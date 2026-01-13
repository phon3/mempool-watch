import { EventEmitter } from 'events';
import WebSocket from 'ws';
import type { ChainConfig, PendingTransaction, WatcherEvents } from './types.js';
import { rawTxToPendingTransaction } from './types.js';
import prisma from '../db/client.js';

// Chain ID to subscription method mapping (based on testing results)
const SUBSCRIPTION_CONFIG: Record<number, { method: string; needsFetch: boolean }> = {
  1: { method: 'alchemy_pendingTransactions', needsFetch: false },    // ETH Mainnet
  11155111: { method: 'alchemy_pendingTransactions', needsFetch: false }, // Sepolia
  137: { method: 'alchemy_pendingTransactions', needsFetch: false },  // Polygon
  8453: { method: 'alchemy_minedTransactions', needsFetch: false },   // Base
  42161: { method: 'alchemy_minedTransactions', needsFetch: false },  // Arbitrum
  10: { method: 'alchemy_minedTransactions', needsFetch: false },     // Optimism
  143: { method: 'newHeads', needsFetch: true },                      // Monad
};

export class MempoolWatcher extends EventEmitter {
  private clients: Map<number, WebSocket> = new Map();
  private unwatchFns: Map<number, () => void> = new Map();
  private reconnectTimers: Map<number, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor(private chains: ChainConfig[]) {
    super();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Watcher is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting mempool watcher for ${this.chains.length} chain(s)`);

    for (const chain of this.chains) {
      await this.watchChain(chain);
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;

    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    for (const [chainId, unwatch] of this.unwatchFns) {
      console.log(`Stopping watcher for chain ${chainId}`);
      unwatch();
    }
    this.unwatchFns.clear();
    this.clients.clear();
  }

  private async watchChain(chainConfig: ChainConfig): Promise<void> {
    const { id: chainId, name, wsUrl } = chainConfig;

    try {
      console.log(`Connecting to ${name} (${chainId}) via WebSocket...`);

      const subConfig = SUBSCRIPTION_CONFIG[chainId] || { method: 'newHeads', needsFetch: true };
      this.watchChainRaw(chainConfig, subConfig);
    } catch (error) {
      console.error(`Failed to connect to ${name}:`, error);
      this.emit('error', error as Error, chainId);
      this.scheduleReconnect(chainConfig);
    }
  }

  private watchChainRaw(
    chainConfig: ChainConfig,
    subConfig: { method: string; needsFetch: boolean }
  ) {
    const { id: chainId, name, wsUrl } = chainConfig;

    const ws = new WebSocket(wsUrl);
    this.clients.set(chainId, ws);

    let subscriptionId: string | null = null;
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('open', () => {
      console.log(`Connected to ${name} (${chainId})`);
      this.emit('connected', chainId);

      // Build subscription params based on method
      let params: unknown[];
      switch (subConfig.method) {
        case 'alchemy_pendingTransactions':
          params = ['alchemy_pendingTransactions', { hashesOnly: false }];
          break;
        case 'alchemy_minedTransactions':
          params = ['alchemy_minedTransactions', { hashesOnly: false }];
          break;
        case 'newHeads':
          params = ['newHeads'];
          break;
        default:
          params = [subConfig.method];
      }

      console.log(`[${name}] Using subscription: ${subConfig.method}`);

      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_subscribe',
        params
      }));
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle Subscription ID response
        if (message.id === 1 && message.result) {
          subscriptionId = message.result;
          console.log(`Subscribed to ${name}. ID: ${subscriptionId}`);
          return;
        }

        // Handle error response
        if (message.error) {
          console.error(`[${name}] Subscription error:`, message.error);
          return;
        }

        // Handle Notification
        if (message.method === 'eth_subscription' && message.params) {
          const result = message.params.result;
          await this.handleSubscriptionEvent(result, chainId, name, wsUrl, subConfig);
        }
      } catch (error) {
        console.error(`Error parsing WS message on ${name}:`, error);
      }
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error on ${name}:`, error);
      this.emit('error', error, chainId);
    });

    ws.on('close', () => {
      console.log(`Disconnected from ${name}`);
      clearInterval(pingInterval);
      this.scheduleReconnect(chainConfig);
    });

    this.unwatchFns.set(chainId, () => {
      ws.close();
      clearInterval(pingInterval);
    });
  }

  private async handleSubscriptionEvent(
    result: unknown,
    chainId: number,
    name: string,
    wsUrl: string,
    subConfig: { method: string; needsFetch: boolean }
  ): Promise<void> {
    try {
      if (subConfig.method === 'alchemy_pendingTransactions') {
        // Full pending transaction object
        const txData = result as Record<string, unknown>;
        if (txData && txData.hash) {
          const pendingTx = rawTxToPendingTransaction(txData, chainId);
          await this.handleTransaction(pendingTx);
        }
      } else if (subConfig.method === 'alchemy_minedTransactions') {
        // Mined transaction format: { removed: boolean, transaction: {...} }
        const minedData = result as { removed?: boolean; transaction?: Record<string, unknown> };
        if (minedData.transaction && !minedData.removed) {
          const pendingTx = rawTxToPendingTransaction(minedData.transaction, chainId);
          pendingTx.status = 'confirmed'; // Mark as confirmed since it's mined
          await this.handleTransaction(pendingTx);
        }
      } else if (subConfig.method === 'newHeads') {
        // Block header - fetch all transactions in block
        const blockData = result as { number?: string; hash?: string };
        if (blockData.number && blockData.hash) {
          await this.fetchBlockTransactions(blockData.number, chainId, name, wsUrl);
        }
      }
    } catch (error) {
      console.error(`[${name}] Error processing event:`, error);
    }
  }

  private async fetchBlockTransactions(
    blockNumber: string,
    chainId: number,
    name: string,
    wsUrl: string
  ): Promise<void> {
    try {
      const httpUrl = wsUrl.replace('wss://', 'https://');

      const response = await fetch(httpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBlockByNumber',
          params: [blockNumber, true] // true = include full tx objects
        })
      });

      const data = (await response.json()) as { result?: { transactions?: unknown[] } };

      if (data.result?.transactions) {
        for (const tx of data.result.transactions) {
          const txData = tx as Record<string, unknown>;
          if (txData.hash) {
            const pendingTx = rawTxToPendingTransaction(txData, chainId);
            pendingTx.status = 'confirmed';
            await this.handleTransaction(pendingTx);
          }
        }
      }
    } catch (error) {
      console.error(`[${name}] Failed to fetch block ${blockNumber}:`, error);
    }
  }

  private async handleTransaction(tx: PendingTransaction): Promise<void> {
    try {
      await prisma.transaction.upsert({
        where: { hash: tx.hash },
        update: { status: tx.status },
        create: {
          hash: tx.hash,
          chainId: tx.chainId,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          gasPrice: tx.gasPrice,
          gasLimit: tx.gasLimit,
          maxFeePerGas: tx.maxFeePerGas,
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
          input: tx.input,
          nonce: tx.nonce,
          type: tx.type,
          timestamp: tx.timestamp,
          status: tx.status,
        },
      });

      this.emit('transaction', tx);
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('Unique constraint'))) {
        console.error('Error saving transaction:', error);
      }
    }
  }

  private scheduleReconnect(chainConfig: ChainConfig): void {
    if (!this.isRunning) return;

    const { id: chainId, name } = chainConfig;

    const existingTimer = this.reconnectTimers.get(chainId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const existingUnwatch = this.unwatchFns.get(chainId);
    if (existingUnwatch) {
      existingUnwatch();
      this.unwatchFns.delete(chainId);
    }
    this.clients.delete(chainId);
    this.emit('disconnected', chainId);

    const timer = setTimeout(async () => {
      console.log(`Reconnecting to ${name}...`);
      this.reconnectTimers.delete(chainId);
      await this.watchChain(chainConfig);
    }, 5000);

    this.reconnectTimers.set(chainId, timer);
  }

  getConnectedChains(): number[] {
    return Array.from(this.clients.keys());
  }
}

export interface MempoolWatcher {
  on<K extends keyof WatcherEvents>(event: K, listener: WatcherEvents[K]): this;
  emit<K extends keyof WatcherEvents>(event: K, ...args: Parameters<WatcherEvents[K]>): boolean;
}

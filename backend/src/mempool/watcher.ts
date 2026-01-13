import { EventEmitter } from 'events';
import WebSocket from 'ws';
import type { ChainConfig, PendingTransaction, WatcherEvents } from './types.js';
import { rawTxToPendingTransaction } from './types.js';
import prisma from '../db/client.js';

// Chains that support alchemy_pendingTransactions (full tx objects)
const ALCHEMY_PENDING_TX_SUPPORTED = [1, 11155111]; // ETH Mainnet, Sepolia

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

      const isAlchemy = wsUrl.includes('alchemy.com');
      // Use alchemy_pendingTransactions only for ETH mainnet/sepolia
      const useAlchemyPending = isAlchemy && ALCHEMY_PENDING_TX_SUPPORTED.includes(chainId);

      this.watchChainRaw(chainConfig, useAlchemyPending);
    } catch (error) {
      console.error(`Failed to connect to ${name}:`, error);
      this.emit('error', error as Error, chainId);
      this.scheduleReconnect(chainConfig);
    }
  }

  private watchChainRaw(chainConfig: ChainConfig, useAlchemyPending: boolean) {
    const { id: chainId, name, wsUrl, rpcUrl } = chainConfig;

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

      // Use appropriate subscription method
      const params = useAlchemyPending
        ? ['alchemy_pendingTransactions', { hashesOnly: false }]
        : ['newPendingTransactions'];

      console.log(`[${name}] Using subscription: ${params[0]}`);

      const subscribeRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_subscribe',
        params
      };

      ws.send(JSON.stringify(subscribeRequest));
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle Subscription ID response
        if (message.id === 1 && message.result) {
          subscriptionId = message.result;
          console.log(`Subscribed to ${name} mempool. ID: ${subscriptionId}`);
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

          if (useAlchemyPending && typeof result === 'object' && result !== null && result.hash) {
            // Full transaction object from alchemy_pendingTransactions
            const pendingTx = rawTxToPendingTransaction(result, chainId);
            await this.handleTransaction(pendingTx);
          } else if (typeof result === 'string') {
            // Hash only from newPendingTransactions - fetch full tx
            await this.fetchAndHandleTransaction(result, chainId, name, wsUrl);
          }
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

  /**
   * Fetch full transaction by hash via JSON-RPC
   */
  private async fetchAndHandleTransaction(hash: string, chainId: number, name: string, wsUrl: string): Promise<void> {
    try {
      // Convert WS URL to HTTP URL for RPC call
      const httpUrl = wsUrl.replace('wss://', 'https://').replace('/v2/', '/v2/');

      const response = await fetch(httpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getTransactionByHash',
          params: [hash]
        })
      });

      const data = await response.json();

      if (data.result) {
        const pendingTx = rawTxToPendingTransaction(data.result, chainId);
        await this.handleTransaction(pendingTx);
      }
    } catch (error) {
      // Transaction might be mined/dropped before we could fetch it - expected
      // Only log if it's not a "not found" type error
      const errorMsg = (error as Error).message || '';
      if (!errorMsg.includes('not found')) {
        console.warn(`[${name}] Failed to fetch tx ${hash.slice(0, 10)}...:`, errorMsg);
      }
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

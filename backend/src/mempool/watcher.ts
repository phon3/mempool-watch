import { createPublicClient, webSocket, type PublicClient, type WebSocketTransport } from 'viem';
import { mainnet, base, arbitrum, optimism, polygon } from 'viem/chains';
import { EventEmitter } from 'events';
import type { ChainConfig, PendingTransaction, WatcherEvents } from './types.js';
import { viemTxToPendingTransaction } from './types.js';
import prisma from '../db/client.js';

// Map of chain IDs to viem chain objects for common chains
const CHAIN_MAP: Record<number, typeof mainnet> = {
  1: mainnet,
  8453: base,
  42161: arbitrum,
  10: optimism,
  137: polygon,
};

export class MempoolWatcher extends EventEmitter {
  private clients: Map<number, PublicClient<WebSocketTransport>> = new Map();
  private unwatchFns: Map<number, () => void> = new Map();
  private reconnectTimers: Map<number, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor(private chains: ChainConfig[]) {
    super();
  }

  /**
   * Start watching all configured chains
   */
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

  /**
   * Stop watching all chains
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    // Clear all reconnect timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    // Unwatch all chains
    for (const [chainId, unwatch] of this.unwatchFns) {
      console.log(`Stopping watcher for chain ${chainId}`);
      unwatch();
    }
    this.unwatchFns.clear();
    this.clients.clear();
  }

  /**
   * Watch a single chain's mempool
   */
  private async watchChain(chainConfig: ChainConfig): Promise<void> {
    const { id: chainId, name, wsUrl } = chainConfig;

    try {
      console.log(`Connecting to ${name} (${chainId}) via WebSocket...`);

      // Get viem chain config or create a minimal one
      const viemChain = CHAIN_MAP[chainId] ?? {
        id: chainId,
        name,
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: [] } },
      };

      const transport = webSocket(wsUrl, {
        reconnect: true,
        retryCount: 5,
        retryDelay: ({ count }) => Math.min(1000 * Math.pow(2, count), 30000),
      });

      const client = createPublicClient({
        chain: viemChain,
        transport,
      });

      this.clients.set(chainId, client);

      // Subscribe to pending transactions
      const unwatch = client.watchPendingTransactions({
        onTransactions: async (hashes) => {
          for (const hash of hashes) {
            try {
              const tx = await client.getTransaction({ hash });
              if (tx) {
                const pendingTx = viemTxToPendingTransaction(tx, chainId);
                await this.handleTransaction(pendingTx);
              }
            } catch (error) {
              // Transaction might have been confirmed/dropped before we could fetch it
              // This is expected behavior, don't log as error
              if (!(error instanceof Error && error.message.includes('not found'))) {
                console.error(`Error fetching tx ${hash} on ${name}:`, error);
              }
            }
          }
        },
        onError: (error) => {
          console.error(`WebSocket error on ${name}:`, error);
          this.emit('error', error, chainId);
          this.scheduleReconnect(chainConfig);
        },
      });

      this.unwatchFns.set(chainId, unwatch);
      this.emit('connected', chainId);
      console.log(`Watching mempool on ${name} (${chainId})...`);
    } catch (error) {
      console.error(`Failed to connect to ${name}:`, error);
      this.emit('error', error as Error, chainId);
      this.scheduleReconnect(chainConfig);
    }
  }

  /**
   * Handle an incoming transaction
   */
  private async handleTransaction(tx: PendingTransaction): Promise<void> {
    try {
      // Save to database
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

      // Emit for real-time updates
      this.emit('transaction', tx);
    } catch (error) {
      // Ignore duplicate key errors (race condition with multiple nodes)
      if (!(error instanceof Error && error.message.includes('Unique constraint'))) {
        console.error('Error saving transaction:', error);
      }
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(chainConfig: ChainConfig): void {
    if (!this.isRunning) return;

    const { id: chainId, name } = chainConfig;

    // Clear existing timer
    const existingTimer = this.reconnectTimers.get(chainId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Clean up existing connection
    const existingUnwatch = this.unwatchFns.get(chainId);
    if (existingUnwatch) {
      existingUnwatch();
      this.unwatchFns.delete(chainId);
    }
    this.clients.delete(chainId);
    this.emit('disconnected', chainId);

    // Schedule reconnection
    const timer = setTimeout(async () => {
      console.log(`Reconnecting to ${name}...`);
      this.reconnectTimers.delete(chainId);
      await this.watchChain(chainConfig);
    }, 5000);

    this.reconnectTimers.set(chainId, timer);
  }

  /**
   * Get connected chain IDs
   */
  getConnectedChains(): number[] {
    return Array.from(this.clients.keys());
  }
}

// Type the EventEmitter
export interface MempoolWatcher {
  on<K extends keyof WatcherEvents>(event: K, listener: WatcherEvents[K]): this;
  emit<K extends keyof WatcherEvents>(event: K, ...args: Parameters<WatcherEvents[K]>): boolean;
}

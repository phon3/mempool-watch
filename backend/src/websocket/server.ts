import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { PendingTransaction } from '../mempool/types.js';

interface ClientState {
  ws: WebSocket;
  subscribedChains: Set<number>; // Empty set means subscribe to all
}

export class TransactionBroadcaster {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientState> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupConnectionHandling();
  }

  private setupConnectionHandling(): void {
    this.wss.on('connection', (ws) => {
      console.log('Client connected');

      this.clients.set(ws, {
        ws,
        subscribedChains: new Set(), // Subscribe to all by default
      });

      // Handle incoming messages (for chain subscription filtering)
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch {
          // Ignore invalid messages
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket client error:', error);
        this.clients.delete(ws);
      });

      // Send initial connection confirmation
      ws.send(
        JSON.stringify({
          type: 'connected',
          timestamp: new Date().toISOString(),
        })
      );
    });
  }

  private handleClientMessage(ws: WebSocket, message: unknown): void {
    if (!message || typeof message !== 'object') return;

    const msg = message as Record<string, unknown>;

    switch (msg.type) {
      case 'subscribe':
        // Subscribe to specific chains
        if (Array.isArray(msg.chains)) {
          const clientState = this.clients.get(ws);
          if (clientState) {
            clientState.subscribedChains = new Set(msg.chains as number[]);
            ws.send(
              JSON.stringify({
                type: 'subscribed',
                chains: Array.from(clientState.subscribedChains),
              })
            );
          }
        }
        break;

      case 'unsubscribe':
        // Reset to all chains
        const clientState = this.clients.get(ws);
        if (clientState) {
          clientState.subscribedChains.clear();
          ws.send(
            JSON.stringify({
              type: 'subscribed',
              chains: [], // Empty means all
            })
          );
        }
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  }

  /**
   * Broadcast a transaction to all connected clients
   */
  broadcast(tx: PendingTransaction): void {
    const message = JSON.stringify({
      type: 'transaction',
      data: tx,
    });

    for (const [ws, state] of this.clients) {
      // Check if client is subscribed to this chain
      const shouldSend =
        state.subscribedChains.size === 0 || state.subscribedChains.has(tx.chainId);

      if (shouldSend && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  /**
   * Broadcast chain connection status
   */
  broadcastChainStatus(chainId: number, status: 'connected' | 'disconnected'): void {
    const message = JSON.stringify({
      type: 'chainStatus',
      chainId,
      status,
    });

    for (const [ws] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

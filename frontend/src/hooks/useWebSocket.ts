import { useEffect, useRef, useState, useCallback } from 'react';
import type { Transaction, WebSocketMessage } from '../types/transaction';

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3002`;

interface UseWebSocketOptions {
  onTransaction?: (tx: Transaction) => void;
  onChainStatus?: (chainId: number, status: 'connected' | 'disconnected') => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onTransaction, onChainStatus, autoReconnect = true, maxReconnectAttempts = 10 } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setReconnectAttempts(0);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'transaction':
            if (message.data && onTransaction) {
              onTransaction(message.data);
            }
            break;
          case 'chainStatus':
            if (message.chainId !== undefined && message.status && onChainStatus) {
              onChainStatus(message.chainId, message.status);
            }
            break;
          case 'connected':
            console.log('Server acknowledged connection');
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      wsRef.current = null;

      if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(`Reconnecting in ${delay}ms...`);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          setReconnectAttempts((prev) => prev + 1);
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [autoReconnect, maxReconnectAttempts, onChainStatus, onTransaction, reconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const subscribeToChains = useCallback((chainIds: number[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'subscribe',
          chains: chainIds,
        })
      );
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    reconnectAttempts,
    connect,
    disconnect,
    subscribeToChains,
  };
}

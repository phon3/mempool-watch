import { useState, useCallback, useEffect, useRef } from 'react';
import type { Transaction, Chain, Stats, PaginatedResponse } from '@/types/transaction';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const MAX_LIVE_TRANSACTIONS = 100;
const BATCH_FLUSH_INTERVAL = 500; // Update UI max 2 times per second

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chains, setChains] = useState<Chain[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Buffer for batching incoming transactions
  const txBufferRef = useRef<Transaction[]>([]);
  const flushIntervalRef = useRef<number | null>(null);

  // Add a new transaction to the buffer (will be flushed periodically)
  const addTransaction = useCallback((tx: Transaction) => {
    txBufferRef.current.push(tx);
  }, []);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
    txBufferRef.current = [];
  }, []);

  // Flush buffered transactions to state periodically
  useEffect(() => {
    flushIntervalRef.current = window.setInterval(() => {
      if (txBufferRef.current.length > 0) {
        const bufferedTxs = [...txBufferRef.current];
        txBufferRef.current = [];

        setTransactions((prev) => {
          // Dedupe and prepend new transactions
          const existingHashes = new Set(prev.map(t => t.hash));
          const newUnique = bufferedTxs.filter(t => !existingHashes.has(t.hash));
          const combined = [...newUnique, ...prev];
          return combined.slice(0, MAX_LIVE_TRANSACTIONS);
        });
      }
    }, BATCH_FLUSH_INTERVAL);

    return () => {
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
      }
    };
  }, []);

  // Fetch chains
  const fetchChains = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/chains`);
      if (!response.ok) throw new Error('Failed to fetch chains');
      const data: Chain[] = await response.json();
      setChains(data);
    } catch (err) {
      console.error('Error fetching chains:', err);
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async (chainId?: number) => {
    try {
      const url = chainId ? `${API_URL}/stats?chainId=${chainId}` : `${API_URL}/stats`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data: Stats = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  // Fetch historical transactions
  const fetchTransactions = useCallback(
    async (
      params: {
        chainId?: number;
        from?: string;
        to?: string;
        limit?: number;
        offset?: number;
      } = {},
      shouldAppend = false
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const searchParams = new URLSearchParams();
        if (params.chainId) searchParams.set('chainId', params.chainId.toString());
        if (params.from) searchParams.set('from', params.from);
        if (params.to) searchParams.set('to', params.to);
        if (params.limit) searchParams.set('limit', params.limit.toString());
        if (params.offset) searchParams.set('offset', params.offset.toString());

        const response = await fetch(`${API_URL}/transactions?${searchParams}`);
        if (!response.ok) throw new Error('Failed to fetch transactions');

        const data: PaginatedResponse<Transaction> = await response.json();

        setTransactions(prev => {
          if (shouldAppend) {
            const existingHashes = new Set(prev.map(t => t.hash));
            const newUnique = data.transactions.filter(t => !existingHashes.has(t.hash));
            return [...prev, ...newUnique];
          }
          return data.transactions;
        });
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Fetch a single transaction
  const fetchTransaction = useCallback(async (hash: string) => {
    try {
      const response = await fetch(`${API_URL}/transactions/${hash}`);
      if (!response.ok) throw new Error('Transaction not found');
      return (await response.json()) as Transaction;
    } catch (err) {
      throw err;
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    Promise.all([fetchChains(), fetchStats(), fetchTransactions({ limit: 50 })]).catch(
      console.error
    );
  }, [fetchChains, fetchStats, fetchTransactions]);

  // Refresh stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    transactions,
    chains,
    stats,
    isLoading,
    error,
    addTransaction,
    fetchTransactions,
    fetchTransaction,
    fetchStats,
    fetchChains,
    clearTransactions,
    hasMore,
  };
}

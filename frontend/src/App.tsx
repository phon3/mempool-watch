import { useState, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useTransactions } from './hooks/useTransactions';
import { TransactionList } from './components/TransactionList';
import { ChainSelector } from './components/ChainSelector';
import { StatsPanel } from './components/StatsPanel';
import { FilterBar } from './components/FilterBar';

function App() {
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [chainStatus, setChainStatus] = useState<Map<number, 'connected' | 'disconnected'>>(
    new Map()
  );
  const [isLive, setIsLive] = useState(true);

  const {
    transactions,
    chains,
    stats,
    isLoading,
    addTransaction,
    fetchTransactions,
    fetchStats,
    clearTransactions
  } = useTransactions();

  const handleTransaction = useCallback(
    (tx: Parameters<typeof addTransaction>[0]) => {
      // If live mode is off (e.g. paused/searching), don't add new transactions
      if (!isLive) return;

      // Add to list if we are viewing all chains (null) OR if tx matches selected chain
      if (selectedChainId === null || tx.chainId === selectedChainId) {
        addTransaction(tx);
      }
    },
    [isLive, selectedChainId, addTransaction]
  );

  const handleChainStatus = useCallback((chainId: number, status: 'connected' | 'disconnected') => {
    setChainStatus((prev) => {
      const next = new Map(prev);
      next.set(chainId, status);
      return next;
    });
  }, []);

  const { isConnected, subscribeToChains } = useWebSocket({
    onTransaction: handleTransaction,
    onChainStatus: handleChainStatus,
  });

  const handleChainSelect = async (chainId: number | null) => {
    setSelectedChainId(chainId);
    clearTransactions(); // Clear current list immediately

    if (chainId) {
      subscribeToChains([chainId]);
      fetchStats(chainId);
      // Fetch recent history for specific chain to populate list immediately
      await fetchTransactions({ chainId, limit: 50 });
    } else {
      subscribeToChains([]); // Subscribe to all
      fetchStats();
      // Fetch recent history for all chains
      await fetchTransactions({ limit: 50 });
    }
  };

  const handleFilter = async (filters: { from?: string; to?: string; hash?: string }) => {
    setIsLive(false);
    await fetchTransactions({
      chainId: selectedChainId ?? undefined,
      from: filters.from,
      to: filters.to,
      limit: 50,
    });
  };

  const handleClearFilter = async () => {
    setIsLive(true);
    await fetchTransactions({
      chainId: selectedChainId ?? undefined,
      limit: 50,
    });
  };

  // Filter transactions by selected chain for display
  const displayTransactions = selectedChainId
    ? transactions.filter((tx) => tx.chainId === selectedChainId)
    : transactions;

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-100">Mempool Watcher</h1>
              <p className="text-slate-400 mt-1">Real-time pending transaction monitoring</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-400 live-indicator' : 'bg-red-400'
                    }`}
                />
                <span className="text-sm text-slate-400">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {isLive && (
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                  LIVE
                </span>
              )}
            </div>
          </div>

          {/* Chain Selector */}
          <ChainSelector
            chains={chains}
            selectedChainId={selectedChainId}
            onSelect={handleChainSelect}
            chainStatus={chainStatus}
          />
        </header>

        {/* Stats Panel */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Statistics</h2>
          <StatsPanel stats={stats} chains={chains} />
        </section>

        {/* Filter Bar */}
        <section className="mb-6">
          <FilterBar onFilter={handleFilter} onClear={handleClearFilter} />
        </section>

        {/* Transaction List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-200">
              {isLive ? 'Live Transactions' : 'Search Results'}
            </h2>
            <span className="text-sm text-slate-400">
              {displayTransactions.length} transaction{displayTransactions.length !== 1 ? 's' : ''}
            </span>
          </div>
          <TransactionList
            transactions={displayTransactions}
            chains={chains}
            isLoading={isLoading}
          />
        </section>
      </div>
    </div>
  );
}

export default App;

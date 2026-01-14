import type { Stats, Chain } from '@/types/transaction';

interface StatsPanelProps {
  stats: Stats | null;
  chains: Chain[];
}

export function StatsPanel({ stats, chains }: StatsPanelProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-800 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-24 mb-2" />
            <div className="h-8 bg-slate-700 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  const getChainName = (chainId: string) => {
    return chains.find((c) => c.id === parseInt(chainId))?.name ?? `Chain ${chainId}`;
  };

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-slate-400 text-sm mb-1">Total Transactions</div>
          <div className="text-2xl font-bold text-slate-100">{stats.total.toLocaleString()}</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-slate-400 text-sm mb-1">Recent (5 min)</div>
          <div className="text-2xl font-bold text-slate-100">
            {stats.recentCount.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-slate-400 text-sm mb-1">TX / Minute</div>
          <div className="text-2xl font-bold text-green-400">{stats.txPerMinute}</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-slate-400 text-sm mb-1">Pending</div>
          <div className="text-2xl font-bold text-yellow-400">
            {(stats.byStatus['pending'] ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Chain Breakdown */}
      {Object.keys(stats.byChain).length > 1 && (
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-slate-400 text-sm mb-3">By Chain</div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.byChain).map(([chainId, count]) => (
              <div key={chainId} className="flex items-center gap-2">
                <span className="text-slate-300">{getChainName(chainId)}:</span>
                <span className="text-slate-100 font-medium">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Senders */}
      {stats.topSenders.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-slate-400 text-sm mb-3">Top Senders (Last Hour)</div>
          <div className="space-y-2">
            {stats.topSenders.slice(0, 5).map((sender, i) => (
              <div key={sender.address} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 w-4">{i + 1}.</span>
                  <span className="font-mono text-sm text-slate-300">
                    {sender.address.slice(0, 10)}...{sender.address.slice(-8)}
                  </span>
                </div>
                <span className="text-slate-400">
                  {sender.count} tx{sender.count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

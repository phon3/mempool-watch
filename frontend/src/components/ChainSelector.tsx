import type { Chain } from '../types/transaction';

interface ChainSelectorProps {
  chains: Chain[];
  selectedChainId: number | null;
  onSelect: (chainId: number | null) => void;
  chainStatus: Map<number, 'connected' | 'disconnected'>;
}

export function ChainSelector({
  chains,
  selectedChainId,
  onSelect,
  chainStatus,
}: ChainSelectorProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          selectedChainId === null
            ? 'bg-blue-500 text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
      >
        All Chains
      </button>

      {chains.map((chain) => {
        const status = chainStatus.get(chain.id);
        const isConnected = status === 'connected' || status === undefined;

        return (
          <button
            key={chain.id}
            onClick={() => onSelect(chain.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              selectedChainId === chain.id
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400 live-indicator' : 'bg-red-400'
              }`}
            />
            {chain.name}
          </button>
        );
      })}
    </div>
  );
}

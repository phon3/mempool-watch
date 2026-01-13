import type { Transaction } from '../types/transaction';

interface TransactionCardProps {
  transaction: Transaction;
  chainName?: string;
}

export function TransactionCard({ transaction: tx, chainName }: TransactionCardProps) {
  const valueInEth = (BigInt(tx.value) / BigInt(10 ** 18)).toString();
  const gasPriceGwei = (BigInt(tx.gasPrice) / BigInt(10 ** 9)).toString();

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const truncateAddress = (addr: string | null) => {
    if (!addr) return 'Contract Creation';
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'confirmed':
        return 'bg-green-500/20 text-green-400';
      case 'dropped':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  const isContractInteraction = tx.input && tx.input !== '0x' && tx.input.length > 2;

  const getExplorerUrl = (chainId: number, hash: string) => {
    switch (chainId) {
      case 8453: // Base
        return `https://basescan.org/tx/${hash}`;
      case 42161: // Arbitrum
        return `https://arbiscan.io/tx/${hash}`;
      case 143: // Monad
        return `https://monadscan.com/tx/${hash}`;
      case 137: // Polygon
        return `https://polygonscan.com/tx/${hash}`;
      case 11155111: // Sepolia
        return `https://sepolia.etherscan.io/tx/${hash}`;
      default: // ETH Mainnet or others
        return `https://etherscan.io/tx/${hash}`;
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(tx.status)}`}>
            {tx.status}
          </span>
          {chainName && (
            <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
              {chainName}
            </span>
          )}
          {isContractInteraction && (
            <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
              Contract
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {new Date(tx.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 w-12">Hash</span>
          <a
            href={getExplorerUrl(tx.chainId, tx.hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 font-mono"
          >
            {truncateHash(tx.hash)}
          </a>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 w-12">From</span>
          <span className="font-mono text-slate-300">{truncateAddress(tx.from)}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 w-12">To</span>
          <span className="font-mono text-slate-300">{truncateAddress(tx.to)}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500 text-xs">Value</span>
              <p className="text-slate-200">{valueInEth} ETH</p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">Gas Price</span>
              <p className="text-slate-200">{gasPriceGwei} Gwei</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-slate-500 text-xs">Nonce</span>
            <p className="text-slate-200">{tx.nonce}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

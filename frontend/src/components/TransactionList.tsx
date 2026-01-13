import { TransactionCard } from './TransactionCard';
import type { Transaction, Chain } from '../types/transaction';

interface TransactionListProps {
  transactions: Transaction[];
  chains: Chain[];
  isLoading: boolean;
}

export function TransactionList({ transactions, chains, isLoading }: TransactionListProps) {
  const getChainName = (chainId: number) => {
    return chains.find((c) => c.id === chainId)?.name ?? `Chain ${chainId}`;
  };

  if (isLoading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading transactions...</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-slate-400 mb-2">No transactions yet</div>
        <div className="text-slate-500 text-sm">
          Waiting for pending transactions from the mempool...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <TransactionCard key={tx.hash} transaction={tx} chainName={getChainName(tx.chainId)} />
      ))}
    </div>
  );
}

import type { Transaction as ViemTransaction } from 'viem';

export interface ChainConfig {
  id: number;
  name: string;
  wsUrl: string;
  rpcUrl?: string;
}

export interface PendingTransaction {
  hash: string;
  chainId: number;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string;
  gasLimit: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  input: string;
  nonce: number;
  type: number;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'dropped';
}

export interface WatcherEvents {
  transaction: (tx: PendingTransaction) => void;
  error: (error: Error, chainId: number) => void;
  connected: (chainId: number) => void;
  disconnected: (chainId: number) => void;
}

export function viemTxToPendingTransaction(
  tx: ViemTransaction,
  chainId: number
): PendingTransaction {
  return {
    hash: tx.hash,
    chainId,
    from: tx.from,
    to: tx.to ?? null,
    value: tx.value.toString(),
    gasPrice: (tx.gasPrice ?? tx.maxFeePerGas ?? 0n).toString(),
    gasLimit: tx.gas.toString(),
    maxFeePerGas: tx.maxFeePerGas?.toString(),
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
    input: tx.input,
    nonce: tx.nonce,
    type: tx.type === 'eip1559' ? 2 : tx.type === 'legacy' ? 0 : 0,
    timestamp: new Date(),
    status: 'pending',
  };
}

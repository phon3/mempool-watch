export interface Transaction {
  id: string;
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
  timestamp: string;
  status: 'pending' | 'confirmed' | 'dropped';
}

export interface Chain {
  id: number;
  name: string;
  active: boolean;
}

export interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byChain: Record<string, number>;
  topSenders: Array<{ address: string; count: number }>;
  recentCount: number;
  txPerMinute: number;
}

export interface PaginatedResponse<T> {
  transactions: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface WebSocketMessage {
  type: 'connected' | 'transaction' | 'chainStatus' | 'subscribed' | 'pong';
  data?: Transaction;
  chainId?: number;
  status?: 'connected' | 'disconnected';
  chains?: number[];
  timestamp?: string;
}

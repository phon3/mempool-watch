import type { RpcProvider } from '../types';

/**
 * QuickNode network mappings
 */
const QUICKNODE_NETWORKS: Record<number, string> = {
  1: 'ethereum-mainnet',
  5: 'ethereum-goerli',
  11155111: 'ethereum-sepolia',
  10: 'optimism',
  137: 'polygon-mainnet',
  80001: 'polygon-testnet',
  42161: 'arbitrum-mainnet',
  421613: 'arbitrum-goerli',
  8453: 'base-mainnet',
  84531: 'base-goerli',
  56: 'bsc',
  97: 'bsc-testnet',
  43114: 'avalanche-mainnet',
  43113: 'avalanche-testnet',
};

export const QuickNodeProvider: RpcProvider = {
  name: 'QuickNode',
  supportedChains: Object.keys(QUICKNODE_NETWORKS).map(Number),
  supportsWebSocket: true,
  supportsHttp: true,

  buildWebSocketUrl(chainId: number, apiKey: string): string {
    const network = QUICKNODE_NETWORKS[chainId];
    if (!network) {
      throw new Error(
        `QuickNode does not support chain ID ${chainId}. Supported chains: ${this.supportedChains.join(', ')}`
      );
    }
    // QuickNode uses the format: wss://network.quiknode.pro/hash/
    return `wss://${network}.quiknode.pro/${apiKey}/`;
  },

  buildHttpUrl(chainId: number, apiKey: string): string {
    const network = QUICKNODE_NETWORKS[chainId];
    if (!network) {
      throw new Error(
        `QuickNode does not support chain ID ${chainId}. Supported chains: ${this.supportedChains.join(', ')}`
      );
    }
    return `https://${network}.quiknode.pro/${apiKey}/`;
  },

  supportsChain(chainId: number): boolean {
    return chainId in QUICKNODE_NETWORKS;
  },
};

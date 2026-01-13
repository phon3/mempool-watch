import type { RpcProvider } from '../types';

/**
 * Infura network mappings
 */
const INFURA_NETWORKS: Record<number, string> = {
  1: 'mainnet',
  5: 'goerli',
  11155111: 'sepolia',
  10: 'optimism-mainnet',
  420: 'optimism-goerli',
  137: 'polygon-mainnet',
  80001: 'polygon-mumbai',
  42161: 'arbitrum-mainnet',
  421613: 'arbitrum-goerli',
  43114: 'avalanche-mainnet',
  43113: 'avalanche-fuji',
};

export const InfuraProvider: RpcProvider = {
  name: 'Infura',
  supportedChains: Object.keys(INFURA_NETWORKS).map(Number),
  supportsWebSocket: true,
  supportsHttp: true,

  buildWebSocketUrl(chainId: number, apiKey: string): string {
    const network = INFURA_NETWORKS[chainId];
    if (!network) {
      throw new Error(
        `Infura does not support chain ID ${chainId}. Supported chains: ${this.supportedChains.join(', ')}`
      );
    }
    return `wss://${network}.infura.io/ws/v3/${apiKey}`;
  },

  buildHttpUrl(chainId: number, apiKey: string): string {
    const network = INFURA_NETWORKS[chainId];
    if (!network) {
      throw new Error(
        `Infura does not support chain ID ${chainId}. Supported chains: ${this.supportedChains.join(', ')}`
      );
    }
    return `https://${network}.infura.io/v3/${apiKey}`;
  },

  supportsChain(chainId: number): boolean {
    return chainId in INFURA_NETWORKS;
  },
};

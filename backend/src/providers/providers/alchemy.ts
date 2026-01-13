import type { RpcProvider } from '../types';

/**
 * Alchemy network mappings for different chains
 */
const ALCHEMY_NETWORKS: Record<number, string> = {
  1: 'eth-mainnet', // Ethereum Mainnet
  5: 'eth-goerli', // Goerli Testnet
  11155111: 'eth-sepolia', // Sepolia Testnet
  10: 'opt-mainnet', // Optimism
  420: 'opt-goerli', // Optimism Goerli
  137: 'polygon-mainnet', // Polygon
  80001: 'polygon-mumbai', // Polygon Mumbai
  42161: 'arb-mainnet', // Arbitrum One
  421613: 'arb-goerli', // Arbitrum Goerli
  8453: 'base-mainnet', // Base
  84531: 'base-goerli', // Base Goerli
  84532: 'base-sepolia', // Base Sepolia
  143: 'monad-mainnet', // Monad Mainnet
};

export const AlchemyProvider: RpcProvider = {
  name: 'Alchemy',
  supportedChains: Object.keys(ALCHEMY_NETWORKS).map(Number),
  supportsWebSocket: true,
  supportsHttp: true,

  buildWebSocketUrl(chainId: number, apiKey: string): string {
    const network = ALCHEMY_NETWORKS[chainId];
    if (!network) {
      throw new Error(
        `Alchemy does not support chain ID ${chainId}. Supported chains: ${this.supportedChains.join(', ')}`
      );
    }
    return `wss://${network}.g.alchemy.com/v2/${apiKey}`;
  },

  buildHttpUrl(chainId: number, apiKey: string): string {
    const network = ALCHEMY_NETWORKS[chainId];
    if (!network) {
      throw new Error(
        `Alchemy does not support chain ID ${chainId}. Supported chains: ${this.supportedChains.join(', ')}`
      );
    }
    return `https://${network}.g.alchemy.com/v2/${apiKey}`;
  },

  supportsChain(chainId: number): boolean {
    return chainId in ALCHEMY_NETWORKS;
  },
};

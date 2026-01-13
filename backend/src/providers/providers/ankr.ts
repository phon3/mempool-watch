import type { RpcProvider } from '../types';

/**
 * Ankr network mappings
 */
const ANKR_NETWORKS: Record<number, string> = {
  1: 'eth',
  5: 'eth_goerli',
  10: 'optimism',
  137: 'polygon',
  80001: 'polygon_mumbai',
  42161: 'arbitrum',
  8453: 'base',
  56: 'bsc',
  97: 'bsc_testnet_chapel',
  43114: 'avalanche',
  43113: 'avalanche_fuji',
  250: 'fantom',
  4002: 'fantom_testnet',
};

export const AnkrProvider: RpcProvider = {
  name: 'Ankr',
  supportedChains: Object.keys(ANKR_NETWORKS).map(Number),
  supportsWebSocket: true,
  supportsHttp: true,

  buildWebSocketUrl(chainId: number, apiKey: string): string {
    const network = ANKR_NETWORKS[chainId];
    if (!network) {
      throw new Error(
        `Ankr does not support chain ID ${chainId}. Supported chains: ${this.supportedChains.join(', ')}`
      );
    }
    // Ankr format: wss://rpc.ankr.com/network/ws/apikey
    return `wss://rpc.ankr.com/${network}/ws/${apiKey}`;
  },

  buildHttpUrl(chainId: number, apiKey: string): string {
    const network = ANKR_NETWORKS[chainId];
    if (!network) {
      throw new Error(
        `Ankr does not support chain ID ${chainId}. Supported chains: ${this.supportedChains.join(', ')}`
      );
    }
    return `https://rpc.ankr.com/${network}/${apiKey}`;
  },

  supportsChain(chainId: number): boolean {
    return chainId in ANKR_NETWORKS;
  },
};

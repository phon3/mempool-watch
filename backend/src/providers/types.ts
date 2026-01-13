/**
 * Provider configuration types for RPC provider abstraction
 */

export type ProviderName = 'alchemy' | 'quicknode' | 'infura' | 'ankr' | 'custom';

export interface ProviderConfig {
  provider: ProviderName;
  apiKey?: string;
  customUrl?: string; // For custom providers
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
}

export interface RpcProvider {
  name: string;
  supportedChains: number[]; // Chain IDs
  supportsWebSocket: boolean;
  supportsHttp: boolean;

  /**
   * Build WebSocket URL for a specific chain
   * @param chainId - The chain ID
   * @param apiKey - Provider API key
   * @returns WebSocket URL
   */
  buildWebSocketUrl(chainId: number, apiKey: string): string;

  /**
   * Build HTTP RPC URL for a specific chain
   * @param chainId - The chain ID
   * @param apiKey - Provider API key
   * @returns HTTP URL
   */
  buildHttpUrl(chainId: number, apiKey: string): string;

  /**
   * Check if provider supports a specific chain
   * @param chainId - The chain ID to check
   * @returns True if chain is supported
   */
  supportsChain(chainId: number): boolean;
}

export interface ProviderEndpoints {
  wsUrl: string;
  httpUrl?: string;
  provider: ProviderName;
}

/**
 * Provider capabilities for documentation
 */
export interface ProviderCapabilities {
  name: string;
  websocketSupport: boolean;
  httpSupport: boolean;
  supportedChains: Array<{
    id: number;
    name: string;
    network: string;
  }>;
}

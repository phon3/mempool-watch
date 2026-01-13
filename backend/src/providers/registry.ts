import type { RpcProvider } from './types';
import { AlchemyProvider } from './providers/alchemy';
import { QuickNodeProvider } from './providers/quicknode';
import { InfuraProvider } from './providers/infura';
import { AnkrProvider } from './providers/ankr';

/**
 * Registry of all available RPC providers
 */
export const PROVIDER_REGISTRY: Record<string, RpcProvider> = {
  alchemy: AlchemyProvider,
  quicknode: QuickNodeProvider,
  infura: InfuraProvider,
  ankr: AnkrProvider,
};

/**
 * Get a provider by name
 */
export function getProvider(name: string): RpcProvider | undefined {
  return PROVIDER_REGISTRY[name.toLowerCase()];
}

/**
 * Get all available provider names
 */
export function getAvailableProviders(): string[] {
  return Object.keys(PROVIDER_REGISTRY);
}

/**
 * Check if a provider exists
 */
export function hasProvider(name: string): boolean {
  return name.toLowerCase() in PROVIDER_REGISTRY;
}

/**
 * Get providers that support a specific chain
 */
export function getProvidersForChain(chainId: number): RpcProvider[] {
  return Object.values(PROVIDER_REGISTRY).filter((provider) => provider.supportsChain(chainId));
}

import type { ProviderConfig, ProviderEndpoints, RpcProvider } from './types';
import { getProvider } from './registry';

/**
 * Provider Manager
 * Handles provider selection, endpoint building, and failover
 */
export class ProviderManager {
  private providerConfigs: ProviderConfig[];

  constructor(configs: ProviderConfig[]) {
    this.providerConfigs = configs;
    this.validateConfigs();
  }

  /**
   * Validate provider configurations
   */
  private validateConfigs(): void {
    for (const config of this.providerConfigs) {
      if (config.provider === 'custom') {
        if (!config.customUrl) {
          throw new Error('Custom provider requires customUrl');
        }
        continue;
      }

      const provider = getProvider(config.provider);
      if (!provider) {
        throw new Error(`Unknown provider: ${config.provider}`);
      }

      if (!config.apiKey && !config.customUrl) {
        throw new Error(`Provider ${config.provider} requires apiKey or customUrl`);
      }
    }
  }

  /**
   * Get all available endpoints for a chain (with failover)
   */
  getEndpoints(chainId: number): ProviderEndpoints[] {
    const endpoints: ProviderEndpoints[] = [];

    for (const config of this.providerConfigs) {
      // Handle custom provider
      if (config.provider === 'custom' && config.customUrl) {
        endpoints.push({
          wsUrl: config.customUrl,
          provider: 'custom',
        });
        continue;
      }

      const provider = getProvider(config.provider);
      if (!provider) continue;

      // Check if provider supports this chain
      if (!provider.supportsChain(chainId)) {
        console.warn(`Provider ${provider.name} does not support chain ${chainId}, skipping`);
        continue;
      }

      // Build endpoints
      try {
        if (config.apiKey) {
          const wsUrl = provider.buildWebSocketUrl(chainId, config.apiKey);
          const httpUrl = provider.supportsHttp
            ? provider.buildHttpUrl(chainId, config.apiKey)
            : undefined;

          endpoints.push({
            wsUrl,
            httpUrl,
            provider: config.provider,
          });
        }
      } catch (error) {
        console.error(
          `Failed to build endpoint for ${config.provider} on chain ${chainId}:`,
          error
        );
      }
    }

    return endpoints;
  }

  /**
   * Get primary endpoint for a chain (first available)
   */
  getPrimaryEndpoint(chainId: number): ProviderEndpoints | null {
    const endpoints = this.getEndpoints(chainId);
    return endpoints[0] || null;
  }

  /**
   * Get endpoint for a specific provider
   */
  getEndpointForProvider(chainId: number, providerName: string): ProviderEndpoints | null {
    const config = this.providerConfigs.find((c) => c.provider === providerName);
    if (!config) return null;

    const provider = getProvider(providerName);
    if (!provider || !provider.supportsChain(chainId)) return null;

    if (!config.apiKey) return null;

    try {
      return {
        wsUrl: provider.buildWebSocketUrl(chainId, config.apiKey),
        httpUrl: provider.supportsHttp ? provider.buildHttpUrl(chainId, config.apiKey) : undefined,
        provider: config.provider,
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if any provider supports a chain
   */
  isChainSupported(chainId: number): boolean {
    return this.getEndpoints(chainId).length > 0;
  }

  /**
   * Get list of configured providers
   */
  getConfiguredProviders(): string[] {
    return this.providerConfigs.map((c) => c.provider);
  }
}

/**
 * Load provider configurations from environment variables
 */
export function loadProvidersFromEnv(): ProviderConfig[] {
  const configs: ProviderConfig[] = [];

  // Check for PROVIDERS env var (comma-separated list)
  const providersEnv = process.env.PROVIDERS;
  if (providersEnv) {
    const providerNames = providersEnv.split(',').map((p) => p.trim());

    for (const providerName of providerNames) {
      const apiKeyEnv = `${providerName.toUpperCase()}_API_KEY`;
      const apiKey = process.env[apiKeyEnv];

      if (apiKey) {
        configs.push({
          provider: providerName as any,
          apiKey,
        });
      } else {
        console.warn(`No API key found for provider ${providerName} (${apiKeyEnv})`);
      }
    }
  }

  // Check for single PROVIDER env var
  const singleProvider = process.env.PROVIDER;
  if (singleProvider && configs.length === 0) {
    const apiKeyEnv = `${singleProvider.toUpperCase()}_API_KEY`;
    const apiKey = process.env[apiKeyEnv];

    if (apiKey) {
      configs.push({
        provider: singleProvider as any,
        apiKey,
      });
    }
  }

  // If no providers configured, return empty array
  // (will fall back to manual URLs in chain config)
  return configs;
}

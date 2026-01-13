import type { ChainConfig } from '../mempool/types.js';
import type { ProviderManager } from '../providers/manager.js';

/**
 * Load chain configurations from environment variables.
 * Format: CHAIN_{N}_{PROPERTY} where N is 1, 2, 3, etc.
 * Required: NAME, ID
 * Optional: WS_URL, RPC_URL (if not using provider manager)
 *
 * New: If providerManager is provided, URLs are auto-generated from providers
 * Backward compatible: Manual WS_URL still works and takes precedence
 */
export function loadChainsFromEnv(providerManager?: ProviderManager): ChainConfig[] {
  const chains: ChainConfig[] = [];
  let index = 1;

  while (true) {
    const name = process.env[`CHAIN_${index}_NAME`];
    const id = process.env[`CHAIN_${index}_ID`];

    if (!name || !id) {
      break;
    }

    const chainId = parseInt(id, 10);

    // Check for manual URL override first (backward compatibility)
    const wsUrl = process.env[`CHAIN_${index}_WS_URL`];
    const rpcUrl = process.env[`CHAIN_${index}_RPC_URL`];

    if (wsUrl) {
      // Manual configuration - use as-is
      chains.push({
        id: chainId,
        name,
        wsUrl,
        rpcUrl,
      });
    } else if (providerManager) {
      // Use provider manager to get endpoint
      const endpoint = providerManager.getPrimaryEndpoint(chainId);

      if (!endpoint) {
        console.warn(`No provider endpoint available for ${name} (${chainId}). Skipping chain.`);
        index++;
        continue;
      }

      chains.push({
        id: chainId,
        name,
        wsUrl: endpoint.wsUrl,
        rpcUrl: endpoint.httpUrl,
      });

      console.log(`Using ${endpoint.provider} provider for ${name} (${chainId})`);
    } else {
      // No manual URL and no provider manager
      console.error(
        `Chain ${index} (${name}): No WS_URL provided and no provider manager configured`
      );
      break;
    }

    index++;
  }

  return chains;
}

/**
 * Get a chain by ID
 */
export function getChainById(chains: ChainConfig[], id: number): ChainConfig | undefined {
  return chains.find((chain) => chain.id === id);
}

/**
 * Validate chain configuration
 */
export function validateChainConfig(config: ChainConfig): boolean {
  if (!config.name || config.name.trim() === '') {
    console.error(`Chain ${config.id}: name is required`);
    return false;
  }

  if (!Number.isInteger(config.id) || config.id <= 0) {
    console.error(`Chain ${config.name}: invalid chain ID`);
    return false;
  }

  if (!config.wsUrl || !config.wsUrl.startsWith('wss://')) {
    console.error(`Chain ${config.name}: wsUrl must start with wss://`);
    return false;
  }

  return true;
}

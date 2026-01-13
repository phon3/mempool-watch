import type { ChainConfig } from '../mempool/types.js';

/**
 * Load chain configurations from environment variables.
 * Format: CHAIN_{N}_{PROPERTY} where N is 1, 2, 3, etc.
 * Required: NAME, ID, WS_URL
 * Optional: RPC_URL
 */
export function loadChainsFromEnv(): ChainConfig[] {
  const chains: ChainConfig[] = [];
  let index = 1;

  while (true) {
    const name = process.env[`CHAIN_${index}_NAME`];
    const id = process.env[`CHAIN_${index}_ID`];
    const wsUrl = process.env[`CHAIN_${index}_WS_URL`];
    const rpcUrl = process.env[`CHAIN_${index}_RPC_URL`];

    if (!name || !id || !wsUrl) {
      break;
    }

    chains.push({
      id: parseInt(id, 10),
      name,
      wsUrl,
      rpcUrl,
    });

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

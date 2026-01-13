import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadChainsFromEnv, validateChainConfig, getChainById } from './chains';
import type { ChainConfig } from '../mempool/types';

describe('loadChainsFromEnv', () => {
  beforeEach(() => {
    // Clear environment variables before each test
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('CHAIN_')) {
        delete process.env[key];
      }
    });
  });

  it('should load single chain configuration', () => {
    process.env.CHAIN_1_NAME = 'ethereum';
    process.env.CHAIN_1_ID = '1';
    process.env.CHAIN_1_WS_URL = 'wss://eth.example.com';

    const chains = loadChainsFromEnv();

    expect(chains).toHaveLength(1);
    expect(chains[0]).toEqual({
      id: 1,
      name: 'ethereum',
      wsUrl: 'wss://eth.example.com',
      rpcUrl: undefined,
    });
  });

  it('should load multiple chain configurations', () => {
    process.env.CHAIN_1_NAME = 'ethereum';
    process.env.CHAIN_1_ID = '1';
    process.env.CHAIN_1_WS_URL = 'wss://eth.example.com';

    process.env.CHAIN_2_NAME = 'base';
    process.env.CHAIN_2_ID = '8453';
    process.env.CHAIN_2_WS_URL = 'wss://base.example.com';
    process.env.CHAIN_2_RPC_URL = 'https://base.example.com';

    const chains = loadChainsFromEnv();

    expect(chains).toHaveLength(2);
    expect(chains[0].id).toBe(1);
    expect(chains[1].id).toBe(8453);
    expect(chains[1].rpcUrl).toBe('https://base.example.com');
  });

  it('should return empty array when no chains configured', () => {
    const chains = loadChainsFromEnv();
    expect(chains).toEqual([]);
  });

  it('should stop loading at first missing chain', () => {
    process.env.CHAIN_1_NAME = 'ethereum';
    process.env.CHAIN_1_ID = '1';
    process.env.CHAIN_1_WS_URL = 'wss://eth.example.com';

    // Gap in numbering - CHAIN_2 missing

    process.env.CHAIN_3_NAME = 'arbitrum';
    process.env.CHAIN_3_ID = '42161';
    process.env.CHAIN_3_WS_URL = 'wss://arb.example.com';

    const chains = loadChainsFromEnv();

    expect(chains).toHaveLength(1); // Should only load CHAIN_1
  });

  it('should handle missing required fields', () => {
    process.env.CHAIN_1_NAME = 'ethereum';
    process.env.CHAIN_1_ID = '1';
    // Missing WS_URL

    const chains = loadChainsFromEnv();
    expect(chains).toEqual([]);
  });
});

describe('getChainById', () => {
  const mockChains: ChainConfig[] = [
    { id: 1, name: 'ethereum', wsUrl: 'wss://eth.example.com' },
    { id: 8453, name: 'base', wsUrl: 'wss://base.example.com' },
    { id: 42161, name: 'arbitrum', wsUrl: 'wss://arb.example.com' },
  ];

  it('should find chain by ID', () => {
    const chain = getChainById(mockChains, 8453);
    expect(chain).toBeDefined();
    expect(chain?.name).toBe('base');
  });

  it('should return undefined for non-existent chain', () => {
    const chain = getChainById(mockChains, 999);
    expect(chain).toBeUndefined();
  });

  it('should return undefined for empty chain list', () => {
    const chain = getChainById([], 1);
    expect(chain).toBeUndefined();
  });
});

describe('validateChainConfig', () => {
  // Suppress console.error for validation tests
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should validate correct configuration', () => {
    const config: ChainConfig = {
      id: 1,
      name: 'ethereum',
      wsUrl: 'wss://eth.example.com',
    };

    expect(validateChainConfig(config)).toBe(true);
  });

  it('should reject empty name', () => {
    const config: ChainConfig = {
      id: 1,
      name: '',
      wsUrl: 'wss://eth.example.com',
    };

    expect(validateChainConfig(config)).toBe(false);
  });

  it('should reject whitespace-only name', () => {
    const config: ChainConfig = {
      id: 1,
      name: '   ',
      wsUrl: 'wss://eth.example.com',
    };

    expect(validateChainConfig(config)).toBe(false);
  });

  it('should reject invalid chain ID (negative)', () => {
    const config: ChainConfig = {
      id: -1,
      name: 'test',
      wsUrl: 'wss://test.example.com',
    };

    expect(validateChainConfig(config)).toBe(false);
  });

  it('should reject zero chain ID', () => {
    const config: ChainConfig = {
      id: 0,
      name: 'test',
      wsUrl: 'wss://test.example.com',
    };

    expect(validateChainConfig(config)).toBe(false);
  });

  it('should reject non-wss URL', () => {
    const config: ChainConfig = {
      id: 1,
      name: 'test',
      wsUrl: 'ws://insecure.example.com',
    };

    expect(validateChainConfig(config)).toBe(false);
  });

  it('should reject HTTP URL', () => {
    const config: ChainConfig = {
      id: 1,
      name: 'test',
      wsUrl: 'https://wrong-protocol.example.com',
    };

    expect(validateChainConfig(config)).toBe(false);
  });

  it('should accept configuration with optional rpcUrl', () => {
    const config: ChainConfig = {
      id: 1,
      name: 'ethereum',
      wsUrl: 'wss://eth.example.com',
      rpcUrl: 'https://eth.example.com',
    };

    expect(validateChainConfig(config)).toBe(true);
  });
});

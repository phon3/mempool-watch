import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProviderManager } from './manager';
import type { ProviderConfig } from './types';

describe('ProviderManager', () => {
    describe('constructor and validation', () => {
        it('should create manager with valid Alchemy config', () => {
            const config: ProviderConfig[] = [
                { provider: 'alchemy', apiKey: 'test-key' },
            ];

            expect(() => new ProviderManager(config)).not.toThrow();
        });

        it('should create manager with multiple providers', () => {
            const configs: ProviderConfig[] = [
                { provider: 'alchemy', apiKey: 'alchemy-key' },
                { provider: 'quicknode', apiKey: 'quicknode-key' },
            ];

            expect(() => new ProviderManager(configs)).not.toThrow();
        });

        it('should create manager with custom provider', () => {
            const config: ProviderConfig[] = [
                { provider: 'custom', customUrl: 'wss://custom.com/ws' },
            ];

            expect(() => new ProviderManager(config)).not.toThrow();
        });

        it('should throw error for unknown provider', () => {
            const config: ProviderConfig[] = [
                { provider: 'unknown' as any, apiKey: 'key' },
            ];

            expect(() => new ProviderManager(config)).toThrow(/Unknown provider/);
        });

        it('should throw error if custom provider missing customUrl', () => {
            const config: ProviderConfig[] = [{ provider: 'custom' }];

            expect(() => new ProviderManager(config)).toThrow(
                /Custom provider requires customUrl/
            );
        });

        it('should throw error if provider missing apiKey', () => {
            const config: ProviderConfig[] = [{ provider: 'alchemy' }];

            expect(() => new ProviderManager(config)).toThrow(/requires apiKey/);
        });
    });

    describe('getEndpoints', () => {
        it('should return Alchemy endpoint for Ethereum', () => {
            const manager = new ProviderManager([
                { provider: 'alchemy', apiKey: 'test-key' },
            ]);

            const endpoints = manager.getEndpoints(1);

            expect(endpoints).toHaveLength(1);
            expect(endpoints[0].wsUrl).toBe(
                'wss://eth-mainnet.g.alchemy.com/v2/test-key'
            );
            expect(endpoints[0].httpUrl).toBe(
                'https://eth-mainnet.g.alchemy.com/v2/test-key'
            );
            expect(endpoints[0].provider).toBe('alchemy');
        });

        it('should return multiple endpoints with failover', () => {
            const manager = new ProviderManager([
                { provider: 'alchemy', apiKey: 'alchemy-key' },
                { provider: 'quicknode', apiKey: 'quicknode-key' },
            ]);

            const endpoints = manager.getEndpoints(1);

            expect(endpoints).toHaveLength(2);
            expect(endpoints[0].provider).toBe('alchemy');
            expect(endpoints[1].provider).toBe('quicknode');
        });

        it('should skip providers that do not support chain', () => {
            const manager = new ProviderManager([
                { provider: 'infura', apiKey: 'infura-key' }, // Infura doesn't support Base
                { provider: 'alchemy', apiKey: 'alchemy-key' }, // Alchemy supports Base
            ]);

            const endpoints = manager.getEndpoints(8453); // Base

            expect(endpoints).toHaveLength(1);
            expect(endpoints[0].provider).toBe('alchemy');
        });

        it('should return custom provider endpoint', () => {
            const manager = new ProviderManager([
                { provider: 'custom', customUrl: 'wss://my-custom.com/ws' },
            ]);

            const endpoints = manager.getEndpoints(1);

            expect(endpoints).toHaveLength(1);
            expect(endpoints[0].wsUrl).toBe('wss://my-custom.com/ws');
            expect(endpoints[0].provider).toBe('custom');
        });

        it('should return empty array if no providers support chain', () => {
            const manager = new ProviderManager([
                { provider: 'infura', apiKey: 'test-key' },
            ]);

            const endpoints = manager.getEndpoints(99999);

            expect(endpoints).toHaveLength(0);
        });
    });

    describe('getPrimaryEndpoint', () => {
        it('should return first available endpoint', () => {
            const manager = new ProviderManager([
                { provider: 'alchemy', apiKey: 'test-key' },
            ]);

            const endpoint = manager.getPrimaryEndpoint(1);

            expect(endpoint).not.toBeNull();
            expect(endpoint?.provider).toBe('alchemy');
        });

        it('should return null if no providers support chain', () => {
            const manager = new ProviderManager([
                { provider: 'infura', apiKey: 'test-key' },
            ]);

            const endpoint = manager.getPrimaryEndpoint(99999);

            expect(endpoint).toBeNull();
        });
    });

    describe('getEndpointForProvider', () => {
        it('should return specific provider endpoint', () => {
            const manager = new ProviderManager([
                { provider: 'alchemy', apiKey: 'alchemy-key' },
                { provider: 'quicknode', apiKey: 'quicknode-key' },
            ]);

            const endpoint = manager.getEndpointForProvider(1, 'quicknode');

            expect(endpoint).not.toBeNull();
            expect(endpoint?.provider).toBe('quicknode');
        });

        it('should return null if provider not configured', () => {
            const manager = new ProviderManager([
                { provider: 'alchemy', apiKey: 'test-key' },
            ]);

            const endpoint = manager.getEndpointForProvider(1, 'infura');

            expect(endpoint).toBeNull();
        });

        it('should return null if provider does not support chain', () => {
            const manager = new ProviderManager([
                { provider: 'infura', apiKey: 'test-key' },
            ]);

            const endpoint = manager.getEndpointForProvider(8453, 'infura');

            expect(endpoint).toBeNull();
        });
    });

    describe('Helper methods', () => {
        it('should check if chain is supported', () => {
            const manager = new ProviderManager([
                { provider: 'alchemy', apiKey: 'test-key' },
            ]);

            expect(manager.isChainSupported(1)).toBe(true);
            expect(manager.isChainSupported(99999)).toBe(false);
        });

        it('should return configured providers', () => {
            const manager = new ProviderManager([
                { provider: 'alchemy', apiKey: 'key1' },
                { provider: 'quicknode', apiKey: 'key2' },
            ]);

            const providers = manager.getConfiguredProviders();

            expect(providers).toEqual(['alchemy', 'quicknode']);
        });
    });

    describe('loadProvidersFromEnv', () => {
        beforeEach(() => {
            // Clear environment
            vi.unstubAllEnvs();
        });

        it('should load single provider from env', async () => {
            vi.stubEnv('PROVIDER', 'alchemy');
            vi.stubEnv('ALCHEMY_API_KEY', 'test-key');

            const { loadProvidersFromEnv } = await import('./manager');
            const configs = loadProvidersFromEnv();

            expect(configs).toHaveLength(1);
            expect(configs[0].provider).toBe('alchemy');
            expect(configs[0].apiKey).toBe('test-key');
        });

        it('should load multiple providers from PROVIDERS env', async () => {
            vi.stubEnv('PROVIDERS', 'alchemy,quicknode');
            vi.stubEnv('ALCHEMY_API_KEY', 'alchemy-key');
            vi.stubEnv('QUICKNODE_API_KEY', 'quicknode-key');

            const { loadProvidersFromEnv } = await import('./manager');
            const configs = loadProvidersFromEnv();

            expect(configs).toHaveLength(2);
            expect(configs[0].provider).toBe('alchemy');
            expect(configs[1].provider).toBe('quicknode');
        });

        it('should return empty array if no providers configured', async () => {
            const { loadProvidersFromEnv } = await import('./manager');
            const configs = loadProvidersFromEnv();

            expect(configs).toHaveLength(0);
        });

        it('should skip provider if API key missing', async () => {
            vi.stubEnv('PROVIDERS', 'alchemy,quicknode');
            vi.stubEnv('ALCHEMY_API_KEY', 'alchemy-key');
            // QUICKNODE_API_KEY missing

            const { loadProvidersFromEnv } = await import('./manager');
            const configs = loadProvidersFromEnv();

            expect(configs).toHaveLength(1);
            expect(configs[0].provider).toBe('alchemy');
        });
    });
});

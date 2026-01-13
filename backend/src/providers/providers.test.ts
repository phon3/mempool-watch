import { describe, it, expect } from 'vitest';
import { AlchemyProvider } from './providers/alchemy';
import { QuickNodeProvider } from './providers/quicknode';
import { InfuraProvider } from './providers/infura';
import { AnkrProvider } from './providers/ankr';

describe('Provider Registry', () => {
    describe('AlchemyProvider', () => {
        it('should build correct WebSocket URL for Ethereum', () => {
            const url = AlchemyProvider.buildWebSocketUrl(1, 'test-api-key');
            expect(url).toBe('wss://eth-mainnet.g.alchemy.com/v2/test-api-key');
        });

        it('should build correct WebSocket URL for Base', () => {
            const url = AlchemyProvider.buildWebSocketUrl(8453, 'test-api-key');
            expect(url).toBe('wss://base-mainnet.g.alchemy.com/v2/test-api-key');
        });

        it('should build correct HTTP URL for Arbitrum', () => {
            const url = AlchemyProvider.buildHttpUrl(42161, 'test-api-key');
            expect(url).toBe('https://arb-mainnet.g.alchemy.com/v2/test-api-key');
        });

        it('should support Ethereum mainnet', () => {
            expect(AlchemyProvider.supportsChain(1)).toBe(true);
        });

        it('should support Base', () => {
            expect(AlchemyProvider.supportsChain(8453)).toBe(true);
        });

        it('should not support unknown chains', () => {
            expect(AlchemyProvider.supportsChain(99999)).toBe(false);
        });

        it('should throw error for unsupported chain', () => {
            expect(() => AlchemyProvider.buildWebSocketUrl(99999, 'key')).toThrow(
                /does not support/
            );
        });

        it('should have WebSocket and HTTP support', () => {
            expect(AlchemyProvider.supportsWebSocket).toBe(true);
            expect(AlchemyProvider.supportsHttp).toBe(true);
        });
    });

    describe('QuickNodeProvider', () => {
        it('should build correct WebSocket URL for Ethereum', () => {
            const url = QuickNodeProvider.buildWebSocketUrl(1, 'test-hash');
            expect(url).toBe('wss://ethereum-mainnet.quiknode.pro/test-hash/');
        });

        it('should build correct HTTP URL for BSC', () => {
            const url = QuickNodeProvider.buildHttpUrl(56, 'test-hash');
            expect(url).toBe('https://bsc.quiknode.pro/test-hash/');
        });

        it('should support Avalanche', () => {
            expect(QuickNodeProvider.supportsChain(43114)).toBe(true);
        });

        it('should throw error for unsupported chain', () => {
            expect(() => QuickNodeProvider.buildWebSocketUrl(99999, 'key')).toThrow(
                /does not support/
            );
        });
    });

    describe('InfuraProvider', () => {
        it('should build correct WebSocket URL for Ethereum', () => {
            const url = InfuraProvider.buildWebSocketUrl(1, 'test-project-id');
            expect(url).toBe('wss://mainnet.infura.io/ws/v3/test-project-id');
        });

        it('should build correct HTTP URL for Polygon', () => {
            const url = InfuraProvider.buildHttpUrl(137, 'test-project-id');
            expect(url).toBe('https://polygon-mainnet.infura.io/v3/test-project-id');
        });

        it('should support Optimism', () => {
            expect(InfuraProvider.supportsChain(10)).toBe(true);
        });

        it('should not support Base (Infura limitation)', () => {
            expect(InfuraProvider.supportsChain(8453)).toBe(false);
        });
    });

    describe('AnkrProvider', () => {
        it('should build correct WebSocket URL for Ethereum', () => {
            const url = AnkrProvider.buildWebSocketUrl(1, 'test-key');
            expect(url).toBe('wss://rpc.ankr.com/eth/ws/test-key');
        });

        it('should build correct HTTP URL for Fantom', () => {
            const url = AnkrProvider.buildHttpUrl(250, 'test-key');
            expect(url).toBe('https://rpc.ankr.com/fantom/test-key');
        });

        it('should support Base', () => {
            expect(AnkrProvider.supportsChain(8453)).toBe(true);
        });

        it('should support Fantom', () => {
            expect(AnkrProvider.supportsChain(250)).toBe(true);
        });
    });

    describe('Provider Metadata', () => {
        it('should have correct provider names', () => {
            expect(AlchemyProvider.name).toBe('Alchemy');
            expect(QuickNodeProvider.name).toBe('QuickNode');
            expect(InfuraProvider.name).toBe('Infura');
            expect(AnkrProvider.name).toBe('Ankr');
        });

        it('should all support WebSocket', () => {
            expect(AlchemyProvider.supportsWebSocket).toBe(true);
            expect(QuickNodeProvider.supportsWebSocket).toBe(true);
            expect(InfuraProvider.supportsWebSocket).toBe(true);
            expect(AnkrProvider.supportsWebSocket).toBe(true);
        });

        it('should all support HTTP', () => {
            expect(AlchemyProvider.supportsHttp).toBe(true);
            expect(QuickNodeProvider.supportsHttp).toBe(true);
            expect(InfuraProvider.supportsHttp).toBe(true);
            expect(AnkrProvider.supportsHttp).toBe(true);
        });
    });
});

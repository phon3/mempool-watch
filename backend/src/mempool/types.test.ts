import { describe, it, expect } from 'vitest';
import { viemTxToPendingTransaction } from './types';
import type { Transaction as ViemTransaction } from 'viem';

describe('viemTxToPendingTransaction', () => {
  it('should convert legacy transaction correctly', () => {
    const viemTx: Partial<ViemTransaction> = {
      hash: '0x123abc',
      from: '0xsender',
      to: '0xrecipient',
      value: 1000000000000000000n, // 1 ETH in wei
      gasPrice: 20000000000n, // 20 gwei
      gas: 21000n,
      input: '0x',
      nonce: 5,
      type: 'legacy',
    };

    const result = viemTxToPendingTransaction(viemTx as ViemTransaction, 1);

    expect(result).toMatchObject({
      hash: '0x123abc',
      chainId: 1,
      from: '0xsender',
      to: '0xrecipient',
      value: '1000000000000000000',
      gasPrice: '20000000000',
      gasLimit: '21000',
      input: '0x',
      nonce: 5,
      type: 0, // Legacy type
      status: 'pending',
    });
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should convert EIP-1559 transaction correctly', () => {
    const viemTx: Partial<ViemTransaction> = {
      hash: '0x456def',
      from: '0xsender2',
      to: '0xrecipient2',
      value: 500000000000000000n, // 0.5 ETH
      maxFeePerGas: 30000000000n, // 30 gwei
      maxPriorityFeePerGas: 2000000000n, // 2 gwei
      gas: 50000n,
      input: '0xabcdef',
      nonce: 10,
      type: 'eip1559',
    };

    const result = viemTxToPendingTransaction(viemTx as ViemTransaction, 8453); // Base chain

    expect(result).toMatchObject({
      hash: '0x456def',
      chainId: 8453,
      from: '0xsender2',
      to: '0xrecipient2',
      value: '500000000000000000',
      gasPrice: '30000000000', // Uses maxFeePerGas
      gasLimit: '50000',
      maxFeePerGas: '30000000000',
      maxPriorityFeePerGas: '2000000000',
      input: '0xabcdef',
      nonce: 10,
      type: 2, // EIP-1559 type
      status: 'pending',
    });
  });

  it('should handle null "to" address (contract creation)', () => {
    const viemTx: Partial<ViemTransaction> = {
      hash: '0x789ghi',
      from: '0xdeployer',
      to: null,
      value: 0n,
      gasPrice: 25000000000n,
      gas: 500000n,
      input: '0x608060405234801561001057600080fd5b50',
      nonce: 0,
      type: 'legacy',
    };

    const result = viemTxToPendingTransaction(viemTx as ViemTransaction, 1);

    expect(result.to).toBeNull();
    expect(result.value).toBe('0');
  });

  it('should handle missing optional fields gracefully', () => {
    const viemTx: Partial<ViemTransaction> = {
      hash: '0xabc123',
      from: '0xuser',
      to: '0xcontract',
      value: 0n,
      gasPrice: 10000000000n,
      gas: 100000n,
      input: '0x',
      nonce: 1,
      type: 'legacy',
    };

    const result = viemTxToPendingTransaction(viemTx as ViemTransaction, 1);

    expect(result.maxFeePerGas).toBeUndefined();
    expect(result.maxPriorityFeePerGas).toBeUndefined();
  });

  it('should use maxFeePerGas as gasPrice fallback when gasPrice is missing', () => {
    const viemTx: Partial<ViemTransaction> = {
      hash: '0xfallback',
      from: '0xuser',
      to: '0xcontract',
      value: 0n,
      maxFeePerGas: 15000000000n,
      maxPriorityFeePerGas: 1500000000n,
      gas: 75000n,
      input: '0x',
      nonce: 3,
      type: 'eip1559',
    };

    const result = viemTxToPendingTransaction(viemTx as ViemTransaction, 42161); // Arbitrum

    expect(result.gasPrice).toBe('15000000000');
  });
});

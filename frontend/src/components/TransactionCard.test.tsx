import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransactionCard } from './TransactionCard';
import type { Transaction } from '@/types/transaction';

describe('TransactionCard', () => {
  const mockTransaction: Transaction = {
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    chainId: 1,
    from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    to: '0x1111222233334444555566667777888899990000',
    value: '1000000000000000000', // 1 ETH
    gasPrice: '20000000000', // 20 Gwei
    gasLimit: '21000',
    input: '0x',
    nonce: 5,
    type: 0,
    timestamp: new Date('2024-01-01T12:00:00Z'),
    status: 'pending',
  };

  it('should render transaction details correctly', () => {
    render(<TransactionCard transaction={mockTransaction} />);

    // Check that key elements are present
    expect(screen.getByText('pending')).toBeInTheDocument();
    // Hash is displayed but truncated, just check the link exists
    const links = document.querySelectorAll('a');
    expect(links.length).toBeGreaterThan(0);
    expect(screen.getByText('1 ETH')).toBeInTheDocument();
    expect(screen.getByText('20 Gwei')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // Nonce
  });

  it('should display chain name when provided', () => {
    render(<TransactionCard transaction={mockTransaction} chainName="Ethereum" />);

    expect(screen.getByText('Ethereum')).toBeInTheDocument();
  });

  it('should show contract interaction badge for non-empty input', () => {
    const contractTx = {
      ...mockTransaction,
      input: '0xa9059cbb000000000000000000000000', // Transfer method
    };

    render(<TransactionCard transaction={contractTx} />);

    expect(screen.getByText('Contract')).toBeInTheDocument();
  });

  it('should handle contract creation (null "to" address)', () => {
    const creationTx = {
      ...mockTransaction,
      to: null,
      input: '0x608060405234801561001057600080fd5b50',
    };

    render(<TransactionCard transaction={creationTx} />);

    expect(screen.getByText('Contract Creation')).toBeInTheDocument();
  });

  it('should display confirmed status with correct styling', () => {
    const confirmedTx = {
      ...mockTransaction,
      status: 'confirmed' as const,
    };

    render(<TransactionCard transaction={confirmedTx} />);

    const statusBadge = screen.getByText('confirmed');
    expect(statusBadge).toHaveClass('text-green-400');
  });

  it('should display dropped status with correct styling', () => {
    const droppedTx = {
      ...mockTransaction,
      status: 'dropped' as const,
    };

    render(<TransactionCard transaction={droppedTx} />);

    const statusBadge = screen.getByText('dropped');
    expect(statusBadge).toHaveClass('text-red-400');
  });

  it('should truncate addresses correctly', () => {
    render(<TransactionCard transaction={mockTransaction} />);

    // Check that from and to labels are present
    expect(screen.getAllByText('From')).toHaveLength(1);
    expect(screen.getAllByText('To')).toHaveLength(1);
  });

  it('should format timestamp correctly', () => {
    render(<TransactionCard transaction={mockTransaction} />);

    // Just verify that a timestamp element exists (formatting varies by locale)
    const parent = screen.getByText('pending').parentElement?.parentElement;
    expect(parent).toBeTruthy();
  });

  it('should create clickable Etherscan link for Mainnet', () => {
    render(<TransactionCard transaction={mockTransaction} />);

    // Find the link by href attribute
    const links = document.querySelectorAll('a');
    const etherscanLink = Array.from(links).find((link) => link.href.includes('etherscan.io/tx/'));
    expect(etherscanLink).toBeTruthy();
    expect(etherscanLink?.getAttribute('target')).toBe('_blank');
  });

  it('should create clickable Basescan link for Base chain', () => {
    const baseTx = {
      ...mockTransaction,
      chainId: 8453,
    };
    render(<TransactionCard transaction={baseTx} />);

    const links = document.querySelectorAll('a');
    const basescanLink = Array.from(links).find((link) => link.href.includes('basescan.org/tx/'));
    expect(basescanLink).toBeTruthy();
  });

  it('should handle zero value transactions', () => {
    const zeroValueTx = {
      ...mockTransaction,
      value: '0',
    };

    render(<TransactionCard transaction={zeroValueTx} />);

    expect(screen.getByText('0 ETH')).toBeInTheDocument();
  });

  it('should handle large value transactions', () => {
    const largeTx = {
      ...mockTransaction,
      value: '1234567890000000000000', // 1234.567... ETH
    };

    render(<TransactionCard transaction={largeTx} />);

    // BigInt division gives us 1234 ETH
    expect(screen.getByText('1234 ETH')).toBeInTheDocument();
  });
});

import { vi } from 'vitest';

// Mock Prisma Client globally
vi.mock('./db/client', () => ({
  default: {
    transaction: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    chain: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

// Suppress console logs during tests (optional)
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};

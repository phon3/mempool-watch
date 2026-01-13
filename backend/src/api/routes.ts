import { Router, type Request, type Response } from 'express';
import prisma from '../db/client.js';
import type { ChainConfig } from '../mempool/types.js';

export function createApiRouter(chains: ChainConfig[]): Router {
  const router = Router();

  /**
   * GET /api/transactions
   * Get paginated transactions with optional filters
   */
  router.get('/transactions', async (req: Request, res: Response) => {
    try {
      const {
        chainId,
        from,
        to,
        status,
        limit = '50',
        offset = '0',
        orderBy = 'timestamp',
        order = 'desc',
      } = req.query;

      const where: Record<string, unknown> = {};

      if (chainId) {
        where.chainId = parseInt(chainId as string, 10);
      }
      if (from) {
        where.from = { contains: (from as string).toLowerCase(), mode: 'insensitive' };
      }
      if (to) {
        where.to = { contains: (to as string).toLowerCase(), mode: 'insensitive' };
      }
      if (status) {
        where.status = status as string;
      }

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          take: Math.min(parseInt(limit as string, 10), 100),
          skip: parseInt(offset as string, 10),
          orderBy: { [orderBy as string]: order },
        }),
        prisma.transaction.count({ where }),
      ]);

      res.json({
        transactions,
        pagination: {
          total,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
          hasMore: parseInt(offset as string, 10) + transactions.length < total,
        },
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  /**
   * GET /api/transactions/:hash
   * Get a single transaction by hash
   */
  router.get('/transactions/:hash', async (req: Request, res: Response) => {
    try {
      const { hash } = req.params;

      const transaction = await prisma.transaction.findUnique({
        where: { hash: hash as string },
      });

      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      res.json(transaction);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({ error: 'Failed to fetch transaction' });
    }
  });

  /**
   * GET /api/stats
   * Get aggregated statistics
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const { chainId } = req.query;

      const where: Record<string, unknown> = {};
      if (chainId) {
        where.chainId = parseInt(chainId as string, 10);
      }

      // Get counts by status
      const statusCounts = await prisma.transaction.groupBy({
        by: ['status'],
        where,
        _count: true,
      });

      // Get counts by chain
      const chainCounts = await prisma.transaction.groupBy({
        by: ['chainId'],
        where,
        _count: true,
      });

      // Get top senders (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const topSenders = await prisma.transaction.groupBy({
        by: ['from'],
        where: {
          ...where,
          timestamp: { gte: oneHourAgo },
        },
        _count: true,
        orderBy: { _count: { from: 'desc' } },
        take: 10,
      });

      // Get recent transaction count (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentCount = await prisma.transaction.count({
        where: {
          ...where,
          timestamp: { gte: fiveMinutesAgo },
        },
      });

      res.json({
        total: statusCounts.reduce((sum, s) => sum + s._count, 0),
        byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
        byChain: Object.fromEntries(chainCounts.map((c) => [c.chainId, c._count])),
        topSenders: topSenders.map((s) => ({
          address: s.from,
          count: s._count,
        })),
        recentCount,
        txPerMinute: Math.round(recentCount / 5),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  /**
   * GET /api/chains
   * Get configured chains
   */
  router.get('/chains', (_req: Request, res: Response) => {
    res.json(
      chains.map((chain) => ({
        id: chain.id,
        name: chain.name,
        active: true,
      }))
    );
  });

  /**
   * GET /api/health
   * Health check endpoint
   */
  router.get('/health', async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'unhealthy', error: 'Database connection failed' });
    }
  });

  return router;
}

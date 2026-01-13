import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { loadChainsFromEnv, validateChainConfig } from './config/chains.js';
import { MempoolWatcher } from './mempool/watcher.js';
import { TransactionBroadcaster } from './websocket/server.js';
import { createApiRouter } from './api/routes.js';
import { loadProvidersFromEnv, ProviderManager } from './providers/manager.js';
import prisma from './db/client.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function main() {
  console.log('Starting Mempool Watcher Backend...');

  // Load provider configurations (if any)
  const providerConfigs = loadProvidersFromEnv();
  let providerManager: ProviderManager | undefined;

  if (providerConfigs.length > 0) {
    providerManager = new ProviderManager(providerConfigs);
    console.log(
      `Loaded ${providerConfigs.length} provider(s): ${providerManager.getConfiguredProviders().join(', ')}`
    );
  }

  // Load and validate chain configurations
  const chains = loadChainsFromEnv(providerManager);

  if (chains.length === 0) {
    console.error(
      'No chains configured. Please set CHAIN_1_NAME, CHAIN_1_ID and either:\n' +
        '  - CHAIN_1_WS_URL (manual configuration), or\n' +
        '  - PROVIDER=alchemy and ALCHEMY_API_KEY (automatic configuration)'
    );
    process.exit(1);
  }

  for (const chain of chains) {
    if (!validateChainConfig(chain)) {
      console.error(`Invalid configuration for chain: ${chain.name}`);
      process.exit(1);
    }
  }

  console.log(`Configured chains: ${chains.map((c) => c.name).join(', ')}`);

  // Sync chains to database
  for (const chain of chains) {
    await prisma.chain.upsert({
      where: { id: chain.id },
      update: { name: chain.name, wsUrl: chain.wsUrl, rpcUrl: chain.rpcUrl, active: true },
      create: {
        id: chain.id,
        name: chain.name,
        wsUrl: chain.wsUrl,
        rpcUrl: chain.rpcUrl,
        active: true,
      },
    });
  }

  // Create Express app
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Create HTTP server (shared for Express and WebSocket)
  const server = createServer(app);

  // Create WebSocket broadcaster
  const broadcaster = new TransactionBroadcaster(server);

  // Create mempool watcher
  const watcher = new MempoolWatcher(chains);

  // Connect watcher events to broadcaster
  watcher.on('transaction', (tx) => {
    broadcaster.broadcast(tx);
  });

  watcher.on('connected', (chainId) => {
    broadcaster.broadcastChainStatus(chainId, 'connected');
  });

  watcher.on('disconnected', (chainId) => {
    broadcaster.broadcastChainStatus(chainId, 'disconnected');
  });

  watcher.on('error', (error, chainId) => {
    console.error(`Chain ${chainId} error:`, error.message);
  });

  // Mount API routes
  app.use('/api', createApiRouter(chains));

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      name: 'Mempool Watcher API',
      version: '1.0.0',
      chains: chains.map((c) => ({ id: c.id, name: c.name })),
      endpoints: {
        transactions: 'GET /api/transactions',
        transaction: 'GET /api/transactions/:hash',
        stats: 'GET /api/stats',
        chains: 'GET /api/chains',
        health: 'GET /api/health',
        websocket: `ws://localhost:${PORT}`,
      },
    });
  });

  // Start server
  server.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
  });

  // Start watching mempool
  await watcher.start();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    await watcher.stop();
    await prisma.$disconnect();
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

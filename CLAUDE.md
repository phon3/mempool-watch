# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EVM Mempool Watcher - a real-time blockchain mempool monitoring application with:
- TypeScript backend using viem for mempool subscription
- React frontend with live transaction feed
- PostgreSQL for persistence
- Python scripts for analysis

## Research References

- [BlockJayn/evm-mempool-scanner](https://github.com/BlockJayn/evm-mempool-scanner) - Clean TypeScript mempool scanner (Recommended for research)
- [duoxehyon/gasflow-server](https://github.com/duoxehyon/gasflow-server) - High-performance Go-based mempool and gas streaming server

## Build and Run Commands

### Backend (TypeScript)

```bash
cd backend
npm install
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Run migrations
npm run dev              # Development with hot reload
npm run build            # TypeScript compilation
npm run lint             # ESLint
```

### Frontend (React)

```bash
cd frontend
npm install
npm run dev      # Vite dev server on :5173
npm run build    # Production build
```

### Database (PostgreSQL)

```bash
docker-compose up -d     # Start PostgreSQL
docker-compose down      # Stop
```

### Python Analysis

```bash
cd analysis
pip install -r requirements.txt
python analyze.py --hours 24 --report full
```

## Architecture

### Backend (`backend/src/`)

- `index.ts` - Express + WebSocket server entry point
- `mempool/watcher.ts` - viem-based mempool subscription with auto-reconnect
- `mempool/types.ts` - Transaction types and conversion utilities
- `config/chains.ts` - Loads chain config from environment variables
- `api/routes.ts` - REST endpoints for transactions, stats, chains
- `websocket/server.ts` - Broadcasts transactions to connected clients
- `db/client.ts` - Prisma client singleton

Key pattern: `MempoolWatcher` is an EventEmitter that emits 'transaction', 'connected', 'disconnected', and 'error' events.

### Frontend (`frontend/src/`)

- `hooks/useWebSocket.ts` - WebSocket connection with auto-reconnect
- `hooks/useTransactions.ts` - Transaction state management and API calls
- `components/TransactionList.tsx` - Main transaction display
- `components/TransactionCard.tsx` - Individual transaction card
- `components/ChainSelector.tsx` - Chain filter buttons
- `components/StatsPanel.tsx` - Statistics display
- `components/FilterBar.tsx` - Search/filter controls

### Database Schema (Prisma)

```prisma
model Transaction {
  hash, chainId, from, to, value, gasPrice, gasLimit,
  maxFeePerGas, maxPriorityFeePerGas, input, nonce, type,
  timestamp, status
}

model Chain {
  id, name, wsUrl, rpcUrl, active
}
```

## Configuration Pattern

All sensitive configuration uses environment variables:

```bash
# backend/.env
DATABASE_URL=postgresql://...
CHAIN_1_NAME=ethereum
CHAIN_1_ID=1
CHAIN_1_WS_URL=wss://...

# frontend/.env
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
```

Chain configuration is numbered: `CHAIN_1_*`, `CHAIN_2_*`, etc.

## Key Libraries

- **viem** - Ethereum library for mempool subscription
- **Prisma** - Database ORM
- **Express** - REST API
- **ws** - WebSocket server
- **React** - Frontend
- **TailwindCSS** - Styling
- **pandas** - Python data analysis

## Testing

### Backend Tests

```bash
cd backend
npm test              # Run tests in watch mode
npm run test:ui       # Open Vitest UI in browser
npm run test:coverage # Generate coverage report
```

### Frontend Tests

```bash
cd frontend
npm test              # Run tests in watch mode
npm run test:ui       # Open Vitest UI in browser
npm run test:coverage # Generate coverage report
```

### Coverage Requirements

- Minimum 70% line coverage for new PRs
- Critical paths (transaction handling, API routes, WebSocket) require >90%
- Tests are mandatory for all new features and bug fixes

### Test Structure

- **Backend**: Tests co-located with source (`*.test.ts` or `*.spec.ts`)
  - Unit tests for watcher, types, config
  - Integration tests for API endpoints
  - Mock Prisma and viem for isolation
- **Frontend**: Tests co-located with components (`*.test.tsx`)
  - Component tests with React Testing Library
  - Hook tests with custom mocks
  - WebSocket integration tests with MSW

## Code Formatting

```bash
# Auto-format all code
npm run format        # Backend or frontend

# Check formatting without changes
npm run format:check
```

Project uses Prettier with:
- Single quotes, semicolons
- 2-space indentation
- 100 character line width
- Trailing commas (ES5 style)

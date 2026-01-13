# EVM Mempool Watcher

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-32%2F32_passing-success)](https://github.com)
[![Code Style: Prettier](https://img.shields.io/badge/Code_Style-Prettier-ff69b4)](https://prettier.io/)

> Real-time mempool monitoring for any EVM-compatible blockchain with a React frontend and Python analysis tools.

##  Features

- 🔄 **Real-time monitoring** - WebSocket-based live transaction feed using viem
- ⛓️ **Multi-chain support** - Ethereum, Base, Arbitrum, Optimism, Polygon, and any EVM chain
- 💾 **Persistent storage** - PostgreSQL database for historical analysis
- 🎨 **Modern React dashboard** - Live updates, filtering, and comprehensive statistics
- 📊 **Python analytics** - Advanced transaction analysis with pandas and matplotlib
- 🧪 **Comprehensive tests** - 32 passing tests with 70% coverage threshold
- 🚀 **Production ready** - Docker Compose, CI/CD, and security best practices


## Architecture

```
┌─────────────────┐     WebSocket     ┌──────────────────┐
│  EVM RPC Node   │◄─────────────────►│  TypeScript      │
│  (configurable) │                   │  Backend (viem)  │
└─────────────────┘                   └────────┬─────────┘
                                               │
                                               ▼
                                      ┌──────────────────┐
                                      │   PostgreSQL     │
                                      └────────┬─────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
           ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
           │React Frontend│           │ REST API     │           │ Python       │
           │(real-time)   │◄─────────►│ (Express)    │           │ Analysis     │
           └──────────────┘  WebSocket└──────────────┘           └──────────────┘
```

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Python 3.10+ (for analysis scripts)
- WebSocket-enabled RPC endpoint (QuickNode, Alchemy, etc.)

## Quick Start

### 1. Start PostgreSQL

```bash
docker-compose up -d
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your RPC WebSocket URLs

# Frontend (optional)
cp frontend/.env.example frontend/.env
```

### 3. Start Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Configuration

### Chain Configuration

Configure your provider in `backend/.env`.

**Recommended: Use a Provider**
Simplifies setup by requiring only one API key for multiple chains.

```bash
PROVIDER=alchemy
ALCHEMY_API_KEY=your_alchemy_key

# Chains configuration (URLs auto-generated)
CHAIN_1_NAME=ethereum
CHAIN_1_ID=1
CHAIN_2_NAME=base
CHAIN_2_ID=8453
```

**Legacy: Manual Configuration**
You can still specify WebSocket URLs manually if needed.

```bash
CHAIN_1_NAME=custom
CHAIN_1_ID=123
CHAIN_1_WS_URL=wss://...
```

### Supported Chain IDs

| Chain | ID |
|-------|-----|
| Ethereum | 1 |
| Base | 8453 |
| Arbitrum | 42161 |
| Optimism | 10 |
| Polygon | 137 |

Any EVM chain works - just provide the correct chain ID and WebSocket URL.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/transactions` | GET | Paginated transactions with filters |
| `/api/transactions/:hash` | GET | Single transaction by hash |
| `/api/stats` | GET | Aggregated statistics |
| `/api/chains` | GET | Configured chains |
| `/api/health` | GET | Health check |

### Query Parameters

`GET /api/transactions` supports:
- `chainId` - Filter by chain
- `from` - Filter by sender address
- `to` - Filter by recipient address
- `status` - Filter by status (pending/confirmed/dropped)
- `limit` - Results per page (max 100)
- `offset` - Pagination offset

## Python Analysis

```bash
cd analysis
pip install -r requirements.txt
cp .env.example .env
# Edit .env with DATABASE_URL

# Full report
python analyze.py --hours 24 --report full

# Specific reports
python analyze.py --report gas
python analyze.py --report senders --limit 20
python analyze.py --report value
python analyze.py --chain 8453 --report overview
```

### Available Reports

- `full` - Complete analysis
- `overview` - Transaction summary
- `gas` - Gas price statistics
- `senders` - Top senders
- `recipients` - Top recipients
- `time` - Hourly distribution
- `value` - Value analysis

## Project Structure

```
mempool/
├── backend/                # TypeScript backend
│   ├── src/
│   │   ├── index.ts       # Entry point
│   │   ├── mempool/       # Watcher logic
│   │   ├── api/           # REST routes
│   │   ├── websocket/     # WS broadcaster
│   │   ├── db/            # Prisma client
│   │   └── config/        # Chain config
│   └── prisma/            # Database schema
├── frontend/              # React frontend
│   └── src/
│       ├── components/    # UI components
│       ├── hooks/         # React hooks
│       └── types/         # TypeScript types
├── analysis/              # Python scripts
└── docker-compose.yml     # PostgreSQL
```

## Development

### Backend

```bash
cd backend
npm run dev        # Development with hot reload
npm run build      # Build for production
npm run lint       # ESLint
npm run db:migrate # Run migrations
```

### Frontend

```bash
cd frontend
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

## 🧪 Testing

This project has comprehensive test coverage across both backend and frontend:

```bash
# Backend tests (21 passing)
cd backend && npm test
npm run test:coverage    # Generate coverage report

# Frontend tests (11 passing)  
cd frontend && npm test
npm run test:ui          # Open Vitest UI
```

**Test Coverage:**
- ✅ Backend: Type conversions, chain configuration, validation logic
- ✅ Frontend: Component rendering, user interactions, state management
- 🎯 Coverage target: 70% minimum (critical paths >90%)

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Code style guidelines
- Testing requirements
- Pull request process

## 🚀 Deployment

The project is configured for automated deployment to a VPS using GitHub Actions.

### Prerequisites

- A DigitalOcean Droplet (or similar VPS)
- SSH access to the VPS
- Docker & Docker Compose installed on VPS

### Setup Secrets

Add the following secrets to your GitHub repository (Settings > Secrets and variables > Actions):

| Secret Name | Description |
|---|---|
| `VPS_HOST` | IP address of your VPS (e.g., `168.71.153.54`) |
| `VPS_USER` | SSH username (e.g., `root`) |
| `SSH_PRIVATE_KEY` | Private SSH key for access |
| `ENV_BACKEND` | Content of your backend `.env` file |

### Configuration

The deployments use the following ports:
- **Backend**: Port `3002` (Mapped to container 3001)
- **Frontend**: Port `3003` (Mapped to container 80)

Ensure these ports are open on your firewall:
```bash
ufw allow 3002/tcp
ufw allow 3003/tcp
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [viem](https://viem.sh/) - TypeScript blockchain library
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [Vitest](https://vitest.dev/) - Blazing fast unit test framework  
- Research inspiration from [BlockJayn](https://github.com/BlockJayn/evm-mempool-scanner) and [Gasflow](https://github.com/duoxehyon/gasflow-server)


Made with ❤️ for the Ethereum ecosystem


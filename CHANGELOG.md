# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive test suite for backend and frontend
- GitHub Actions CI/CD workflows
- Code quality tools (ESLint, Prettier, pre-commit hooks)

## [1.0.0] - 2026-01-12

### Added
- Initial release of EVM Mempool Watcher
- Real-time mempool monitoring via WebSocket subscription using viem
- Multi-chain support with environment-based configuration
  - Ethereum Mainnet
  - Base
  - Arbitrum
  - Optimism
  - Polygon
  - Any EVM-compatible chain via custom configuration
- TypeScript backend with Express REST API
  - `/api/transactions` - Paginated transaction queries with filters
  - `/api/transactions/:hash` - Single transaction lookup
  - `/api/stats` - Real-time statistics and aggregations
  - `/api/chains` - List configured chains
  - `/api/health` - Database health check
- WebSocket server for real-time transaction broadcasting
  - Auto-reconnection support
  - Chain-specific subscription filtering
  - Ping/pong heartbeat mechanism
- PostgreSQL persistence layer with Prisma ORM
  - Transaction storage with full metadata
  - Chain configuration management
  - Efficient indexing for fast queries
- React frontend with modern UI
  - Live transaction feed with WebSocket updates
  - Multi-chain selector
  - Real-time statistics panel
  - Transaction search and filtering
  - Responsive design with TailwindCSS
  - Auto-reconnecting WebSocket connection
- Python analysis scripts
  - Transaction volume analysis
  - Gas price statistics
  - Top senders/recipients identification
  - Hourly distribution charts
  - Customizable time windows and reporting
- Docker Compose setup for PostgreSQL
- Comprehensive documentation
  - Detailed README with setup instructions
  - Architecture diagrams
  - API documentation
  - Configuration examples
  - Python analysis guide

### Technical Details
- Built with TypeScript 5.6 and Node.js 18+
- viem 2.21 for blockchain interactions
- React 18.3 with hooks-based architecture
- Prisma 5.22 for database management
- Express 4.21 for REST API
- Native WebSocket support (ws 8.18)
- Pandas for Python data analysis

[Unreleased]: https://github.com/YOUR_ORG/mempool/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/YOUR_ORG/mempool/releases/tag/v1.0.0

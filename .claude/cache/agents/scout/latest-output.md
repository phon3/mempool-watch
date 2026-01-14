# Infrastructure & Configuration Analysis
Generated: 2026-01-13

## Summary

Production-ready **EVM Mempool Watcher** with CI/CD, Docker, and Python analytics.

**Technologies:** TypeScript backend (viem + Express), React frontend (Vite), PostgreSQL + Prisma, Python analytics, Docker Compose, GitHub Actions

## CI/CD Pipeline

### deploy.yml
**Purpose:** Automated VPS deployment on main push

**Process:**
1. SSH to VPS (appleboy/ssh-action)
2. Clone to /opt/repos/mempool-watch (first run)
3. git reset --hard origin/main
4. Write backend/.env from secrets
5. docker compose up -d --build
6. docker system prune -f

**Secrets:** VPS_HOST, VPS_USER, SSH_PRIVATE_KEY, ENV_BACKEND

**Gotchas:** git reset --hard destroys local changes, auto-detects docker compose command

### test.yml
**Purpose:** Matrix testing on Node 18.x & 20.x

**Jobs:** Backend (21 tests), Frontend (11 tests), Build verification

**Features:** Codecov from Node 20.x only, npm ci, explicit lockfile paths

### lint.yml
**Purpose:** Format and quality checks (Prettier + ESLint)

## Docker

### docker-compose.yml
**Services:**
- postgres: postgres:16-alpine, mempool/mempool_password, health check
- backend: Port 3002:3002, depends on postgres, mounts .env
- frontend: Port 3003:80, depends on backend

### backend/Dockerfile
**Multi-stage:** Build (npm install, prisma generate, build, prune) + Production (copy dist)
**Exposes:** 3001 (mapped to 3002)
**Gotchas:** .env mounted not copied, requires openssl for Prisma

### frontend/Dockerfile
**Build + serve:** npm build → nginx:alpine
**Copies:** nginx.conf

### frontend/nginx.conf
**SPA routing:** try_files fallback
**API proxy:** /api/ → backend:3002
**Features:** WebSocket headers, Gzip

## Analysis Tools

### analyze.py
**Reports:** overview, gas, senders, recipients, time, value, full
**Usage:** python analyze.py --hours 24 --report full
**Dependencies:** psycopg2-binary, pandas, python-dotenv, tabulate

## Documentation

### README.md
Primary docs: Architecture, quick start, API endpoints, deployment
Testing: 32 tests, 70% coverage

### CONTRIBUTING.md
ESLint + Prettier, 70% coverage (90% critical), conventional commits

### CHANGELOG.md
v1.0.0 (2026-01-12): Initial release

### REFERENCES.md
Mempool guides, MEV research, related projects

## Root Config

### .gitignore
Excludes: .env, dist/, coverage/, node_modules/, research repos, AI artifacts

### .prettierrc
semi: true, singleQuote: true, tabWidth: 2, printWidth: 100

### LICENSE
MIT (2026)

### .claude/settings.json
Enabled plugins: cartographer

## Issue Templates

### bug_report.md
Fields: Description, reproduction, environment (OS, Node, chain, RPC), logs

### feature_request.md
Fields: Description, use case, solution, contribution willingness

## Architecture

### Deployment
GitHub Push → Actions → SSH to VPS → Git reset → Write .env → Docker up

### Dev vs Prod
| Aspect | Dev | Prod |
|--------|-----|------|
| Backend | 3001 | 3002 |
| Frontend | 5173 | 3003 |
| Build | npm dev | Docker |
| Env | Local | Secrets |

### Ports
| Port | Service | Access |
|------|---------|--------|
| 5432 | PostgreSQL | Internal |
| 3001 | Backend (container) | Internal |
| 3002 | Backend (host) | External |
| 80 | Frontend (container) | Internal |
| 3003 | Frontend (host) | External |
| 5173 | Vite dev | Dev only |

## Key Findings

### CI/CD
- 3 workflows: test, lint, deploy
- Matrix: Node 18.x, 20.x
- Automated VPS deployment
- Secrets-based .env

### Docker
- Multi-stage builds
- Health checks
- Runtime .env mount
- Docker network names

### Testing
- 32 tests (70% coverage)
- Vitest framework
- Mocked external deps

### Code Quality
- ESLint + Prettier
- 100 char width
- Conventional commits

## Critical Files

### Must Configure
1. backend/.env - RPC URLs, chain IDs
2. GitHub Secrets - VPS, SSH, ENV_BACKEND
3. analysis/.env - DATABASE_URL

### Auto-Generated
1. backend/dist/
2. frontend/dist/
3. node_modules/

## Important Commands



## Open Questions

1. How are RPC credentials rotated?
2. Database migration process?
3. DATABASE_URL override in deployment?
4. WebSocket monitoring?
5. Deployment rollback process?
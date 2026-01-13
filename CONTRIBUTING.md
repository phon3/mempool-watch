# Contributing to EVM Mempool Watcher

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Docker & Docker Compose (for PostgreSQL)
- Python 3.10+ (for analysis scripts)
- An RPC provider with WebSocket access (QuickNode, Alchemy, Infura, etc.)

### Getting Started

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mempool.git
   cd mempool
   ```

2. **Install dependencies**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   cd ../analysis && pip install -r requirements.txt
   ```

3. **Set up the database**
   ```bash
   docker-compose up -d
   cd backend
   npx prisma generate
   npx prisma migrate dev
   ```

4. **Configure environment variables**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   # Edit .env files with your configuration
   ```

5. **Run the development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

## Code Style

### TypeScript/JavaScript

- We use **ESLint** for linting and **Prettier** for formatting
- Run `npm run lint` before committing
- Run `npm run format` to auto-format code
- Use **meaningful variable names** - avoid abbreviations
- Prefer `const` over `let`, avoid `var`
- Use async/await over Promise chains
- Keep functions focused and under 50 lines when possible

### Code Organization

- **Backend**: Organize by feature (mempool/, api/, websocket/, etc.)
- **Frontend**: Components in `components/`, shared hooks in `hooks/`
- **Types**: Define types in dedicated `types.ts` files
- **Tests**: Co-locate test files with source files (`*.test.ts` or `*.spec.ts`)

### Documentation

- Add **JSDoc comments** to all public APIs and exported functions
- Document **complex algorithms** with inline comments explaining "why" not "what"
- Update README.md if you add new features or change setup instructions
- Add examples to docstrings when helpful

## Testing Requirements

### All contributions must include tests

- **Backend**: Unit tests for new functions, integration tests for APIs
- **Frontend**: Component tests for UI, hook tests for custom hooks
- **Minimum coverage**: 70% line coverage overall, 90%+ for critical paths

### Running Tests

```bash
# Backend tests
cd backend
npm test              # Watch mode
npm run test:coverage # Generate coverage report

# Frontend tests
cd frontend
npm test              # Watch mode
npm run test:coverage # Generate coverage report
```

### Writing Tests

- Use **Vitest** as the test framework
- Mock external dependencies (viem, Prisma, WebSocket)
- Test error cases and edge conditions
- Use descriptive test names: `it('should reconnect after connection failure', ...)`

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, well-documented code
   - Add tests for new functionality
   - Ensure all tests pass
   - Run linter and fix any issues

3. **Commit your changes**
   - Use clear, descriptive commit messages
   - Follow conventional commits format when possible:
     - `feat: add gas price prediction API`
     - `fix: resolve WebSocket reconnection bug`
     - `docs: update README with new examples`
     - `test: add tests for transaction filtering`

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   - Open a Pull Request on GitHub
   - Fill out the PR template completely
   - Link any related issues

5. **Code Review**
   - Address reviewer feedback promptly
   - Keep discussions focused and professional
   - Update tests if implementation changes

6. **Merge**
   - PRs require at least one approval
   - All CI checks must pass
   - Squash-merge is preferred for clean history

## Issue Reporting

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, chain, RPC provider)
- Relevant logs or error messages

### Feature Requests

Include:
- Clear description of the feature
- Use case or problem it solves
- Proposed implementation (if you have ideas)
- Willingness to contribute implementation

## Project Structure

Understanding the codebase:

```
mempool/
├── backend/           # TypeScript backend (Express + viem)
│   ├── src/
│   │   ├── index.ts        # Entry point
│   │   ├── mempool/        # Transaction watcher
│   │   ├── api/            # REST routes
│   │   ├── websocket/      # WebSocket broadcaster
│   │   ├── db/             # Prisma client
│   │   └── config/         # Chain configuration
│   └── prisma/             # Database schema
├── frontend/          # React frontend (Vite + TypeScript)
│   └── src/
│       ├── components/     # React components
│       ├── hooks/          # Custom hooks
│       └── types/          # TypeScript types
└── analysis/          # Python analysis scripts
```

## Additional Resources

- [Project README](README.md) - Setup and usage instructions
- [CLAUDE.md](CLAUDE.md) - AI assistant guidance for the codebase
- [Viem Documentation](https://viem.sh/) - Ethereum library we use
- [Prisma Documentation](https://www.prisma.io/docs/) - Database ORM

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help create a welcoming environment for all contributors

## Questions?

Feel free to open a [GitHub Discussion](../../discussions) for questions about contributing!

---

Thank you for contributing to EVM Mempool Watcher! 🚀

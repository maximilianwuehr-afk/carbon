# Development Commands

## Prerequisites

- Node.js 22+
- pnpm 9+
- (Optional) Docker for deployment testing

## Quick Start

```bash
# Clone and install
cd carbon
pnpm install

# Start development servers
pnpm dev

# This runs:
# - API server on http://localhost:3000
# - Web app on http://localhost:5173
```

## Package Scripts

### Root

```bash
pnpm dev          # Start all apps in dev mode
pnpm build        # Build all packages and apps
pnpm lint         # Lint all packages
pnpm test         # Run all tests
pnpm clean        # Clean all build artifacts
pnpm format       # Format all files with Prettier
```

### @carbon/core

```bash
cd packages/core
pnpm dev          # Watch mode
pnpm build        # Build library
pnpm test         # Run tests
pnpm test:run     # Run tests once
```

### @carbon/api

```bash
cd apps/api
pnpm dev          # Start with hot reload
pnpm build        # Build for production
pnpm start        # Run production build
```

### @carbon/web

```bash
cd apps/web
pnpm dev          # Start Vite dev server
pnpm build        # Build for production
pnpm preview      # Preview production build
```

## Environment Setup

Create `.env.local` in the root:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# OpenAI
OPENAI_API_KEY=your_api_key

# App (defaults work for local dev)
VAULT_PATH=./data/vault
DATABASE_PATH=./data/carbon.db
SESSION_SECRET=dev-secret-change-in-production
PORT=3000
```

## Database

SQLite database is created automatically on first run.

```bash
# View database (requires sqlite3 CLI)
sqlite3 data/carbon.db

# Reset database
rm data/carbon.db
pnpm dev
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @carbon/core test

# Run tests in watch mode
pnpm --filter @carbon/core test -- --watch

# Run tests with coverage
pnpm --filter @carbon/core test -- --coverage
```

## Docker

```bash
# Build image
docker build -t carbon -f apps/api/Dockerfile .

# Run locally
docker run -p 3000:3000 -v $(pwd)/data:/data carbon

# Or use docker-compose
docker-compose up
```

## Deployment (Fly.io)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# First deployment
fly apps create carbon-notes
fly volumes create vault_data --region fra --size 1
fly secrets set GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=xxx OPENAI_API_KEY=xxx SESSION_SECRET=xxx
fly deploy

# Subsequent deployments
fly deploy

# View logs
fly logs

# SSH into machine
fly ssh console

# Open in browser
fly open
```

## Troubleshooting

### Port already in use

```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Database locked

This can happen if you have multiple processes. Stop all and restart:

```bash
pkill -f "tsx watch"
pnpm dev
```

### Rebuild dependencies

```bash
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

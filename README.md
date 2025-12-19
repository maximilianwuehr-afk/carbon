# Carbon

Local-first Markdown notes with sync and Google Workspace integration.

## Features

- **File-based vault**: Notes are real `.md` files on the filesystem
- **Real-time sync**: Automatic merge using diff-match-patch (3-way when possible)
- **Google Calendar**: View agenda, insert events into daily notes
- **Google Drive**: Search and insert file references
- **AI Chat**: Context-aware assistant with vault access
- **Wiki-links**: Obsidian-compatible `[[links]]` with backlinks

## Architecture

```
/carbon
├── apps/
│   ├── web/          # React + Vite frontend
│   └── api/          # Hono backend
├── packages/
│   └── core/         # Shared merge/sync/vault logic
└── docs/             # Architecture + API docs
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Deployment

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login and deploy
fly auth login
fly apps create carbon-notes
fly volumes create vault_data --region fra --size 1
fly deploy
```

## Environment Variables

Create `.env.local` in root:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# OpenAI
OPENAI_API_KEY=your_api_key

# App
VAULT_PATH=./data/vault
DATABASE_PATH=./data/carbon.db
SESSION_SECRET=your_session_secret
```

## License

MIT

# Carbon Architecture

## Overview

Carbon is a local-first Markdown notes application with sync capabilities and Google Workspace integration.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Clients                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │   Web App   │    │ macOS (TBD) │    │  iOS (TBD)  │                 │
│  │ React+Vite  │    │   Tauri     │    │ React Native│                 │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                 │
│         │                  │                  │                         │
│         └─────────────────┼──────────────────┘                         │
│                           │                                             │
│                    ┌──────▼──────┐                                      │
│                    │  REST API   │                                      │
│                    │   (Hono)    │                                      │
│                    └──────┬──────┘                                      │
│                           │                                             │
│         ┌─────────────────┼─────────────────┐                          │
│         │                 │                 │                          │
│   ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐                     │
│   │ Filesystem│    │  SQLite   │    │   MCP     │                     │
│   │   Vault   │    │  (Index)  │    │  Server   │                     │
│   └───────────┘    └───────────┘    └───────────┘                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Core Principles

### 1. File-Based Vault (Source of Truth)
- Notes are real `.md` files on the filesystem
- SQLite is ONLY for indexing (search, backlinks)
- If index is lost, rebuild from files

### 2. Local-First
- Client has full copy of data (IndexedDB)
- Works offline
- Sync happens in background

### 3. Conflict-Free Sync
- 3-way merge using diff-match-patch
- No conflict prompts (auto-merge)
- Keep alternate versions for manual review

## Package Structure

```
/carbon
├── packages/core          # Shared logic (merge, sync, vault, links)
├── apps/web              # React frontend
└── apps/api              # Hono backend
```

### @carbon/core

Platform-agnostic logic that can be used by web, desktop, and mobile clients:

- **merge/**: diff-match-patch based 3-way merge
- **sync/**: Sync state machine, cursors, hash computation
- **vault/**: Path utilities, frontmatter parsing, tree building
- **links/**: Wiki-link parsing, backlink indexing
- **schemas/**: Zod schemas for all entities

### @carbon/web

React + Vite frontend with:

- CodeMirror 6 for editing
- shadcn/ui components
- Zustand for state
- TanStack Query for data fetching
- Dexie for IndexedDB

### @carbon/api

Hono backend with:

- Filesystem-based vault operations
- SQLite for indexing
- Google OAuth integration
- OpenAI chat streaming

## Data Flow

### Sync Pull

```
Client                    Server
   │                         │
   │  POST /sync/pull        │
   │  {deviceId, cursor}     │
   │ ───────────────────────>│
   │                         │ Read files changed since cursor
   │                         │ Read revision history
   │  {notes, files, cursor} │
   │ <───────────────────────│
   │                         │
   │ Update IndexedDB        │
   │                         │
```

### Sync Push

```
Client                    Server
   │                         │
   │  POST /sync/push        │
   │  {deviceId, changes}    │
   │ ───────────────────────>│
   │                         │ For each change:
   │                         │   Read current file
   │                         │   3-way merge (if base available)
   │                         │   Write merged content
   │                         │   Update index
   │  {results, cursor}      │
   │ <───────────────────────│
   │                         │
```

## Merge Algorithm

### 3-Way Merge (Preferred)

When base revision is available:

1. Compute patches: base → client
2. Compute patches: base → server
3. Apply client patches to server content
4. If fails, apply server patches to client
5. If both fail, keep both versions

### 2-Way Merge (Fallback)

When no base revision:

1. Compute patches: server → client
2. Apply patches to server
3. Mark as potentially lossy

## Google Integration

### OAuth Flow

1. User clicks "Connect Google"
2. Redirect to Google OAuth (calendar.readonly, drive.readonly)
3. Store encrypted tokens in SQLite
4. Auto-refresh on expiry

### Calendar

- Fetch day's events for Daily Note
- Format as Markdown (time, title, attendees, meet link)
- Insert at cursor

### Drive

- Search/browse files
- Insert as Markdown link

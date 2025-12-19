# Architecture Decision Records

## ADR-001: File-Based Vault as Source of Truth

**Status:** Accepted

**Context:**
We need to store notes. Options are:
1. Database (Postgres/SQLite) as primary storage
2. Filesystem as primary storage, database for indexing

**Decision:**
Use filesystem as the source of truth. Notes are real `.md` files.

**Rationale:**
- Portable: Users can access notes outside the app
- Auditable: Standard tools work (git, grep, etc.)
- Familiar: Matches Obsidian mental model
- Recoverable: No proprietary format

**Consequences:**
- Need filesystem watcher for external changes
- Index rebuild required on startup
- Slightly slower for large vaults


## ADR-002: diff-match-patch for Merge

**Status:** Accepted

**Context:**
Need to merge concurrent edits from multiple devices.

**Decision:**
Use Google's diff-match-patch library with 3-way merge when base is available.

**Rationale:**
- Character-level diffs work well for text
- 3-way merge distinguishes additions from deletions
- Well-tested library
- Patch format is storable for debugging

**Consequences:**
- Need to store base revisions
- More complex than last-write-wins
- Merge quality depends on edit patterns


## ADR-003: SQLite for Indexing Only

**Status:** Accepted

**Context:**
Need fast search and backlink queries.

**Decision:**
Use SQLite for indexing with FTS5 for full-text search.

**Rationale:**
- Fast queries
- FTS5 is excellent for text search
- Embedded, no external dependencies
- Easy backup (single file)

**Consequences:**
- Index must be rebuilt if corrupted
- Slight duplication of metadata


## ADR-004: Hono for Backend

**Status:** Accepted

**Context:**
Need a TypeScript-native backend framework.

**Decision:**
Use Hono with Node.js server adapter.

**Rationale:**
- TypeScript-native
- Fast (claims faster than Express)
- Works with multiple runtimes (Node, Bun, Deno)
- Good middleware ecosystem

**Consequences:**
- Smaller community than Express
- Fewer tutorials/examples


## ADR-005: CodeMirror 6 for Editor

**Status:** Accepted

**Context:**
Need a Markdown editor with custom syntax support.

**Decision:**
Use CodeMirror 6 with Markdown language support.

**Rationale:**
- Excellent extension system
- Good performance with large files
- Can add wiki-link syntax
- Active development

**Consequences:**
- Text-first (not WYSIWYG)
- Need to build wiki-link decorations


## ADR-006: Single-User MVP

**Status:** Accepted

**Context:**
Building MVP quickly. Multi-user adds complexity.

**Decision:**
Single-user mode for MVP. One set of Google credentials.

**Rationale:**
- Faster to ship
- Simpler auth model
- Can add multi-user later

**Consequences:**
- Not suitable for shared deployments
- Must redesign auth for multi-user


## ADR-007: Fly.io Deployment

**Status:** Accepted

**Context:**
Need simple deployment with persistent storage.

**Decision:**
Deploy on Fly.io with Fly Volumes for vault storage.

**Rationale:**
- Simple Docker deployment
- Persistent volumes
- Good CLI (flyctl)
- Reasonable pricing

**Consequences:**
- Single region for MVP (data locality)
- Volume attached to single machine


## ADR-008: Cursor-Based Sync

**Status:** Accepted

**Context:**
Need incremental sync to avoid transferring entire vault.

**Decision:**
Use timestamp-based cursor for sync pagination.

**Rationale:**
- Simple to implement
- Easy to debug (human-readable)
- Works across time zones
- Efficient for incremental updates

**Consequences:**
- Requires consistent server time
- Clock skew can cause issues

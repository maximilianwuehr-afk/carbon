# AI Playbook

Guide for AI-assisted development on Carbon.

## Repository Structure

```
/carbon
├── packages/core/     # Shared logic - START HERE for understanding
├── apps/web/          # React frontend
├── apps/api/          # Hono backend
└── docs/              # This documentation
```

## Key Invariants

### 1. Filesystem is Source of Truth

```typescript
// CORRECT: Read from filesystem, update index
const markdown = await fs.readFile(path);
updateIndex(path, markdown);

// WRONG: Read from database, write to filesystem
const note = db.get(path);
await fs.writeFile(path, note.content);
```

### 2. All Paths Are Relative

```typescript
// CORRECT
const path = "Daily notes/2025-12-19.md";

// WRONG
const path = "/Users/max/vault/Daily notes/2025-12-19.md";
```

### 3. Wiki-Links Are Case-Insensitive

```typescript
// These all resolve to the same note
[[My Note]]
[[my note]]
[[MY NOTE]]
```

### 4. Revisions Are Content Hashes

```typescript
// Revision = SHA-256 of markdown content
const revision = await computeRevision(markdown);
// Same content = same revision
```

### 5. Merge Never Prompts

```typescript
// CORRECT: Auto-merge, keep alternate on conflict
const result = mergeMarkdown(client, server, base);
if (!result.clean) {
  await writeNote(conflictPath, client);
}

// WRONG: Prompt user
if (!result.clean) {
  promptUser("Resolve conflict...");
}
```

## Common Patterns

### Adding a New API Route

```typescript
// apps/api/src/routes/myfeature.ts
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

export const myfeatureRoutes = new Hono();

myfeatureRoutes.get('/', async (c) => {
  return c.json({ data: [] });
});

// Register in apps/api/src/app.ts
app.route('/myfeature', myfeatureRoutes);
```

### Adding a New Component

```typescript
// apps/web/src/components/ui/MyComponent.tsx
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  children: React.ReactNode;
}

export function MyComponent({ className, children }: Props) {
  return (
    <div className={cn("p-4 border rounded", className)}>
      {children}
    </div>
  );
}
```

### Adding a Schema

```typescript
// packages/core/src/schemas/myentity.ts
import { z } from 'zod';

export const MyEntitySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string().datetime(),
});

export type MyEntity = z.infer<typeof MyEntitySchema>;

// Export in packages/core/src/schemas/index.ts
export * from './myentity.js';
```

### Adding a Test

```typescript
// packages/core/src/mymodule/myfunction.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from './myfunction.js';

describe('myFunction', () => {
  it('does the expected thing', () => {
    expect(myFunction('input')).toBe('output');
  });
});
```

## Extending Safely

### Adding a Slash Command

1. Define command in `/apps/api/src/routes/chat.ts`
2. Add handler that calls appropriate service
3. Update `/chat/commands` endpoint

### Adding Google Integration

1. Add scope to OAuth request in `/apps/api/src/routes/auth.ts`
2. Create new route file for the API
3. Add token refresh handling (copy from calendar.ts)

### Adding New Note Type

1. Add template in `/data/vault/templates/`
2. Update path utilities in `/packages/core/src/vault/paths.ts`
3. Add UI for creating from template

## Code Quality Checklist

Before committing:

- [ ] Types are strict (no `any`)
- [ ] Zod schemas validate all external input
- [ ] Errors are handled (try/catch, error boundaries)
- [ ] New features have tests
- [ ] Comments explain "why", not "what"
- [ ] File paths are relative to vault root
- [ ] No hardcoded strings (use constants or config)

## Common Mistakes

### Wrong: Storing absolute paths

```typescript
// BAD
const notePath = "/Users/max/vault/notes/my-note.md";

// GOOD
const notePath = "notes/my-note.md";
```

### Wrong: Using database as source of truth

```typescript
// BAD
const note = db.getNoteByPath(path);
return note.content;

// GOOD
const content = await fs.readFile(join(vaultPath, path));
return content;
```

### Wrong: Blocking on sync

```typescript
// BAD
await syncAllNotes(); // Blocks UI
setNotes(localNotes);

// GOOD
setNotes(localNotes); // Show immediately
syncInBackground(); // Update when done
```

### Wrong: Mutating shared state

```typescript
// BAD
state.notes.push(newNote);

// GOOD
setState(prev => ({ ...prev, notes: [...prev.notes, newNote] }));
```

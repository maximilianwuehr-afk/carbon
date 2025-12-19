/**
 * Sync routes for pull/push operations.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getDb } from '../db/index.js';
import { readNote, writeNote, deleteNote, getNotesModifiedSince, listAllNotes } from '../services/vault.js';
import { mergeMarkdown, parseCursor, createCurrentCursor } from '@carbon/core';
import { randomUUID } from 'crypto';

const uuid = () => randomUUID();

export const syncRoutes = new Hono();

// Pull changes since cursor
const pullSchema = z.object({
  deviceId: z.string(),
  cursor: z.string().nullable(),
});

syncRoutes.post('/pull', zValidator('json', pullSchema), async (c) => {
  const { deviceId, cursor } = c.req.valid('json');
  const db = getDb();
  
  // Get modified notes since cursor
  const since = cursor ? parseCursor(cursor) : new Date(0);
  const modifiedPaths = await getNotesModifiedSince(since);
  
  // Read full note data
  const notes = [];
  for (const path of modifiedPaths.slice(0, 100)) { // Limit batch size
    const note = await readNote(path);
    if (note) {
      notes.push({
        id: uuid(),
        path: note.path,
        title: note.title,
        markdown: note.markdown,
        frontmatter: note.frontmatter,
        revision: note.revision,
        updatedAt: note.updatedAt,
        deviceId: 'server',
        baseRevision: null,
      });
    }
  }
  
  // Get deleted paths (from index but not filesystem)
  const allPaths = await listAllNotes();
  const allPathsSet = new Set(allPaths.map((p) => p.toLowerCase()));
  
  const indexedPaths = db
    .prepare('SELECT path FROM notes_index')
    .all()
    .map((row: { path: string }) => row.path);
  
  const deletedPaths = indexedPaths.filter((p) => !allPathsSet.has(p.toLowerCase()));
  
  // Update sync state
  const newCursor = createCurrentCursor();
  db.prepare(
    `INSERT INTO sync_state (device_id, cursor, last_sync_at)
     VALUES (?, ?, ?)
     ON CONFLICT(device_id) DO UPDATE SET
       cursor = excluded.cursor,
       last_sync_at = excluded.last_sync_at`
  ).run(deviceId, newCursor, new Date().toISOString());
  
  return c.json({
    notes,
    files: [],
    deletedPaths,
    cursor: newCursor,
    hasMore: modifiedPaths.length > 100,
  });
});

// Push local changes
const changeSchema = z.object({
  type: z.enum(['create', 'update', 'delete']),
  path: z.string(),
  markdown: z.string().optional(),
  revision: z.string().optional(),
  baseRevision: z.string().nullable().optional(),
  updatedAt: z.string(),
});

const pushSchema = z.object({
  deviceId: z.string(),
  changes: z.array(changeSchema),
});

syncRoutes.post('/push', zValidator('json', pushSchema), async (c) => {
  const { deviceId, changes } = c.req.valid('json');
  const db = getDb();
  const results = [];
  
  for (const change of changes) {
    if (change.type === 'delete') {
      await deleteNote(change.path);
      db.prepare('DELETE FROM notes_index WHERE path = ?').run(change.path);
      
      results.push({
        path: change.path,
        status: 'accepted' as const,
      });
      continue;
    }
    
    // For create/update, check for conflicts
    const serverNote = await readNote(change.path);
    
    if (!serverNote) {
      // No server version, accept client change
      if (change.markdown) {
        const result = await writeNote(change.path, change.markdown);
        results.push({
          path: change.path,
          status: 'accepted' as const,
          note: {
            id: uuid(),
            path: result.path,
            title: '', // Will be extracted
            markdown: change.markdown,
            revision: result.revision,
            updatedAt: result.updatedAt,
            deviceId,
            baseRevision: null,
          },
        });
      }
      continue;
    }
    
    // Server has a version - attempt merge
    if (!change.markdown) continue;
    
    // Get base revision for 3-way merge
    let baseContent: string | null = null;
    if (change.baseRevision) {
      const baseRow = db
        .prepare('SELECT content FROM revisions WHERE path = ? AND revision = ?')
        .get(change.path, change.baseRevision) as { content: string } | undefined;
      baseContent = baseRow?.content || null;
    }
    
    const mergeResult = mergeMarkdown(change.markdown, serverNote.markdown, baseContent);
    
    // Save merged content
    const writeResult = await writeNote(change.path, mergeResult.merged);
    
    // Store revision for future merges
    db.prepare(
      `INSERT OR REPLACE INTO revisions (path, revision, content, created_at)
       VALUES (?, ?, ?, ?)`
    ).run(change.path, writeResult.revision, mergeResult.merged, new Date().toISOString());
    
    // Clean up old revisions (keep last 10)
    db.prepare(
      `DELETE FROM revisions WHERE path = ? AND revision NOT IN (
         SELECT revision FROM revisions WHERE path = ? ORDER BY created_at DESC LIMIT 10
       )`
    ).run(change.path, change.path);
    
    if (mergeResult.clean) {
      results.push({
        path: change.path,
        status: 'merged' as const,
        note: {
          id: uuid(),
          path: writeResult.path,
          title: '',
          markdown: mergeResult.merged,
          revision: writeResult.revision,
          updatedAt: writeResult.updatedAt,
          deviceId: 'server',
          baseRevision: change.baseRevision || null,
        },
      });
    } else {
      // Conflict - save alternate version
      const conflictPath = change.path.replace(/\.md$/, '.conflict.md');
      await writeNote(conflictPath, change.markdown);
      
      results.push({
        path: change.path,
        status: 'conflict' as const,
        note: {
          id: uuid(),
          path: writeResult.path,
          title: '',
          markdown: mergeResult.merged,
          revision: writeResult.revision,
          updatedAt: writeResult.updatedAt,
          deviceId: 'server',
          baseRevision: change.baseRevision || null,
        },
        conflictPath,
      });
    }
  }
  
  const newCursor = createCurrentCursor();
  
  return c.json({
    results,
    cursor: newCursor,
  });
});

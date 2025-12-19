/**
 * Notes CRUD routes.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { readNote, writeNote, deleteNote, listAllNotes, getFolderTree } from '../services/vault.js';
import { getDb } from '../db/index.js';
import { extractTitle, parseFrontmatter, getLinkedPaths } from '@carbon/core';
import { randomUUID } from 'crypto';

const uuid = () => randomUUID();

export const notesRoutes = new Hono();

// List all notes
notesRoutes.get('/', async (c) => {
  const paths = await listAllNotes();
  const notes = [];
  
  for (const path of paths) {
    const note = await readNote(path);
    if (note) {
      notes.push({
        id: uuid(), // TODO: Generate stable IDs
        path: note.path,
        title: note.title,
        updatedAt: note.updatedAt,
      });
    }
  }
  
  return c.json({ notes });
});

// Get folder tree
notesRoutes.get('/tree', async (c) => {
  const tree = await getFolderTree();
  return c.json({ tree });
});

// Search notes
notesRoutes.get('/search', zValidator('query', z.object({ q: z.string() })), async (c) => {
  const { q } = c.req.valid('query');
  const db = getDb();
  
  const results = db
    .prepare(
      `SELECT path, title, snippet(notes_fts, 2, '<mark>', '</mark>', '...', 32) as snippet
       FROM notes_fts
       WHERE notes_fts MATCH ?
       ORDER BY rank
       LIMIT 50`
    )
    .all(q);
  
  return c.json({ results });
});

// Get backlinks for a note
notesRoutes.get('/backlinks/:path{.+}', async (c) => {
  const path = c.req.param('path');
  const db = getDb();
  
  const backlinks = db
    .prepare(
      `SELECT source_path as path FROM backlinks WHERE target_path = ? OR target_path = ?`
    )
    .all(path, path.replace(/\.md$/, ''));
  
  return c.json({ backlinks });
});

// Get a single note
notesRoutes.get('/:path{.+}', async (c) => {
  const path = c.req.param('path');
  const note = await readNote(path);
  
  if (!note) {
    return c.json({ error: 'Note not found' }, 404);
  }
  
  return c.json({ note });
});

// Create or update a note
const upsertSchema = z.object({
  markdown: z.string(),
  baseRevision: z.string().nullable().optional(),
});

notesRoutes.put(
  '/:path{.+}',
  zValidator('json', upsertSchema),
  async (c) => {
    try {
      const path = c.req.param('path');
      const { markdown, baseRevision } = c.req.valid('json');
      
      // Write to filesystem
      const result = await writeNote(path, markdown);
      
      // Update index
      const db = getDb();
      const title = extractTitle(markdown, path);
      const { frontmatter } = parseFrontmatter(markdown);
      const preview = markdown.slice(0, 200);
      const id = uuid();
      
      db.prepare(
        `INSERT INTO notes_index (id, path, title, content_preview, revision, updated_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(path) DO UPDATE SET
           title = excluded.title,
           content_preview = excluded.content_preview,
           revision = excluded.revision,
           updated_at = excluded.updated_at`
      ).run(id, path, title, preview, result.revision, result.updatedAt, new Date().toISOString());
      
      // Update backlinks
      const linkedPaths = getLinkedPaths(markdown);
      db.prepare('DELETE FROM backlinks WHERE source_path = ?').run(path);
      
      const insertBacklink = db.prepare(
        'INSERT OR IGNORE INTO backlinks (source_path, target_path) VALUES (?, ?)'
      );
      for (const target of linkedPaths) {
        insertBacklink.run(path, target);
      }
      
      // Update FTS
      db.prepare(
        `INSERT INTO notes_fts (path, title, content)
         VALUES (?, ?, ?)
         ON CONFLICT(path) DO UPDATE SET
           title = excluded.title,
           content = excluded.content`
      ).run(path, title, markdown);
      
      return c.json({
        note: {
          id,
          path: result.path,
          title,
          revision: result.revision,
          updatedAt: result.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error creating/updating note:', error);
      return c.json(
        { error: 'Failed to create/update note', details: error instanceof Error ? error.message : String(error) },
        500
      );
    }
  }
);

// Delete a note
notesRoutes.delete('/:path{.+}', async (c) => {
  const path = c.req.param('path');
  
  const deleted = await deleteNote(path);
  
  if (!deleted) {
    return c.json({ error: 'Note not found' }, 404);
  }
  
  // Remove from index
  const db = getDb();
  db.prepare('DELETE FROM notes_index WHERE path = ?').run(path);
  db.prepare('DELETE FROM backlinks WHERE source_path = ?').run(path);
  db.prepare('DELETE FROM notes_fts WHERE path = ?').run(path);
  
  return c.json({ success: true });
});

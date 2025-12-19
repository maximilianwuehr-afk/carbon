import { z } from 'zod';

/**
 * Note schema - represents a Markdown note in the vault.
 *
 * INVARIANTS:
 * - `path` is relative to vault root, uses forward slashes, ends with .md
 * - `revision` is SHA-256 hash of the markdown content (for change detection)
 * - `baseRevision` is the revision this note was edited from (for 3-way merge)
 * - `deviceId` identifies the device that last modified this note
 */
export const NoteSchema = z.object({
  /** Unique identifier (UUID v4) */
  id: z.string().uuid(),

  /** Relative path from vault root, e.g., "Daily notes/2025-12-19.md" */
  path: z.string().regex(/^[^/].*\.md$/, 'Path must be relative and end with .md'),

  /** Note title (derived from filename or frontmatter) */
  title: z.string(),

  /** Raw Markdown content */
  markdown: z.string(),

  /** Parsed YAML frontmatter (if present) */
  frontmatter: z.record(z.unknown()).optional(),

  /** ISO 8601 timestamp of last modification */
  updatedAt: z.string().datetime(),

  /** Device identifier that last modified this note */
  deviceId: z.string(),

  /** SHA-256 hash of markdown content */
  revision: z.string(),

  /** Revision this edit was based on (for 3-way merge) */
  baseRevision: z.string().nullable(),
});

export type Note = z.infer<typeof NoteSchema>;

/**
 * Minimal note reference for lists and backlinks
 */
export const NoteRefSchema = z.object({
  id: z.string().uuid(),
  path: z.string(),
  title: z.string(),
  updatedAt: z.string().datetime(),
});

export type NoteRef = z.infer<typeof NoteRefSchema>;

/**
 * Note creation input (id, revision, updatedAt auto-generated)
 */
export const CreateNoteSchema = z.object({
  path: z.string().regex(/^[^/].*\.md$/, 'Path must be relative and end with .md'),
  markdown: z.string(),
  baseRevision: z.string().nullable().optional(),
});

export type CreateNote = z.infer<typeof CreateNoteSchema>;

/**
 * Note update input
 */
export const UpdateNoteSchema = z.object({
  markdown: z.string(),
  baseRevision: z.string().nullable(),
});

export type UpdateNote = z.infer<typeof UpdateNoteSchema>;

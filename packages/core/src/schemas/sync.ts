import { z } from 'zod';
import { NoteSchema, NoteRefSchema } from './note.js';
import { FileSchema } from './file.js';

/**
 * Sync state for a device.
 *
 * INVARIANTS:
 * - `cursor` is opaque to clients; server uses it to track sync position
 * - Cursor format: ISO timestamp of last synced change
 */
export const SyncStateSchema = z.object({
  /** Unique device identifier */
  deviceId: z.string(),

  /** Opaque cursor for incremental sync */
  cursor: z.string(),

  /** ISO 8601 timestamp of last successful sync */
  lastSyncAt: z.string().datetime(),
});

export type SyncState = z.infer<typeof SyncStateSchema>;

/**
 * Change types for sync operations
 */
export const ChangeTypeSchema = z.enum(['create', 'update', 'delete']);
export type ChangeType = z.infer<typeof ChangeTypeSchema>;

/**
 * A single change in a sync batch
 */
export const SyncChangeSchema = z.object({
  type: ChangeTypeSchema,
  path: z.string(),
  markdown: z.string().optional(), // For create/update
  revision: z.string().optional(),
  baseRevision: z.string().nullable().optional(),
  updatedAt: z.string().datetime(),
});

export type SyncChange = z.infer<typeof SyncChangeSchema>;

/**
 * Pull request - client asks for changes since cursor
 */
export const SyncPullRequestSchema = z.object({
  deviceId: z.string(),
  cursor: z.string().nullable(), // null for initial sync
});

export type SyncPullRequest = z.infer<typeof SyncPullRequestSchema>;

/**
 * Pull response - server returns changes and new cursor
 */
export const SyncPullResponseSchema = z.object({
  notes: z.array(NoteSchema),
  files: z.array(FileSchema),
  deletedPaths: z.array(z.string()),
  cursor: z.string(),
  hasMore: z.boolean(),
});

export type SyncPullResponse = z.infer<typeof SyncPullResponseSchema>;

/**
 * Push request - client sends local changes
 */
export const SyncPushRequestSchema = z.object({
  deviceId: z.string(),
  changes: z.array(SyncChangeSchema),
});

export type SyncPushRequest = z.infer<typeof SyncPushRequestSchema>;

/**
 * Merge result for a single note in sync operations
 */
export const SyncMergeResultSchema = z.object({
  path: z.string(),
  status: z.enum(['merged', 'conflict', 'accepted']),
  note: NoteSchema.optional(),
  /** If conflict, path to the alternate version */
  conflictPath: z.string().optional(),
});

export type SyncMergeResult = z.infer<typeof SyncMergeResultSchema>;

/**
 * Push response - server returns merge results
 */
export const SyncPushResponseSchema = z.object({
  results: z.array(SyncMergeResultSchema),
  cursor: z.string(),
});

export type SyncPushResponse = z.infer<typeof SyncPushResponseSchema>;

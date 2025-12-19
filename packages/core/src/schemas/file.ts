import { z } from 'zod';

/**
 * File schema - represents a non-markdown file (attachment) in the vault.
 *
 * INVARIANTS:
 * - Non-markdown files use "last-modified wins" for conflict resolution
 * - `storageKey` is the key used to retrieve the file from storage
 */
export const FileSchema = z.object({
  /** Unique identifier (UUID v4) */
  id: z.string().uuid(),

  /** Relative path from vault root */
  path: z.string(),

  /** Original filename */
  name: z.string(),

  /** MIME type */
  mime: z.string(),

  /** File size in bytes */
  size: z.number().int().nonnegative(),

  /** ISO 8601 timestamp of last modification */
  updatedAt: z.string().datetime(),

  /** Device that last modified this file */
  lastModifiedBy: z.string(),

  /** Storage key for file retrieval */
  storageKey: z.string(),
});

export type File = z.infer<typeof FileSchema>;

/**
 * File upload response
 */
export const FileUploadResponseSchema = z.object({
  id: z.string().uuid(),
  path: z.string(),
  storageKey: z.string(),
  size: z.number(),
});

export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;

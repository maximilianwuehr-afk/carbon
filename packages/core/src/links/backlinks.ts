/**
 * Backlink indexing utilities.
 *
 * BACKLINKS:
 * - For each note, track which other notes link to it
 * - Used for "What links here" feature
 * - Index is maintained incrementally on note save
 *
 * INVARIANTS:
 * - Backlinks are stored as source→targets mapping
 * - Index is rebuilt on startup from all notes
 * - Updates are incremental (only reindex changed notes)
 */

import { getLinkedPaths } from './parser.js';

/**
 * Backlink index: maps target path → array of source paths that link to it
 */
export type BacklinkIndex = Map<string, Set<string>>;

/**
 * Create an empty backlink index
 */
export function createBacklinkIndex(): BacklinkIndex {
  return new Map();
}

/**
 * Add links from a note to the index
 */
export function indexNote(
  index: BacklinkIndex,
  sourcePath: string,
  markdown: string
): void {
  const linkedPaths = getLinkedPaths(markdown);

  for (const targetPath of linkedPaths) {
    const normalizedTarget = targetPath.toLowerCase();
    
    if (!index.has(normalizedTarget)) {
      index.set(normalizedTarget, new Set());
    }
    
    index.get(normalizedTarget)!.add(sourcePath);
  }
}

/**
 * Remove all backlinks from a source note
 */
export function unindexNote(index: BacklinkIndex, sourcePath: string): void {
  for (const [, sources] of index) {
    sources.delete(sourcePath);
  }

  // Clean up empty entries
  for (const [target, sources] of index) {
    if (sources.size === 0) {
      index.delete(target);
    }
  }
}

/**
 * Update backlinks for a note (removes old links, adds new ones)
 */
export function updateNoteIndex(
  index: BacklinkIndex,
  sourcePath: string,
  markdown: string
): void {
  unindexNote(index, sourcePath);
  indexNote(index, sourcePath, markdown);
}

/**
 * Get all notes that link to a target path
 */
export function getBacklinks(index: BacklinkIndex, targetPath: string): string[] {
  const normalizedTarget = targetPath.toLowerCase();
  
  // Try exact match first
  let sources = index.get(normalizedTarget);
  
  // Try without extension
  if (!sources) {
    const withoutExt = normalizedTarget.replace(/\.md$/, '');
    sources = index.get(withoutExt) || index.get(`${withoutExt}.md`);
  }
  
  return sources ? Array.from(sources) : [];
}

/**
 * Get outgoing links from a note
 */
export function getOutgoingLinks(markdown: string): string[] {
  return getLinkedPaths(markdown);
}

/**
 * Build complete backlink index from all notes
 */
export function buildBacklinkIndex(
  notes: Array<{ path: string; markdown: string }>
): BacklinkIndex {
  const index = createBacklinkIndex();

  for (const note of notes) {
    indexNote(index, note.path, note.markdown);
  }

  return index;
}

/**
 * Serialize backlink index for storage
 */
export function serializeBacklinkIndex(index: BacklinkIndex): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  
  for (const [target, sources] of index) {
    result[target] = Array.from(sources);
  }
  
  return result;
}

/**
 * Deserialize backlink index from storage
 */
export function deserializeBacklinkIndex(data: Record<string, string[]>): BacklinkIndex {
  const index = createBacklinkIndex();
  
  for (const [target, sources] of Object.entries(data)) {
    index.set(target, new Set(sources));
  }
  
  return index;
}

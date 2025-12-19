/**
 * Cursor utilities for incremental sync.
 *
 * CURSOR FORMAT: ISO 8601 timestamp string
 *
 * WHY TIMESTAMP:
 * - Simple to compare and sort
 * - Works across time zones
 * - Easy to debug
 *
 * INVARIANT: Cursor represents the updatedAt of the last synced change.
 * On pull, server returns changes with updatedAt > cursor.
 */

/**
 * Create initial cursor (epoch)
 */
export function createInitialCursor(): string {
  return new Date(0).toISOString();
}

/**
 * Create cursor from current time
 */
export function createCurrentCursor(): string {
  return new Date().toISOString();
}

/**
 * Parse cursor to Date
 */
export function parseCursor(cursor: string): Date {
  return new Date(cursor);
}

/**
 * Compare two cursors (returns negative if a < b, 0 if equal, positive if a > b)
 */
export function compareCursors(a: string, b: string): number {
  return parseCursor(a).getTime() - parseCursor(b).getTime();
}

/**
 * Get the later of two cursors
 */
export function maxCursor(a: string, b: string): string {
  return compareCursors(a, b) >= 0 ? a : b;
}

/**
 * Check if a timestamp is after the cursor
 */
export function isAfterCursor(cursor: string, timestamp: string): boolean {
  return compareCursors(timestamp, cursor) > 0;
}

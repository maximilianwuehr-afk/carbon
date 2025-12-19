/**
 * Path utilities for vault operations.
 *
 * INVARIANTS:
 * - All paths use forward slashes (even on Windows)
 * - Paths are relative to vault root
 * - No leading slash
 * - No trailing slash for directories
 * - Note paths end with .md
 */

/**
 * Normalize a path to use forward slashes and remove leading/trailing slashes
 */
export function normalizePath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/+/g, '/');
}

/**
 * Get the parent directory of a path
 */
export function getParentPath(path: string): string | null {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) return null;
  return normalized.slice(0, lastSlash);
}

/**
 * Get the filename from a path
 */
export function getFileName(path: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);
}

/**
 * Get the filename without extension
 */
export function getBaseName(path: string): string {
  const fileName = getFileName(path);
  const lastDot = fileName.lastIndexOf('.');
  return lastDot === -1 ? fileName : fileName.slice(0, lastDot);
}

/**
 * Get the extension from a path (without the dot)
 */
export function getExtension(path: string): string {
  const fileName = getFileName(path);
  const lastDot = fileName.lastIndexOf('.');
  return lastDot === -1 ? '' : fileName.slice(lastDot + 1);
}

/**
 * Check if a path is a Markdown file
 */
export function isMarkdownFile(path: string): boolean {
  const ext = getExtension(path).toLowerCase();
  return ext === 'md' || ext === 'markdown';
}

/**
 * Join path segments
 */
export function joinPath(...segments: string[]): string {
  return normalizePath(segments.filter(Boolean).join('/'));
}

/**
 * Create a daily note path for a date
 */
export function getDailyNotePath(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `Daily notes/${year}-${month}-${day}.md`;
}

/**
 * Parse a daily note path to get the date
 */
export function parseDailyNotePath(path: string): Date | null {
  const match = path.match(/Daily notes\/(\d{4})-(\d{2})-(\d{2})\.md$/);
  if (!match) return null;
  return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
}

/**
 * Create a meeting note path
 */
export function getMeetingNotePath(title: string, eventId: string, date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const safeTitle = title.replace(/[<>:"/\\|?*]/g, '-').slice(0, 100);
  return `Meetings/${year}-${month}/${safeTitle} ~${eventId}.md`;
}

/**
 * Extract event ID from a meeting note path
 */
export function extractEventId(path: string): string | null {
  const match = path.match(/~([A-Za-z0-9_-]+)\.md$/);
  return match ? match[1] : null;
}

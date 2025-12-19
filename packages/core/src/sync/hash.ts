/**
 * Revision hash utilities.
 *
 * WHY SHA-256:
 * - Collision-resistant for content addressing
 * - Fast enough for small text files
 * - Standard algorithm available in all environments
 *
 * INVARIANT: Same content always produces same hash.
 */

/**
 * Compute SHA-256 hash of content (browser-compatible)
 */
export async function computeRevision(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  // Use Web Crypto API (available in browsers and Node 18+)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Synchronous hash computation (for Node.js with crypto module)
 * This is a fallback for environments where crypto.subtle is not available synchronously.
 */
export function computeRevisionSync(content: string): string {
  // Simple djb2 hash for sync contexts - not cryptographic but fast
  // For true content addressing, use computeRevision (async)
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = (hash * 33) ^ content.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Check if two revisions match
 */
export function revisionsMatch(a: string, b: string): boolean {
  return a === b;
}

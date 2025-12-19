import { computePatches, applyPatches, canMerge } from './diff-match-patch.js';

/**
 * Result of a three-way merge operation.
 */
export interface MergeResult {
  /** The merged content */
  merged: string;
  /** Whether the merge was clean (no conflicts) */
  clean: boolean;
  /** If not clean, description of the issue */
  conflictReason?: string;
}

/**
 * Three-way merge for Markdown content.
 *
 * ALGORITHM:
 * 1. Compute patches from base → client (clientPatches)
 * 2. Compute patches from base → server (serverPatches)
 * 3. Apply clientPatches to server content
 * 4. If that fails or produces bad result, apply serverPatches to client content
 * 5. If both fail, return conflict
 *
 * WHY THREE-WAY:
 * - Two-way merge can't distinguish between "A added X" vs "B deleted X"
 * - With the common base, we know what each side changed
 *
 * INVARIANT: We always return a result, even if conflicted. The caller
 * decides whether to keep both versions or prompt the user.
 */
export function threeWayMerge(base: string, client: string, server: string): MergeResult {
  // Fast path: no changes from base
  if (client === base && server === base) {
    return { merged: base, clean: true };
  }

  // Fast path: only one side changed
  if (client === base) {
    return { merged: server, clean: true };
  }
  if (server === base) {
    return { merged: client, clean: true };
  }

  // Fast path: both sides made identical changes
  if (client === server) {
    return { merged: client, clean: true };
  }

  // Check if content is too different to merge
  if (!canMerge(client, server)) {
    return {
      merged: client,
      clean: false,
      conflictReason: 'Content diverged too much to auto-merge',
    };
  }

  // Compute patches from base to each version
  const clientPatches = computePatches(base, client);
  const serverPatches = computePatches(base, server);

  // Try applying client patches to server
  const clientOnServer = applyPatches(server, clientPatches);
  if (clientOnServer.success) {
    return { merged: clientOnServer.result, clean: true };
  }

  // Try applying server patches to client
  const serverOnClient = applyPatches(client, serverPatches);
  if (serverOnClient.success) {
    return { merged: serverOnClient.result, clean: true };
  }

  // Both patch applications had issues - use best effort from first attempt
  // Mark as conflict so caller can decide to keep alternate version
  return {
    merged: clientOnServer.result,
    clean: false,
    conflictReason: 'Patches could not be applied cleanly',
  };
}

/**
 * Two-way merge fallback when no base is available.
 *
 * ALGORITHM:
 * 1. Compute patches from server → client
 * 2. Apply patches to server (effectively merging client changes)
 *
 * WHY: Without a base, we assume server is canonical and try to
 * incorporate client changes. This may lose some server changes
 * if they conflict, but it's the best we can do.
 */
export function twoWayMerge(client: string, server: string): MergeResult {
  if (client === server) {
    return { merged: client, clean: true };
  }

  if (!canMerge(client, server)) {
    return {
      merged: server,
      clean: false,
      conflictReason: 'Content diverged too much to auto-merge without base',
    };
  }

  // Apply client changes to server
  const patches = computePatches(server, client);
  const { result, success } = applyPatches(server, patches);

  return {
    merged: result,
    clean: success,
    conflictReason: success ? undefined : 'Patches could not be applied cleanly',
  };
}

/**
 * Main merge function - uses 3-way if base available, else 2-way.
 */
export function mergeMarkdown(
  client: string,
  server: string,
  base: string | null
): MergeResult {
  if (base !== null) {
    return threeWayMerge(base, client, server);
  }
  return twoWayMerge(client, server);
}

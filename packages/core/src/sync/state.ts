import type { SyncState, SyncChange } from '../schemas/sync.js';

/**
 * Sync status for the client
 */
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

/**
 * Client-side sync state manager.
 *
 * INVARIANTS:
 * - Dirty queue is persisted to IndexedDB
 * - Changes are applied optimistically to local state
 * - On sync, dirty changes are pushed and remote changes pulled
 */
export interface ClientSyncState {
  deviceId: string;
  cursor: string | null;
  lastSyncAt: Date | null;
  status: SyncStatus;
  dirtyPaths: Set<string>;
  error: Error | null;
}

/**
 * Create initial client sync state
 */
export function createClientSyncState(deviceId: string): ClientSyncState {
  return {
    deviceId,
    cursor: null,
    lastSyncAt: null,
    status: 'idle',
    dirtyPaths: new Set(),
    error: null,
  };
}

/**
 * Mark a path as dirty (needs sync)
 */
export function markDirty(state: ClientSyncState, path: string): ClientSyncState {
  const dirtyPaths = new Set(state.dirtyPaths);
  dirtyPaths.add(path);
  return { ...state, dirtyPaths };
}

/**
 * Mark paths as synced (remove from dirty queue)
 */
export function markSynced(state: ClientSyncState, paths: string[]): ClientSyncState {
  const dirtyPaths = new Set(state.dirtyPaths);
  for (const path of paths) {
    dirtyPaths.delete(path);
  }
  return { ...state, dirtyPaths };
}

/**
 * Update sync state after successful sync
 */
export function updateAfterSync(
  state: ClientSyncState,
  cursor: string,
  syncedPaths: string[]
): ClientSyncState {
  return {
    ...state,
    cursor,
    lastSyncAt: new Date(),
    status: 'idle',
    dirtyPaths: new Set([...state.dirtyPaths].filter((p) => !syncedPaths.includes(p))),
    error: null,
  };
}

/**
 * Set sync error state
 */
export function setSyncError(state: ClientSyncState, error: Error): ClientSyncState {
  return {
    ...state,
    status: 'error',
    error,
  };
}

/**
 * Check if there are pending changes to sync
 */
export function hasPendingChanges(state: ClientSyncState): boolean {
  return state.dirtyPaths.size > 0;
}

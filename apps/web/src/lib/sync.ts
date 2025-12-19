/**
 * Sync service for background synchronization.
 *
 * SYNC ALGORITHM:
 * 1. Pull: Fetch changes from server since last cursor
 * 2. Merge: Apply server changes to local store
 * 3. Push: Send local dirty changes to server
 * 4. Update cursor on success
 */

import {
  db,
  getDeviceId,
  getSyncState,
  updateSyncState,
  getSyncQueue,
  bulkUpdateNotes,
  markNoteSynced,
  type LocalNote,
} from './db';

const API_BASE = '/api';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncResult {
  pulled: number;
  pushed: number;
  errors: string[];
}

/**
 * Perform a full sync cycle: pull then push
 */
export async function sync(): Promise<SyncResult> {
  const result: SyncResult = { pulled: 0, pushed: 0, errors: [] };

  try {
    // Pull changes from server
    const pullResult = await pull();
    result.pulled = pullResult.count;

    // Push local changes to server
    const pushResult = await push();
    result.pushed = pushResult.count;
    result.errors = pushResult.errors;
  } catch (error) {
    result.errors.push(String(error));
  }

  return result;
}

/**
 * Pull changes from server
 */
async function pull(): Promise<{ count: number }> {
  const deviceId = getDeviceId();
  const syncState = await getSyncState();
  const cursor = syncState?.cursor || null;

  const response = await fetch(`${API_BASE}/sync/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, cursor }),
  });

  if (!response.ok) {
    throw new Error(`Pull failed: ${response.status}`);
  }

  const data = await response.json();

  // Apply changes to local store
  if (data.notes && data.notes.length > 0) {
    const localNotes: LocalNote[] = data.notes.map((note: any) => ({
      id: note.id,
      path: note.path,
      title: note.title,
      markdown: note.markdown,
      frontmatter: note.frontmatter,
      revision: note.revision,
      baseRevision: note.baseRevision,
      updatedAt: note.updatedAt,
      isDirty: false,
      syncedAt: new Date().toISOString(),
    }));

    await bulkUpdateNotes(localNotes);
  }

  // Handle deleted notes
  if (data.deletedPaths && data.deletedPaths.length > 0) {
    for (const path of data.deletedPaths) {
      const note = await db.notes.where('path').equals(path).first();
      if (note) {
        await db.notes.delete(note.id);
      }
    }
  }

  // Update cursor
  await updateSyncState(data.cursor);

  return { count: data.notes?.length || 0 };
}

/**
 * Push local changes to server
 */
async function push(): Promise<{ count: number; errors: string[] }> {
  const deviceId = getDeviceId();
  const queue = await getSyncQueue();

  if (queue.length === 0) {
    return { count: 0, errors: [] };
  }

  // Prepare changes
  const changes = queue.map((item) => ({
    type: item.type,
    path: item.path,
    markdown: item.markdown,
    revision: item.revision,
    baseRevision: item.baseRevision,
    updatedAt: item.createdAt,
  }));

  const response = await fetch(`${API_BASE}/sync/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, changes }),
  });

  if (!response.ok) {
    throw new Error(`Push failed: ${response.status}`);
  }

  const data = await response.json();
  const errors: string[] = [];

  // Process results
  for (const result of data.results) {
    if (result.status === 'conflict') {
      errors.push(`Conflict on ${result.path}`);
    }

    // Update local note with server revision
    if (result.note) {
      await markNoteSynced(result.path, result.note.revision);
    }
  }

  // Update cursor
  await updateSyncState(data.cursor);

  return { count: changes.length, errors };
}

/**
 * Start automatic sync on interval
 */
let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(intervalMs: number = 30000): void {
  if (syncInterval) return;

  // Initial sync
  sync().catch(console.error);

  // Periodic sync
  syncInterval = setInterval(() => {
    sync().catch(console.error);
  }, intervalMs);

  // Sync on visibility change (tab becomes visible)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      sync().catch(console.error);
    }
  });

  // Sync on online
  window.addEventListener('online', () => {
    sync().catch(console.error);
  });
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

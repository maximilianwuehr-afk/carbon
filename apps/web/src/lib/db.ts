/**
 * IndexedDB local store using Dexie.
 *
 * Provides offline-first storage with sync queue.
 *
 * INVARIANTS:
 * - Local store is the primary source for UI
 * - Changes are queued and synced in background
 * - Sync cursor tracks last successful sync
 */

import Dexie, { type Table } from 'dexie';

export interface LocalNote {
  id: string;
  path: string;
  title: string;
  markdown: string;
  frontmatter?: Record<string, unknown>;
  revision: string;
  baseRevision: string | null;
  updatedAt: string;
  syncedAt: string | null;
  isDirty: boolean;
}

export interface LocalFile {
  id: string;
  path: string;
  name: string;
  mime: string;
  size: number;
  storageKey: string;
  updatedAt: string;
  syncedAt: string | null;
}

export interface SyncQueue {
  id?: number;
  path: string;
  type: 'create' | 'update' | 'delete';
  markdown?: string;
  revision?: string;
  baseRevision?: string | null;
  createdAt: string;
}

export interface SyncState {
  id: string;
  deviceId: string;
  cursor: string | null;
  lastSyncAt: string | null;
}

export class CarbonDB extends Dexie {
  notes!: Table<LocalNote, string>;
  files!: Table<LocalFile, string>;
  syncQueue!: Table<SyncQueue, number>;
  syncState!: Table<SyncState, string>;

  constructor() {
    super('CarbonDB');

    this.version(1).stores({
      notes: 'id, path, title, updatedAt, isDirty',
      files: 'id, path, updatedAt',
      syncQueue: '++id, path, type, createdAt',
      syncState: 'id',
    });
  }
}

export const db = new CarbonDB();

/**
 * Get or create device ID
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem('carbon_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('carbon_device_id', deviceId);
  }
  return deviceId;
}

/**
 * Get current sync state
 */
export async function getSyncState(): Promise<SyncState | undefined> {
  return db.syncState.get('current');
}

/**
 * Update sync state
 */
export async function updateSyncState(cursor: string): Promise<void> {
  const deviceId = getDeviceId();
  await db.syncState.put({
    id: 'current',
    deviceId,
    cursor,
    lastSyncAt: new Date().toISOString(),
  });
}

/**
 * Get a note by path
 */
export async function getNote(path: string): Promise<LocalNote | undefined> {
  return db.notes.where('path').equals(path).first();
}

/**
 * Save a note locally
 */
export async function saveNote(note: Omit<LocalNote, 'isDirty' | 'syncedAt'>): Promise<void> {
  await db.notes.put({
    ...note,
    isDirty: true,
    syncedAt: null,
  });

  // Add to sync queue
  await db.syncQueue.add({
    path: note.path,
    type: 'update',
    markdown: note.markdown,
    revision: note.revision,
    baseRevision: note.baseRevision,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Mark note as synced
 */
export async function markNoteSynced(path: string, revision: string): Promise<void> {
  const note = await getNote(path);
  if (note) {
    await db.notes.update(note.id, {
      isDirty: false,
      syncedAt: new Date().toISOString(),
      revision,
    });
  }

  // Remove from sync queue
  await db.syncQueue.where('path').equals(path).delete();
}

/**
 * Get all dirty notes
 */
export async function getDirtyNotes(): Promise<LocalNote[]> {
  return db.notes.where('isDirty').equals(1).toArray();
}

/**
 * Get sync queue items
 */
export async function getSyncQueue(): Promise<SyncQueue[]> {
  return db.syncQueue.orderBy('createdAt').toArray();
}

/**
 * Clear sync queue for paths
 */
export async function clearSyncQueue(paths: string[]): Promise<void> {
  for (const path of paths) {
    await db.syncQueue.where('path').equals(path).delete();
  }
}

/**
 * Bulk update notes from server
 */
export async function bulkUpdateNotes(notes: LocalNote[]): Promise<void> {
  await db.notes.bulkPut(
    notes.map((note) => ({
      ...note,
      isDirty: false,
      syncedAt: new Date().toISOString(),
    }))
  );
}

/**
 * Delete a note locally
 */
export async function deleteNote(path: string): Promise<void> {
  const note = await getNote(path);
  if (note) {
    await db.notes.delete(note.id);

    // Add delete to sync queue
    await db.syncQueue.add({
      path,
      type: 'delete',
      createdAt: new Date().toISOString(),
    });
  }
}

/**
 * Get all notes
 */
export async function getAllNotes(): Promise<LocalNote[]> {
  return db.notes.orderBy('updatedAt').reverse().toArray();
}

/**
 * Search notes locally
 */
export async function searchNotes(query: string): Promise<LocalNote[]> {
  const q = query.toLowerCase();
  return db.notes
    .filter(
      (note) =>
        note.title.toLowerCase().includes(q) ||
        note.markdown.toLowerCase().includes(q)
    )
    .toArray();
}

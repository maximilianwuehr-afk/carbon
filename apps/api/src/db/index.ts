/**
 * SQLite database initialization and queries.
 *
 * IMPORTANT: SQLite is used ONLY for indexing and metadata.
 * The canonical source of truth for notes is the filesystem.
 */

import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return db;
}

export async function initDatabase(dbPath: string): Promise<void> {
  // Ensure directory exists
  mkdirSync(dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    -- Notes index (for search and backlinks)
    CREATE TABLE IF NOT EXISTS notes_index (
      id TEXT PRIMARY KEY,
      path TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content_preview TEXT,
      revision TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Backlinks index
    CREATE TABLE IF NOT EXISTS backlinks (
      source_path TEXT NOT NULL,
      target_path TEXT NOT NULL,
      PRIMARY KEY (source_path, target_path),
      FOREIGN KEY (source_path) REFERENCES notes_index(path) ON DELETE CASCADE
    );

    -- Full-text search
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      path,
      title,
      content,
      content='notes_index',
      content_rowid='rowid'
    );

    -- Sync state for devices
    CREATE TABLE IF NOT EXISTS sync_state (
      device_id TEXT PRIMARY KEY,
      cursor TEXT NOT NULL,
      last_sync_at TEXT NOT NULL
    );

    -- Revision history (for 3-way merge)
    CREATE TABLE IF NOT EXISTS revisions (
      path TEXT NOT NULL,
      revision TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (path, revision)
    );

    -- OAuth tokens (encrypted)
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      provider TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TEXT,
      updated_at TEXT NOT NULL
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes_index(updated_at);
    CREATE INDEX IF NOT EXISTS idx_backlinks_target ON backlinks(target_path);
    CREATE INDEX IF NOT EXISTS idx_revisions_path ON revisions(path);
  `);

  console.log('✅ Database initialized');
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

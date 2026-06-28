/**
 * v1 — initial schema.
 * Runs inside an exclusive transaction (see client.js). DDL only via execAsync.
 * Soft deletes (deletedAt) exist from day one so Drive sync (Phase 9) can
 * propagate deletions; sync_queue is created now but only written to in Phase 9.
 */
export const v1Initial = {
  version: 1,
  async up(txn) {
    await txn.execAsync(`
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        mood TEXT,
        dateKey TEXT NOT NULL,
        wordCount INTEGER NOT NULL DEFAULT 0,
        isStarred INTEGER NOT NULL DEFAULT 0,
        isLocked INTEGER NOT NULL DEFAULT 0,
        weatherTemp REAL,
        weatherCode INTEGER,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_entries_dateKey ON entries(dateKey);
      CREATE INDEX IF NOT EXISTS idx_entries_updatedAt ON entries(updatedAt);

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS entry_tags (
        entryId TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        tagId TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (entryId, tagId)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entityType TEXT NOT NULL,
        entityId TEXT NOT NULL,
        operation TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0
      );
    `);
  },
};

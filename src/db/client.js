import * as SQLite from 'expo-sqlite';
import { v1Initial } from './migrations/v1_initial';
import { v2AiConsent } from './migrations/v2_aiConsent';
import { v3TagOrder } from './migrations/v3_tagOrder';
import { v4Moods } from './migrations/v4_moods';
import { v5Tasks } from './migrations/v5_tasks';
import { v6TaskLabel } from './migrations/v6_taskLabel';

/** Ordered migration list. MIGRATIONS[i] brings the DB to user_version i + 1. */
const MIGRATIONS = [v1Initial, v2AiConsent, v3TagOrder, v4Moods, v5Tasks, v6TaskLabel];

/** Each vault is a physically separate DB file → total content isolation. */
const VAULT_FILES = {
  main: 'marigold.db',
  secret: 'marigold_secret.db',
};

let activeVault = 'main';
const dbPromises = {}; // vault name -> Promise<db>

/** The vault currently in use ('main' | 'secret'). */
export function getActiveVault() {
  return activeVault;
}

/** Switch which vault getDatabase() returns. Caller re-inits app state afterwards. */
export function setActiveVault(vault) {
  if (!VAULT_FILES[vault]) throw new Error(`Unknown vault: ${vault}`);
  activeVault = vault;
}

/**
 * Singleton accessor for the ACTIVE vault's DB. Always go through this — never call
 * openDatabaseAsync elsewhere. Safe to call concurrently; the first caller per vault
 * triggers open + migrate.
 */
export function getDatabase() {
  const vault = activeVault;
  if (!dbPromises[vault]) {
    dbPromises[vault] = openAndMigrate(VAULT_FILES[vault]).catch((err) => {
      dbPromises[vault] = null; // allow retry after a failed open
      throw err;
    });
  }
  return dbPromises[vault];
}

async function openAndMigrate(fileName) {
  const db = await SQLite.openDatabaseAsync(fileName);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync('PRAGMA user_version');
  let current = row?.user_version ?? 0;

  while (current < MIGRATIONS.length) {
    const migration = MIGRATIONS[current];
    await db.withExclusiveTransactionAsync(async (txn) => {
      await migration.up(txn);
      await txn.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
    current = migration.version;
  }

  return db;
}

import { getDatabase } from '../client';
import { wrapVaultKey, getSessionPin, getVaultKeyId, getStoredWrappedKey } from '../../services/crypto';
import { exportAiConfig } from '../../services/geminiAI';

/** Full faithful snapshot of every diary table (for Drive backup). */
export async function exportSnapshot() {
  const db = await getDatabase();
  const [entries, tags, entryTags, settings] = await Promise.all([
    db.getAllAsync('SELECT * FROM entries'),
    db.getAllAsync('SELECT * FROM tags'),
    db.getAllAsync('SELECT * FROM entry_tags'),
    db.getAllAsync('SELECT key, value FROM settings'),
  ]);
  // Prefer the persisted wrapped key (present whenever a PIN has been set); fall back to a live PIN.
  let vaultKey = await getStoredWrappedKey();
  if (!vaultKey) {
    const pin = getSessionPin();
    if (pin) {
      try {
        vaultKey = await wrapVaultKey(pin);
      } catch {}
    }
  }
  return {
    schema: 3,
    exportedAt: new Date().toISOString(),
    entries,
    tags,
    entryTags,
    settings,
    vaultKey,
    keyId: await getVaultKeyId(),
    ai: await exportAiConfig(),
  };
}

/** Replace ALL local diary data with a snapshot. Destructive + transactional. */
export async function importSnapshot(data) {
  const db = await getDatabase();
  const entries = data?.entries || [];
  const tags = data?.tags || [];
  const entryTags = data?.entryTags || [];
  const settings = data?.settings || [];

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM entry_tags');
    await txn.runAsync('DELETE FROM entries');
    await txn.runAsync('DELETE FROM tags');
    await txn.runAsync('DELETE FROM settings');

    for (const t of tags) {
      await txn.runAsync(
        'INSERT INTO tags (id, name, createdAt, sortOrder) VALUES ($id, $name, $createdAt, $sortOrder)',
        { $id: t.id, $name: t.name, $createdAt: t.createdAt, $sortOrder: t.sortOrder ?? 0 }
      );
    }
    for (const e of entries) {
      await txn.runAsync(
        `INSERT INTO entries
           (id, title, content, mood, dateKey, wordCount, isStarred, isLocked,
            weatherTemp, weatherCode, createdAt, updatedAt, deletedAt, aiConsent)
         VALUES
           ($id, $title, $content, $mood, $dateKey, $wordCount, $isStarred, $isLocked,
            $weatherTemp, $weatherCode, $createdAt, $updatedAt, $deletedAt, $aiConsent)`,
        {
          $id: e.id,
          $title: e.title ?? '',
          $content: e.content ?? '',
          $mood: e.mood ?? null,
          $dateKey: e.dateKey,
          $wordCount: e.wordCount ?? 0,
          $isStarred: e.isStarred ?? 0,
          $isLocked: e.isLocked ?? 0,
          $weatherTemp: e.weatherTemp ?? null,
          $weatherCode: e.weatherCode ?? null,
          $createdAt: e.createdAt,
          $updatedAt: e.updatedAt,
          $deletedAt: e.deletedAt ?? null,
          $aiConsent: e.aiConsent ?? 0,
        }
      );
    }
    for (const et of entryTags) {
      await txn.runAsync('INSERT INTO entry_tags (entryId, tagId) VALUES ($e, $t)', {
        $e: et.entryId,
        $t: et.tagId,
      });
    }
    for (const s of settings) {
      await txn.runAsync('INSERT INTO settings (key, value) VALUES ($k, $v)', {
        $k: s.key,
        $v: s.value,
      });
    }
  });

  return { entries: entries.length, tags: tags.length };
}

/** Group rows by a key → Map<key, row[]>. */
function groupBy(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const k = r[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

/**
 * Merge two snapshots without data loss. Entries resolve by newest updatedAt
 * (handles edits + soft-deletes); tags/settings union (local wins on conflict);
 * each entry's tag links follow whichever side won that entry. `remote` may be null.
 */
export function mergeSnapshots(local, remote) {
  if (!remote) return local;

  const winner = new Map(); // id -> { row, side }
  for (const e of local.entries || []) winner.set(e.id, { row: e, side: 'local' });
  for (const e of remote.entries || []) {
    const cur = winner.get(e.id);
    if (!cur || (e.updatedAt || '') > (cur.row.updatedAt || '')) {
      winner.set(e.id, { row: e, side: 'remote' });
    }
  }
  const entries = [...winner.values()].map((w) => w.row);

  const tagById = new Map();
  for (const t of remote.tags || []) tagById.set(t.id, t);
  for (const t of local.tags || []) tagById.set(t.id, t); // local overrides
  const tags = [...tagById.values()];

  const localET = groupBy(local.entryTags || [], 'entryId');
  const remoteET = groupBy(remote.entryTags || [], 'entryId');
  const entryTags = [];
  for (const [id, w] of winner) {
    const links = (w.side === 'local' ? localET.get(id) : remoteET.get(id)) || [];
    entryTags.push(...links);
  }

  const setByKey = new Map();
  for (const s of remote.settings || []) setByKey.set(s.key, s);
  for (const s of local.settings || []) setByKey.set(s.key, s); // local wins
  const settings = [...setByKey.values()];

  return {
    schema: local.schema ?? 3,
    exportedAt: local.exportedAt,
    entries,
    tags,
    entryTags,
    settings,
    vaultKey: local.vaultKey || remote.vaultKey || null,
    keyId: local.keyId || remote.keyId || null,
    ai: local.ai ?? remote.ai ?? null,
  };
}

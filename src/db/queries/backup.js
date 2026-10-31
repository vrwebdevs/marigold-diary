import { getDatabase } from '../client';
import { wrapVaultKey, getSessionPin, getVaultKeyId, getStoredWrappedKey } from '../../services/crypto';
import { exportAiConfig } from '../../services/geminiAI';

/** Full faithful snapshot of every diary table (for Drive backup). */
export async function exportSnapshot() {
  const db = await getDatabase();
  const [entries, tags, entryTags, settings, moods, taskNames, persons, taskLogs] = await Promise.all([
    db.getAllAsync('SELECT * FROM entries'),
    db.getAllAsync('SELECT * FROM tags'),
    db.getAllAsync('SELECT * FROM entry_tags'),
    db.getAllAsync('SELECT key, value FROM settings'),
    db.getAllAsync('SELECT * FROM moods'),
    db.getAllAsync('SELECT * FROM task_names'),
    db.getAllAsync('SELECT * FROM persons'),
    db.getAllAsync('SELECT * FROM task_logs'),
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
    schema: 4,
    exportedAt: new Date().toISOString(),
    entries,
    tags,
    entryTags,
    settings,
    moods,
    taskNames,
    persons,
    taskLogs,
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
  const moods = data?.moods || [];
  const taskNames = data?.taskNames || [];
  const persons = data?.persons || [];
  const taskLogs = data?.taskLogs || [];

  await db.withExclusiveTransactionAsync(async (txn) => {
    // Delete in FK-safe order (children first)
    await txn.runAsync('DELETE FROM entry_tags');
    await txn.runAsync('DELETE FROM task_logs');
    await txn.runAsync('DELETE FROM entries');
    await txn.runAsync('DELETE FROM tags');
    await txn.runAsync('DELETE FROM settings');
    await txn.runAsync('DELETE FROM persons');
    await txn.runAsync('DELETE FROM task_names');
    // Only clear moods if the snapshot actually includes them (schema >= 4).
    // Older backups have no moods array — leave the migration-seeded defaults in place.
    if (moods.length > 0) {
      await txn.runAsync('DELETE FROM moods');
    }

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
    for (const m of moods) {
      await txn.runAsync(
        'INSERT INTO moods (key, label, color, sortOrder, isDefault) VALUES ($k, $l, $c, $s, $d)',
        { $k: m.key, $l: m.label, $c: m.color ?? null, $s: m.sortOrder ?? 0, $d: m.isDefault ?? 0 }
      );
    }
    for (const tn of taskNames) {
      await txn.runAsync(
        'INSERT INTO task_names (id, name, sortOrder, createdAt) VALUES ($id, $name, $sort, $ts)',
        { $id: tn.id, $name: tn.name, $sort: tn.sortOrder ?? 0, $ts: tn.createdAt }
      );
    }
    for (const p of persons) {
      await txn.runAsync(
        'INSERT INTO persons (id, name, sortOrder, createdAt) VALUES ($id, $name, $sort, $ts)',
        { $id: p.id, $name: p.name, $sort: p.sortOrder ?? 0, $ts: p.createdAt }
      );
    }
    for (const tl of taskLogs) {
      await txn.runAsync(
        'INSERT INTO task_logs (id, label, personId, loggedAt, createdAt) VALUES ($id, $lb, $p, $la, $ts)',
        { $id: tl.id, $lb: tl.label, $p: tl.personId, $la: tl.loggedAt, $ts: tl.createdAt }
      );
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

  const moodByKey = new Map();
  for (const m of remote.moods || []) moodByKey.set(m.key, m);
  for (const m of local.moods || []) moodByKey.set(m.key, m); // local wins
  const moods = [...moodByKey.values()];

  const taskNameById = new Map();
  for (const t of remote.taskNames || []) taskNameById.set(t.id, t);
  for (const t of local.taskNames || []) taskNameById.set(t.id, t); // local wins
  const taskNames = [...taskNameById.values()];

  const personById = new Map();
  for (const p of remote.persons || []) personById.set(p.id, p);
  for (const p of local.persons || []) personById.set(p.id, p); // local wins
  const persons = [...personById.values()];

  const taskLogById = new Map();
  for (const tl of remote.taskLogs || []) taskLogById.set(tl.id, tl);
  for (const tl of local.taskLogs || []) taskLogById.set(tl.id, tl); // local wins
  const taskLogs = [...taskLogById.values()];

  return {
    schema: local.schema ?? 4,
    exportedAt: local.exportedAt,
    entries,
    tags,
    entryTags,
    settings,
    moods,
    taskNames,
    persons,
    taskLogs,
    vaultKey: local.vaultKey || remote.vaultKey || null,
    keyId: local.keyId || remote.keyId || null,
    ai: local.ai ?? remote.ai ?? null,
  };
}

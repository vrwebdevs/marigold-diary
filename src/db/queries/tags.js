import { getDatabase } from '../client';
import { generateId, nowISO } from '../../utils/idUtils';
import { normalizeTag } from '../../utils/textUtils';
import { encryptDeterministic, decryptString, isEncrypted } from '../../services/crypto';

/** Decrypt a tag row's name for display. */
async function decryptTagRow(row) {
  if (!row) return row;
  return { ...row, name: await decryptString(row.name) };
}

async function decryptTagRows(rows) {
  const out = [];
  for (const r of rows) out.push(await decryptTagRow(r));
  return out;
}

/** Find by normalized name or create. Names are stored deterministically encrypted. */
export async function getOrCreateTag(rawName) {
  const db = await getDatabase();
  const name = normalizeTag(rawName);
  if (!name) return null;
  const encName = await encryptDeterministic(name);
  // match the encrypted name, or a not-yet-migrated plaintext name
  const existing = await db.getFirstAsync(
    'SELECT * FROM tags WHERE name = $enc OR name = $plain',
    { $enc: encName, $plain: name }
  );
  if (existing) {
    if (existing.name !== encName) {
      await db.runAsync('UPDATE tags SET name = $enc WHERE id = $id', { $enc: encName, $id: existing.id });
    }
    return { ...existing, name };
  }
  const id = generateId();
  const ts = nowISO();
  const maxRow = await db.getFirstAsync('SELECT COALESCE(MAX(sortOrder), -1) AS m FROM tags');
  const sortOrder = (maxRow?.m ?? -1) + 1;
  await db.runAsync(
    'INSERT INTO tags (id, name, sortOrder, createdAt) VALUES ($id, $name, $sortOrder, $createdAt)',
    { $id: id, $name: encName, $sortOrder: sortOrder, $createdAt: ts }
  );
  return { id, name, sortOrder, createdAt: ts };
}

/** All tags with live usage counts (excludes soft-deleted entries). */
export async function listTagsWithCounts() {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT t.*, COUNT(e.id) AS count
     FROM tags t
     LEFT JOIN entry_tags et ON et.tagId = t.id
     LEFT JOIN entries e ON e.id = et.entryId AND e.deletedAt IS NULL
     GROUP BY t.id ORDER BY t.sortOrder ASC`
  );
  return decryptTagRows(rows);
}

export async function getTagsForEntry(entryId) {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT t.* FROM tags t
     JOIN entry_tags et ON et.tagId = t.id
     WHERE et.entryId = $entryId ORDER BY t.sortOrder ASC`,
    { $entryId: entryId }
  );
  return decryptTagRows(rows);
}

/** Replace an entry's tag set from raw names (creates tags as needed). */
export async function setEntryTags(entryId, rawNames = []) {
  const db = await getDatabase();
  const tags = [];
  for (const raw of rawNames) {
    const tag = await getOrCreateTag(raw);
    if (tag && !tags.some((t) => t.id === tag.id)) tags.push(tag);
  }
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM entry_tags WHERE entryId = $entryId', { $entryId: entryId });
    for (const tag of tags) {
      await txn.runAsync(
        'INSERT INTO entry_tags (entryId, tagId) VALUES ($entryId, $tagId)',
        { $entryId: entryId, $tagId: tag.id }
      );
    }
  });
  return tags;
}

export async function deleteTag(tagId) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM tags WHERE id = $id', { $id: tagId });
}

/** Persist a new tag priority order (array of tag ids, top → bottom). */
export async function reorderTags(orderedIds) {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await txn.runAsync('UPDATE tags SET sortOrder = $o WHERE id = $id', { $o: i, $id: orderedIds[i] });
    }
  });
}

/** (tagName, mood) rows for mood-by-tag insights (names decrypted). */
export async function getTagMoodRows() {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT t.name AS name, e.mood AS mood
     FROM entry_tags et
     JOIN tags t ON t.id = et.tagId
     JOIN entries e ON e.id = et.entryId
     WHERE e.deletedAt IS NULL AND e.mood IS NOT NULL`
  );
  return decryptTagRows(rows);
}

/** Encrypt any still-plaintext tag names in the active vault (idempotent). */
export async function encryptPlaintextTags() {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT id, name FROM tags');
  for (const row of rows) {
    if (row.name && !isEncrypted(row.name)) {
      await db.runAsync('UPDATE tags SET name = $n WHERE id = $id', {
        $id: row.id,
        $n: await encryptDeterministic(row.name),
      });
    }
  }
}

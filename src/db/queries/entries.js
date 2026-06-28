import { getDatabase } from '../client';
import { generateId, nowISO } from '../../utils/idUtils';
import { toDateKey } from '../../utils/dateUtils';
import { stripHtml, countWords } from '../../utils/textUtils';
import { encryptString, decryptString, isEncrypted } from '../../services/crypto';
import { getSetting, setSetting } from './settings';
import { encryptPlaintextTags } from './tags';

/**
 * Entry CRUD. Reads exclude soft-deleted rows. title/content are encrypted at rest
 * (see services/crypto); wordCount/mood/dates stay plaintext. Text search runs in-app
 * over decrypted rows since ciphertext can't be SQL-matched.
 */

/** Decrypt the encrypted fields (title, content) of an entry row. */
async function decryptEntry(row) {
  if (!row) return row;
  return {
    ...row,
    title: await decryptString(row.title),
    content: await decryptString(row.content),
  };
}

async function decryptList(rows) {
  const out = [];
  for (const row of rows) out.push(await decryptEntry(row));
  return out;
}

export async function createEntry({ title = '', content = '', mood = null, date = null, weatherTemp = null, weatherCode = null, aiConsent = 0 }) {
  const db = await getDatabase();
  const id = generateId();
  const when = date || new Date();
  const ts = date ? date.toISOString() : nowISO();
  await db.runAsync(
    `INSERT INTO entries (id, title, content, mood, dateKey, wordCount, weatherTemp, weatherCode, aiConsent, createdAt, updatedAt)
     VALUES ($id, $title, $content, $mood, $dateKey, $wordCount, $weatherTemp, $weatherCode, $aiConsent, $createdAt, $updatedAt)`,
    {
      $id: id,
      $title: await encryptString(title),
      $content: await encryptString(content),
      $mood: mood,
      $dateKey: toDateKey(when),
      $wordCount: countWords(stripHtml(content)),
      $weatherTemp: weatherTemp,
      $weatherCode: weatherCode,
      $aiConsent: aiConsent ? 1 : 0,
      $createdAt: ts,
      $updatedAt: ts,
    }
  );
  return getEntryById(id);
}

export async function updateEntry(id, fields) {
  const db = await getDatabase();
  const allowed = ['title', 'content', 'mood', 'isStarred', 'isLocked', 'weatherTemp', 'weatherCode', 'aiConsent'];
  const sets = [];
  const params = { $id: id, $updatedAt: nowISO() };
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = $${key}`);
      params[`$${key}`] =
        key === 'title' || key === 'content' ? await encryptString(fields[key]) : fields[key];
    }
  }
  if (fields.content !== undefined) {
    sets.push('wordCount = $wordCount');
    params.$wordCount = countWords(stripHtml(fields.content));
  }
  if (!sets.length) return getEntryById(id);
  await db.runAsync(
    `UPDATE entries SET ${sets.join(', ')}, updatedAt = $updatedAt WHERE id = $id`,
    params
  );
  return getEntryById(id);
}

export async function deleteEntry(id) {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE entries SET deletedAt = $now, updatedAt = $now WHERE id = $id',
    { $id: id, $now: nowISO() }
  );
}

export async function getEntryById(id) {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    'SELECT * FROM entries WHERE id = $id AND deletedAt IS NULL',
    { $id: id }
  );
  return decryptEntry(row);
}

/**
 * List with filters.
 * opts: { search, mood, tagId, starredOnly, sort: 'newest'|'oldest', limit, offset }
 */
export async function listEntries(opts = {}) {
  const db = await getDatabase();
  const { search, mood, tagId, starredOnly, sort = 'newest', limit = 50, offset = 0 } = opts;
  const where = ['e.deletedAt IS NULL'];
  const params = {};
  if (mood) {
    where.push('e.mood = $mood');
    params.$mood = mood;
  }
  if (starredOnly) {
    where.push('e.isStarred = 1');
  }
  if (tagId) {
    where.push('EXISTS (SELECT 1 FROM entry_tags et WHERE et.entryId = e.id AND et.tagId = $tagId)');
    params.$tagId = tagId;
  }
  const order = sort === 'oldest' ? 'ASC' : 'DESC';

  // content is encrypted → text search runs in-app over decrypted rows (no SQL LIKE)
  if (search) {
    const rows = await db.getAllAsync(
      `SELECT e.* FROM entries e WHERE ${where.join(' AND ')} ORDER BY e.dateKey ${order}, e.createdAt ${order}`,
      params
    );
    const decrypted = await decryptList(rows);
    const q = search.toLowerCase();
    return decrypted
      .filter(
        (e) =>
          (e.title || '').toLowerCase().includes(q) ||
          stripHtml(e.content || '').toLowerCase().includes(q)
      )
      .slice(offset, offset + limit);
  }

  params.$limit = limit;
  params.$offset = offset;
  const rows = await db.getAllAsync(
    `SELECT e.* FROM entries e
     WHERE ${where.join(' AND ')}
     ORDER BY e.dateKey ${order}, e.createdAt ${order}
     LIMIT $limit OFFSET $offset`,
    params
  );
  return decryptList(rows);
}

export async function getEntriesByDateKey(dateKey) {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM entries WHERE dateKey = $dateKey AND deletedAt IS NULL ORDER BY createdAt DESC',
    { $dateKey: dateKey }
  );
  return decryptList(rows);
}

export async function getEntryDateKeys() {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT dateKey, COUNT(*) AS count FROM entries
     WHERE deletedAt IS NULL GROUP BY dateKey ORDER BY dateKey ASC`
  );
}

export async function getOnThisDay(monthDay, excludeDateKey) {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM entries
     WHERE substr(dateKey, 6) = $monthDay AND dateKey != $exclude AND deletedAt IS NULL
     ORDER BY dateKey DESC`,
    { $monthDay: monthDay, $exclude: excludeDateKey || '' }
  );
  return decryptList(rows);
}

export async function getEntryTotals() {
  const db = await getDatabase();
  return db.getFirstAsync(
    `SELECT COUNT(*) AS totalEntries, COALESCE(SUM(wordCount), 0) AS totalWords
     FROM entries WHERE deletedAt IS NULL`
  );
}

/**
 * THE single gate for every AI read of entry content. Enforces the consent ladder:
 * locked entries never leave the device; 'none' returns nothing; 'selective' requires
 * the per-entry aiConsent flag; 'all' still excludes locked. Returns DECRYPTED content.
 */
export async function listShareableEntries({ mode, sinceDateKey = null, limit = 200 } = {}) {
  if (mode !== 'all' && mode !== 'selective') return [];
  const db = await getDatabase();
  const where = ['deletedAt IS NULL', 'isLocked = 0'];
  const params = { $limit: limit };
  if (mode === 'selective') {
    where.push('aiConsent = 1');
  }
  if (sinceDateKey) {
    where.push('dateKey >= $since');
    params.$since = sinceDateKey;
  }
  const rows = await db.getAllAsync(
    `SELECT * FROM entries WHERE ${where.join(' AND ')} ORDER BY dateKey DESC LIMIT $limit`,
    params
  );
  return decryptList(rows);
}

/** Encrypt any still-plaintext title/content in the ACTIVE vault (idempotent). */
export async function encryptPlaintextEntries() {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT id, title, content FROM entries');
  for (const row of rows) {
    const titlePlain = row.title && !isEncrypted(row.title);
    const contentPlain = row.content && !isEncrypted(row.content);
    if (!titlePlain && !contentPlain) continue;
    await db.runAsync('UPDATE entries SET title = $t, content = $c WHERE id = $id', {
      $id: row.id,
      $t: titlePlain ? await encryptString(row.title) : row.title,
      $c: contentPlain ? await encryptString(row.content) : row.content,
    });
  }
}

/** One-time per-vault: encrypt the plaintext backlog, then flag it done. */
export async function ensureEntriesEncrypted() {
  if (!(await getSetting('encMigrated', false))) {
    await encryptPlaintextEntries();
    await setSetting('encMigrated', true);
  }
  if (!(await getSetting('tagEncMigrated', false))) {
    await encryptPlaintextTags();
    await setSetting('tagEncMigrated', true);
  }
}

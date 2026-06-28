import { getDatabase } from '../client';
import { generateId } from '../../utils/idUtils';

export async function listMoods() {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM moods ORDER BY sortOrder ASC');
}

export async function createMood(label, color) {
  const db = await getDatabase();
  const key = 'm_' + generateId();
  const maxRow = await db.getFirstAsync('SELECT COALESCE(MAX(sortOrder), -1) AS m FROM moods');
  const sortOrder = (maxRow?.m ?? -1) + 1;
  await db.runAsync(
    'INSERT INTO moods (key, label, color, sortOrder, isDefault) VALUES ($k, $l, $c, $s, 0)',
    { $k: key, $l: (label || '').trim(), $c: color, $s: sortOrder }
  );
  return { key, label: (label || '').trim(), color, sortOrder, isDefault: 0 };
}

export async function updateMood(key, fields) {
  const db = await getDatabase();
  const sets = [];
  const params = { $key: key };
  if (fields.label !== undefined) {
    sets.push('label = $label');
    params.$label = (fields.label || '').trim();
  }
  if (fields.color !== undefined) {
    sets.push('color = $color');
    params.$color = fields.color;
  }
  if (!sets.length) return;
  await db.runAsync(`UPDATE moods SET ${sets.join(', ')} WHERE key = $key`, params);
}

export async function reorderMoods(orderedKeys) {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (let i = 0; i < orderedKeys.length; i++) {
      await txn.runAsync('UPDATE moods SET sortOrder = $o WHERE key = $k', { $o: i, $k: orderedKeys[i] });
    }
  });
}

export async function countEntriesWithMood(key) {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    'SELECT COUNT(*) AS c FROM entries WHERE mood = $k AND deletedAt IS NULL',
    { $k: key }
  );
  return row?.c ?? 0;
}

export async function deleteMood(key) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM moods WHERE key = $k', { $k: key });
}

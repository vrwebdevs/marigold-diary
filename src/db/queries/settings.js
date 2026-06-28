import { getDatabase } from '../client';

/** Settings are JSON-encoded so booleans/numbers/objects round-trip. */
export async function getSetting(key, fallback = null) {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT value FROM settings WHERE key = $key', { $key: key });
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

export async function setSetting(key, value) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES ($key, $value)
     ON CONFLICT(key) DO UPDATE SET value = $value`,
    { $key: key, $value: JSON.stringify(value) }
  );
}

export async function getAllSettings() {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT key, value FROM settings');
  const out = {};
  for (const row of rows) {
    try {
      out[row.key] = JSON.parse(row.value);
    } catch {
      // skip malformed values
    }
  }
  return out;
}

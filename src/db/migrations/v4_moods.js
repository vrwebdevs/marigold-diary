/** v4 — user-manageable moods. Seeded with the 5 built-ins (color NULL = use the theme color). */
export const v4Moods = {
  version: 4,
  async up(txn) {
    await txn.execAsync(`
      CREATE TABLE IF NOT EXISTS moods (
        key TEXT PRIMARY KEY NOT NULL,
        label TEXT NOT NULL,
        color TEXT,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        isDefault INTEGER NOT NULL DEFAULT 0
      );
    `);
    const defaults = [
      ['radiant', 'Radiant', 0],
      ['calm', 'Calm', 1],
      ['steady', 'Steady', 2],
      ['heavy', 'Heavy', 3],
      ['frayed', 'Frayed', 4],
    ];
    for (const [key, label, sortOrder] of defaults) {
      await txn.runAsync(
        'INSERT OR IGNORE INTO moods (key, label, color, sortOrder, isDefault) VALUES ($k, $l, NULL, $s, 1)',
        { $k: key, $l: label, $s: sortOrder }
      );
    }
  },
};

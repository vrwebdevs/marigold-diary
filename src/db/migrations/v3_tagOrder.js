/**
 * v3 — tag priority order. `sortOrder` drives tag order everywhere (manager,
 * write picker, journal filter). Existing tags are backfilled by creation time.
 */
export const v3TagOrder = {
  version: 3,
  async up(txn) {
    await txn.execAsync('ALTER TABLE tags ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0;');
    const rows = await txn.getAllAsync('SELECT id FROM tags ORDER BY createdAt ASC, name ASC');
    for (let i = 0; i < rows.length; i++) {
      await txn.runAsync('UPDATE tags SET sortOrder = $o WHERE id = $id', { $o: i, $id: rows[i].id });
    }
  },
};

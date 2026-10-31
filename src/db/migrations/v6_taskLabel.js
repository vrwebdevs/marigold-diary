/** v6 — replace taskNameId FK with free-text label on task_logs */
export const v6TaskLabel = {
  version: 6,
  async up(txn) {
    await txn.execAsync(`
      CREATE TABLE IF NOT EXISTS task_logs_v6 (
        id TEXT PRIMARY KEY NOT NULL,
        label TEXT NOT NULL DEFAULT '',
        personId TEXT NOT NULL REFERENCES persons(id),
        loggedAt TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
      INSERT INTO task_logs_v6 (id, label, personId, loggedAt, createdAt)
        SELECT tl.id, COALESCE(tn.name, ''), tl.personId, tl.loggedAt, tl.createdAt
        FROM task_logs tl
        LEFT JOIN task_names tn ON tn.id = tl.taskNameId;
      DROP TABLE task_logs;
      ALTER TABLE task_logs_v6 RENAME TO task_logs;
    `);
  },
};

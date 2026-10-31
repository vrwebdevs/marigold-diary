/** v5 — task tracker: task_names, persons, task_logs. */
export const v5Tasks = {
  version: 5,
  async up(txn) {
    await txn.execAsync(`
      CREATE TABLE IF NOT EXISTS task_names (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS persons (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS task_logs (
        id TEXT PRIMARY KEY NOT NULL,
        taskNameId TEXT NOT NULL REFERENCES task_names(id),
        personId TEXT NOT NULL REFERENCES persons(id),
        loggedAt TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);
  },
};

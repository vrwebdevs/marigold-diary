import { getDatabase } from '../client';
import { generateId, nowISO } from '../../utils/idUtils';
import { fromDateKey } from '../../utils/dateUtils';


// ── Task Names ────────────────────────────────────────────────
export async function listTaskNames() {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM task_names ORDER BY sortOrder ASC');
}

export async function createTaskName(name) {
  const db = await getDatabase();
  const id = generateId();
  const maxRow = await db.getFirstAsync('SELECT COALESCE(MAX(sortOrder), -1) AS m FROM task_names');
  const sortOrder = (maxRow?.m ?? -1) + 1;
  const createdAt = nowISO();
  await db.runAsync(
    'INSERT INTO task_names (id, name, sortOrder, createdAt) VALUES ($id, $name, $sort, $ts)',
    { $id: id, $name: name.trim(), $sort: sortOrder, $ts: createdAt }
  );
  return { id, name: name.trim(), sortOrder, createdAt };
}

export async function deleteTaskName(id) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM task_names WHERE id = $id', { $id: id });
}

export async function reorderTaskNames(orderedIds) {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await txn.runAsync('UPDATE task_names SET sortOrder = $o WHERE id = $id', { $o: i, $id: orderedIds[i] });
    }
  });
}

// ── Persons ───────────────────────────────────────────────────
export async function listPersons() {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM persons ORDER BY sortOrder ASC');
}

export async function createPerson(name) {
  const db = await getDatabase();
  const id = generateId();
  const maxRow = await db.getFirstAsync('SELECT COALESCE(MAX(sortOrder), -1) AS m FROM persons');
  const sortOrder = (maxRow?.m ?? -1) + 1;
  const createdAt = nowISO();
  await db.runAsync(
    'INSERT INTO persons (id, name, sortOrder, createdAt) VALUES ($id, $name, $sort, $ts)',
    { $id: id, $name: name.trim(), $sort: sortOrder, $ts: createdAt }
  );
  return { id, name: name.trim(), sortOrder, createdAt };
}

export async function deletePerson(id) {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM task_logs WHERE personId = $id', { $id: id });
    await txn.runAsync('DELETE FROM persons WHERE id = $id', { $id: id });
  });
}

export async function reorderPersons(orderedIds) {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await txn.runAsync('UPDATE persons SET sortOrder = $o WHERE id = $id', { $o: i, $id: orderedIds[i] });
    }
  });
}

// ── Task Logs ─────────────────────────────────────────────────
export async function listTaskLogsForDay(dateKey) {
  const db = await getDatabase();
  const start = fromDateKey(dateKey);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return db.getAllAsync(
    `SELECT tl.id, tl.label, tl.loggedAt, tl.createdAt,
            p.name AS personName, p.id AS personId
     FROM task_logs tl
     JOIN persons p ON p.id = tl.personId
     WHERE tl.loggedAt >= $start AND tl.loggedAt < $end
     ORDER BY tl.loggedAt ASC`,
    { $start: start.toISOString(), $end: end.toISOString() }
  );
}

export async function listAllTaskLogs() {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT tl.id, tl.label, tl.loggedAt, tl.createdAt,
            p.name AS personName
     FROM task_logs tl
     JOIN persons p ON p.id = tl.personId
     ORDER BY tl.loggedAt DESC`
  );
}

export async function createTaskLog(label, personId, loggedAt) {
  const db = await getDatabase();
  const id = generateId();
  const createdAt = nowISO();
  await db.runAsync(
    'INSERT INTO task_logs (id, label, personId, loggedAt, createdAt) VALUES ($id, $lb, $p, $la, $ts)',
    { $id: id, $lb: label.trim(), $p: personId, $la: loggedAt, $ts: createdAt }
  );
  return { id, label, personId, loggedAt, createdAt };
}

export async function updateTaskLogTime(id, loggedAt) {
  const db = await getDatabase();
  await db.runAsync('UPDATE task_logs SET loggedAt = $la WHERE id = $id', { $la: loggedAt, $id: id });
}

export async function deleteTaskLog(id) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM task_logs WHERE id = $id', { $id: id });
}

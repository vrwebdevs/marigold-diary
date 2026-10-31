/**
 * Centralized query keys. Invalidation rules:
 *  - entry create/update/delete → invalidate entryKeys.all (lists, detail,
 *    dateKeys, totals, onThisDay all start with 'entries')
 *  - entry delete + tag set/delete → also invalidate tagKeys.all (usage counts)
 */
export const entryKeys = {
  all: ['entries'],
  list: (filters) => ['entries', 'list', filters],
  detail: (id) => ['entries', 'detail', id],
  byDay: (dateKey) => ['entries', 'byDay', dateKey],
  dateKeys: ['entries', 'dateKeys'],
  totals: ['entries', 'totals'],
  onThisDay: (monthDay) => ['entries', 'onThisDay', monthDay],
};

export const tagKeys = {
  all: ['tags'],
  forEntry: (entryId) => ['tags', 'entry', entryId],
};

export const taskKeys = {
  names: ['tasks', 'names'],
  persons: ['tasks', 'persons'],
  logs: ['tasks', 'logs'],
  logsForDay: (dateKey) => ['tasks', 'logs', dateKey],
  allLogs: ['tasks', 'logs', 'all'],
};

import { toDateKey, fromDateKey } from './dateUtils';

/**
 * Consecutive-day writing streak ending today — or ending yesterday if today
 * has no entry yet (today shouldn't break a live streak before bedtime).
 */
export function computeCurrentStreak(dateKeys, todayKey = toDateKey()) {
  const have = new Set(dateKeys);
  let cursor = todayKey;
  if (!have.has(cursor)) {
    const yesterday = fromDateKey(cursor);
    yesterday.setDate(yesterday.getDate() - 1);
    cursor = toDateKey(yesterday);
  }
  let streak = 0;
  while (have.has(cursor)) {
    streak++;
    const prev = fromDateKey(cursor);
    prev.setDate(prev.getDate() - 1);
    cursor = toDateKey(prev);
  }
  return streak;
}

/** Longest consecutive-day streak anywhere in history. */
export function computeLongestStreak(dateKeys) {
  const sorted = [...new Set(dateKeys)].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const key of sorted) {
    if (prev) {
      const next = fromDateKey(prev);
      next.setDate(next.getDate() + 1);
      run = toDateKey(next) === key ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = key;
  }
  return best;
}

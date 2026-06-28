/**
 * All dates are stored as either:
 *  - ISO timestamps (entry createdAt/updatedAt) — new Date().toISOString()
 *  - local date keys 'YYYY-MM-DD' (heatmap, streaks, on-this-day)
 * Date keys are LOCAL time on purpose: a 23:30 entry belongs to that day for the user.
 */

/** Local 'YYYY-MM-DD' key for a Date (defaults to now). */
export function toDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a 'YYYY-MM-DD' key into a local-midnight Date. */
export function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b);
}

/** Whole days from key a to key b (b - a). Same day = 0, yesterday→today = 1. */
export function daysBetween(keyA, keyB) {
  const ms = fromDateKey(keyB) - fromDateKey(keyA);
  return Math.round(ms / 86400000);
}

/** 'Thursday, June 12' */
export function formatFullDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** 'Jun 12, 2026' */
export function formatShortDate(date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** '9:41 PM' */
export function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** 'Today' / 'Yesterday' / 'Monday' (within 6 days) / 'Jun 12, 2026'. */
export function relativeDayLabel(date, now = new Date()) {
  const diff = daysBetween(toDateKey(date), toDateKey(now));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return formatShortDate(date);
}

/** 'Good morning' / 'Good afternoon' / 'Good evening' for the Caveat greeting. */
export function greetingForHour(hour = new Date().getHours()) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

import { colors } from './colors';

/** The 5 built-ins (color null → resolved from the active theme). */
export const DEFAULT_MOODS = [
  { key: 'radiant', label: 'Radiant', color: null, sortOrder: 0, isDefault: 1 },
  { key: 'calm', label: 'Calm', color: null, sortOrder: 1, isDefault: 1 },
  { key: 'steady', label: 'Steady', color: null, sortOrder: 2, isDefault: 1 },
  { key: 'heavy', label: 'Heavy', color: null, sortOrder: 3, isDefault: 1 },
  { key: 'frayed', label: 'Frayed', color: null, sortOrder: 4, isDefault: 1 },
];

/** Mutable singleton (seeded with defaults; applyMoods swaps in the DB list). */
export const moodList = [...DEFAULT_MOODS];

export function applyMoods(list) {
  moodList.length = 0;
  for (const m of list) moodList.push(m);
}

function rawMood(key) {
  return moodList.find((m) => m.key === key) || null;
}

/** Mood color: stored custom color, else the theme's built-in, else a neutral. */
export function moodColor(key) {
  const m = rawMood(key);
  if (m && m.color) return m.color;
  return colors.moods[key] || colors.softInk;
}

/** Mood row with its color resolved (never null). */
export function moodByKey(key) {
  const m = rawMood(key);
  if (!m) return null;
  return { ...m, color: moodColor(key) };
}

/** Curated emotion colors (harmonious with the themes). */
export const CURATED_MOOD_COLORS = [
  '#D98A3D', '#C25E3A', '#A8423A', '#C75D72', '#9C4F86', '#6E5DA6',
  '#4F6DB0', '#3E8E9C', '#4E9E70', '#7A9A4E', '#B59A3E', '#9A7B5A',
  '#7C7F8A', '#B06A8E', '#5A8C7E', '#8A6D3B',
];

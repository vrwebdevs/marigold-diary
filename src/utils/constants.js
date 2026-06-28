import { colors } from '../theme';

/**
 * The five Marigold moods. Order matters — this is the display order
 * in MoodSelector and Insights. `key` is what gets stored in the DB.
 */
export const MOODS = [
  { key: 'radiant', label: 'Radiant', color: colors.moods.radiant },
  { key: 'calm', label: 'Calm', color: colors.moods.calm },
  { key: 'steady', label: 'Steady', color: colors.moods.steady },
  { key: 'heavy', label: 'Heavy', color: colors.moods.heavy },
  { key: 'frayed', label: 'Frayed', color: colors.moods.frayed },
];

export { moodByKey } from '../theme/moods';

/** App-wide defaults, used by the settings table seed and stores. */
export const DEFAULTS = {
  diaryName: 'My Diary',
  theme: 'light', // light | dark | vintage | notebook
  fontScale: 1, // 0.9 | 1 | 1.15
  reminderEnabled: false,
  reminderTime: '21:00', // HH:mm, 24h
  coverColor: colors.clay,
};

/** Keys for expo-secure-store. Never store these values in SQLite. */
export const SECURE_KEYS = {
  pinHash: 'marigold.pinHash',
  secretPinHash: 'marigold.secretPinHash',
  geminiApiKey: 'marigold.geminiApiKey',
  aiEnabled: 'marigold.aiEnabled',
  aiSharingMode: 'marigold.aiSharingMode',
  googleAccessToken: 'marigold.googleAccessToken',
  googleRefreshToken: 'marigold.googleRefreshToken',
};

export const EXCERPT_LENGTH = 120; // chars shown on EntryCard

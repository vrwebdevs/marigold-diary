import { create } from 'zustand';
import { DEFAULTS } from '../utils/constants';
import { getAllSettings, setSetting } from '../db/queries/settings';

/**
 * Settings live in the SQLite settings table; this store is the in-memory
 * mirror. hydrate() once at startup, then updateSetting() writes through.
 */
export const useSettingsStore = create((set) => ({
  ...DEFAULTS,
  hydrated: false,

  hydrate: async () => {
    const stored = await getAllSettings();
    const next = {};
    for (const key of Object.keys(DEFAULTS)) {
      if (stored[key] !== undefined) next[key] = stored[key];
    }
    // reset to DEFAULTS first so switching to an empty vault never inherits values
    set({ ...DEFAULTS, ...next, hydrated: true });
  },

  updateSetting: async (key, value) => {
    if (!(key in DEFAULTS)) {
      throw new Error(`Unknown setting: ${key}`);
    }
    set({ [key]: value }); // optimistic
    await setSetting(key, value);
  },
}));

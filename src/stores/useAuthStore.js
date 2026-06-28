import { create } from 'zustand';

/**
 * App lock state. Real PIN/biometric logic lands in Phase 6 — until then
 * isUnlocked starts true so the auth gate passes through.
 */
export const useAuthStore = create((set) => ({
  pinEnabled: false,
  biometricsEnabled: false,
  isUnlocked: true, // P6.1 flips this to start false when a PIN is set
  unlockedEntryIds: [], // per-entry locks opened this session
  vault: 'main', // active vault for this session ('main' | 'secret')

  setVault: (vault) => set({ vault }),
  setPinEnabled: (pinEnabled) => set({ pinEnabled }),
  setBiometricsEnabled: (biometricsEnabled) => set({ biometricsEnabled }),
  unlock: () => set({ isUnlocked: true }),
  lock: () => set({ isUnlocked: false, unlockedEntryIds: [] }),
  unlockEntry: (id) =>
    set((s) => ({ unlockedEntryIds: [...new Set([...s.unlockedEntryIds, id])] })),
}));

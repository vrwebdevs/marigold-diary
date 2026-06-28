import { create } from 'zustand';

/** Drive sync status (engine lands in Phase 9; UI reads this store). */
export const useSyncStore = create((set) => ({
  isConnected: false, // Google account linked
  status: 'idle', // idle | syncing | error
  error: null,
  lastSyncedAt: null, // ISO string
  queueCount: 0,
  account: null, // { email, name, photo } when a Google account is linked
  dirty: true, // local changes not yet synced

  setConnected: (isConnected) => set({ isConnected }),
  setAccount: (account) => set({ account, isConnected: !!account }),
  setDirty: (dirty) => set({ dirty }),
  setStatus: (status, error = null) => set({ status, error }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setQueueCount: (queueCount) => set({ queueCount }),
}));

import { create } from 'zustand';

/**
 * UI-side entry state only. Entry DATA lives in SQLite and is fetched via
 * React Query (Phase 3) — never mirror query results into this store.
 */

const initialDraft = {
  id: null, // set when editing an existing entry
  title: '',
  content: '',
  mood: null,
  tagNames: [],
  aiConsent: false,
};

const initialFilters = {
  search: '',
  mood: null,
  tagId: null,
  starredOnly: false,
  sort: 'newest', // newest | oldest
};

export const useEntryStore = create((set) => ({
  // WriteScreen draft (autosave target)
  draft: { ...initialDraft },
  setDraft: (fields) => set((s) => ({ draft: { ...s.draft, ...fields } })),
  resetDraft: () => set({ draft: { ...initialDraft } }),

  // JournalScreen filters
  filters: { ...initialFilters },
  setFilters: (fields) => set((s) => ({ filters: { ...s.filters, ...fields } })),
  resetFilters: () => set({ filters: { ...initialFilters } }),
}));

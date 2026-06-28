import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEntry,
  updateEntry,
  deleteEntry,
  getEntryById,
  listEntries,
  getEntriesByDateKey,
  getEntryDateKeys,
  getEntryTotals,
  getOnThisDay,
} from '../db/queries/entries';
import { entryKeys, tagKeys } from './queryKeys';
import { useSyncStore } from '../stores';

export function useEntries(filters = {}) {
  return useQuery({
    queryKey: entryKeys.list(filters),
    queryFn: () => listEntries(filters),
  });
}

export function useEntry(id) {
  return useQuery({
    queryKey: entryKeys.detail(id),
    queryFn: () => getEntryById(id),
    enabled: !!id,
  });
}

export function useEntriesByDay(dateKey) {
  return useQuery({
    queryKey: entryKeys.byDay(dateKey),
    queryFn: () => getEntriesByDateKey(dateKey),
    enabled: !!dateKey,
  });
}

export function useEntryDateKeys() {
  return useQuery({
    queryKey: entryKeys.dateKeys,
    queryFn: getEntryDateKeys,
  });
}

export function useEntryTotals() {
  return useQuery({
    queryKey: entryKeys.totals,
    queryFn: getEntryTotals,
  });
}

export function useOnThisDay(monthDay, excludeDateKey) {
  return useQuery({
    queryKey: entryKeys.onThisDay(monthDay),
    queryFn: () => getOnThisDay(monthDay, excludeDateKey),
    enabled: !!monthDay,
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entryKeys.all });
      useSyncStore.getState().setDirty(true);
    },
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }) => updateEntry(id, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entryKeys.all });
      useSyncStore.getState().setDirty(true);
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entryKeys.all });
      queryClient.invalidateQueries({ queryKey: tagKeys.all }); // usage counts
      useSyncStore.getState().setDirty(true);
    },
  });
}

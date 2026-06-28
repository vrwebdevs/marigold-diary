import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listTagsWithCounts,
  getTagsForEntry,
  setEntryTags,
  deleteTag,
  getOrCreateTag,
  reorderTags,
} from '../db/queries/tags';
import { tagKeys } from './queryKeys';
import { useSyncStore } from '../stores';

export function useTags() {
  return useQuery({
    queryKey: tagKeys.all,
    queryFn: listTagsWithCounts,
  });
}

export function useEntryTags(entryId) {
  return useQuery({
    queryKey: tagKeys.forEntry(entryId),
    queryFn: () => getTagsForEntry(entryId),
    enabled: !!entryId,
  });
}

export function useSetEntryTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, tagNames }) => setEntryTags(entryId, tagNames),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      useSyncStore.getState().setDirty(true);
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      queryClient.invalidateQueries({ queryKey: ['entries'] }); // tag filters may reference it
      useSyncStore.getState().setDirty(true);
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: getOrCreateTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      useSyncStore.getState().setDirty(true);
    },
  });
}

export function useReorderTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reorderTags,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      useSyncStore.getState().setDirty(true);
    },
  });
}

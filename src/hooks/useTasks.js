import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSyncStore } from '../stores';
import {
  listTaskNames, createTaskName, deleteTaskName, reorderTaskNames,
  listPersons, createPerson, deletePerson, reorderPersons,
  listTaskLogsForDay, listAllTaskLogs,
  createTaskLog, updateTaskLogTime, deleteTaskLog,
} from '../db/queries/tasks';
import { taskKeys } from './queryKeys';

// ── Task Names ────────────────────────────────────────────────
export function useTaskNames() {
  return useQuery({ queryKey: taskKeys.names, queryFn: listTaskNames });
}

export function useCreateTaskName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name) => createTaskName(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.names });
      useSyncStore.getState().setDirty(true);
    },
  });
}

export function useDeleteTaskName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteTaskName(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.names });
      qc.invalidateQueries({ queryKey: taskKeys.logs });
      useSyncStore.getState().setDirty(true);
    },
  });
}

export function useReorderTaskNames() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds) => reorderTaskNames(orderedIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.names }),
  });
}

// ── Persons ───────────────────────────────────────────────────
export function usePersons() {
  return useQuery({ queryKey: taskKeys.persons, queryFn: listPersons });
}

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name) => createPerson(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.persons });
      useSyncStore.getState().setDirty(true);
    },
  });
}

export function useDeletePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deletePerson(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.persons });
      qc.invalidateQueries({ queryKey: taskKeys.logs });
      useSyncStore.getState().setDirty(true);
    },
  });
}

export function useReorderPersons() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds) => reorderPersons(orderedIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.persons }),
  });
}

// ── Task Logs ─────────────────────────────────────────────────
export function useTaskLogsForDay(dateKey) {
  return useQuery({
    queryKey: taskKeys.logsForDay(dateKey),
    queryFn: () => listTaskLogsForDay(dateKey),
    enabled: !!dateKey,
  });
}

export function useAllTaskLogs() {
  return useQuery({ queryKey: taskKeys.allLogs, queryFn: listAllTaskLogs });
}

export function useCreateTaskLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ label, personId, loggedAt }) =>
      createTaskLog(label, personId, loggedAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.logs });
      useSyncStore.getState().setDirty(true);
    },
  });
}

export function useUpdateTaskLogTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, loggedAt }) => updateTaskLogTime(id, loggedAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.logs });
      useSyncStore.getState().setDirty(true);
    },
  });
}

export function useDeleteTaskLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteTaskLog(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.logs });
      useSyncStore.getState().setDirty(true);
    },
  });
}

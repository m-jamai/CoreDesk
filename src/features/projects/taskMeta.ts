import type { TaskStatus } from '../../types';

export const TASK_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'À faire' },
  { id: 'doing', label: 'En cours' },
  { id: 'done', label: 'Terminé' },
];

export const statusLabel = (s: TaskStatus) => TASK_COLUMNS.find((c) => c.id === s)!.label;

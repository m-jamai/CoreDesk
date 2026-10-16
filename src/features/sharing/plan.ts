import { useSyncExternalStore } from 'react';
import { PLANS } from '../../config/plans';
import { useWorkspace } from '../../store/workspace';

export function usePlan() {
  const ws = useWorkspace();
  const id = ws.settings.plan;
  return { id, limits: PLANS[id], isPro: id === 'pro' };
}

/* Plan comparison dialog — openable from anywhere in Work Sharing / Teacher. */
let dialogState: { open: boolean; reason?: string } = { open: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function openPlanDialog(reason?: string) {
  dialogState = { open: true, reason };
  emit();
}
export function closePlanDialog() {
  dialogState = { open: false };
  emit();
}
export function usePlanDialog() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => dialogState,
  );
}

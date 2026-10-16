import { useSyncExternalStore } from 'react';
import type { VaultData } from '../types';
import { STORAGE_KEYS, VAULT_DEMO_PIN, VAULT_IDLE_LOCK_MS, VAULT_VERSION } from '../config/app';
import { createSeedVault } from '../data/vaultSeed';
import { createPersister, readJSON, removeKey } from '../lib/storage';

/* =====================================================================
 * Private Vault store — DEMO ONLY.
 *
 * - Kept in its own store, never merged into the shareable workspace,
 *   never indexed by global search, never offered in Work Sharing.
 * - Holds placeholder names/sizes only. No file contents are read or saved.
 * - The lock state lives in memory; the PIN is a hard-coded constant.
 *   None of this is authentication or encryption. A production vault would
 *   need server-side auth and client-side encryption with user-held keys.
 * ===================================================================== */

interface VaultState {
  data: VaultData;
  unlocked: boolean;
}

function load(): VaultData {
  const saved = readJSON<VaultData>(STORAGE_KEYS.vault);
  if (saved && saved.version === VAULT_VERSION && Array.isArray(saved.docs)) return saved;
  return createSeedVault();
}

let state: VaultState = { data: load(), unlocked: false };
const listeners = new Set<() => void>();
const persist = createPersister(STORAGE_KEYS.vault);
let idleTimer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useVault(): VaultState {
  return useSyncExternalStore(subscribe, () => state);
}

export function setVaultData(update: (d: VaultData) => VaultData) {
  state = { ...state, data: update(state.data) };
  persist(state.data);
  emit();
  bumpIdle();
}

/** Visual PIN check only. Returns true when the demo PIN matches. */
export function tryUnlock(pin: string): boolean {
  if (pin !== VAULT_DEMO_PIN) return false;
  state = { ...state, unlocked: true };
  emit();
  bumpIdle();
  return true;
}

export function lockVault() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = undefined;
  if (!state.unlocked) return;
  state = { ...state, unlocked: false };
  emit();
}

export function bumpIdle() {
  if (!state.unlocked) return;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(lockVault, VAULT_IDLE_LOCK_MS);
}

export function resetVault() {
  removeKey(STORAGE_KEYS.vault);
  state = { data: createSeedVault(), unlocked: false };
  persist(state.data);
  emit();
}

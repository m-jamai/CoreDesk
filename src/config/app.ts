/** Central app constants. */

export const STORAGE_KEYS = {
  workspace: 'coredesk.workspace.v1',
  vault: 'coredesk.vault-demo.v1',
} as const;

/** Bump to force a reseed when the data model changes shape. */
export const WORKSPACE_VERSION = 1;
export const VAULT_VERSION = 1;

/**
 * DEMO ONLY. The Vault PIN is a hard-coded visual gate checked in the browser.
 * It is not authentication and protects nothing. It is shown on the PIN screen.
 */
export const VAULT_DEMO_PIN = '2580';

/** Vault re-locks after this many ms without interaction (demo behaviour). */
export const VAULT_IDLE_LOCK_MS = 5 * 60 * 1000;

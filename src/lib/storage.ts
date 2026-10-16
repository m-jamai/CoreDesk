/**
 * Small, defensive localStorage helpers.
 * Storage can be unavailable (private mode, blocked site data) — the app
 * must keep working in memory when that happens.
 */
export function readJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Debounced writer so rapid edits (dragging, typing) don't thrash storage. */
export function createPersister(key: string, delay = 250) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: unknown;
  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (pending !== undefined) writeJSON(key, pending);
    pending = undefined;
  };
  if (typeof window !== 'undefined') window.addEventListener('beforeunload', flush);
  return (value: unknown) => {
    pending = value;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, delay);
  };
}

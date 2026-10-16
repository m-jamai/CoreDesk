import { useSyncExternalStore } from 'react';

/**
 * Hash-based routing. GitHub Pages serves a single index.html, so
 * routes live after the `#` (e.g. /coredesk/#/projects/p_1/tasks).
 * Refreshing any nested route always works — no 404 redirect tricks.
 */

export interface Route {
  path: string[];
  query: URLSearchParams;
  raw: string;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/projects';
  const [pathPart = '', queryPart = ''] = raw.split('?');
  return {
    raw,
    path: pathPart.split('/').filter(Boolean).map(decodeURIComponent),
    query: new URLSearchParams(queryPart),
  };
}

let current = parse();
const listeners = new Set<() => void>();

window.addEventListener('hashchange', () => {
  current = parse();
  listeners.forEach((l) => l());
});

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => current);
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const hash = `#${to.startsWith('/') ? to : `/${to}`}`;
  if (opts.replace) {
    window.history.replaceState(null, '', hash);
    current = parse();
    listeners.forEach((l) => l());
  } else {
    window.location.hash = hash;
  }
}

export function href(to: string): string {
  return `#${to.startsWith('/') ? to : `/${to}`}`;
}

/** Remove a query param (e.g. `open`) without adding a history entry. */
export function clearQueryParam(name: string) {
  const r = parse();
  if (!r.query.has(name)) return;
  r.query.delete(name);
  const q = r.query.toString();
  navigate(`/${r.path.map(encodeURIComponent).join('/')}${q ? `?${q}` : ''}`, { replace: true });
}

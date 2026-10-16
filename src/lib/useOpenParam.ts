import { useEffect, useRef } from 'react';
import { clearQueryParam } from './router';

/**
 * Deep-link support: `?open=<id>` opens an item once (from search or the Map),
 * then the param is cleared so a refresh doesn't re-open it.
 */
export function useOpenParam(openId: string | null, handler: (id: string) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!openId) return;
    ref.current(openId);
    clearQueryParam('open');
  }, [openId]);
}

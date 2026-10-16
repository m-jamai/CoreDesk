export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

import type { Tone } from '../../types';
export const toneColor = (tone: Tone) => `var(--tone-${tone})`;
export const TONES: Tone[] = ['neutral', 'amber', 'teal', 'blue', 'violet', 'rose'];

import type { Tone } from '../../types';
import s from './ui.module.css';
import { cx, toneColor, TONES } from './cx';

export function TonePicker({ value, onChange, size }: { value: Tone; onChange: (t: Tone) => void; size?: 'sm' }) {
  return (
    <div className={s.tonePicker} role="radiogroup" aria-label="Colour">
      {TONES.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={value === t}
          aria-label={t}
          title={t[0]!.toUpperCase() + t.slice(1)}
          className={cx(s.toneOpt, value === t && s.toneOptOn)}
          style={size === 'sm' ? { width: 20, height: 20 } : undefined}
          onClick={() => onChange(t)}
        >
          <i style={{ background: toneColor(t) }} />
        </button>
      ))}
    </div>
  );
}

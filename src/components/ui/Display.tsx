import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Info, TriangleAlert } from 'lucide-react';
import type { Tone } from '../../types';
import { initials } from '../../lib/format';
import s from './ui.module.css';
import { cx, toneColor } from './cx';

export function Tag({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={s.tag}>
      {tone && <span className={s.dot} style={{ color: toneColor(tone) }} />}
      {children}
    </span>
  );
}

export type PillTone = 'neutral' | 'accent' | 'success' | 'danger' | 'info';

export function Pill({ children, tone = 'neutral', icon: Icon, dot }: { children: ReactNode; tone?: PillTone; icon?: LucideIcon; dot?: boolean }) {
  return (
    <span className={cx(s.pill, tone !== 'neutral' && s[`pill_${tone}`])}>
      {dot && <span className={s.dot} />}
      {Icon && <Icon size={12} strokeWidth={1.75} />}
      {children}
    </span>
  );
}

const AVATAR_TINTS = ['#3b3f47', '#3d4a45', '#4a4238', '#41404d', '#4a3c40', '#3a4550'];

export function Avatar({ name, size = 22 }: { name: string; size?: number }) {
  const tint = AVATAR_TINTS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TINTS.length];
  return (
    <span className={s.avatar} style={{ width: size, height: size, fontSize: Math.max(9, size * 0.4), background: tint }} title={name} aria-label={name}>
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, max = 4, size = 22 }: { names: string[]; max?: number; size?: number }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <span className={s.avatarStack}>
      {shown.map((n) => <Avatar key={n} name={n} size={size} />)}
      {extra > 0 && (
        <span className={s.avatar} style={{ width: size, height: size, fontSize: 9 }}>+{extra}</span>
      )}
    </span>
  );
}

export function Progress({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={s.progress} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={s.progressFill} style={{ width: `${v}%` }} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className={s.empty}>
      <div className={s.emptyIcon}><Icon size={18} strokeWidth={1.5} /></div>
      <div className={s.emptyTitle}>{title}</div>
      {text && <div className={s.emptyText}>{text}</div>}
      {action && <div className={s.emptyAction}>{action}</div>}
    </div>
  );
}

export function Notice({ children, tone = 'neutral', icon }: { children: ReactNode; tone?: 'neutral' | 'warn'; icon?: LucideIcon }) {
  const Icon = icon ?? (tone === 'warn' ? TriangleAlert : Info);
  return (
    <div className={cx(s.notice, tone === 'warn' && s.notice_warn)} role="note">
      <Icon size={14} strokeWidth={1.75} />
      <div>{children}</div>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={s.kbd}>{children}</kbd>;
}

export function Spinner() {
  return <span className={s.spinner} role="status" aria-label="Loading" />;
}

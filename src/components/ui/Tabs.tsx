import type { LucideIcon } from 'lucide-react';
import s from './ui.module.css';
import { cx } from './cx';
import { href as toHref } from '../../lib/router';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
  /** When set, the tab is a link (route-driven tabs). */
  href?: string;
}

export function Tabs({ items, value, onChange, ariaLabel }: { items: TabItem[]; value: string; onChange?: (id: string) => void; ariaLabel: string }) {
  return (
    <nav className={s.tabs} aria-label={ariaLabel}>
      {items.map((t) => {
        const content = (
          <>
            {t.icon && <t.icon size={14} strokeWidth={1.75} />}
            {t.label}
            {t.count !== undefined && <span className={s.tabCount}>{t.count}</span>}
          </>
        );
        const className = cx(s.tab, value === t.id && s.tabActive);
        return t.href ? (
          <a key={t.id} href={toHref(t.href)} className={className} aria-current={value === t.id ? 'page' : undefined}>{content}</a>
        ) : (
          <button key={t.id} type="button" className={className} aria-current={value === t.id ? 'page' : undefined} onClick={() => onChange?.(t.id)}>
            {content}
          </button>
        );
      })}
    </nav>
  );
}

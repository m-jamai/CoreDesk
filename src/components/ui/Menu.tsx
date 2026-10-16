import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';
import s from './ui.module.css';
import { cx } from './cx';
import { IconButton } from './Button';

export type MenuEntry =
  | { type?: 'item'; label: string; icon?: LucideIcon; onSelect: () => void; danger?: boolean; disabled?: boolean; hint?: string }
  | { type: 'separator' }
  | { type: 'label'; label: string };

export interface MenuPosition { x: number; y: number; align?: 'left' | 'right' }

/** Floating menu at a fixed viewport position. Used for dropdowns and right-click menus. */
export function MenuPopover({ position, items, onClose }: { position: MenuPosition; items: MenuEntry[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: position.x, top: position.y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = position.align === 'right' ? position.x - r.width : position.x;
    let top = position.y;
    if (left + r.width > window.innerWidth - 8) left = window.innerWidth - r.width - 8;
    if (top + r.height > window.innerHeight - 8) top = Math.max(8, position.y - r.height - 4);
    setPos({ left: Math.max(8, left), top });
    el.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [position]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const btns = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        const i = btns.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % btns.length : (i - 1 + btns.length) % btns.length;
        btns[next]?.focus();
      }
    };
    const onScroll = () => onClose();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [onClose]);

  return createPortal(
    <div ref={ref} className={s.menu} style={pos} role="menu" onContextMenu={(e) => e.preventDefault()}>
      {items.map((it, i) => {
        if (it.type === 'separator') return <div key={i} className={s.menuSep} />;
        if (it.type === 'label') return <div key={i} className={cx('label', s.menuLabel)}>{it.label}</div>;
        const Icon = it.icon;
        return (
          <button
            key={i}
            type="button"
            role="menuitem"
            disabled={it.disabled}
            className={cx(s.menuItem, it.danger && s.menuItemDanger)}
            onClick={() => { onClose(); it.onSelect(); }}
          >
            {Icon && <Icon size={14} strokeWidth={1.75} />}
            {it.label}
            {it.hint && <span className={s.menuHint}>{it.hint}</span>}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

/** Hook for right-click context menus. */
export function useContextMenu() {
  const [state, setState] = useState<{ pos: MenuPosition; items: MenuEntry[] } | null>(null);
  const open = (e: { clientX: number; clientY: number; preventDefault: () => void }, items: MenuEntry[]) => {
    e.preventDefault();
    setState({ pos: { x: e.clientX, y: e.clientY }, items });
  };
  const node: ReactNode = state ? <MenuPopover position={state.pos} items={state.items} onClose={() => setState(null)} /> : null;
  return { open, node };
}

/** "More" button with a dropdown menu. */
export function MoreMenu({ items, label = 'More actions', icon = MoreHorizontal, size = 'sm' }: { items: MenuEntry[]; label?: string; icon?: LucideIcon; size?: 'sm' | 'md' }) {
  const [pos, setPos] = useState<MenuPosition | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  return (
    <>
      <IconButton
        ref={btn}
        icon={icon}
        label={label}
        size={size}
        active={!!pos}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          if (pos) return setPos(null);
          const r = btn.current!.getBoundingClientRect();
          setPos({ x: r.right, y: r.bottom + 4, align: 'right' });
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      />
      {pos && <MenuPopover position={pos} items={items} onClose={() => setPos(null)} />}
    </>
  );
}

import type { CSSProperties, ReactNode } from 'react';
import s from './ui.module.css';

export function Toolbar({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div className={s.toolbar} style={style}>{children}</div>;
}
export const ToolbarSpacer = () => <div className={s.toolbarSpacer} />;
export const ToolbarSep = () => <div className={s.toolbarSep} aria-hidden />;

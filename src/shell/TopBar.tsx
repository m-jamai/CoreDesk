import { Fragment } from 'react';
import { ChevronRight, Menu, Search } from 'lucide-react';
import s from './Shell.module.css';
import { href } from '../lib/router';
import { IconButton, Kbd } from '../components/ui';

export interface Crumb { label: string; to?: string }

export function TopBar({ crumbs, onMenu, onSearch }: { crumbs: Crumb[]; onMenu: () => void; onSearch: () => void }) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <header className={s.topbar}>
      <IconButton icon={Menu} label="Open navigation" className={s.menuBtn} onClick={onMenu} />
      <nav className={s.crumbs} aria-label="Breadcrumb">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <Fragment key={i}>
              {i > 0 && <ChevronRight size={13} className={s.crumbSep} aria-hidden />}
              {last || !c.to ? (
                <span className={last ? s.crumbCurrent : s.crumb} aria-current={last ? 'page' : undefined}>{c.label}</span>
              ) : (
                <a className={s.crumb} href={href(c.to)}>{c.label}</a>
              )}
            </Fragment>
          );
        })}
      </nav>
      <div className={s.topSpacer} />
      <button type="button" className={s.searchTrigger} onClick={onSearch} aria-label="Search workspace">
        <Search size={13} strokeWidth={1.75} />
        <span>Search workspace</span>
        <Kbd>{isMac ? '⌘K' : 'Ctrl K'}</Kbd>
      </button>
    </header>
  );
}

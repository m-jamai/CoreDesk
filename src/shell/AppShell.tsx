import { useEffect, useState, type ReactNode } from 'react';
import s from './Shell.module.css';
import { Sidebar } from './Sidebar';
import { TopBar, type Crumb } from './TopBar';
import { CommandSearch } from './CommandSearch';
import type { Route } from '../lib/router';

export function AppShell({ route, crumbs, children }: { route: Route; crumbs: Crumb[]; children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => setDrawer(false), [route.raw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={s.app}>
      <Sidebar route={route} open={drawer} onNavigate={() => setDrawer(false)} />
      {drawer && <div className={s.drawerBackdrop} onClick={() => setDrawer(false)} />}
      <div className={s.main}>
        <TopBar crumbs={crumbs} onMenu={() => setDrawer(true)} onSearch={() => setSearch(true)} />
        <main className={s.content} id="main">{children}</main>
      </div>
      <CommandSearch open={search} onClose={() => setSearch(false)} />
    </div>
  );
}

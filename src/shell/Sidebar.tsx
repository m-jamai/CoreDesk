import { Settings } from 'lucide-react';
import s from './Shell.module.css';
import { NAV } from './nav';
import { href, type Route } from '../lib/router';
import { useWorkspace } from '../store/workspace';
import { Avatar, cx, toneColor } from '../components/ui';

export function Sidebar({ route, open, onNavigate }: { route: Route; open: boolean; onNavigate: () => void }) {
  const ws = useWorkspace();
  const top = route.path[0] ?? 'projects';
  const recentProjects = [...ws.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const recentBoards = [...ws.boards].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);

  return (
    <aside className={cx(s.sidebar, open && s.sidebarOpen)} aria-label="Main navigation">
      <div className={s.brand}>
        <span className={s.mark} aria-hidden><i /><i /><i /></span>
        <span className={s.wordmark}>CoreDesk</span>
        <span className={s.demoChip} title="Front-end prototype with local demo data">Demo</span>
      </div>

      <div className={s.scroll}>
        <nav className={s.nav}>
          {NAV.map((n) => {
            const active = top === n.id;
            return (
              <a
                key={n.id}
                href={href(n.path)}
                className={cx(s.navItem, active && s.navActive)}
                aria-current={active ? 'page' : undefined}
                title={n.label}
                onClick={onNavigate}
              >
                <n.icon size={16} strokeWidth={1.75} />
                <span className={s.navLabel}>{n.label}</span>
              </a>
            );
          })}
        </nav>

        <div className={s.group}>
          <div className={cx('label', s.groupLabel)}>Recent projects</div>
          {recentProjects.map((p) => (
            <a
              key={p.id}
              href={href(`/projects/${p.id}/sections`)}
              className={cx(s.subItem, route.path[0] === 'projects' && route.path[1] === p.id && s.subActive)}
              onClick={onNavigate}
            >
              <span className={s.swatch} style={{ background: toneColor(p.tone) }} />
              <span>{p.name}</span>
            </a>
          ))}
        </div>

        <div className={s.group}>
          <div className={cx('label', s.groupLabel)}>Recent boards</div>
          {recentBoards.map((b) => (
            <a
              key={b.id}
              href={href(`/board/${b.id}`)}
              className={cx(s.subItem, route.path[0] === 'board' && route.path[1] === b.id && s.subActive)}
              onClick={onNavigate}
            >
              <span className={s.swatch} style={{ background: 'var(--line-focus)' }} />
              <span>{b.name}</span>
            </a>
          ))}
        </div>
      </div>

      <div className={s.foot}>
        <a href={href('/settings')} className={cx(s.navItem, top === 'settings' && s.navActive)} title="Settings" onClick={onNavigate}>
          <Settings size={16} strokeWidth={1.75} />
          <span className={s.navLabel}>Settings</span>
        </a>
        <div className={s.user}>
          <Avatar name={ws.settings.displayName} size={24} />
          <div className={s.userText}>
            <div className={s.userName}>{ws.settings.displayName}</div>
            <div className={s.userMeta}>Local demo workspace</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

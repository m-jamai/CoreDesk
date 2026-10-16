import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownUp, CheckSquare, CornerDownLeft, File, Folder, GraduationCap, Layers, LockKeyhole,
  NotebookPen, Search, Shapes, StickyNote, AlignLeft, type LucideIcon,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import s from './Shell.module.css';
import { useWorkspace } from '../store/workspace';
import { navigate } from '../lib/router';
import { cx } from '../components/ui';

interface Result {
  id: string;
  group: string;
  title: string;
  meta: string;
  icon: LucideIcon;
  to: string;
}

/**
 * Local search across the shareable workspace.
 * The Private Vault lives in a separate store and is intentionally never indexed here.
 */
export function CommandSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ws = useWorkspace();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) { setQ(''); setActive(0); } }, [open]);

  const results = useMemo<Result[]>(() => {
    const query = q.trim().toLowerCase();
    const projectName = new Map(ws.projects.map((p) => [p.id, p.name]));
    const boardName = new Map(ws.boards.map((b) => [b.id, b.name]));
    const match = (...fields: string[]) => !query || fields.some((f) => f.toLowerCase().includes(query));
    const out: Result[] = [];
    const push = (r: Result) => out.push(r);

    ws.projects.filter((p) => match(p.name, p.description, p.tags.join(' '))).forEach((p) =>
      push({ id: p.id, group: 'Projects', title: p.name, meta: p.status, icon: Layers, to: `/projects/${p.id}/sections` }));
    ws.boards.filter((b) => match(b.name, b.description)).forEach((b) =>
      push({ id: b.id, group: 'Boards', title: b.name, meta: 'Board', icon: Shapes, to: `/board/${b.id}` }));
    if (query) {
      ws.sections.filter((x) => match(x.title, x.content, x.tags.join(' '))).forEach((x) =>
        push({ id: x.id, group: 'Sections', title: x.title, meta: projectName.get(x.projectId) ?? '', icon: AlignLeft, to: `/projects/${x.projectId}/sections?open=${x.id}` }));
      ws.tasks.filter((x) => match(x.title, x.description)).forEach((x) =>
        push({ id: x.id, group: 'Tasks', title: x.title, meta: projectName.get(x.projectId) ?? '', icon: CheckSquare, to: `/projects/${x.projectId}/tasks?open=${x.id}` }));
      ws.notes.filter((x) => match(x.title, x.body, x.tags.join(' '))).forEach((x) =>
        push({ id: x.id, group: 'Notes', title: x.title, meta: projectName.get(x.projectId) ?? '', icon: NotebookPen, to: `/projects/${x.projectId}/notes?open=${x.id}` }));
      ws.files.filter((x) => match(x.name)).forEach((x) =>
        push({ id: x.id, group: 'Files', title: x.name, meta: projectName.get(x.projectId) ?? '', icon: x.kind === 'folder' ? Folder : File, to: `/projects/${x.projectId}/files?open=${x.id}` }));
      ws.cards.filter((x) => match(x.title, x.body)).forEach((x) =>
        push({ id: x.id, group: 'Ideas', title: x.title, meta: boardName.get(x.boardId) ?? '', icon: StickyNote, to: `/board/${x.boardId}?open=${x.id}` }));
    }
    ws.courses.filter((c) => match(c.title, c.summary, c.audience)).forEach((c) =>
      push({ id: c.id, group: 'Courses', title: c.title, meta: c.visibility, icon: GraduationCap, to: `/sharing/teacher/${c.id}` }));
    return out.slice(0, 40);
  }, [q, ws]);

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const go = (r?: Result) => {
    if (!r) return;
    onClose();
    navigate(r.to);
  };

  let lastGroup = '';

  return createPortal(
    <div className={s.palette} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={s.paletteBox} role="dialog" aria-modal="true" aria-label="Search workspace">
        <div className={s.paletteInput}>
          <Search size={16} strokeWidth={1.75} />
          <input
            autoFocus
            value={q}
            placeholder="Search projects, tasks, notes, files, boards, courses…"
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search query"
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
              else if (e.key === 'Enter') go(results[active]);
            }}
          />
        </div>
        <div className={s.results} ref={listRef} role="listbox">
          {results.length === 0 && <div className={s.noResults}>No matches for “{q}”.</div>}
          {results.map((r, i) => {
            const header = r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            return (
              <div key={`${r.group}-${r.id}`}>
                {header && <div className={cx('label', s.resultGroup)}>{header}</div>}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  data-index={i}
                  className={cx(s.result, i === active && s.resultActive)}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(r)}
                >
                  <r.icon size={15} strokeWidth={1.75} />
                  <span className={s.resultTitle}>{r.title}</span>
                  <span className={s.resultMeta}>{r.meta}</span>
                </button>
              </div>
            );
          })}
        </div>
        <div className={s.paletteFoot}>
          <span><ArrowDownUp size={12} /> Navigate</span>
          <span><CornerDownLeft size={12} /> Open</span>
          <span className={s.privacy}><LockKeyhole size={12} /> Private Vault is never searched</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

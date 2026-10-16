import { useMemo, useState } from 'react';
import { FolderPlus, Layers, Network, Pencil, Plus, Share2, Trash2 } from 'lucide-react';
import type { Project, ProjectStatus } from '../../types';
import L from '../../components/layout/layout.module.css';
import s from './projects.module.css';
import {
  Button, EmptyState, MoreMenu, Pill, Progress, SearchInput, Segmented, Tag, Toolbar, ToolbarSpacer,
  toneColor, useContextMenu, useFeedback, type MenuEntry, type PillTone,
} from '../../components/ui';
import { deleteProject, useWorkspace } from '../../store/workspace';
import { navigate } from '../../lib/router';
import { relativeTime } from '../../lib/format';
import { ProjectDialog } from './dialogs';

type Filter = 'all' | ProjectStatus;

export const STATUS_PILL: Record<ProjectStatus, { label: string; tone: PillTone }> = {
  active: { label: 'Active', tone: 'accent' },
  planning: { label: 'Planning', tone: 'info' },
  paused: { label: 'Paused', tone: 'neutral' },
  archived: { label: 'Archived', tone: 'neutral' },
};

export function ProjectsOverview() {
  const ws = useWorkspace();
  const { confirm, toast } = useFeedback();
  const ctx = useContextMenu();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [dialog, setDialog] = useState<{ project?: Project } | null>(null);

  const stats = useMemo(() => {
    const m = new Map<string, { sections: number; files: number; notes: number; tasks: number; done: number; shared: boolean }>();
    for (const p of ws.projects) m.set(p.id, { sections: 0, files: 0, notes: 0, tasks: 0, done: 0, shared: false });
    ws.sections.forEach((x) => m.get(x.projectId) && m.get(x.projectId)!.sections++);
    ws.files.forEach((x) => x.kind === 'document' && m.get(x.projectId) && m.get(x.projectId)!.files++);
    ws.notes.forEach((x) => m.get(x.projectId) && m.get(x.projectId)!.notes++);
    ws.tasks.forEach((x) => {
      const st = m.get(x.projectId);
      if (!st) return;
      st.tasks++;
      if (x.status === 'done') st.done++;
    });
    ws.shares.forEach((sh) => { if (sh.itemType === 'project' && sh.status === 'active' && m.get(sh.itemId)) m.get(sh.itemId)!.shared = true; });
    return m;
  }, [ws]);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return [...ws.projects]
      .filter((p) => filter === 'all' || p.status === filter)
      .filter((p) => !query || [p.name, p.description, ...p.tags].some((f) => f.toLowerCase().includes(query)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [ws.projects, q, filter]);

  const menuFor = (p: Project): MenuEntry[] => [
    { label: 'Open', icon: Layers, onSelect: () => navigate(`/projects/${p.id}/sections`) },
    { label: 'Open Map', icon: Network, onSelect: () => navigate(`/projects/${p.id}/map`) },
    { label: 'Edit details', icon: Pencil, onSelect: () => setDialog({ project: p }) },
    { label: 'Share…', icon: Share2, onSelect: () => navigate(`/sharing?new=project:${p.id}`) },
    { type: 'separator' },
    {
      label: 'Delete project', icon: Trash2, danger: true,
      onSelect: async () => {
        const ok = await confirm({
          title: `Delete “${p.name}”?`,
          message: 'All sections, files, tasks, notes and Map nodes in this project will be removed, and any share of it will be revoked. This cannot be undone.',
          confirmLabel: 'Delete project',
          danger: true,
        });
        if (ok) { deleteProject(p.id); toast('Project deleted'); }
      },
    },
  ];

  return (
    <>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Filter projects" />
        <Segmented<Filter>
          ariaLabel="Status filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'planning', label: 'Planning' },
            { value: 'paused', label: 'Paused' },
          ]}
        />
        <ToolbarSpacer />
        <Button variant="primary" icon={Plus} onClick={() => setDialog({})}>New project</Button>
      </Toolbar>

      <div className={L.scroll}>
        <div className={L.inner}>
          {list.length === 0 ? (
            ws.projects.length === 0 ? (
              <EmptyState icon={FolderPlus} title="No projects yet" text="Projects hold sections, files, tasks, notes and a Map — all connected." action={<Button variant="primary" icon={Plus} onClick={() => setDialog({})}>Create your first project</Button>} />
            ) : (
              <EmptyState icon={Layers} title="No matching projects" text="Try a different search or status filter." action={<Button onClick={() => { setQ(''); setFilter('all'); }}>Clear filters</Button>} />
            )
          ) : (
            <div className={s.grid}>
              {list.map((p) => {
                const st = stats.get(p.id)!;
                const pct = st.tasks ? (st.done / st.tasks) * 100 : 0;
                return (
                  <div
                    key={p.id}
                    role="link"
                    tabIndex={0}
                    className={s.projectCard}
                    onClick={() => navigate(`/projects/${p.id}/sections`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/projects/${p.id}/sections`); }}
                    onContextMenu={(e) => ctx.open(e, menuFor(p))}
                  >
                    <div className={s.cardStripe} style={{ background: toneColor(p.tone) }} />
                    <div className={s.cardMain}>
                      <div className={s.cardTop}>
                        <div className={s.cardTitle}>{p.name}</div>
                        <span onClick={(e) => e.stopPropagation()}><MoreMenu items={menuFor(p)} /></span>
                      </div>
                      <div className={s.cardDesc}>{p.description || 'No description'}</div>
                      <div className={s.cardTags}>
                        <Pill tone={STATUS_PILL[p.status].tone} dot>{STATUS_PILL[p.status].label}</Pill>
                        {p.tags.map((t) => <Tag key={t}>{t}</Tag>)}
                      </div>
                    </div>
                    <div className={s.cardMeters}>
                      <div className={s.meter}><span className="label">Sections</span><span className={s.meterValue}>{st.sections}</span></div>
                      <div className={s.meter}><span className="label">Tasks</span><span className={s.meterValue}>{st.done}/{st.tasks}</span></div>
                      <div className={s.meter}><span className="label">Files</span><span className={s.meterValue}>{st.files}</span></div>
                      <div className={s.meter}><span className="label">Notes</span><span className={s.meterValue}>{st.notes}</span></div>
                    </div>
                    <div className={s.cardFoot}>
                      <div className={s.grow}><Progress value={pct} label="Tasks completed" /></div>
                      {st.shared && <span title="Shared in Work Sharing" style={{ display: 'inline-flex' }}><Share2 size={12} /></span>}
                      <span>{relativeTime(p.updatedAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ProjectDialog
        open={!!dialog}
        project={dialog?.project}
        onClose={() => setDialog(null)}
        onCreated={(id) => navigate(`/projects/${id}/sections`)}
      />
      {ctx.node}
    </>
  );
}

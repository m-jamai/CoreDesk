import { useMemo, useState } from 'react';
import { AlignLeft, Network, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import type { Project, Section } from '../../types';
import L from '../../components/layout/layout.module.css';
import s from './projects.module.css';
import {
  Button, EmptyState, IconButton, MoreMenu, SearchInput, Segmented, Select, Tag, Toolbar, ToolbarSpacer,
  cx, useFeedback,
} from '../../components/ui';
import { addMapNode, deleteSection, isOnMap, patch, useWorkspace } from '../../store/workspace';
import { relativeTime } from '../../lib/format';
import { useOpenParam } from '../../lib/useOpenParam';
import { navigate } from '../../lib/router';
import { SectionDialog } from './dialogs';

export function SectionsView({ project, openId }: { project: Project; openId: string | null }) {
  const ws = useWorkspace();
  const { confirm, toast } = useFeedback();
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'all' | 'favorites'>('all');
  const [tag, setTag] = useState('');
  const [dialog, setDialog] = useState<{ section?: Section } | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  const sections = useMemo(() => ws.sections.filter((x) => x.projectId === project.id), [ws.sections, project.id]);
  const allTags = useMemo(() => Array.from(new Set(sections.flatMap((x) => x.tags))).sort(), [sections]);

  useOpenParam(openId, (id) => {
    const sec = sections.find((x) => x.id === id);
    if (sec) { setHighlight(id); setDialog({ section: sec }); }
  });

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return sections
      .filter((x) => mode === 'all' || x.favorite)
      .filter((x) => !tag || x.tags.includes(tag))
      .filter((x) => !query || x.title.toLowerCase().includes(query) || x.content.toLowerCase().includes(query))
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt.localeCompare(a.updatedAt));
  }, [sections, q, mode, tag]);

  const remove = async (sec: Section) => {
    if (await confirm({ title: `Delete “${sec.title}”?`, message: 'The section and any Map nodes pointing to it will be removed.', confirmLabel: 'Delete section', danger: true })) {
      deleteSection(sec.id);
      toast('Section deleted');
    }
  };

  return (
    <>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search sections" />
        <Segmented
          ariaLabel="Show"
          value={mode}
          onChange={setMode}
          options={[{ value: 'all', label: 'All' }, { value: 'favorites', label: 'Favorites', icon: Star }]}
        />
        {allTags.length > 0 && (
          <Select value={tag} onChange={(e) => setTag(e.target.value)} style={{ width: 140, height: 28, fontSize: 'var(--fs-sm)' }} aria-label="Filter by tag">
            <option value="">All tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        )}
        <ToolbarSpacer />
        <Button variant="primary" icon={Plus} onClick={() => setDialog({})}>New section</Button>
      </Toolbar>

      <div className={L.scroll}>
        <div className={L.inner}>
          {list.length === 0 ? (
            sections.length === 0 ? (
              <EmptyState icon={AlignLeft} title="No sections yet" text="Sections structure the project: briefs, principles, specs, plans." action={<Button variant="primary" icon={Plus} onClick={() => setDialog({})}>Add a section</Button>} />
            ) : (
              <EmptyState icon={AlignLeft} title="Nothing matches" text="Adjust the search, tag or favorites filter." action={<Button onClick={() => { setQ(''); setTag(''); setMode('all'); }}>Clear filters</Button>} />
            )
          ) : (
            <div className={s.sectionsGrid}>
              {list.map((sec) => {
                const onMap = isOnMap(ws, 'section', sec.id);
                return (
                  <article key={sec.id} className={cx(s.block, highlight === sec.id && s.blockHighlight)}>
                    <div className={s.blockHead}>
                      <button type="button" className={s.blockTitle} onClick={() => setDialog({ section: sec })}>{sec.title}</button>
                      <IconButton
                        icon={Star}
                        size="sm"
                        label={sec.favorite ? 'Remove from favorites' : 'Add to favorites'}
                        className={cx(s.star, sec.favorite && s.starOn)}
                        onClick={() => { patch('sections', sec.id, { favorite: !sec.favorite }); toast(sec.favorite ? 'Removed from favorites' : 'Added to favorites'); }}
                      />
                      <MoreMenu items={[
                        { label: 'Edit', icon: Pencil, onSelect: () => setDialog({ section: sec }) },
                        onMap
                          ? { label: 'Show on Map', icon: Network, onSelect: () => navigate(`/projects/${project.id}/map`) }
                          : { label: 'Add to Map', icon: Network, onSelect: () => { addMapNode(project.id, 'section', sec.id); toast('Added to Map'); } },
                        { type: 'separator' },
                        { label: 'Delete', icon: Trash2, danger: true, onSelect: () => remove(sec) },
                      ]} />
                    </div>
                    <div className={s.blockBody} onClick={() => setDialog({ section: sec })}>
                      {sec.content || <span style={{ color: 'var(--text-3)' }}>Empty section — click to write.</span>}
                    </div>
                    <div className={s.blockFoot}>
                      {sec.tags.map((t) => <Tag key={t}>{t}</Tag>)}
                      <span className={s.grow} />
                      {onMap && <span className={s.onMap} title="On the project Map"><Network size={11} /></span>}
                      <span>{relativeTime(sec.updatedAt)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <SectionDialog open={!!dialog} onClose={() => { setDialog(null); setHighlight(null); }} projectId={project.id} section={dialog?.section} />
    </>
  );
}

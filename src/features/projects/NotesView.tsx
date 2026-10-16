import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Network, NotebookPen, Plus, Trash2 } from 'lucide-react';
import type { Note, Project } from '../../types';
import s from './projects.module.css';
import {
  Button, EmptyState, IconButton, SearchInput, Select, Tag, Toolbar, ToolbarSpacer, cx, useFeedback,
} from '../../components/ui';
import { addMapNode, deleteNote, insert, isOnMap, patch, touchProject, useWorkspace } from '../../store/workspace';
import { dateTime, nowISO, parseTags, relativeTime, shortDate } from '../../lib/format';
import { uid } from '../../lib/id';
import { useOpenParam } from '../../lib/useOpenParam';
import { navigate } from '../../lib/router';

export function NotesView({ project, openId }: { project: Project; openId: string | null }) {
  const ws = useWorkspace();
  const { confirm, toast } = useFeedback();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileEditing, setMobileEditing] = useState(false);

  const notes = useMemo(() => ws.notes.filter((n) => n.projectId === project.id), [ws.notes, project.id]);
  const allTags = useMemo(() => Array.from(new Set(notes.flatMap((n) => n.tags))).sort(), [notes]);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return notes
      .filter((n) => !tag || n.tags.includes(tag))
      .filter((n) => !query || n.title.toLowerCase().includes(query) || n.body.toLowerCase().includes(query))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, q, tag]);

  // Keep a valid selection
  useEffect(() => {
    if (activeId && notes.some((n) => n.id === activeId)) return;
    setActiveId(list[0]?.id ?? null);
  }, [activeId, notes, list]);

  useOpenParam(openId, (id) => {
    if (notes.some((n) => n.id === id)) { setActiveId(id); setMobileEditing(true); setQ(''); setTag(''); }
  });

  const active = notes.find((n) => n.id === activeId) ?? null;

  const create = () => {
    const id = uid('n');
    insert('notes', { id, projectId: project.id, title: '', body: '', tags: [], createdAt: nowISO(), updatedAt: nowISO() });
    touchProject(project.id);
    setQ(''); setTag('');
    setActiveId(id);
    setMobileEditing(true);
    toast('Note created');
  };

  const remove = async (n: Note) => {
    if (await confirm({ title: `Delete “${n.title || 'Untitled note'}”?`, message: 'The note and any Map node pointing to it will be removed.', confirmLabel: 'Delete note', danger: true })) {
      deleteNote(n.id);
      setMobileEditing(false);
      toast('Note deleted');
    }
  };

  return (
    <>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search notes" />
        {allTags.length > 0 && (
          <Select value={tag} onChange={(e) => setTag(e.target.value)} style={{ width: 140, height: 28, fontSize: 'var(--fs-sm)' }} aria-label="Filter by tag">
            <option value="">All tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        )}
        <ToolbarSpacer />
        <Button variant="primary" icon={Plus} onClick={create}>New note</Button>
      </Toolbar>

      {notes.length === 0 ? (
        <EmptyState icon={NotebookPen} title="No notes yet" text="Capture meeting notes, observations and loose thoughts. Notes save as you type." action={<Button variant="primary" icon={Plus} onClick={create}>Write a note</Button>} />
      ) : (
        <div className={cx(s.notes, mobileEditing && s.notesEditing)}>
          <div className={s.noteList} role="listbox" aria-label="Notes">
            {list.length === 0 && <div style={{ padding: 20, color: 'var(--text-2)', fontSize: 'var(--fs-sm)', textAlign: 'center' }}>No notes match.</div>}
            {list.map((n) => (
              <button
                key={n.id}
                type="button"
                role="option"
                aria-selected={n.id === activeId}
                className={cx(s.noteItem, n.id === activeId && s.noteActive)}
                onClick={() => { setActiveId(n.id); setMobileEditing(true); }}
              >
                <span className={s.noteItemTitle}>{n.title || 'Untitled note'}</span>
                <span className={s.noteItemSnippet}>{n.body || 'No content'}</span>
                <span className={s.noteItemMeta}>
                  <span>{shortDate(n.updatedAt)}</span>
                  {n.tags.slice(0, 3).map((t) => <span key={t}>#{t}</span>)}
                </span>
              </button>
            ))}
          </div>
          <div className={s.editor}>
            {active ? <NoteEditor key={active.id} note={active} onBack={() => setMobileEditing(false)} onDelete={() => remove(active)} projectId={project.id} onMap={isOnMap(ws, 'note', active.id)} /> : null}
          </div>
        </div>
      )}
    </>
  );
}

function NoteEditor({ note, onBack, onDelete, projectId, onMap }: { note: Note; onBack: () => void; onDelete: () => void; projectId: string; onMap: boolean }) {
  const { toast } = useFeedback();
  const [tags, setTags] = useState(note.tags.join(', '));

  const update = (changes: Partial<Note>) => {
    patch('notes', note.id, { ...changes, updatedAt: nowISO() });
    touchProject(projectId);
  };

  return (
    <>
      <Toolbar style={{ background: 'var(--bg-0)' }}>
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack} className={s.backBtn}>Notes</Button>
        <span className="label">Saved {relativeTime(note.updatedAt)}</span>
        <ToolbarSpacer />
        {onMap
          ? <Button size="sm" variant="ghost" icon={Network} onClick={() => navigate(`/projects/${projectId}/map`)}>On Map</Button>
          : <Button size="sm" variant="ghost" icon={Network} onClick={() => { addMapNode(projectId, 'note', note.id); toast('Added to Map'); }}>Add to Map</Button>}
        <IconButton icon={Trash2} label="Delete note" size="sm" onClick={onDelete} />
      </Toolbar>
      <div className={s.editorInner}>
        <div className={s.editorMeta}>
          <span>Created {dateTime(note.createdAt)}</span>
          {note.tags.map((t) => <Tag key={t}>{t}</Tag>)}
        </div>
        <input
          className={s.editorTitle}
          value={note.title}
          placeholder="Untitled note"
          aria-label="Note title"
          maxLength={120}
          autoFocus={!note.title}
          onChange={(e) => update({ title: e.target.value })}
        />
        <input
          className={s.editorTags}
          value={tags}
          placeholder="Add tags, separated by commas"
          aria-label="Tags"
          onChange={(e) => setTags(e.target.value)}
          onBlur={() => { const t = parseTags(tags); setTags(t.join(', ')); if (t.join() !== note.tags.join()) update({ tags: t }); }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        />
        <textarea
          className={s.editorBody}
          value={note.body}
          placeholder="Start writing…"
          aria-label="Note body"
          onChange={(e) => update({ body: e.target.value })}
        />
      </div>
    </>
  );
}

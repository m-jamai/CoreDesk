import { useMemo, useState, type DragEvent } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Network, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Project, Task, TaskPriority, TaskStatus } from '../../types';
import s from './projects.module.css';
import {
  Button, IconButton, MoreMenu, SearchInput, Segmented, Toolbar, ToolbarSpacer, cx, useFeedback, type MenuEntry,
} from '../../components/ui';
import { addMapNode, deleteTask, isOnMap, moveTask, useWorkspace } from '../../store/workspace';
import { shortDate } from '../../lib/format';
import { useOpenParam } from '../../lib/useOpenParam';
import { navigate } from '../../lib/router';
import { TaskDialog } from './dialogs';
import { TASK_COLUMNS } from './taskMeta';

type PrioFilter = 'all' | TaskPriority;

export function TasksView({ project, openId }: { project: Project; openId: string | null }) {
  const ws = useWorkspace();
  const { confirm, toast } = useFeedback();
  const [q, setQ] = useState('');
  const [prio, setPrio] = useState<PrioFilter>('all');
  const [dialog, setDialog] = useState<{ task?: Task; status?: TaskStatus } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ status: TaskStatus; index: number } | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  const tasks = useMemo(() => ws.tasks.filter((t) => t.projectId === project.id), [ws.tasks, project.id]);

  useOpenParam(openId, (id) => {
    const t = tasks.find((x) => x.id === id);
    if (t) { setHighlight(id); setDialog({ task: t }); }
  });

  const columns = useMemo(() => {
    const query = q.trim().toLowerCase();
    const visible = tasks
      .filter((t) => prio === 'all' || t.priority === prio)
      .filter((t) => !query || t.title.toLowerCase().includes(query) || t.description.toLowerCase().includes(query));
    return TASK_COLUMNS.map((c) => ({
      ...c,
      tasks: visible.filter((t) => t.status === c.id).sort((a, b) => a.order - b.order),
      total: tasks.filter((t) => t.status === c.id).length,
    }));
  }, [tasks, q, prio]);

  const filtered = q.trim() !== '' || prio !== 'all';

  const remove = async (t: Task) => {
    if (await confirm({ title: `Delete “${t.title}”?`, message: 'This task will be removed from the board and the Map.', confirmLabel: 'Delete task', danger: true })) {
      deleteTask(t.id);
      toast('Task deleted');
    }
  };

  const moveBy = (t: Task, dir: -1 | 1) => {
    const idx = TASK_COLUMNS.findIndex((c) => c.id === t.status);
    const target = TASK_COLUMNS[idx + dir];
    if (!target) return;
    moveTask(t.id, target.id);
    toast(`Moved to ${target.label}`);
  };

  const menuFor = (t: Task): MenuEntry[] => [
    { label: 'Edit', icon: Pencil, onSelect: () => setDialog({ task: t }) },
    { type: 'label', label: 'Move to' },
    ...TASK_COLUMNS.filter((c) => c.id !== t.status).map<MenuEntry>((c) => ({
      label: c.label, icon: ArrowRight, onSelect: () => { moveTask(t.id, c.id); toast(`Moved to ${c.label}`); },
    })),
    { type: 'separator' },
    isOnMap(ws, 'task', t.id)
      ? { label: 'Show on Map', icon: Network, onSelect: () => navigate(`/projects/${project.id}/map`) }
      : { label: 'Add to Map', icon: Network, onSelect: () => { addMapNode(project.id, 'task', t.id); toast('Added to Map'); } },
    { label: 'Delete', icon: Trash2, danger: true, onSelect: () => remove(t) },
  ];

  /* ---------- native drag & drop ---------- */
  const onDragStart = (e: DragEvent, t: Task) => {
    e.dataTransfer.setData('text/plain', t.id);
    e.dataTransfer.effectAllowed = 'move';
    setDragId(t.id);
  };

  const onColumnDragOver = (e: DragEvent, status: TaskStatus, list: Task[]) => {
    if (!dragId) return;
    e.preventDefault();
    // Find insertion index from pointer position against card midpoints.
    const cards = Array.from((e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[data-task-id]'));
    let index = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i]!.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) { index = i; break; }
    }
    // Account for the dragged card itself being in this column.
    const selfIndex = list.findIndex((t) => t.id === dragId);
    const effective = selfIndex !== -1 && selfIndex < index ? index - 1 : index;
    if (!over || over.status !== status || over.index !== effective) setOver({ status, index: effective });
  };

  const onDrop = (e: DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    if (id) {
      const task = tasks.find((t) => t.id === id);
      // When filtered, place relative to visible order — map visible index to full column index.
      let index = over?.status === status ? over.index : undefined;
      if (index !== undefined && filtered) {
        const visible = columns.find((c) => c.id === status)!.tasks.filter((t) => t.id !== id);
        const anchor = visible[index];
        const full = tasks.filter((t) => t.status === status && t.id !== id).sort((a, b) => a.order - b.order);
        index = anchor ? full.findIndex((t) => t.id === anchor.id) : full.length;
      }
      moveTask(id, status, index);
      if (task && task.status !== status) toast(`Moved to ${TASK_COLUMNS.find((c) => c.id === status)!.label}`);
    }
    setDragId(null);
    setOver(null);
  };

  const now = Date.now();

  return (
    <>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search tasks" />
        <Segmented<PrioFilter>
          ariaLabel="Priority"
          value={prio}
          onChange={setPrio}
          options={[{ value: 'all', label: 'All' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]}
        />
        <ToolbarSpacer />
        <span className="label" style={{ whiteSpace: 'nowrap' }}>Drag cards between columns</span>
        <Button variant="primary" icon={Plus} onClick={() => setDialog({ status: 'todo' })}>New task</Button>
      </Toolbar>

      <div className={s.kanban}>
        {columns.map((col, colIndex) => (
          <section
            key={col.id}
            className={cx(s.column, over?.status === col.id && s.columnOver)}
            aria-label={col.label}
            onDragOver={(e) => onColumnDragOver(e, col.id, col.tasks)}
            onDragLeave={(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setOver(null); }}
            onDrop={(e) => onDrop(e, col.id)}
          >
            <header className={s.columnHead}>
              <span className={cx(s.statusDot, col.id !== 'todo' && s[`statusDot_${col.id}`])} />
              <span className={s.columnName}>{col.label}</span>
              <span className={s.columnCount}>{filtered ? `${col.tasks.length}/${col.total}` : col.total}</span>
              <span style={{ flex: 1 }} />
              <IconButton icon={Plus} size="sm" label={`Add task to ${col.label}`} onClick={() => setDialog({ status: col.id })} />
            </header>
            <div className={s.columnBody}>
              {col.tasks.length === 0 && !(over?.status === col.id) && (
                <div className={s.columnEmpty}>{filtered ? 'No matching tasks' : 'Drop tasks here'}</div>
              )}
              {col.tasks.map((t, i) => {
                const overdue = t.due && t.status !== 'done' && new Date(t.due).getTime() < now;
                return (
                  <div key={t.id} style={{ display: 'contents' }}>
                    {over?.status === col.id && dragId !== t.id && over.index === col.tasks.slice(0, i).filter((x) => x.id !== dragId).length && <div className={s.dropLine} />}
                    <article
                      data-task-id={t.id}
                      className={cx(s.taskCard, dragId === t.id && s.taskDragging, t.status === 'done' && s.taskDone, highlight === t.id && s.taskHighlight)}
                      draggable
                      onDragStart={(e) => onDragStart(e, t)}
                      onDragEnd={() => { setDragId(null); setOver(null); }}
                      onDoubleClick={() => setDialog({ task: t })}
                    >
                      <div className={s.taskTop}>
                        <div className={s.taskTitle}>{t.title}</div>
                        <MoreMenu items={menuFor(t)} />
                      </div>
                      {t.description && <div className={s.taskDesc}>{t.description}</div>}
                      <div className={s.taskMeta}>
                        <span className={cx(s.prio, s[`prio_${t.priority}`])} title={`${t.priority} priority`}>
                          <span className={s.prioBars}><i /><i /><i /></span>{t.priority}
                        </span>
                        {t.due && (
                          <span className={cx(overdue && s.overdue)} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }} title={overdue ? 'Overdue' : 'Due date'}>
                            <CalendarDays size={11} />{shortDate(t.due)}
                          </span>
                        )}
                        <span style={{ flex: 1 }} />
                        <IconButton icon={ArrowLeft} size="sm" label="Move left" disabled={colIndex === 0} onClick={() => moveBy(t, -1)} />
                        <IconButton icon={ArrowRight} size="sm" label="Move right" disabled={colIndex === TASK_COLUMNS.length - 1} onClick={() => moveBy(t, 1)} />
                      </div>
                    </article>
                  </div>
                );
              })}
              {over?.status === col.id && over.index >= col.tasks.filter((t) => t.id !== dragId).length && <div className={s.dropLine} />}
              <button type="button" className={s.addTask} onClick={() => setDialog({ status: col.id })}><Plus size={13} /> Add task</button>
            </div>
          </section>
        ))}
      </div>

      <TaskDialog
        open={!!dialog}
        onClose={() => { setDialog(null); setHighlight(null); }}
        projectId={project.id}
        task={dialog?.task}
        defaultStatus={dialog?.status}
      />
    </>
  );
}

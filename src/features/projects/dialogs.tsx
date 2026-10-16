import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type {
  FileEntry, ID, Project, ProjectStatus, Section, Task, TaskPriority, TaskStatus, Tone,
} from '../../types';
import {
  Button, Dialog, Field, FormRow, Input, Select, Textarea, TonePicker, useFeedback,
} from '../../components/ui';
import { deleteSection, deleteTask, insert, patch, touchProject } from '../../store/workspace';
import { uid } from '../../lib/id';
import { nowISO, parseTags } from '../../lib/format';
import { TASK_COLUMNS } from './taskMeta';

/* ---------------------------------------------------------------- */
/* Project                                                          */
/* ---------------------------------------------------------------- */

export function ProjectDialog({ open, onClose, project, onCreated }: { open: boolean; onClose: () => void; project?: Project; onCreated?: (id: ID) => void }) {
  const { toast } = useFeedback();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [tone, setTone] = useState<Tone>('amber');
  const [tags, setTags] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? '');
    setDescription(project?.description ?? '');
    setStatus(project?.status ?? 'active');
    setTone(project?.tone ?? 'amber');
    setTags(project?.tags.join(', ') ?? '');
    setTouched(false);
  }, [open, project]);

  const error = name.trim().length < 2 ? 'Give the project a name (2+ characters).' : null;

  const save = () => {
    setTouched(true);
    if (error) return;
    const data = { name: name.trim(), description: description.trim(), status, tone, tags: parseTags(tags), updatedAt: nowISO() };
    if (project) {
      patch('projects', project.id, data);
      toast('Project updated');
    } else {
      const id = uid('p');
      insert('projects', { id, createdAt: nowISO(), ...data });
      toast('Project created');
      onCreated?.(id);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={project ? 'Edit project' : 'New project'}
      onSubmit={save}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">{project ? 'Save changes' : 'Create project'}</Button></>}
    >
      <Field label="Name" error={touched ? error : null} htmlFor="pd-name">
        <Input id="pd-name" value={name} onChange={(e) => setName(e.target.value)} invalid={touched && !!error} placeholder="e.g. Spring catalogue" maxLength={80} />
      </Field>
      <Field label="Description" htmlFor="pd-desc">
        <Textarea id="pd-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is this project about?" maxLength={400} />
      </Field>
      <FormRow>
        <Field label="Status" htmlFor="pd-status">
          <Select id="pd-status" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            <option value="active">Active</option>
            <option value="planning">Planning</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
        <Field label="Colour">
          <TonePicker value={tone} onChange={setTone} />
        </Field>
      </FormRow>
      <Field label="Tags" hint="Comma-separated" htmlFor="pd-tags">
        <Input id="pd-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="client, branding" />
      </Field>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- */
/* Section                                                          */
/* ---------------------------------------------------------------- */

export function SectionDialog({ open, onClose, projectId, section }: { open: boolean; onClose: () => void; projectId: ID; section?: Section }) {
  const { toast, confirm } = useFeedback();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(section?.title ?? '');
    setContent(section?.content ?? '');
    setTags(section?.tags.join(', ') ?? '');
    setTouched(false);
  }, [open, section]);

  const error = !title.trim() ? 'A section needs a title.' : null;

  const save = () => {
    setTouched(true);
    if (error) return;
    const data = { title: title.trim(), content: content.trim(), tags: parseTags(tags), updatedAt: nowISO() };
    if (section) {
      patch('sections', section.id, data);
      toast('Section saved');
    } else {
      insert('sections', { id: uid('s'), projectId, favorite: false, ...data });
      toast('Section created');
    }
    touchProject(projectId);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={section ? 'Edit section' : 'New section'}
      width={600}
      onSubmit={save}
      footerLeft={section && (
        <Button variant="danger" icon={Trash2} onClick={async () => {
          if (await confirm({ title: `Delete “${section.title}”?`, message: 'The section and any Map nodes pointing to it will be removed.', confirmLabel: 'Delete section', danger: true })) {
            deleteSection(section.id);
            toast('Section deleted');
            onClose();
          }
        }}>Delete</Button>
      )}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">{section ? 'Save' : 'Create section'}</Button></>}
    >
      <Field label="Title" error={touched ? error : null} htmlFor="sd-title">
        <Input id="sd-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={touched && !!error} maxLength={100} placeholder="e.g. Client brief" />
      </Field>
      <Field label="Content" htmlFor="sd-content">
        <Textarea id="sd-content" value={content} onChange={(e) => setContent(e.target.value)} rows={10} placeholder="Write the section content…" />
      </Field>
      <Field label="Tags" hint="Comma-separated" htmlFor="sd-tags">
        <Input id="sd-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="brief, planning" />
      </Field>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- */
/* Task                                                             */
/* ---------------------------------------------------------------- */

export function TaskDialog({
  open, onClose, projectId, task, defaultStatus = 'todo',
}: { open: boolean; onClose: () => void; projectId: ID; task?: Task; defaultStatus?: TaskStatus }) {
  const { toast, confirm } = useFeedback();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [due, setDue] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setStatus(task?.status ?? defaultStatus);
    setPriority(task?.priority ?? 'medium');
    setDue(task?.due ? task.due.slice(0, 10) : '');
    setTouched(false);
  }, [open, task, defaultStatus]);

  const error = !title.trim() ? 'A task needs a title.' : null;

  const save = () => {
    setTouched(true);
    if (error) return;
    const data = {
      title: title.trim(), description: description.trim(), status, priority,
      due: due ? new Date(`${due}T12:00:00`).toISOString() : undefined,
      updatedAt: nowISO(),
    };
    if (task) {
      patch('tasks', task.id, data);
      toast('Task saved');
    } else {
      insert('tasks', { id: uid('t'), projectId, order: Date.now(), ...data });
      toast('Task created');
    }
    touchProject(projectId);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      onSubmit={save}
      footerLeft={task && (
        <Button variant="danger" icon={Trash2} onClick={async () => {
          if (await confirm({ title: `Delete “${task.title}”?`, message: 'This task will be removed from the board and the Map.', confirmLabel: 'Delete task', danger: true })) {
            deleteTask(task.id);
            toast('Task deleted');
            onClose();
          }
        }}>Delete</Button>
      )}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">{task ? 'Save' : 'Create task'}</Button></>}
    >
      <Field label="Title" error={touched ? error : null} htmlFor="td-title">
        <Input id="td-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={touched && !!error} maxLength={120} placeholder="What needs to be done?" />
      </Field>
      <Field label="Description" htmlFor="td-desc">
        <Textarea id="td-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optional details" />
      </Field>
      <FormRow>
        <Field label="Status" htmlFor="td-status">
          <Select id="td-status" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {TASK_COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </Select>
        </Field>
        <Field label="Priority" htmlFor="td-prio">
          <Select id="td-prio" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </Field>
      </FormRow>
      <Field label="Due date" hint="Optional" htmlFor="td-due">
        <Input id="td-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      </Field>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- */
/* File / folder name                                               */
/* ---------------------------------------------------------------- */

export function FileNameDialog({
  open, onClose, mode, entry, siblings, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  mode: 'folder' | 'document' | 'rename';
  entry?: FileEntry;
  siblings: FileEntry[];
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(mode === 'rename' ? entry?.name ?? '' : mode === 'document' ? 'untitled.md' : '');
    setTouched(false);
  }, [open, mode, entry]);

  const trimmed = name.trim();
  const error = !trimmed
    ? 'Enter a name.'
    : /[\\/:*?"<>|]/.test(trimmed)
      ? 'Names cannot contain \\ / : * ? " < > |'
      : siblings.some((f) => f.id !== entry?.id && f.name.toLowerCase() === trimmed.toLowerCase())
        ? 'An item with this name already exists here.'
        : null;

  const title = mode === 'rename' ? `Rename ${entry?.kind === 'folder' ? 'folder' : 'document'}` : mode === 'folder' ? 'New folder' : 'New document';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      width={420}
      onSubmit={() => { setTouched(true); if (!error) { onSubmit(trimmed); onClose(); } }}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">{mode === 'rename' ? 'Rename' : 'Create'}</Button></>}
    >
      <Field label="Name" error={touched ? error : null} hint={mode === 'document' ? 'Demo entry only — no file content is created.' : undefined} htmlFor="fn-name">
        <Input id="fn-name" value={name} onChange={(e) => setName(e.target.value)} invalid={touched && !!error} maxLength={120} onFocus={(e) => {
          const dot = e.target.value.lastIndexOf('.');
          if (dot > 0) e.target.setSelectionRange(0, dot);
        }} />
      </Field>
    </Dialog>
  );
}

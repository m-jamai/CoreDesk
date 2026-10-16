import { useEffect, useState } from 'react';
import type {
  Course, CourseLevel, ID, Learner, Lesson, LessonKind, ResourceKind, SessionMode, TeachingSession,
} from '../../types';
import { Button, Dialog, Field, FormRow, Input, Notice, Select, Textarea, useFeedback } from '../../components/ui';
import { insert, patch, updateCourse, useWorkspace } from '../../store/workspace';
import { uid } from '../../lib/id';
import { nowISO } from '../../lib/format';
import { withinLimit } from '../../config/plans';
import { openPlanDialog, usePlan } from '../sharing/plan';
import { LESSON_KIND, RESOURCE_KIND } from './courseMeta';

const footer = (onClose: () => void, label: string) => (
  <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">{label}</Button></>
);

/* ---------------- Course ---------------- */

export function CourseDialog({ open, onClose, course, onCreated }: { open: boolean; onClose: () => void; course?: Course; onCreated?: (id: ID) => void }) {
  const { toast } = useFeedback();
  const ws = useWorkspace();
  const { limits } = usePlan();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [audience, setAudience] = useState('');
  const [level, setLevel] = useState<CourseLevel>('beginner');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(course?.title ?? ''); setSummary(course?.summary ?? ''); setAudience(course?.audience ?? ''); setLevel(course?.level ?? 'beginner'); setTouched(false);
  }, [open, course]);

  const errors = {
    title: title.trim().length < 3 ? 'Course title needs at least 3 characters.' : null,
    audience: !audience.trim() ? 'Who is this course for?' : null,
  };

  const save = () => {
    setTouched(true);
    if (errors.title || errors.audience) return;
    const data = { title: title.trim(), summary: summary.trim(), audience: audience.trim(), level };
    if (course) {
      updateCourse(course.id, (c) => ({ ...c, ...data }));
      toast('Course updated');
    } else {
      if (!withinLimit(ws.courses.length, limits.courses)) {
        openPlanDialog(`The ${limits.label} plan includes ${limits.courses} courses.`);
        return;
      }
      const id = uid('co');
      insert('courses', {
        id, ...data, visibility: 'draft', enrollment: 'invite',
        modules: [{ id: uid('mo'), title: 'Module 1', lessons: [] }],
        resources: [], createdAt: nowISO(), updatedAt: nowISO(),
      });
      toast('Course created as a draft');
      onCreated?.(id);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={course ? 'Edit course details' : 'New course'} onSubmit={save} width={540} footer={footer(onClose, course ? 'Save' : 'Create course')}>
      <Field label="Title" error={touched ? errors.title : null} htmlFor="cd-title">
        <Input id="cd-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={touched && !!errors.title} maxLength={90} placeholder="e.g. Practical Git for Designers" />
      </Field>
      <Field label="Summary" htmlFor="cd-summary">
        <Textarea id="cd-summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} maxLength={400} placeholder="What will learners be able to do afterwards?" />
      </Field>
      <FormRow>
        <Field label="Audience" error={touched ? errors.audience : null} htmlFor="cd-aud">
          <Input id="cd-aud" value={audience} onChange={(e) => setAudience(e.target.value)} invalid={touched && !!errors.audience} placeholder="e.g. Junior engineers" maxLength={80} />
        </Field>
        <Field label="Level" htmlFor="cd-level">
          <Select id="cd-level" value={level} onChange={(e) => setLevel(e.target.value as CourseLevel)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </Select>
        </Field>
      </FormRow>
    </Dialog>
  );
}

/* ---------------- Module ---------------- */

export function ModuleDialog({ open, onClose, course, moduleId }: { open: boolean; onClose: () => void; course: Course; moduleId?: ID }) {
  const { toast } = useFeedback();
  const existing = course.modules.find((m) => m.id === moduleId);
  const [title, setTitle] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (open) { setTitle(existing?.title ?? `Module ${course.modules.length + 1}`); setTouched(false); } }, [open, existing, course.modules.length]);
  const error = !title.trim() ? 'Enter a module title.' : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={existing ? 'Rename module' : 'New module'}
      width={420}
      onSubmit={() => {
        setTouched(true);
        if (error) return;
        updateCourse(course.id, (c) => ({
          ...c,
          modules: existing
            ? c.modules.map((m) => (m.id === existing.id ? { ...m, title: title.trim() } : m))
            : [...c.modules, { id: uid('mo'), title: title.trim(), lessons: [] }],
        }));
        toast(existing ? 'Module renamed' : 'Module added');
        onClose();
      }}
      footer={footer(onClose, existing ? 'Save' : 'Add module')}
    >
      <Field label="Title" error={touched ? error : null} htmlFor="md-title">
        <Input id="md-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={touched && !!error} maxLength={80} />
      </Field>
    </Dialog>
  );
}

/* ---------------- Lesson ---------------- */

export function LessonDialog({ open, onClose, course, moduleId, lesson }: { open: boolean; onClose: () => void; course: Course; moduleId: ID; lesson?: Lesson }) {
  const { toast } = useFeedback();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<LessonKind>('reading');
  const [minutes, setMinutes] = useState('15');
  const [summary, setSummary] = useState('');
  const [mod, setMod] = useState(moduleId);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(lesson?.title ?? ''); setKind(lesson?.kind ?? 'reading'); setMinutes(String(lesson?.minutes ?? 15)); setSummary(lesson?.summary ?? ''); setMod(moduleId); setTouched(false);
  }, [open, lesson, moduleId]);

  const mins = Number(minutes);
  const errors = {
    title: !title.trim() ? 'Enter a lesson title.' : null,
    minutes: !Number.isInteger(mins) || mins < 1 || mins > 600 ? 'Duration must be 1–600 minutes.' : null,
  };

  const save = () => {
    setTouched(true);
    if (errors.title || errors.minutes) return;
    const data: Lesson = { id: lesson?.id ?? uid('le'), title: title.trim(), kind, minutes: mins, summary: summary.trim() };
    updateCourse(course.id, (c) => ({
      ...c,
      modules: c.modules.map((m) => {
        const without = m.lessons.filter((l) => l.id !== data.id);
        if (m.id === mod) {
          const idx = m.lessons.findIndex((l) => l.id === data.id);
          if (idx >= 0) { const copy = [...m.lessons]; copy[idx] = data; return { ...m, lessons: copy }; }
          return { ...m, lessons: [...without, data] };
        }
        return { ...m, lessons: without };
      }),
    }));
    toast(lesson ? 'Lesson saved' : 'Lesson added');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={lesson ? 'Edit lesson' : 'New lesson'} onSubmit={save} width={520} footer={footer(onClose, lesson ? 'Save' : 'Add lesson')}>
      <Field label="Title" error={touched ? errors.title : null} htmlFor="ld-title">
        <Input id="ld-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={touched && !!errors.title} maxLength={100} placeholder="e.g. Reading a datasheet" />
      </Field>
      <FormRow>
        <Field label="Format" htmlFor="ld-kind">
          <Select id="ld-kind" value={kind} onChange={(e) => setKind(e.target.value as LessonKind)}>
            {(Object.keys(LESSON_KIND) as LessonKind[]).map((k) => <option key={k} value={k}>{LESSON_KIND[k].label}</option>)}
          </Select>
        </Field>
        <Field label="Duration (minutes)" error={touched ? errors.minutes : null} htmlFor="ld-min">
          <Input id="ld-min" type="number" min={1} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} invalid={touched && !!errors.minutes} />
        </Field>
      </FormRow>
      <Field label="Module" htmlFor="ld-mod">
        <Select id="ld-mod" value={mod} onChange={(e) => setMod(e.target.value)}>
          {course.modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </Select>
      </Field>
      <Field label="Summary" htmlFor="ld-sum">
        <Textarea id="ld-sum" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} maxLength={300} placeholder="One or two sentences learners see in the outline." />
      </Field>
    </Dialog>
  );
}

/* ---------------- Resource ---------------- */

export function ResourceDialog({ open, onClose, course }: { open: boolean; onClose: () => void; course: Course }) {
  const { toast } = useFeedback();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ResourceKind>('pdf');
  const [detail, setDetail] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (open) { setName(''); setKind('pdf'); setDetail(''); setTouched(false); } }, [open]);
  const error = !name.trim() ? 'Enter a resource name.' : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add resource"
      width={460}
      onSubmit={() => {
        setTouched(true);
        if (error) return;
        updateCourse(course.id, (c) => ({ ...c, resources: [...c.resources, { id: uid('r'), name: name.trim(), kind, detail: detail.trim() }] }));
        toast('Resource added');
        onClose();
      }}
      footer={footer(onClose, 'Add resource')}
    >
      <Field label="Name" error={touched ? error : null} htmlFor="rd-name">
        <Input id="rd-name" value={name} onChange={(e) => setName(e.target.value)} invalid={touched && !!error} maxLength={100} placeholder="e.g. Exercise starter files" />
      </Field>
      <FormRow>
        <Field label="Type" htmlFor="rd-kind">
          <Select id="rd-kind" value={kind} onChange={(e) => setKind(e.target.value as ResourceKind)}>
            {(Object.keys(RESOURCE_KIND) as ResourceKind[]).map((k) => <option key={k} value={k}>{RESOURCE_KIND[k].label}</option>)}
          </Select>
        </Field>
        <Field label="Detail" htmlFor="rd-detail">
          <Input id="rd-detail" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="e.g. 12 pages" maxLength={60} />
        </Field>
      </FormRow>
      <Notice>Resources are listed for planning only — no file is uploaded or stored.</Notice>
    </Dialog>
  );
}

/* ---------------- Session ---------------- */

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function SessionDialog({ open, onClose, courseId, session }: { open: boolean; onClose: () => void; courseId: ID; session?: TeachingSession }) {
  const { toast } = useFeedback();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [minutes, setMinutes] = useState('60');
  const [mode, setMode] = useState<SessionMode>('online');
  const [location, setLocation] = useState('');
  const [agenda, setAgenda] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    const def = new Date(Date.now() + 7 * 864e5); def.setHours(10, 0, 0, 0);
    setTitle(session?.title ?? ''); setDate(toLocalInput(session?.date ?? def.toISOString())); setMinutes(String(session?.minutes ?? 60));
    setMode(session?.mode ?? 'online'); setLocation(session?.location ?? ''); setAgenda(session?.agenda ?? ''); setTouched(false);
  }, [open, session]);

  const mins = Number(minutes);
  const errors = {
    title: !title.trim() ? 'Enter a session title.' : null,
    date: !date || Number.isNaN(new Date(date).getTime()) ? 'Choose a date and time.' : null,
    minutes: !Number.isInteger(mins) || mins < 5 || mins > 480 ? '5–480 minutes.' : null,
  };

  const save = () => {
    setTouched(true);
    if (errors.title || errors.date || errors.minutes) return;
    const data = { title: title.trim(), date: new Date(date).toISOString(), minutes: mins, mode, location: location.trim() || (mode === 'online' ? 'Video call' : 'To be confirmed'), agenda: agenda.trim() };
    if (session) { patch('sessions', session.id, data); toast('Session updated'); }
    else { insert('sessions', { id: uid('se'), courseId, ...data }); toast('Session planned'); }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={session ? 'Edit session' : 'Plan a session'} onSubmit={save} width={540} footer={footer(onClose, session ? 'Save' : 'Plan session')}>
      <Field label="Title" error={touched ? errors.title : null} htmlFor="ss-title">
        <Input id="ss-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={touched && !!errors.title} maxLength={100} placeholder="e.g. Workshop — first prototype" />
      </Field>
      <FormRow>
        <Field label="Date & time" error={touched ? errors.date : null} htmlFor="ss-date">
          <Input id="ss-date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} invalid={touched && !!errors.date} />
        </Field>
        <Field label="Duration (minutes)" error={touched ? errors.minutes : null} htmlFor="ss-min">
          <Input id="ss-min" type="number" min={5} max={480} value={minutes} onChange={(e) => setMinutes(e.target.value)} invalid={touched && !!errors.minutes} />
        </Field>
      </FormRow>
      <FormRow>
        <Field label="Format" htmlFor="ss-mode">
          <Select id="ss-mode" value={mode} onChange={(e) => setMode(e.target.value as SessionMode)}>
            <option value="online">Online</option>
            <option value="in-person">In person</option>
          </Select>
        </Field>
        <Field label="Location" htmlFor="ss-loc">
          <Input id="ss-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={mode === 'online' ? 'Video call' : 'Room or address'} maxLength={100} />
        </Field>
      </FormRow>
      <Field label="Agenda" htmlFor="ss-agenda">
        <Textarea id="ss-agenda" value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={3} maxLength={400} />
      </Field>
    </Dialog>
  );
}

/* ---------------- Learner ---------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function LearnerDialog({ open, onClose, course, learners }: { open: boolean; onClose: () => void; course: Course; learners: Learner[] }) {
  const { toast } = useFeedback();
  const { limits } = usePlan();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (open) { setName(''); setEmail(''); setTouched(false); } }, [open]);

  const e = email.trim().toLowerCase();
  const errors = {
    name: !name.trim() ? 'Enter a name.' : null,
    email: !EMAIL_RE.test(e) ? 'Enter a valid email.' : learners.some((l) => l.email === e) ? 'Already enrolled.' : null,
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add demo learner"
      subtitle="Adds sample data only — nobody is invited or emailed."
      width={440}
      onSubmit={() => {
        setTouched(true);
        if (errors.name || errors.email) return;
        if (!withinLimit(learners.length, limits.learnersPerCourse)) {
          openPlanDialog(`The ${limits.label} plan allows ${limits.learnersPerCourse} learners per course.`);
          return;
        }
        insert('learners', { id: uid('ln'), courseId: course.id, name: name.trim(), email: e, completedLessonIds: [], enrolledAt: nowISO(), lastActive: nowISO() });
        toast('Demo learner added');
        onClose();
      }}
      footer={footer(onClose, 'Add learner')}
    >
      <Field label="Name" error={touched ? errors.name : null} htmlFor="lr-name">
        <Input id="lr-name" value={name} onChange={(ev) => setName(ev.target.value)} invalid={touched && !!errors.name} maxLength={60} />
      </Field>
      <Field label="Email" error={touched ? errors.email : null} htmlFor="lr-email">
        <Input id="lr-email" type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} invalid={touched && !!errors.email} placeholder="learner@example.com" />
      </Field>
    </Dialog>
  );
}

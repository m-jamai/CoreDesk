import { useMemo, useState } from 'react';
import {
  ArrowLeft, BookOpen, CalendarClock, Eye, LayoutDashboard, Pencil, Send, Sparkles, Trash2, Users,
} from 'lucide-react';
import type { Course } from '../../types';
import L from '../../components/layout/layout.module.css';
import s from './teacher.module.css';
import sh from '../sharing/sharing.module.css';
import {
  Button, IconButton, MoreMenu, Pill, Progress, Tabs, Tag, cx, useFeedback,
} from '../../components/ui';
import { deleteCourse, useWorkspace } from '../../store/workspace';
import { navigate } from '../../lib/router';
import { dateTime, pluralize, relativeTime } from '../../lib/format';
import { openPlanDialog, usePlan } from '../sharing/plan';
import { CourseDialog } from './dialogs';
import { LESSON_KIND, VISIBILITY, courseTotals, formatMinutes, learnerProgress } from './courseMeta';
import { CurriculumTab } from './CurriculumTab';
import { SessionsTab } from './SessionsTab';
import { LearnersTab } from './LearnersTab';
import { PublishTab } from './PublishTab';

const TABS = ['overview', 'curriculum', 'sessions', 'learners', 'publish'] as const;
type Tab = (typeof TABS)[number];

export function CourseWorkspace({ course, tab }: { course: Course; tab: string }) {
  const ws = useWorkspace();
  const { confirm, toast } = useFeedback();
  const { limits, isPro } = usePlan();
  const [editing, setEditing] = useState(false);
  const active: Tab = (TABS as readonly string[]).includes(tab) ? (tab as Tab) : 'overview';
  const base = `/sharing/teacher/${course.id}`;

  const learners = useMemo(() => ws.learners.filter((l) => l.courseId === course.id), [ws.learners, course.id]);
  const sessions = useMemo(() => ws.sessions.filter((x) => x.courseId === course.id).sort((a, b) => a.date.localeCompare(b.date)), [ws.sessions, course.id]);
  const totals = courseTotals(course);

  return (
    <>
      <div className={s.bar}>
        <IconButton icon={ArrowLeft} label="All courses" onClick={() => navigate('/sharing/teacher')} style={{ alignSelf: 'center' }} />
        <Tabs
          ariaLabel="Course sections"
          value={active}
          items={[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: base },
            { id: 'curriculum', label: 'Curriculum', icon: BookOpen, count: totals.lessons, href: `${base}/curriculum` },
            { id: 'sessions', label: 'Sessions', icon: CalendarClock, count: sessions.length, href: `${base}/sessions` },
            { id: 'learners', label: 'Learners', icon: Users, count: learners.length, href: `${base}/learners` },
            { id: 'publish', label: 'Publish', icon: Send, href: `${base}/publish` },
          ]}
        />
        <div className={s.barRight}>
          <Pill tone={VISIBILITY[course.visibility].tone} dot>{VISIBILITY[course.visibility].label}</Pill>
          <button type="button" className={cx(sh.planChip, isPro && sh.planChipPro, 'hide-sm')} onClick={() => openPlanDialog()}>
            <Sparkles size={12} />{limits.label}
          </button>
          <Button size="sm" icon={Eye} onClick={() => navigate(`${base}/learn`)}>Learner preview</Button>
          <MoreMenu items={[
            { label: 'Edit course details', icon: Pencil, onSelect: () => setEditing(true) },
            { type: 'separator' },
            {
              label: 'Delete course', icon: Trash2, danger: true,
              onSelect: async () => {
                if (await confirm({ title: `Delete “${course.title}”?`, message: 'Lessons, resources, sessions and learner records will be removed.', confirmLabel: 'Delete course', danger: true })) {
                  navigate('/sharing/teacher');
                  deleteCourse(course.id);
                  toast('Course deleted');
                }
              },
            },
          ]} />
        </div>
      </div>

      {active === 'overview' && <Overview course={course} onEdit={() => setEditing(true)} />}
      {active === 'curriculum' && <CurriculumTab course={course} />}
      {active === 'sessions' && <SessionsTab course={course} sessions={sessions} />}
      {active === 'learners' && <LearnersTab course={course} learners={learners} />}
      {active === 'publish' && <PublishTab course={course} learners={learners.length} />}

      <CourseDialog open={editing} course={course} onClose={() => setEditing(false)} />
    </>
  );
}

function Overview({ course, onEdit }: { course: Course; onEdit: () => void }) {
  const ws = useWorkspace();
  const learners = ws.learners.filter((l) => l.courseId === course.id);
  const totals = courseTotals(course);
  const progress = learners.map((l) => learnerProgress(course, l).pct);
  const avg = progress.length ? progress.reduce((a, b) => a + b, 0) / progress.length : 0;
  const completed = progress.filter((p) => p >= 100).length;
  const next = ws.sessions.filter((x) => x.courseId === course.id && new Date(x.date).getTime() > Date.now()).sort((a, b) => a.date.localeCompare(b.date))[0];
  const recent = [...learners].sort((a, b) => b.lastActive.localeCompare(a.lastActive)).slice(0, 5);
  const base = `/sharing/teacher/${course.id}`;

  return (
    <div className={L.scroll}>
      <div className={L.inner} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className={L.head} style={{ marginBottom: 0 }}>
          <div className={L.headTitle}>
            <h1>{course.title}</h1>
            <div className={s.metaRow}>
              <Tag>{course.level}</Tag>
              <Tag>{course.audience}</Tag>
              <Tag>{course.enrollment === 'invite' ? 'invite only' : 'link enrolment'}</Tag>
            </div>
          </div>
          <div className={L.headActions}><Button icon={Pencil} onClick={onEdit}>Edit details</Button></div>
        </div>

        <div className={L.stats}>
          <div className={L.stat}><span className="label">Modules</span><span className={L.statValue}>{totals.modules}</span></div>
          <div className={L.stat}><span className="label">Lessons</span><span className={L.statValue}>{totals.lessons}</span></div>
          <div className={L.stat}><span className="label">Duration</span><span className={L.statValue} style={{ fontSize: 'var(--fs-lg)' }}>{formatMinutes(totals.minutes)}</span></div>
          <div className={L.stat}><span className="label">Learners</span><span className={L.statValue}>{learners.length}</span></div>
          <div className={L.stat}><span className="label">Avg. progress</span><span className={L.statValue}>{Math.round(avg)}%</span></div>
          <div className={L.stat}><span className="label">Completed</span><span className={L.statValue}>{completed}</span></div>
        </div>

        <div className={s.overviewGrid}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p className={s.lead}>{course.summary || 'No summary yet.'}</p>
            <div className={L.panel}>
              <div className={L.panelHead}><span className="label">Outline</span><a href={`#${base}/curriculum`} style={{ fontSize: 'var(--fs-xs)', color: 'var(--accent)' }}>Edit curriculum</a></div>
              <ol className={s.outline}>
                {course.modules.map((m, i) => (
                  <li key={m.id}>
                    <span className={s.outlineIdx}>{String(i + 1).padStart(2, '0')}</span>
                    <span className={s.outlineTitle}>{m.title}</span>
                    <span style={{ display: 'flex', gap: 4 }}>
                      {Array.from(new Set(m.lessons.map((l) => l.kind))).map((k) => {
                        const Icon = LESSON_KIND[k].icon;
                        return <Icon key={k} size={12} color="var(--text-2)" aria-label={LESSON_KIND[k].label} />;
                      })}
                    </span>
                    <span className={L.mutedSm}>{pluralize(m.lessons.length, 'lesson')} · {formatMinutes(m.lessons.reduce((n, l) => n + l.minutes, 0))}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className={L.panel}>
              <div className={L.panelHead}><span className="label">Next session</span></div>
              <div className={L.panelBody}>
                {next ? (
                  <>
                    <div style={{ fontWeight: 600 }}>{next.title}</div>
                    <div className={L.mutedSm} style={{ marginTop: 2 }}>{dateTime(next.date)} · {next.minutes} min · {next.mode === 'online' ? 'Online' : next.location}</div>
                  </>
                ) : <span className={L.muted}>No upcoming session. <a href={`#${base}/sessions`} style={{ color: 'var(--accent)' }}>Plan one</a></span>}
              </div>
            </div>
            <div className={L.panel}>
              <div className={L.panelHead}><span className="label">Recent learner activity</span><a href={`#${base}/learners`} style={{ fontSize: 'var(--fs-xs)', color: 'var(--accent)' }}>All learners</a></div>
              <div className={L.panelBody} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recent.length === 0 && <span className={L.muted}>No learners yet.</span>}
                {recent.map((l) => {
                  const p = learnerProgress(course, l);
                  return (
                    <div key={l.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)' }}>
                        <span>{l.name}</span><span className={L.mutedSm}>{relativeTime(l.lastActive)}</span>
                      </div>
                      <Progress value={p.pct} label={`${l.name} progress`} />
                    </div>
                  );
                })}
                <span className={L.mutedSm}>Progress figures are illustrative sample data.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { CalendarClock, Eye, GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Course, CourseVisibility } from '../../types';
import L from '../../components/layout/layout.module.css';
import s from './teacher.module.css';
import {
  Button, EmptyState, MoreMenu, Pill, Progress, SearchInput, Segmented, Toolbar, ToolbarSpacer, useFeedback,
} from '../../components/ui';
import { deleteCourse, useWorkspace } from '../../store/workspace';
import { navigate } from '../../lib/router';
import { dateTime, relativeTime } from '../../lib/format';
import { formatLimit, withinLimit } from '../../config/plans';
import { openPlanDialog, usePlan } from '../sharing/plan';
import { CourseDialog } from './dialogs';
import { VISIBILITY, courseTotals, formatMinutes, learnerProgress } from './courseMeta';

type Filter = 'all' | CourseVisibility;

export function TeacherHome() {
  const ws = useWorkspace();
  const { confirm, toast } = useFeedback();
  const { limits } = usePlan();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [dialog, setDialog] = useState<{ course?: Course } | null>(null);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return ws.courses
      .filter((c) => filter === 'all' || c.visibility === filter)
      .filter((c) => !query || [c.title, c.summary, c.audience].some((f) => f.toLowerCase().includes(query)))
      .map((c) => {
        const learners = ws.learners.filter((l) => l.courseId === c.id);
        const avg = learners.length ? learners.reduce((n, l) => n + learnerProgress(c, l).pct, 0) / learners.length : 0;
        const next = ws.sessions.filter((x) => x.courseId === c.id && new Date(x.date).getTime() > Date.now()).sort((a, b) => a.date.localeCompare(b.date))[0];
        return { course: c, learners: learners.length, avg, next, totals: courseTotals(c) };
      })
      .sort((a, b) => b.course.updatedAt.localeCompare(a.course.updatedAt));
  }, [ws.courses, ws.learners, ws.sessions, q, filter]);

  const upcoming = useMemo(
    () => ws.sessions.filter((x) => new Date(x.date).getTime() > Date.now()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3),
    [ws.sessions],
  );
  const totalLearners = ws.learners.length;

  const startNew = () => {
    if (!withinLimit(ws.courses.length, limits.courses)) {
      openPlanDialog(`The ${limits.label} plan includes ${limits.courses} courses. Delete one or switch plans.`);
      return;
    }
    setDialog({});
  };

  return (
    <>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search courses" />
        <Segmented<Filter>
          ariaLabel="Visibility"
          value={filter}
          onChange={setFilter}
          options={[{ value: 'all', label: 'All' }, { value: 'published', label: 'Published' }, { value: 'unlisted', label: 'Unlisted' }, { value: 'draft', label: 'Drafts' }]}
        />
        <ToolbarSpacer />
        <span className="label hide-sm">{ws.courses.length} / {formatLimit(limits.courses)} courses</span>
        <Button variant="primary" icon={Plus} onClick={startNew}>New course</Button>
      </Toolbar>

      <div className={L.scroll}>
        <div className={L.inner} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={L.stats}>
            <div className={L.stat}><span className="label">Courses</span><span className={L.statValue}>{ws.courses.length}</span></div>
            <div className={L.stat}><span className="label">Published</span><span className={L.statValue}>{ws.courses.filter((c) => c.visibility === 'published').length}</span></div>
            <div className={L.stat}><span className="label">Learners</span><span className={L.statValue}>{totalLearners}</span></div>
            <div className={L.stat}><span className="label">Upcoming sessions</span><span className={L.statValue}>{upcoming.length}</span></div>
          </div>

          {rows.length === 0 ? (
            ws.courses.length === 0 ? (
              <EmptyState icon={GraduationCap} title="Share what you know" text="Build a course from modules and lessons, plan sessions and follow learner progress." action={<Button variant="primary" icon={Plus} onClick={startNew}>Create a course</Button>} />
            ) : (
              <EmptyState icon={GraduationCap} title="No courses match" action={<Button onClick={() => { setQ(''); setFilter('all'); }}>Clear filters</Button>} />
            )
          ) : (
            <div className={s.courseList}>
              {rows.map(({ course: c, learners, avg, next, totals }) => (
                <div
                  key={c.id}
                  className={s.courseRow}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/sharing/teacher/${c.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/sharing/teacher/${c.id}`); }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className={s.courseTitle}>{c.title}</div>
                    <div className={s.courseSub}>{c.audience} · {c.level} · edited {relativeTime(c.updatedAt)}</div>
                  </div>
                  <div><Pill tone={VISIBILITY[c.visibility].tone} dot>{VISIBILITY[c.visibility].label}</Pill></div>
                  <div className={`${s.metric} ${s.wide}`}><span>Content</span><b>{totals.lessons} lessons · {formatMinutes(totals.minutes)}</b></div>
                  <div className={`${s.metric} ${s.wide}`}>
                    <span>Avg. progress · {learners} learners</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Progress value={avg} label="Average progress" /><b>{Math.round(avg)}%</b></div>
                  </div>
                  <div className={`${s.metric} ${s.wide}`}><span>Next session</span><b style={{ fontFamily: 'var(--font-sans)' }}>{next ? new Date(next.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</b></div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <MoreMenu items={[
                      { label: 'Open', icon: GraduationCap, onSelect: () => navigate(`/sharing/teacher/${c.id}`) },
                      { label: 'Preview as learner', icon: Eye, onSelect: () => navigate(`/sharing/teacher/${c.id}/learn`) },
                      { label: 'Edit details', icon: Pencil, onSelect: () => setDialog({ course: c }) },
                      { type: 'separator' },
                      {
                        label: 'Delete course', icon: Trash2, danger: true,
                        onSelect: async () => {
                          if (await confirm({ title: `Delete “${c.title}”?`, message: 'Lessons, resources, sessions and learner records for this course will be removed.', confirmLabel: 'Delete course', danger: true })) {
                            deleteCourse(c.id);
                            toast('Course deleted');
                          }
                        },
                      },
                    ]} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {upcoming.length > 0 && (
            <div className={L.panel}>
              <div className={L.panelHead}><span className="label">Upcoming sessions</span><CalendarClock size={14} color="var(--text-2)" /></div>
              {upcoming.map((x) => {
                const course = ws.courses.find((c) => c.id === x.courseId);
                return (
                  <a key={x.id} href={`#/sharing/teacher/${x.courseId}/sessions`} className={s.sessionRow} style={{ textDecoration: 'none' }}>
                    <div className={s.sessionText}>
                      <div className={s.sessionTitle}>{x.title}</div>
                      <div className={s.sessionMeta}><span>{dateTime(x.date)}</span><span>{course?.title}</span><span>{x.mode === 'online' ? 'Online' : x.location}</span></div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CourseDialog open={!!dialog} course={dialog?.course} onClose={() => setDialog(null)} onCreated={(id) => navigate(`/sharing/teacher/${id}/curriculum`)} />
    </>
  );
}

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Eye, X } from 'lucide-react';
import type { Course } from '../../types';
import s from './teacher.module.css';
import sh from '../sharing/sharing.module.css';
import { Button, EmptyState, Pill, Progress, Tag, cx } from '../../components/ui';
import { navigate } from '../../lib/router';
import { LESSON_KIND, RESOURCE_KIND, courseTotals, formatMinutes } from './courseMeta';

/**
 * What a learner would see. Completion state is local to this preview
 * and intentionally not saved.
 */
export function LearnerPreview({ course }: { course: Course }) {
  const lessons = useMemo(() => course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))), [course]);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const totals = courseTotals(course);
  const current = lessons[index];
  const back = `/sharing/teacher/${course.id}`;

  const toggleDone = (id: string) => setDone((d) => { const n = new Set(d); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className={sh.previewFrame}>
      <div className={sh.previewBanner}>
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => navigate(back)}>Back to editor</Button>
        <Pill tone="info" icon={Eye}>Learner preview</Pill>
        <span style={{ color: 'var(--text-2)' }}>Progress in this preview is not saved</span>
        <span style={{ flex: 1 }} />
        <Button size="sm" variant="ghost" icon={X} onClick={() => navigate(back)}>Exit</Button>
      </div>

      {lessons.length === 0 ? (
        <EmptyState icon={BookOpen} title="This course has no lessons yet" text="Add lessons in the Curriculum tab to preview the learner experience." action={<Button onClick={() => navigate(`${back}/curriculum`)}>Open curriculum</Button>} />
      ) : (
        <div className={s.learn}>
          <aside className={s.learnSide} aria-label="Course outline">
            <div className={s.learnHead}>
              <strong>{course.title}</strong>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)' }}>{totals.lessons} lessons · {formatMinutes(totals.minutes)}</span>
              <Progress value={(done.size / lessons.length) * 100} label="Your progress" />
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)' }}>{done.size} of {lessons.length} complete</span>
            </div>
            {course.modules.map((m) => (
              <div key={m.id}>
                <div className={cx('label', s.learnModule)}>{m.title}</div>
                {m.lessons.map((l) => {
                  const i = lessons.findIndex((x) => x.id === l.id);
                  return (
                    <button key={l.id} type="button" className={cx(s.learnLesson, i === index && s.learnLessonActive)} onClick={() => setIndex(i)}>
                      <span className={cx(s.check, done.has(l.id) && s.checkDone)}>{done.has(l.id) && <Check size={10} strokeWidth={3} />}</span>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-2xs)', color: 'var(--text-2)' }}>{l.minutes}′</span>
                    </button>
                  );
                })}
              </div>
            ))}
            {course.resources.length > 0 && (
              <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="label">Resources</span>
                {course.resources.map((r) => {
                  const K = RESOURCE_KIND[r.kind];
                  return <span key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 'var(--fs-sm)', color: 'var(--text-1)' }}><K.icon size={13} />{r.name}</span>;
                })}
              </div>
            )}
          </aside>

          <main className={s.learnMain}>
            {current && (
              <div className={s.learnContent}>
                <span className="label">{current.moduleTitle} · Lesson {index + 1} of {lessons.length}</span>
                <h1 style={{ fontSize: 'var(--fs-2xl)' }}>{current.title}</h1>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Tag>{LESSON_KIND[current.kind].label}</Tag>
                  <Tag>{current.minutes} min</Tag>
                </div>
                {current.summary && <p style={{ fontSize: 'var(--fs-lg)', color: 'var(--text-1)', lineHeight: 1.6 }}>{current.summary}</p>}
                <div className={s.learnPlaceholder}>
                  {(() => { const Icon = LESSON_KIND[current.kind].icon; return <Icon size={22} />; })()}
                  <span>{LESSON_KIND[current.kind].label} content would appear here.</span>
                  <span style={{ fontSize: 'var(--fs-xs)' }}>The prototype stores lesson outlines, not media or documents.</span>
                </div>
                <div>
                  <Button variant={done.has(current.id) ? 'secondary' : 'primary'} icon={Check} onClick={() => toggleDone(current.id)}>
                    {done.has(current.id) ? 'Completed' : 'Mark as complete'}
                  </Button>
                </div>
                <div className={s.learnNav}>
                  <Button icon={ArrowLeft} disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>Previous</Button>
                  <Button iconRight={ArrowRight} disabled={index === lessons.length - 1} onClick={() => setIndex((i) => i + 1)}>Next</Button>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

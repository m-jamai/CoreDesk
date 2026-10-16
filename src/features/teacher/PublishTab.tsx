import { CircleCheck, CircleDashed, Copy, EyeOff, Globe, Link2, Lock, Sparkles } from 'lucide-react';
import type { Course, CourseVisibility } from '../../types';
import L from '../../components/layout/layout.module.css';
import s from './teacher.module.css';
import sh from '../sharing/sharing.module.css';
import { Button, Notice, Segmented, cx, useFeedback } from '../../components/ui';
import { updateCourse } from '../../store/workspace';
import { openPlanDialog, usePlan } from '../sharing/plan';
import { courseTotals } from './courseMeta';

export function PublishTab({ course, learners }: { course: Course; learners: number }) {
  const { toast } = useFeedback();
  const { limits } = usePlan();
  const totals = courseTotals(course);

  const checks = [
    { ok: course.title.trim().length >= 3, label: 'Course has a clear title' },
    { ok: course.summary.trim().length >= 20, label: 'Summary describes the outcome (20+ characters)' },
    { ok: totals.lessons >= 1, label: 'At least one lesson' },
    { ok: course.modules.every((m) => m.lessons.length > 0), label: 'No empty modules' },
    { ok: course.resources.length > 0, label: 'At least one resource (recommended)' },
  ];
  const ready = checks.slice(0, 4).every((c) => c.ok);

  const setVisibility = (v: CourseVisibility) => {
    if (v === course.visibility) return;
    if (v === 'published' && !limits.publicPublishing) {
      openPlanDialog('Public publishing is part of the Pro plan. On Limited, courses can be shared as unlisted.');
      return;
    }
    if (v !== 'draft' && !ready) {
      toast('Complete the required checklist items first', 'danger');
      return;
    }
    updateCourse(course.id, (c) => ({ ...c, visibility: v }));
    toast(v === 'draft' ? 'Course moved back to draft' : v === 'unlisted' ? 'Course is unlisted (simulated)' : 'Course published (simulated)');
  };

  const OPTIONS: { v: CourseVisibility; icon: typeof Globe; title: string; text: string; pro?: boolean }[] = [
    { v: 'draft', icon: EyeOff, title: 'Draft', text: 'Only you can see it. Edit freely.' },
    { v: 'unlisted', icon: Link2, title: 'Unlisted', text: 'Anyone you give the link to could view it.' },
    { v: 'published', icon: Globe, title: 'Published', text: 'Listed on your public teaching page.', pro: !limits.publicPublishing },
  ];

  const link = `https://coredesk.example/learn/${course.id}`;

  return (
    <div className={L.scroll}>
      <div className={L.innerNarrow} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Notice tone="warn">
          <strong>Publication is simulated.</strong> Nothing leaves your browser: there is no public page, the course link below does not resolve, and learners are not notified.
        </Notice>

        <div>
          <div className={L.sectionTitle}><span className="label">Visibility</span></div>
          <div className={s.visGrid} role="radiogroup" aria-label="Visibility">
            {OPTIONS.map((o) => (
              <button
                key={o.v}
                type="button"
                role="radio"
                aria-checked={course.visibility === o.v}
                className={cx(s.visOpt, course.visibility === o.v && s.visOptOn)}
                onClick={() => setVisibility(o.v)}
              >
                <strong><o.icon size={14} />{o.title}{o.pro && <span className={sh.proTag}>PRO</span>}</strong>
                <span>{o.text}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className={L.sectionTitle}><span className="label">Enrolment</span></div>
          <Segmented
            ariaLabel="Enrolment"
            value={course.enrollment}
            onChange={(v) => { updateCourse(course.id, (c) => ({ ...c, enrollment: v })); toast('Enrolment setting saved'); }}
            options={[{ value: 'invite', label: 'Invite only', icon: Lock }, { value: 'link', label: 'Anyone with the link', icon: Link2 }]}
          />
        </div>

        <div>
          <div className={L.sectionTitle}><span className="label">Course link</span></div>
          <div className={sh.linkBox}>
            <span>{course.visibility === 'draft' ? 'Available once the course is unlisted or published' : link}</span>
            <Button size="sm" icon={Copy} disabled={course.visibility === 'draft'} onClick={async () => {
              try { await navigator.clipboard.writeText(link); toast('Demo link copied — it does not resolve anywhere', 'info'); } catch { toast('Clipboard unavailable', 'danger'); }
            }}>Copy</Button>
          </div>
        </div>

        <div className={L.panel}>
          <div className={L.panelHead}><span className="label">Readiness</span><span className={L.mutedSm}>{learners} enrolled</span></div>
          <div className={L.panelBody}>
            <ul className={s.checklist}>
              {checks.map((c) => (
                <li key={c.label}>
                  {c.ok ? <CircleCheck size={15} className={s.ok} /> : <CircleDashed size={15} className={s.missing} />}
                  <span style={{ color: c.ok ? 'var(--text-0)' : 'var(--text-2)' }}>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {!limits.publicPublishing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--fs-sm)', color: 'var(--text-2)' }}>
            <Sparkles size={14} color="var(--accent)" />
            Public listing is available on Pro.
            <Button size="sm" variant="ghost" onClick={() => openPlanDialog()}>Compare plans</Button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Trash2, UserPlus, Users } from 'lucide-react';
import type { Course, Learner } from '../../types';
import L from '../../components/layout/layout.module.css';
import s from './teacher.module.css';
import {
  Avatar, Button, EmptyState, IconButton, Notice, Progress, SearchInput, Segmented, Toolbar, ToolbarSpacer, useFeedback,
} from '../../components/ui';
import { setWorkspace } from '../../store/workspace';
import { relativeTime, shortDate } from '../../lib/format';
import { formatLimit } from '../../config/plans';
import { usePlan } from '../sharing/plan';
import { LearnerDialog } from './dialogs';
import { learnerProgress } from './courseMeta';

type Sort = 'progress' | 'name' | 'active';

export function LearnersTab({ course, learners }: { course: Course; learners: Learner[] }) {
  const { confirm, toast } = useFeedback();
  const { limits } = usePlan();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('progress');
  const [adding, setAdding] = useState(false);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return learners
      .filter((l) => !query || l.name.toLowerCase().includes(query) || l.email.includes(query))
      .map((l) => ({ l, p: learnerProgress(course, l) }))
      .sort((a, b) => (sort === 'progress' ? b.p.pct - a.p.pct : sort === 'name' ? a.l.name.localeCompare(b.l.name) : b.l.lastActive.localeCompare(a.l.lastActive)));
  }, [learners, q, sort, course]);

  const remove = async (l: Learner) => {
    if (await confirm({ title: `Remove ${l.name}?`, message: 'Their demo enrolment and progress will be deleted.', confirmLabel: 'Remove learner', danger: true })) {
      setWorkspace((st) => ({ ...st, learners: st.learners.filter((x) => x.id !== l.id) }));
      toast('Learner removed');
    }
  };

  return (
    <>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search learners" />
        <Segmented<Sort> ariaLabel="Sort" value={sort} onChange={setSort} options={[{ value: 'progress', label: 'Progress' }, { value: 'active', label: 'Recent' }, { value: 'name', label: 'Name' }]} />
        <ToolbarSpacer />
        <span className="label hide-sm">{learners.length} / {formatLimit(limits.learnersPerCourse)}</span>
        <Button variant="primary" icon={UserPlus} onClick={() => setAdding(true)}>Add learner</Button>
      </Toolbar>
      <div className={L.scroll}>
        <div className={L.inner} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Notice>Learners and their progress are illustrative sample data. There is no learner account system in this prototype.</Notice>
          {learners.length === 0 ? (
            <EmptyState icon={Users} title="No learners yet" text="Add demo learners to see how progress tracking would look." action={<Button variant="primary" icon={UserPlus} onClick={() => setAdding(true)}>Add a demo learner</Button>} />
          ) : rows.length === 0 ? (
            <EmptyState icon={Users} title="No learners match" />
          ) : (
            <table className={L.table}>
              <thead>
                <tr><th>Learner</th><th>Progress</th><th className={L.hideSm}>Lessons</th><th className={L.hideSm}>Last active</th><th className={L.hideSm}>Enrolled</th><th aria-label="Actions" /></tr>
              </thead>
              <tbody>
                {rows.map(({ l, p }) => (
                  <tr key={l.id}>
                    <td style={{ maxWidth: 0, width: '34%' }}>
                      <div className={L.cellFlex}>
                        <Avatar name={l.name} size={26} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: 'var(--text-0)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                          <div className={L.mutedSm} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><div className={s.progressCell}><Progress value={p.pct} label={`${l.name} progress`} /><span className="mono">{Math.round(p.pct)}%</span></div></td>
                    <td className={`${L.hideSm} mono`} style={{ fontSize: 'var(--fs-xs)' }}>{p.done}/{p.total}</td>
                    <td className={L.hideSm} style={{ fontSize: 'var(--fs-xs)' }}>{relativeTime(l.lastActive)}</td>
                    <td className={L.hideSm} style={{ fontSize: 'var(--fs-xs)' }}>{shortDate(l.enrolledAt)}</td>
                    <td className={L.actionsCell}><IconButton icon={Trash2} size="sm" label={`Remove ${l.name}`} onClick={() => remove(l)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <LearnerDialog open={adding} course={course} learners={learners} onClose={() => setAdding(false)} />
    </>
  );
}

import { Check, Sparkles } from 'lucide-react';
import s from './sharing.module.css';
import { Button, Dialog, Notice, Pill, cx, useFeedback } from '../../components/ui';
import { PLANS, formatLimit, type PlanLimits } from '../../config/plans';
import type { PlanId } from '../../types';
import { patchSettings } from '../../store/workspace';
import { closePlanDialog, usePlan, usePlanDialog } from './plan';

const ROWS: { label: string; get: (p: PlanLimits) => string }[] = [
  { label: 'Active shares', get: (p) => formatLimit(p.activeShares) },
  { label: 'Collaborators per share', get: (p) => formatLimit(p.collaboratorsPerShare) },
  { label: 'Editor access', get: (p) => (p.editorAccess ? 'Yes' : 'Viewer only') },
  { label: 'Courses', get: (p) => formatLimit(p.courses) },
  { label: 'Learners per course', get: (p) => formatLimit(p.learnersPerCourse) },
  { label: 'Public course publishing', get: (p) => (p.publicPublishing ? 'Yes' : 'Unlisted only') },
];

export function PlanDialog() {
  const { open, reason } = usePlanDialog();
  const { id: current } = usePlan();
  const { toast } = useFeedback();

  const choose = (id: PlanId) => {
    patchSettings({ plan: id });
    toast(`Switched to ${PLANS[id].label} (demo — no payment involved)`, 'info');
    closePlanDialog();
  };

  return (
    <Dialog
      open={open}
      onClose={closePlanDialog}
      title="Work Sharing plans"
      subtitle="Illustrative limits for the prototype. Edit them in src/config/plans.ts."
      width={620}
      footer={<Button variant="ghost" onClick={closePlanDialog}>Close</Button>}
    >
      {reason && <Notice tone="warn">{reason}</Notice>}
      <div className={s.planGrid}>
        {(Object.keys(PLANS) as PlanId[]).map((id) => {
          const p = PLANS[id];
          const isCurrent = id === current;
          return (
            <div key={id} className={cx(s.planCol, isCurrent && s.planColCurrent)}>
              <div className={s.planName}>
                {id === 'pro' && <Sparkles size={15} color="var(--accent)" />}
                {p.label}
                {isCurrent && <Pill tone="accent" icon={Check}>Current</Pill>}
              </div>
              <div className={s.planTag}>{p.tagline}</div>
              <ul className={s.planRows}>
                {ROWS.map((r) => <li key={r.label}><span>{r.label}</span><span>{r.get(p)}</span></li>)}
              </ul>
              <Button variant={isCurrent ? 'secondary' : id === 'pro' ? 'primary' : 'secondary'} disabled={isCurrent} onClick={() => choose(id)}>
                {isCurrent ? 'Current plan' : `Switch to ${p.label} (demo)`}
              </Button>
            </div>
          );
        })}
      </div>
      <Notice>No subscription or payment is connected. Switching plans here only changes the demo limits stored in your browser.</Notice>
    </Dialog>
  );
}

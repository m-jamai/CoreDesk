import { useState } from 'react';
import { CalendarClock, Clock, MapPin, Pencil, Plus, Trash2, Video } from 'lucide-react';
import type { Course, TeachingSession } from '../../types';
import L from '../../components/layout/layout.module.css';
import s from './teacher.module.css';
import { Button, EmptyState, MoreMenu, Toolbar, ToolbarSpacer, cx, useFeedback } from '../../components/ui';
import { setWorkspace } from '../../store/workspace';
import { SessionDialog } from './dialogs';

export function SessionsTab({ course, sessions }: { course: Course; sessions: TeachingSession[] }) {
  const { confirm, toast } = useFeedback();
  const [dialog, setDialog] = useState<{ session?: TeachingSession } | null>(null);
  const now = Date.now();
  const upcoming = sessions.filter((x) => new Date(x.date).getTime() >= now);
  const past = sessions.filter((x) => new Date(x.date).getTime() < now).reverse();

  const remove = async (x: TeachingSession) => {
    if (await confirm({ title: `Cancel “${x.title}”?`, message: 'The session is removed from the plan. Nobody is notified (demo).', confirmLabel: 'Remove session', danger: true })) {
      setWorkspace((st) => ({ ...st, sessions: st.sessions.filter((y) => y.id !== x.id) }));
      toast('Session removed');
    }
  };

  const row = (x: TeachingSession, isPast: boolean) => {
    const d = new Date(x.date);
    return (
      <div key={x.id} className={cx(s.sessionRow, isPast && s.sessionPast)}>
        <div className={s.dateBlock}>
          <span>{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
          <b>{d.getDate()}</b>
        </div>
        <div className={s.sessionText}>
          <div className={s.sessionTitle}>{x.title}</div>
          <div className={s.sessionMeta}>
            <span><Clock size={11} />{d.toLocaleDateString('en-GB', { weekday: 'short' })} {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {x.minutes} min</span>
            <span>{x.mode === 'online' ? <Video size={11} /> : <MapPin size={11} />}{x.location}</span>
          </div>
          {x.agenda && <div className={s.sessionAgenda}>{x.agenda}</div>}
        </div>
        <MoreMenu items={[
          { label: 'Edit session', icon: Pencil, onSelect: () => setDialog({ session: x }) },
          { type: 'separator' },
          { label: 'Remove session', icon: Trash2, danger: true, onSelect: () => remove(x) },
        ]} />
      </div>
    );
  };

  return (
    <>
      <Toolbar>
        <span className="label">{upcoming.length} upcoming · {past.length} past</span>
        <ToolbarSpacer />
        <Button variant="primary" icon={Plus} onClick={() => setDialog({})}>Plan session</Button>
      </Toolbar>
      <div className={L.scroll}>
        <div className={L.innerNarrow} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sessions.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No sessions planned" text="Plan live sessions, workshops or office hours for this course." action={<Button variant="primary" icon={Plus} onClick={() => setDialog({})}>Plan a session</Button>} />
          ) : (
            <>
              <div className={L.panel}>
                <div className={L.panelHead}><span className="label">Upcoming</span></div>
                {upcoming.length ? upcoming.map((x) => row(x, false)) : <div className={s.moduleEmpty}>Nothing scheduled.</div>}
              </div>
              {past.length > 0 && (
                <div className={L.panel}>
                  <div className={L.panelHead}><span className="label">Past</span></div>
                  {past.map((x) => row(x, true))}
                </div>
              )}
            </>
          )}
          <span className={L.mutedSm}>Planning only — no calendar invitations are sent from the prototype.</span>
        </div>
      </div>
      <SessionDialog open={!!dialog} courseId={course.id} session={dialog?.session} onClose={() => setDialog(null)} />
    </>
  );
}

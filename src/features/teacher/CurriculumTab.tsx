import { useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Course, ID, Lesson } from '../../types';
import L from '../../components/layout/layout.module.css';
import s from './teacher.module.css';
import { Button, EmptyState, IconButton, MoreMenu, Toolbar, ToolbarSpacer, useFeedback } from '../../components/ui';
import { updateCourse } from '../../store/workspace';
import { pluralize } from '../../lib/format';
import { LessonDialog, ModuleDialog, ResourceDialog } from './dialogs';
import { LESSON_KIND, RESOURCE_KIND, courseTotals, formatMinutes } from './courseMeta';

export function CurriculumTab({ course }: { course: Course }) {
  const { confirm, toast } = useFeedback();
  const [moduleDialog, setModuleDialog] = useState<{ id?: ID } | null>(null);
  const [lessonDialog, setLessonDialog] = useState<{ moduleId: ID; lesson?: Lesson } | null>(null);
  const [resourceDialog, setResourceDialog] = useState(false);
  const totals = courseTotals(course);

  const moveLesson = (moduleId: ID, lessonId: ID, dir: -1 | 1) => {
    updateCourse(course.id, (c) => ({
      ...c,
      modules: c.modules.map((m) => {
        if (m.id !== moduleId) return m;
        const i = m.lessons.findIndex((l) => l.id === lessonId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= m.lessons.length) return m;
        const lessons = [...m.lessons];
        [lessons[i], lessons[j]] = [lessons[j]!, lessons[i]!];
        return { ...m, lessons };
      }),
    }));
  };

  const moveModule = (moduleId: ID, dir: -1 | 1) => {
    updateCourse(course.id, (c) => {
      const i = c.modules.findIndex((m) => m.id === moduleId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= c.modules.length) return c;
      const modules = [...c.modules];
      [modules[i], modules[j]] = [modules[j]!, modules[i]!];
      return { ...c, modules };
    });
  };

  const deleteLesson = async (moduleId: ID, lesson: Lesson) => {
    if (await confirm({ title: `Delete lesson “${lesson.title}”?`, message: 'Learner completion for this lesson will no longer count toward progress.', confirmLabel: 'Delete lesson', danger: true })) {
      updateCourse(course.id, (c) => ({ ...c, modules: c.modules.map((m) => (m.id === moduleId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lesson.id) } : m)) }));
      toast('Lesson deleted');
    }
  };

  const deleteModule = async (moduleId: ID) => {
    const m = course.modules.find((x) => x.id === moduleId)!;
    if (await confirm({ title: `Delete module “${m.title}”?`, message: m.lessons.length ? `Its ${pluralize(m.lessons.length, 'lesson')} will be deleted too.` : 'This empty module will be removed.', confirmLabel: 'Delete module', danger: true })) {
      updateCourse(course.id, (c) => ({ ...c, modules: c.modules.filter((x) => x.id !== moduleId) }));
      toast('Module deleted');
    }
  };

  return (
    <>
      <Toolbar>
        <span className="label">{pluralize(totals.modules, 'module')} · {pluralize(totals.lessons, 'lesson')} · {formatMinutes(totals.minutes)}</span>
        <ToolbarSpacer />
        <Button icon={FolderPlus} onClick={() => setModuleDialog({})}>Module</Button>
        <Button variant="primary" icon={Plus} disabled={!course.modules.length} onClick={() => setLessonDialog({ moduleId: course.modules[0]!.id })}>Lesson</Button>
      </Toolbar>
      <div className={L.scroll}>
        <div className={L.inner}>
          <div className={s.curriculum}>
            <div>
              {course.modules.length === 0 && (
                <EmptyState icon={BookOpen} title="No modules yet" text="Group lessons into modules — e.g. Foundations, Practice, Project." action={<Button variant="primary" icon={FolderPlus} onClick={() => setModuleDialog({})}>Add a module</Button>} />
              )}
              {course.modules.map((m, mi) => (
                <section key={m.id} className={s.moduleBlock}>
                  <header className={s.moduleHead}>
                    <span className="label">{String(mi + 1).padStart(2, '0')}</span>
                    <h3>{m.title}</h3>
                    <span className={L.mutedSm}>{formatMinutes(m.lessons.reduce((n, l) => n + l.minutes, 0))}</span>
                    <IconButton icon={Plus} size="sm" label={`Add lesson to ${m.title}`} onClick={() => setLessonDialog({ moduleId: m.id })} />
                    <MoreMenu items={[
                      { label: 'Rename module', icon: Pencil, onSelect: () => setModuleDialog({ id: m.id }) },
                      { label: 'Move up', icon: ArrowUp, disabled: mi === 0, onSelect: () => moveModule(m.id, -1) },
                      { label: 'Move down', icon: ArrowDown, disabled: mi === course.modules.length - 1, onSelect: () => moveModule(m.id, 1) },
                      { type: 'separator' },
                      { label: 'Delete module', icon: Trash2, danger: true, onSelect: () => deleteModule(m.id) },
                    ]} />
                  </header>
                  {m.lessons.length === 0 && <div className={s.moduleEmpty}>No lessons in this module yet.</div>}
                  {m.lessons.map((l, li) => {
                    const K = LESSON_KIND[l.kind];
                    return (
                      <div key={l.id} className={s.lessonRow}>
                        <span className={s.kindIcon} title={K.label}><K.icon size={13} strokeWidth={1.75} /></span>
                        <div className={s.lessonText}>
                          <div className={s.lessonTitle}>{l.title}</div>
                          {l.summary && <div className={s.lessonSummary}>{l.summary}</div>}
                        </div>
                        <span className={s.lessonMins}>{l.minutes} min</span>
                        <IconButton icon={ArrowUp} size="sm" label="Move lesson up" disabled={li === 0} onClick={() => moveLesson(m.id, l.id, -1)} />
                        <IconButton icon={ArrowDown} size="sm" label="Move lesson down" disabled={li === m.lessons.length - 1} onClick={() => moveLesson(m.id, l.id, 1)} />
                        <MoreMenu items={[
                          { label: 'Edit lesson', icon: Pencil, onSelect: () => setLessonDialog({ moduleId: m.id, lesson: l }) },
                          { type: 'separator' },
                          { label: 'Delete lesson', icon: Trash2, danger: true, onSelect: () => deleteLesson(m.id, l) },
                        ]} />
                      </div>
                    );
                  })}
                </section>
              ))}
            </div>

            <aside className={L.panel}>
              <div className={L.panelHead}>
                <span className="label">Resources · {course.resources.length}</span>
                <IconButton icon={Plus} size="sm" label="Add resource" onClick={() => setResourceDialog(true)} />
              </div>
              {course.resources.length === 0 && <div className={s.moduleEmpty}>Slides, starter code, worksheets…</div>}
              {course.resources.map((r) => {
                const K = RESOURCE_KIND[r.kind];
                return (
                  <div key={r.id} className={s.resource}>
                    <span className={s.kindIcon}><K.icon size={13} strokeWidth={1.75} /></span>
                    <div className={s.lessonText}>
                      <div className={s.lessonTitle}>{r.name}</div>
                      <div className={s.lessonSummary}>{K.label}{r.detail ? ` · ${r.detail}` : ''}</div>
                    </div>
                    <IconButton icon={Trash2} size="sm" label={`Remove ${r.name}`} onClick={async () => {
                      if (await confirm({ title: `Remove “${r.name}”?`, confirmLabel: 'Remove', danger: true })) {
                        updateCourse(course.id, (c) => ({ ...c, resources: c.resources.filter((x) => x.id !== r.id) }));
                        toast('Resource removed');
                      }
                    }} />
                  </div>
                );
              })}
            </aside>
          </div>
        </div>
      </div>

      <ModuleDialog open={!!moduleDialog} course={course} moduleId={moduleDialog?.id} onClose={() => setModuleDialog(null)} />
      {lessonDialog && (
        <LessonDialog open course={course} moduleId={lessonDialog.moduleId} lesson={lessonDialog.lesson} onClose={() => setLessonDialog(null)} />
      )}
      <ResourceDialog open={resourceDialog} course={course} onClose={() => setResourceDialog(false)} />
    </>
  );
}

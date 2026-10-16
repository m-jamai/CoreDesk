import { useMemo, useState } from 'react';
import { AlignLeft, CheckSquare, FolderOpen, Network, NotebookPen, Pencil, Share2, Trash2 } from 'lucide-react';
import type { Project } from '../../types';
import type { ProjectView } from '../../App';
import s from './projects.module.css';
import { MoreMenu, Pill, Tabs, toneColor, useFeedback } from '../../components/ui';
import { deleteProject, useWorkspace } from '../../store/workspace';
import { navigate } from '../../lib/router';
import { ProjectDialog } from './dialogs';
import { STATUS_PILL } from './ProjectsOverview';
import { SectionsView } from './SectionsView';
import { FilesView } from './FilesView';
import { TasksView } from './TasksView';
import { NotesView } from './NotesView';
import { MapView } from './MapView';

export function ProjectWorkspace({ project, view, openId }: { project: Project; view: ProjectView; openId: string | null }) {
  const ws = useWorkspace();
  const { confirm, toast } = useFeedback();
  const [editing, setEditing] = useState(false);

  const counts = useMemo(() => ({
    sections: ws.sections.filter((x) => x.projectId === project.id).length,
    files: ws.files.filter((x) => x.projectId === project.id).length,
    tasks: ws.tasks.filter((x) => x.projectId === project.id && x.status !== 'done').length,
    notes: ws.notes.filter((x) => x.projectId === project.id).length,
    map: ws.mapNodes.filter((x) => x.projectId === project.id).length,
  }), [ws, project.id]);

  const base = `/projects/${project.id}`;
  const shared = ws.shares.some((sh) => sh.itemType === 'project' && sh.itemId === project.id && sh.status === 'active');

  return (
    <>
      <div className={s.wsBar}>
        <Tabs
          ariaLabel="Project views"
          value={view}
          items={[
            { id: 'sections', label: 'Sections', icon: AlignLeft, count: counts.sections, href: `${base}/sections` },
            { id: 'files', label: 'Files', icon: FolderOpen, count: counts.files, href: `${base}/files` },
            { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: counts.tasks, href: `${base}/tasks` },
            { id: 'notes', label: 'Notes', icon: NotebookPen, count: counts.notes, href: `${base}/notes` },
            { id: 'map', label: 'Map', icon: Network, count: counts.map, href: `${base}/map` },
          ]}
        />
        <div className={s.wsBarRight}>
          <span className={s.wsSwatch} style={{ background: toneColor(project.tone) }} aria-hidden />
          <Pill tone={STATUS_PILL[project.status].tone}>{STATUS_PILL[project.status].label}</Pill>
          {shared && <Pill icon={Share2}>Shared</Pill>}
          <MoreMenu
            label="Project actions"
            items={[
              { label: 'Edit project details', icon: Pencil, onSelect: () => setEditing(true) },
              { label: shared ? 'Manage sharing' : 'Share project…', icon: Share2, onSelect: () => navigate(shared ? '/sharing' : `/sharing?new=project:${project.id}`) },
              { type: 'separator' },
              {
                label: 'Delete project', icon: Trash2, danger: true,
                onSelect: async () => {
                  if (await confirm({ title: `Delete “${project.name}”?`, message: 'Everything inside this project will be removed. This cannot be undone.', confirmLabel: 'Delete project', danger: true })) {
                    navigate('/projects');
                    deleteProject(project.id);
                    toast('Project deleted');
                  }
                },
              },
            ]}
          />
        </div>
      </div>

      <div className={s.viewBody}>
        {view === 'sections' && <SectionsView project={project} openId={openId} />}
        {view === 'files' && <FilesView project={project} openId={openId} />}
        {view === 'tasks' && <TasksView project={project} openId={openId} />}
        {view === 'notes' && <NotesView project={project} openId={openId} />}
        {view === 'map' && <MapView project={project} />}
      </div>

      <ProjectDialog open={editing} project={project} onClose={() => setEditing(false)} />
    </>
  );
}

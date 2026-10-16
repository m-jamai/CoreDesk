import { useEffect } from 'react';
import { useRoute, navigate } from './lib/router';
import { useWorkspace } from './store/workspace';
import { AppShell } from './shell/AppShell';
import type { Crumb } from './shell/TopBar';
import { FeedbackProvider } from './components/ui';
import { ProjectsOverview } from './features/projects/ProjectsOverview';
import { ProjectWorkspace } from './features/projects/ProjectWorkspace';
import { BoardPage } from './features/board/BoardPage';
import { SharingPage } from './features/sharing/SharingPage';
import { SharePreview } from './features/sharing/SharePreview';
import { TeacherHome } from './features/teacher/TeacherHome';
import { CourseWorkspace } from './features/teacher/CourseWorkspace';
import { LearnerPreview } from './features/teacher/LearnerPreview';
import { VaultPage } from './features/vault/VaultPage';
import { SettingsPage } from './shell/SettingsPage';
import { NotFound } from './shell/NotFound';
import { PlanDialog } from './features/sharing/PlanDialog';

const PROJECT_VIEWS = ['sections', 'files', 'tasks', 'notes', 'map'] as const;
export type ProjectView = (typeof PROJECT_VIEWS)[number];

export default function App() {
  const route = useRoute();
  const ws = useWorkspace();
  const [top, a, b, c] = route.path;

  // Redirect bare root to Projects
  useEffect(() => {
    if (!top) navigate('/projects', { replace: true });
  }, [top]);

  let crumbs: Crumb[] = [];
  let page: JSX.Element;

  switch (top ?? 'projects') {
    case 'projects': {
      if (!a) {
        crumbs = [{ label: 'Projects' }];
        page = <ProjectsOverview />;
        break;
      }
      const project = ws.projects.find((p) => p.id === a);
      if (!project) { crumbs = [{ label: 'Projects', to: '/projects' }, { label: 'Not found' }]; page = <NotFound what="project" back="/projects" />; break; }
      const view: ProjectView = (PROJECT_VIEWS as readonly string[]).includes(b ?? '') ? (b as ProjectView) : 'sections';
      crumbs = [{ label: 'Projects', to: '/projects' }, { label: project.name }];
      page = <ProjectWorkspace key={project.id} project={project} view={view} openId={route.query.get('open')} />;
      break;
    }
    case 'board': {
      const board = a ? ws.boards.find((x) => x.id === a) : undefined;
      crumbs = board ? [{ label: 'Board', to: '/board' }, { label: board.name }] : [{ label: 'Board' }];
      page = <BoardPage boardId={a ?? null} openId={route.query.get('open')} />;
      break;
    }
    case 'sharing': {
      if (a === 'preview' && b) {
        crumbs = [{ label: 'Work Sharing', to: '/sharing' }, { label: 'Preview' }];
        page = <SharePreview shareId={b} />;
      } else if (a === 'teacher') {
        const course = b ? ws.courses.find((x) => x.id === b) : undefined;
        if (b && !course) {
          crumbs = [{ label: 'Work Sharing', to: '/sharing' }, { label: 'Teacher', to: '/sharing/teacher' }, { label: 'Not found' }];
          page = <NotFound what="course" back="/sharing/teacher" />;
        } else if (course && c === 'learn') {
          crumbs = [{ label: 'Work Sharing', to: '/sharing' }, { label: 'Teacher', to: '/sharing/teacher' }, { label: course.title, to: `/sharing/teacher/${course.id}` }, { label: 'Learner preview' }];
          page = <LearnerPreview course={course} />;
        } else if (course) {
          crumbs = [{ label: 'Work Sharing', to: '/sharing' }, { label: 'Teacher', to: '/sharing/teacher' }, { label: course.title }];
          page = <CourseWorkspace key={course.id} course={course} tab={c ?? 'overview'} />;
        } else {
          crumbs = [{ label: 'Work Sharing', to: '/sharing' }, { label: 'Teacher' }];
          page = <SharingPage tab="teacher"><TeacherHome /></SharingPage>;
        }
      } else {
        crumbs = [{ label: 'Work Sharing' }];
        page = <SharingPage tab="shares" />;
      }
      break;
    }
    case 'vault':
      crumbs = [{ label: 'Private Vault' }];
      page = <VaultPage />;
      break;
    case 'settings':
      crumbs = [{ label: 'Settings' }];
      page = <SettingsPage />;
      break;
    default:
      crumbs = [{ label: 'Not found' }];
      page = <NotFound what="page" back="/projects" />;
  }

  return (
    <FeedbackProvider>
      <AppShell route={route} crumbs={crumbs}>{page}</AppShell>
      <PlanDialog />
    </FeedbackProvider>
  );
}

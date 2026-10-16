/* ------------------------------------------------------------------
 * CoreDesk data model
 * One normalized workspace. Every view reads from the same collections,
 * so a task created in Tasks is the same object the Map and Sharing see.
 * ------------------------------------------------------------------ */

export type ID = string;
export type ISODate = string;

export type Tone = 'neutral' | 'amber' | 'teal' | 'blue' | 'violet' | 'rose';

/* ---------- Projects ---------- */

export type ProjectStatus = 'active' | 'planning' | 'paused' | 'archived';

export interface Project {
  id: ID;
  name: string;
  description: string;
  status: ProjectStatus;
  tone: Tone;
  tags: string[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Section {
  id: ID;
  projectId: ID;
  title: string;
  content: string;
  tags: string[];
  favorite: boolean;
  updatedAt: ISODate;
}

export type FileKind = 'folder' | 'document';

export interface FileEntry {
  id: ID;
  projectId: ID;
  parentId: ID | null;
  kind: FileKind;
  name: string;
  /** bytes — demo metadata only; file contents are never stored */
  size?: number;
  updatedAt: ISODate;
}

export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: ID;
  projectId: ID;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due?: ISODate;
  order: number;
  updatedAt: ISODate;
}

export interface Note {
  id: ID;
  projectId: ID;
  title: string;
  body: string;
  tags: string[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type MapRefType = 'section' | 'file' | 'task' | 'note';

/** A Map node only *references* a project item. Deleting the node never deletes the item. */
export interface MapNode {
  id: ID;
  projectId: ID;
  refType: MapRefType;
  refId: ID;
  x: number;
  y: number;
}

export interface MapEdge {
  id: ID;
  projectId: ID;
  from: ID; // MapNode id
  to: ID;   // MapNode id
}

/* ---------- Board ---------- */

export interface Board {
  id: ID;
  name: string;
  description: string;
  updatedAt: ISODate;
}

export interface BoardCard {
  id: ID;
  boardId: ID;
  title: string;
  body: string;
  tone: Tone;
  x: number;
  y: number;
}

export interface BoardLink {
  id: ID;
  boardId: ID;
  from: ID;
  to: ID;
}

/* ---------- Work Sharing ---------- */

export type AccessLevel = 'viewer' | 'editor';
export type ShareStatus = 'active' | 'revoked';
export type ShareItemType = 'project' | 'board';
export type LinkAccess = 'restricted' | 'link';

export interface Collaborator {
  id: ID;
  name: string;
  email: string;
  role: AccessLevel;
}

/** References an existing project or board by id — never a copy. */
export interface Share {
  id: ID;
  itemType: ShareItemType;
  itemId: ID;
  status: ShareStatus;
  linkAccess: LinkAccess;
  linkRole: AccessLevel;
  collaborators: Collaborator[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

/* ---------- Teacher ---------- */

export type LessonKind = 'reading' | 'video' | 'exercise' | 'live';

export interface Lesson {
  id: ID;
  title: string;
  kind: LessonKind;
  minutes: number;
  summary: string;
}

export interface CourseModule {
  id: ID;
  title: string;
  lessons: Lesson[];
}

export type ResourceKind = 'pdf' | 'link' | 'slides' | 'code' | 'dataset';

export interface CourseResource {
  id: ID;
  name: string;
  kind: ResourceKind;
  detail: string;
}

export type CourseVisibility = 'draft' | 'unlisted' | 'published';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Course {
  id: ID;
  title: string;
  summary: string;
  audience: string;
  level: CourseLevel;
  visibility: CourseVisibility;
  enrollment: 'invite' | 'link';
  modules: CourseModule[];
  resources: CourseResource[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type SessionMode = 'online' | 'in-person';

export interface TeachingSession {
  id: ID;
  courseId: ID;
  title: string;
  date: ISODate;      // yyyy-mm-ddThh:mm
  minutes: number;
  mode: SessionMode;
  location: string;
  agenda: string;
}

export interface Learner {
  id: ID;
  courseId: ID;
  name: string;
  email: string;
  completedLessonIds: ID[];
  enrolledAt: ISODate;
  lastActive: ISODate;
}

/* ---------- Settings ---------- */

export type PlanId = 'limited' | 'pro';

export interface Settings {
  plan: PlanId;
  displayName: string;
}

/* ---------- Workspace root ---------- */

export interface Workspace {
  version: number;
  projects: Project[];
  sections: Section[];
  files: FileEntry[];
  tasks: Task[];
  notes: Note[];
  mapNodes: MapNode[];
  mapEdges: MapEdge[];
  boards: Board[];
  cards: BoardCard[];
  links: BoardLink[];
  shares: Share[];
  courses: Course[];
  sessions: TeachingSession[];
  learners: Learner[];
  settings: Settings;
}

/* ---------- Private Vault (kept in a separate store) ---------- */

export interface VaultFolder {
  id: ID;
  name: string;
}

export interface VaultDoc {
  id: ID;
  folderId: ID;
  name: string;
  kind: 'pdf' | 'image' | 'text' | 'sheet';
  size: number;
  updatedAt: ISODate;
}

export interface VaultData {
  version: number;
  folders: VaultFolder[];
  docs: VaultDoc[];
}

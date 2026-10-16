import { useSyncExternalStore } from 'react';
import type {
  BoardCard, Course, FileEntry, ID, MapRefType, Task, TaskStatus, Workspace,
} from '../types';
import { STORAGE_KEYS, WORKSPACE_VERSION } from '../config/app';
import { createSeedWorkspace } from '../data/seed';
import { createPersister, readJSON, removeKey } from '../lib/storage';
import { nowISO } from '../lib/format';

/* =====================================================================
 * Workspace store
 * A tiny external store (no library). Components subscribe with
 * useWorkspace() and derive what they need with useMemo.
 * All non-sensitive demo data persists to localStorage.
 * ===================================================================== */

function load(): Workspace {
  const saved = readJSON<Workspace>(STORAGE_KEYS.workspace);
  if (saved && saved.version === WORKSPACE_VERSION && Array.isArray(saved.projects)) return saved;
  return createSeedWorkspace();
}

let state: Workspace = load();
const listeners = new Set<() => void>();
const persist = createPersister(STORAGE_KEYS.workspace);

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getWorkspace(): Workspace {
  return state;
}

export function setWorkspace(update: (s: Workspace) => Workspace) {
  state = update(state);
  persist(state);
  listeners.forEach((l) => l());
}

export function useWorkspace(): Workspace {
  return useSyncExternalStore(subscribe, getWorkspace);
}

export function resetWorkspace() {
  removeKey(STORAGE_KEYS.workspace);
  state = createSeedWorkspace();
  persist(state);
  listeners.forEach((l) => l());
}

/* ---------- Generic collection helpers ---------- */

type CollectionKey = {
  [K in keyof Workspace]: Workspace[K] extends { id: ID }[] ? K : never;
}[keyof Workspace];

export type ItemOf<K extends CollectionKey> = Workspace[K] extends (infer T)[] ? T : never;

export function insert<K extends CollectionKey>(key: K, item: ItemOf<K>) {
  setWorkspace((s) => ({ ...s, [key]: [...(s[key] as ItemOf<K>[]), item] }));
}

export function patch<K extends CollectionKey>(key: K, id: ID, changes: Partial<ItemOf<K>>) {
  setWorkspace((s) => ({
    ...s,
    [key]: (s[key] as unknown as (ItemOf<K> & { id: ID })[]).map((it) => (it.id === id ? { ...it, ...changes } : it)),
  }));
}

function without<T extends { id: ID }>(list: T[], ids: Set<ID>): T[] {
  return list.filter((it) => !ids.has(it.id));
}

/** Touch a project's updatedAt whenever something inside it changes. */
export function touchProject(projectId: ID) {
  patch('projects', projectId, { updatedAt: nowISO() });
}

/* ---------- Map helpers (node removal never deletes items) ---------- */

function dropMapNodesFor(s: Workspace, refType: MapRefType, refIds: Set<ID>): Workspace {
  const nodeIds = new Set(s.mapNodes.filter((n) => n.refType === refType && refIds.has(n.refId)).map((n) => n.id));
  if (!nodeIds.size) return s;
  return {
    ...s,
    mapNodes: without(s.mapNodes, nodeIds),
    mapEdges: s.mapEdges.filter((e) => !nodeIds.has(e.from) && !nodeIds.has(e.to)),
  };
}

export function removeMapNode(nodeId: ID) {
  setWorkspace((s) => ({
    ...s,
    mapNodes: s.mapNodes.filter((n) => n.id !== nodeId),
    mapEdges: s.mapEdges.filter((e) => e.from !== nodeId && e.to !== nodeId),
  }));
}

/* ---------- Domain actions with cascades ---------- */

export function deleteProject(id: ID) {
  setWorkspace((s) => ({
    ...s,
    projects: s.projects.filter((p) => p.id !== id),
    sections: s.sections.filter((x) => x.projectId !== id),
    files: s.files.filter((x) => x.projectId !== id),
    tasks: s.tasks.filter((x) => x.projectId !== id),
    notes: s.notes.filter((x) => x.projectId !== id),
    mapNodes: s.mapNodes.filter((x) => x.projectId !== id),
    mapEdges: s.mapEdges.filter((x) => x.projectId !== id),
    shares: s.shares.filter((x) => !(x.itemType === 'project' && x.itemId === id)),
  }));
}

export function deleteSection(id: ID) {
  setWorkspace((s) => dropMapNodesFor({ ...s, sections: s.sections.filter((x) => x.id !== id) }, 'section', new Set([id])));
}

export function deleteNote(id: ID) {
  setWorkspace((s) => dropMapNodesFor({ ...s, notes: s.notes.filter((x) => x.id !== id) }, 'note', new Set([id])));
}

export function deleteTask(id: ID) {
  setWorkspace((s) => dropMapNodesFor({ ...s, tasks: s.tasks.filter((x) => x.id !== id) }, 'task', new Set([id])));
}

/** Collect a file entry and all its descendants. */
export function collectFileTree(files: FileEntry[], rootId: ID): Set<ID> {
  const ids = new Set<ID>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of files) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    }
  }
  return ids;
}

export function deleteFile(id: ID) {
  setWorkspace((s) => {
    const ids = collectFileTree(s.files, id);
    return dropMapNodesFor({ ...s, files: without(s.files, ids) }, 'file', ids);
  });
}

/** Move a task to a column at a given index; reorders siblings. */
export function moveTask(taskId: ID, status: TaskStatus, index?: number) {
  setWorkspace((s) => {
    const task = s.tasks.find((t) => t.id === taskId);
    if (!task) return s;
    const column = s.tasks
      .filter((t) => t.projectId === task.projectId && t.status === status && t.id !== taskId)
      .sort((a, b) => a.order - b.order);
    const at = index === undefined ? column.length : Math.max(0, Math.min(index, column.length));
    const moved: Task = { ...task, status, updatedAt: nowISO() };
    column.splice(at, 0, moved);
    const orderMap = new Map(column.map((t, i) => [t.id, i]));
    return {
      ...s,
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...moved, order: orderMap.get(t.id)! } : orderMap.has(t.id) ? { ...t, order: orderMap.get(t.id)! } : t)),
    };
  });
  const t = state.tasks.find((x) => x.id === taskId);
  if (t) touchProject(t.projectId);
}

export function deleteBoard(id: ID) {
  setWorkspace((s) => ({
    ...s,
    boards: s.boards.filter((b) => b.id !== id),
    cards: s.cards.filter((c) => c.boardId !== id),
    links: s.links.filter((l) => l.boardId !== id),
    shares: s.shares.filter((x) => !(x.itemType === 'board' && x.itemId === id)),
  }));
}

export function deleteCard(id: ID) {
  setWorkspace((s) => ({
    ...s,
    cards: s.cards.filter((c) => c.id !== id),
    links: s.links.filter((l) => l.from !== id && l.to !== id),
  }));
}

export function updateCard(id: ID, changes: Partial<BoardCard>) {
  const card = state.cards.find((c) => c.id === id);
  patch('cards', id, changes);
  if (card) patch('boards', card.boardId, { updatedAt: nowISO() });
}

export function deleteCourse(id: ID) {
  setWorkspace((s) => ({
    ...s,
    courses: s.courses.filter((c) => c.id !== id),
    sessions: s.sessions.filter((x) => x.courseId !== id),
    learners: s.learners.filter((x) => x.courseId !== id),
  }));
}

export function updateCourse(id: ID, update: (c: Course) => Course) {
  setWorkspace((s) => ({
    ...s,
    courses: s.courses.map((c) => (c.id === id ? { ...update(c), updatedAt: nowISO() } : c)),
  }));
}

export function patchSettings(changes: Partial<Workspace['settings']>) {
  setWorkspace((s) => ({ ...s, settings: { ...s.settings, ...changes } }));
}

/** Place a project item on its Map. Returns the node id (existing one if already placed). */
export function addMapNode(projectId: ID, refType: MapRefType, refId: ID, at?: { x: number; y: number }): ID {
  const existing = state.mapNodes.find((n) => n.projectId === projectId && n.refType === refType && n.refId === refId);
  if (existing) return existing.id;
  const siblings = state.mapNodes.filter((n) => n.projectId === projectId);
  // Default: next free slot in a loose grid to the right of existing nodes.
  const pos = at ?? (() => {
    const i = siblings.length;
    return { x: 60 + (i % 4) * 300, y: 60 + Math.floor(i / 4) * 150 };
  })();
  const id = `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  setWorkspace((s) => ({ ...s, mapNodes: [...s.mapNodes, { id, projectId, refType, refId, x: pos.x, y: pos.y }] }));
  return id;
}

export function isOnMap(ws: Workspace, refType: MapRefType, refId: ID): boolean {
  return ws.mapNodes.some((n) => n.refType === refType && n.refId === refId);
}

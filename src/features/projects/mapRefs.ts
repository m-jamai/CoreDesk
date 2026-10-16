import { AlignLeft, CheckSquare, File, Folder, NotebookPen, type LucideIcon } from 'lucide-react';
import type { ID, MapRefType, Workspace } from '../../types';
import { fileSize, shortDate } from '../../lib/format';
import { statusLabel } from './taskMeta';

export interface ResolvedRef {
  title: string;
  kind: string;
  meta: string;
  body?: string;
  icon: LucideIcon;
  /** Project view that owns this item */
  view: 'sections' | 'files' | 'tasks' | 'notes';
}

/** Resolve a Map reference to the live project item. Returns null if the item no longer exists. */
export function resolveRef(ws: Workspace, refType: MapRefType, refId: ID): ResolvedRef | null {
  switch (refType) {
    case 'section': {
      const x = ws.sections.find((i) => i.id === refId);
      return x ? { title: x.title, kind: 'Section', meta: x.tags.join(' · ') || `Edited ${shortDate(x.updatedAt)}`, body: x.content, icon: AlignLeft, view: 'sections' } : null;
    }
    case 'task': {
      const x = ws.tasks.find((i) => i.id === refId);
      return x ? { title: x.title, kind: 'Task', meta: `${statusLabel(x.status)} · ${x.priority}`, body: x.description, icon: CheckSquare, view: 'tasks' } : null;
    }
    case 'note': {
      const x = ws.notes.find((i) => i.id === refId);
      return x ? { title: x.title || 'Untitled note', kind: 'Note', meta: shortDate(x.updatedAt), body: x.body, icon: NotebookPen, view: 'notes' } : null;
    }
    case 'file': {
      const x = ws.files.find((i) => i.id === refId);
      if (!x) return null;
      const count = ws.files.filter((f) => f.parentId === x.id).length;
      return {
        title: x.name,
        kind: x.kind === 'folder' ? 'Folder' : 'Document',
        meta: x.kind === 'folder' ? `${count} item${count === 1 ? '' : 's'}` : fileSize(x.size),
        icon: x.kind === 'folder' ? Folder : File,
        view: 'files',
      };
    }
  }
}

export const REF_LABEL: Record<MapRefType, string> = { section: 'Sections', file: 'Files', task: 'Tasks', note: 'Notes' };

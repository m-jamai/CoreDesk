import { useMemo, useRef, useState, type DragEvent } from 'react';
import {
  ChevronRight, File, FilePlus, Folder, FolderOpen, FolderPlus, HardDrive, Network, Pencil, Trash2, Upload,
} from 'lucide-react';
import type { FileEntry, ID, Project } from '../../types';
import L from '../../components/layout/layout.module.css';
import s from './projects.module.css';
import {
  Button, Dialog, EmptyState, MoreMenu, Notice, SearchInput, Select, Toolbar, ToolbarSep, ToolbarSpacer,
  cx, useContextMenu, useFeedback, type MenuEntry,
} from '../../components/ui';
import { addMapNode, collectFileTree, deleteFile, insert, isOnMap, patch, touchProject, useWorkspace } from '../../store/workspace';
import { extOf, fileSize, nowISO, relativeTime } from '../../lib/format';
import { uid } from '../../lib/id';
import { useOpenParam } from '../../lib/useOpenParam';
import { navigate } from '../../lib/router';
import { FileNameDialog } from './dialogs';

type SortKey = 'name' | 'updated' | 'size';

export function FilesView({ project, openId }: { project: Project; openId: string | null }) {
  const ws = useWorkspace();
  const { confirm, toast } = useFeedback();
  const ctx = useContextMenu();
  const [folderId, setFolderId] = useState<ID | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [selected, setSelected] = useState<ID | null>(null);
  const [nameDialog, setNameDialog] = useState<{ mode: 'folder' | 'document' | 'rename'; entry?: FileEntry } | null>(null);
  const [preview, setPreview] = useState<FileEntry | null>(null);
  const [dropTarget, setDropTarget] = useState<ID | 'root' | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const files = useMemo(() => ws.files.filter((f) => f.projectId === project.id), [ws.files, project.id]);
  const byId = useMemo(() => new Map(files.map((f) => [f.id, f])), [files]);

  // Guard against a folder that was deleted elsewhere
  const currentFolder = folderId ? byId.get(folderId) ?? null : null;
  const cwd = currentFolder?.id ?? null;

  const path = useMemo(() => {
    const out: FileEntry[] = [];
    let cur = currentFolder;
    while (cur) { out.unshift(cur); cur = cur.parentId ? byId.get(cur.parentId) ?? null : null; }
    return out;
  }, [currentFolder, byId]);

  const pathOf = (f: FileEntry) => {
    const parts: string[] = [];
    let cur = f.parentId ? byId.get(f.parentId) : undefined;
    while (cur) { parts.unshift(cur.name); cur = cur.parentId ? byId.get(cur.parentId) : undefined; }
    return parts.join(' / ') || 'Project root';
  };

  useOpenParam(openId, (id) => {
    const f = byId.get(id);
    if (!f) return;
    if (f.kind === 'folder') setFolderId(f.id);
    else { setFolderId(f.parentId); setSelected(f.id); }
  });

  const searching = q.trim().length > 0;
  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const base = searching ? files.filter((f) => f.name.toLowerCase().includes(query)) : files.filter((f) => f.parentId === cwd);
    return [...base].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      if (sort === 'updated') return b.updatedAt.localeCompare(a.updatedAt);
      if (sort === 'size') return (b.size ?? 0) - (a.size ?? 0);
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }, [files, cwd, q, searching, sort]);

  const siblingsFor = (parent: ID | null) => files.filter((f) => f.parentId === parent);
  const childCount = (id: ID) => files.filter((f) => f.parentId === id).length;

  const create = (kind: 'folder' | 'document', name: string) => {
    insert('files', { id: uid('f'), projectId: project.id, parentId: cwd, kind, name, size: kind === 'document' ? 0 : undefined, updatedAt: nowISO() });
    touchProject(project.id);
    toast(kind === 'folder' ? 'Folder created' : 'Document entry created');
  };

  const simulateUpload = (list: FileList | null) => {
    if (!list?.length) return;
    const taken = new Set(siblingsFor(cwd).map((f) => f.name.toLowerCase()));
    let added = 0;
    for (const file of Array.from(list).slice(0, 20)) {
      let name = file.name;
      let n = 2;
      while (taken.has(name.toLowerCase())) {
        const dot = file.name.lastIndexOf('.');
        name = dot > 0 ? `${file.name.slice(0, dot)} (${n})${file.name.slice(dot)}` : `${file.name} (${n})`;
        n++;
      }
      taken.add(name.toLowerCase());
      // Only the file's name and size are recorded. Its contents are never read or stored.
      insert('files', { id: uid('f'), projectId: project.id, parentId: cwd, kind: 'document', name, size: file.size, updatedAt: nowISO() });
      added++;
    }
    touchProject(project.id);
    toast(`Simulated upload: ${added} entr${added === 1 ? 'y' : 'ies'} added (name & size only)`, 'info');
  };

  const move = (id: ID, target: ID | null) => {
    const f = byId.get(id);
    if (!f || f.parentId === target || id === target) return;
    if (f.kind === 'folder' && target && collectFileTree(files, id).has(target)) {
      toast('A folder cannot be moved inside itself', 'danger');
      return;
    }
    if (siblingsFor(target).some((x) => x.name.toLowerCase() === f.name.toLowerCase())) {
      toast('An item with that name already exists there', 'danger');
      return;
    }
    patch('files', id, { parentId: target, updatedAt: nowISO() });
    touchProject(project.id);
    toast(`Moved to ${target ? byId.get(target)?.name : 'project root'}`);
  };

  const remove = async (f: FileEntry) => {
    const inner = f.kind === 'folder' ? collectFileTree(files, f.id).size - 1 : 0;
    const ok = await confirm({
      title: `Delete “${f.name}”?`,
      message: f.kind === 'folder' && inner > 0 ? `This folder and the ${inner} item${inner === 1 ? '' : 's'} inside it will be removed.` : 'This entry will be removed from the project.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) {
      deleteFile(f.id);
      if (selected === f.id) setSelected(null);
      toast('Deleted');
    }
  };

  const open = (f: FileEntry) => {
    if (f.kind === 'folder') { setFolderId(f.id); setQ(''); setSelected(null); }
    else setPreview(f);
  };

  const menuFor = (f: FileEntry): MenuEntry[] => {
    const onMap = isOnMap(ws, 'file', f.id);
    return [
      { label: f.kind === 'folder' ? 'Open folder' : 'Preview', icon: f.kind === 'folder' ? FolderOpen : File, onSelect: () => open(f) },
      { label: 'Rename', icon: Pencil, onSelect: () => setNameDialog({ mode: 'rename', entry: f }) },
      onMap
        ? { label: 'Show on Map', icon: Network, onSelect: () => navigate(`/projects/${project.id}/map`) }
        : { label: 'Add to Map', icon: Network, onSelect: () => { addMapNode(project.id, 'file', f.id); toast('Added to Map'); } },
      ...(f.parentId ? [{ label: 'Move to project root', icon: HardDrive, onSelect: () => move(f.id, null) } as MenuEntry] : []),
      { type: 'separator' },
      { label: 'Delete', icon: Trash2, danger: true, onSelect: () => remove(f) },
    ];
  };

  /* ---------- drag to move ---------- */
  const onRowDragStart = (e: DragEvent, f: FileEntry) => {
    e.dataTransfer.setData('application/x-coredesk-file', f.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const allowDrop = (e: DragEvent, target: ID | 'root') => {
    const types = e.dataTransfer.types;
    if (types.includes('application/x-coredesk-file') || types.includes('Files')) {
      e.preventDefault();
      setDropTarget(target);
    }
  };
  const onDrop = (e: DragEvent, target: ID | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
    const id = e.dataTransfer.getData('application/x-coredesk-file');
    if (id) move(id, target);
    else if (e.dataTransfer.files?.length) {
      if (target !== cwd) setFolderId(target);
      simulateUpload(e.dataTransfer.files);
    }
  };

  return (
    <>
      <Toolbar>
        <nav className={s.pathbar} aria-label="Folder path">
          {path.length > 0 || searching ? (
            <button
              type="button"
              className={s.pathBtn}
              onClick={() => { setFolderId(null); setQ(''); }}
              onDragOver={(e) => allowDrop(e, 'root')}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => onDrop(e, null)}
              style={dropTarget === 'root' ? { background: 'var(--accent-dim)' } : undefined}
            >
              Files
            </button>
          ) : <span className={s.pathCurrent}>Files</span>}
          {!searching && path.map((p, i) => (
            <span key={p.id} style={{ display: 'contents' }}>
              <ChevronRight size={12} color="var(--text-3)" />
              {i === path.length - 1
                ? <span className={s.pathCurrent}>{p.name}</span>
                : <button type="button" className={s.pathBtn} onClick={() => setFolderId(p.id)}>{p.name}</button>}
            </span>
          ))}
          {searching && <><ChevronRight size={12} color="var(--text-3)" /><span className={s.pathCurrent}>Search results</span></>}
        </nav>
        <ToolbarSpacer />
        <SearchInput value={q} onChange={setQ} placeholder="Search all files" width={190} />
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={{ width: 120, height: 28, fontSize: 'var(--fs-sm)' }} aria-label="Sort by">
          <option value="name">Name</option>
          <option value="updated">Modified</option>
          <option value="size">Size</option>
        </Select>
        <ToolbarSep />
        <Button icon={FolderPlus} onClick={() => setNameDialog({ mode: 'folder' })}>Folder</Button>
        <Button icon={FilePlus} onClick={() => setNameDialog({ mode: 'document' })}>Document</Button>
        <Button variant="primary" icon={Upload} onClick={() => uploadRef.current?.click()}>Upload</Button>
        <input ref={uploadRef} type="file" multiple hidden onChange={(e) => { simulateUpload(e.target.files); e.target.value = ''; }} />
      </Toolbar>

      <div
        className={L.scroll}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }}
        onDrop={(e) => onDrop(e, cwd)}
      >
        <div className={L.inner} style={{ paddingTop: 8 }}>
          {rows.length === 0 ? (
            searching ? (
              <EmptyState icon={File} title="No files match" text={`Nothing named like “${q}” in this project.`} />
            ) : (
              <EmptyState
                icon={currentFolder ? FolderOpen : Folder}
                title={currentFolder ? 'This folder is empty' : 'No files yet'}
                text="Create a folder or a document entry, or drop files here to simulate an upload."
                action={<div style={{ display: 'flex', gap: 8 }}><Button icon={FolderPlus} onClick={() => setNameDialog({ mode: 'folder' })}>New folder</Button><Button variant="primary" icon={Upload} onClick={() => uploadRef.current?.click()}>Upload</Button></div>}
              />
            )
          ) : (
            <table className={L.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th className={L.hideSm}>{searching ? 'Location' : 'Type'}</th>
                  <th className={L.hideSm} style={{ textAlign: 'right' }}>Size</th>
                  <th>Modified</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => {
                  const ext = extOf(f.name);
                  const isDrop = dropTarget === f.id;
                  return (
                    <tr
                      key={f.id}
                      className={cx((selected === f.id || isDrop) && L.rowSelected)}
                      draggable
                      onDragStart={(e) => onRowDragStart(e, f)}
                      onDragOver={f.kind === 'folder' ? (e) => allowDrop(e, f.id) : undefined}
                      onDragLeave={f.kind === 'folder' ? () => setDropTarget(null) : undefined}
                      onDrop={f.kind === 'folder' ? (e) => onDrop(e, f.id) : undefined}
                      onClick={() => setSelected(f.id)}
                      onDoubleClick={() => open(f)}
                      onContextMenu={(e) => { setSelected(f.id); ctx.open(e, menuFor(f)); }}
                    >
                      <td className={L.primaryCell} style={{ maxWidth: 0, width: '50%' }}>
                        <button type="button" className={s.fileName} onClick={(e) => { e.stopPropagation(); open(f); }}>
                          {f.kind === 'folder' ? <Folder size={15} className={s.folderIcon} /> : <File size={15} className={s.fileIcon} />}
                          <span>{f.name}</span>
                        </button>
                      </td>
                      <td className={L.hideSm}>
                        {searching ? <span className={L.mutedSm}>{pathOf(f)}</span> : f.kind === 'folder' ? <span className={L.mutedSm}>Folder · {childCount(f.id)}</span> : ext ? <span className={s.ext}>{ext}</span> : <span className={L.mutedSm}>Document</span>}
                      </td>
                      <td className={cx(L.hideSm, 'mono')} style={{ textAlign: 'right', fontSize: 'var(--fs-xs)' }}>{f.kind === 'folder' ? '—' : fileSize(f.size)}</td>
                      <td style={{ fontSize: 'var(--fs-xs)', whiteSpace: 'nowrap' }}>{relativeTime(f.updatedAt)}</td>
                      <td className={L.actionsCell} onClick={(e) => e.stopPropagation()}><MoreMenu items={menuFor(f)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {rows.length > 0 && !searching && (
            <div className={s.dropHint}>Drop files here to simulate an upload · drag rows onto a folder to move them</div>
          )}
        </div>
      </div>

      <FileNameDialog
        open={!!nameDialog}
        mode={nameDialog?.mode ?? 'folder'}
        entry={nameDialog?.entry}
        siblings={siblingsFor(nameDialog?.entry ? nameDialog.entry.parentId : cwd)}
        onClose={() => setNameDialog(null)}
        onSubmit={(name) => {
          if (nameDialog?.mode === 'rename' && nameDialog.entry) {
            patch('files', nameDialog.entry.id, { name, updatedAt: nowISO() });
            touchProject(project.id);
            toast('Renamed');
          } else if (nameDialog) create(nameDialog.mode === 'folder' ? 'folder' : 'document', name);
        }}
      />

      <Dialog
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.name ?? ''}
        subtitle={preview ? pathOf(preview) : undefined}
        width={460}
        footer={<>
          <Button onClick={() => { if (preview) setNameDialog({ mode: 'rename', entry: preview }); setPreview(null); }} icon={Pencil}>Rename</Button>
          <Button variant="primary" onClick={() => setPreview(null)}>Close</Button>
        </>}
      >
        {preview && (
          <>
            <dl className={s.kv}>
              <dt>Type</dt><dd>{extOf(preview.name).toUpperCase() || 'Document'}</dd>
              <dt>Size</dt><dd className="mono">{fileSize(preview.size)}</dd>
              <dt>Modified</dt><dd>{relativeTime(preview.updatedAt)}</dd>
            </dl>
            <Notice>File contents are not stored in this prototype — this entry is metadata only.</Notice>
          </>
        )}
      </Dialog>
      {ctx.node}
    </>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  FileImage, FileSpreadsheet, FileText, FileType, Folder, FolderPlus, Inbox, Lock, Pencil, Plus, Trash2,
} from 'lucide-react';
import type { ID, VaultDoc, VaultFolder } from '../../types';
import L from '../../components/layout/layout.module.css';
import s from './vault.module.css';
import {
  Button, Dialog, EmptyState, Field, FormRow, IconButton, Input, MoreMenu, SearchInput, Select, Toolbar,
  ToolbarSpacer, cx, useContextMenu, useFeedback, type MenuEntry,
} from '../../components/ui';
import { bumpIdle, lockVault, setVaultData, useVault } from '../../store/vault';
import { fileSize, nowISO, relativeTime } from '../../lib/format';
import { uid } from '../../lib/id';

type Sort = 'name' | 'updated' | 'size';

const KIND_ICON = { pdf: FileType, image: FileImage, text: FileText, sheet: FileSpreadsheet } as const;
const KIND_LABEL = { pdf: 'PDF', image: 'Image', text: 'Text', sheet: 'Spreadsheet' } as const;

export function VaultBrowser() {
  const { data } = useVault();
  const { confirm, toast } = useFeedback();
  const ctx = useContextMenu();
  const [folderId, setFolderId] = useState<ID | 'all'>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('updated');
  const [docDialog, setDocDialog] = useState<{ doc?: VaultDoc } | null>(null);
  const [folderDialog, setFolderDialog] = useState<{ folder?: VaultFolder } | null>(null);

  // Any interaction keeps the demo session alive; idle → auto-lock.
  useEffect(() => {
    const bump = () => bumpIdle();
    window.addEventListener('pointerdown', bump);
    window.addEventListener('keydown', bump);
    return () => { window.removeEventListener('pointerdown', bump); window.removeEventListener('keydown', bump); };
  }, []);

  const folderName = (id: ID) => data.folders.find((f) => f.id === id)?.name ?? '—';
  const count = (id: ID) => data.docs.filter((d) => d.folderId === id).length;

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return data.docs
      .filter((d) => folderId === 'all' || d.folderId === folderId)
      .filter((d) => !query || d.name.toLowerCase().includes(query))
      .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'size' ? b.size - a.size : b.updatedAt.localeCompare(a.updatedAt)));
  }, [data.docs, folderId, q, sort]);

  const lock = () => { lockVault(); toast('Vault locked', 'info'); };

  const removeDoc = async (d: VaultDoc) => {
    if (await confirm({ title: `Remove “${d.name}”?`, message: 'This placeholder entry will be deleted from the Vault demo.', confirmLabel: 'Remove', danger: true })) {
      setVaultData((v) => ({ ...v, docs: v.docs.filter((x) => x.id !== d.id) }));
      toast('Entry removed');
    }
  };

  const removeFolder = async (f: VaultFolder) => {
    const n = count(f.id);
    if (await confirm({ title: `Delete folder “${f.name}”?`, message: n ? `Its ${n} entr${n === 1 ? 'y' : 'ies'} will be removed too.` : 'This empty folder will be removed.', confirmLabel: 'Delete folder', danger: true })) {
      setVaultData((v) => ({ ...v, folders: v.folders.filter((x) => x.id !== f.id), docs: v.docs.filter((d) => d.folderId !== f.id) }));
      if (folderId === f.id) setFolderId('all');
      toast('Folder deleted');
    }
  };

  const moveDoc = (d: VaultDoc, to: ID) => {
    setVaultData((v) => ({ ...v, docs: v.docs.map((x) => (x.id === d.id ? { ...x, folderId: to, updatedAt: nowISO() } : x)) }));
    toast(`Moved to ${folderName(to)}`);
  };

  const menuFor = (d: VaultDoc): MenuEntry[] => [
    { label: 'Rename', icon: Pencil, onSelect: () => setDocDialog({ doc: d }) },
    { type: 'label', label: 'Move to' },
    ...data.folders.filter((f) => f.id !== d.folderId).map<MenuEntry>((f) => ({ label: f.name, icon: Folder, onSelect: () => moveDoc(d, f.id) })),
    { type: 'separator' },
    { label: 'Remove', icon: Trash2, danger: true, onSelect: () => removeDoc(d) },
  ];

  return (
    <div className={s.browser}>
      <aside className={s.folders} aria-label="Vault folders">
        <div className={s.foldersHead}>
          <span className="label">Folders</span>
          <IconButton icon={FolderPlus} size="sm" label="New folder" onClick={() => setFolderDialog({})} />
        </div>
        <div className={s.folderList}>
          <div className={cx(s.folder, folderId === 'all' && s.folderActive)}>
            <button type="button" className={s.folderBtn} onClick={() => setFolderId('all')}>
              <Inbox size={14} /><span>All entries</span><span className={s.count}>{data.docs.length}</span>
            </button>
          </div>
          {data.folders.map((f) => (
            <div key={f.id} className={cx(s.folder, folderId === f.id && s.folderActive)}>
              <button type="button" className={s.folderBtn} onClick={() => setFolderId(f.id)}>
                <Folder size={14} /><span>{f.name}</span><span className={s.count}>{count(f.id)}</span>
              </button>
              <MoreMenu items={[
                { label: 'Rename folder', icon: Pencil, onSelect: () => setFolderDialog({ folder: f }) },
                { label: 'Delete folder', icon: Trash2, danger: true, onSelect: () => removeFolder(f) },
              ]} />
            </div>
          ))}
        </div>
      </aside>

      <div className={s.main}>
        <Toolbar style={{ background: '#0f1011' }}>
          <SearchInput value={q} onChange={setQ} placeholder="Search Vault" />
          <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} style={{ width: 160, height: 28, fontSize: 'var(--fs-sm)' }} aria-label="Sort by">
            <option value="updated">Recently modified</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </Select>
          <ToolbarSpacer />
          <Button icon={Plus} onClick={() => setDocDialog({})} disabled={!data.folders.length}>Add entry</Button>
          <Button icon={Lock} className={s.lockBtn} onClick={lock}>Lock</Button>
        </Toolbar>

        <div className={L.scroll}>
          <div className={L.inner} style={{ paddingTop: 8 }}>
            {rows.length === 0 ? (
              q ? <EmptyState icon={Inbox} title="No entries match" />
                : data.folders.length === 0
                  ? <EmptyState icon={FolderPlus} title="No folders" text="Create a folder to organise placeholder entries." action={<Button icon={FolderPlus} onClick={() => setFolderDialog({})}>New folder</Button>} />
                  : <EmptyState icon={Inbox} title="This folder is empty" text="Add a placeholder entry to see how the Vault would organise documents." action={<Button icon={Plus} onClick={() => setDocDialog({})}>Add entry</Button>} />
            ) : (
              <table className={L.table}>
                <thead>
                  <tr>
                    <th style={{ background: '#0b0c0d' }}>Name</th>
                    {folderId === 'all' && <th className={L.hideSm} style={{ background: '#0b0c0d' }}>Folder</th>}
                    <th className={L.hideSm} style={{ background: '#0b0c0d' }}>Type</th>
                    <th className={L.hideSm} style={{ background: '#0b0c0d', textAlign: 'right' }}>Size</th>
                    <th style={{ background: '#0b0c0d' }}>Modified</th>
                    <th style={{ background: '#0b0c0d' }} aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => {
                    const Icon = KIND_ICON[d.kind];
                    return (
                      <tr key={d.id} onContextMenu={(e) => ctx.open(e, menuFor(d))} onDoubleClick={() => setDocDialog({ doc: d })}>
                        <td className={L.primaryCell} style={{ maxWidth: 0, width: '45%' }}>
                          <span className={L.cellFlex}><Icon size={15} className={s.docIcon} /><span>{d.name}</span></span>
                        </td>
                        {folderId === 'all' && <td className={L.hideSm}>{folderName(d.folderId)}</td>}
                        <td className={L.hideSm}>{KIND_LABEL[d.kind]}</td>
                        <td className={`${L.hideSm} mono`} style={{ textAlign: 'right', fontSize: 'var(--fs-xs)' }}>{fileSize(d.size)}</td>
                        <td style={{ fontSize: 'var(--fs-xs)', whiteSpace: 'nowrap' }}>{relativeTime(d.updatedAt)}</td>
                        <td className={L.actionsCell}><MoreMenu items={menuFor(d)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <DocDialog
        open={!!docDialog}
        doc={docDialog?.doc}
        folders={data.folders}
        defaultFolder={folderId === 'all' ? data.folders[0]?.id : folderId}
        siblings={data.docs}
        onClose={() => setDocDialog(null)}
      />
      <FolderDialog open={!!folderDialog} folder={folderDialog?.folder} folders={data.folders} onClose={() => setFolderDialog(null)} />
      {ctx.node}
    </div>
  );
}

function DocDialog({
  open, onClose, doc, folders, defaultFolder, siblings,
}: { open: boolean; onClose: () => void; doc?: VaultDoc; folders: VaultFolder[]; defaultFolder?: ID; siblings: VaultDoc[] }) {
  const { toast } = useFeedback();
  const [name, setName] = useState('');
  const [folder, setFolder] = useState('');
  const [kind, setKind] = useState<VaultDoc['kind']>('pdf');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(doc?.name ?? ''); setFolder(doc?.folderId ?? defaultFolder ?? ''); setKind(doc?.kind ?? 'pdf'); setTouched(false);
  }, [open, doc, defaultFolder]);

  const trimmed = name.trim();
  const error = !trimmed ? 'Enter a name.' : siblings.some((d) => d.id !== doc?.id && d.folderId === folder && d.name.toLowerCase() === trimmed.toLowerCase()) ? 'An entry with this name already exists in that folder.' : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={doc ? 'Rename entry' : 'Add placeholder entry'}
      subtitle={doc ? undefined : 'Records a name only. No file is read, uploaded, stored or encrypted.'}
      width={460}
      onSubmit={() => {
        setTouched(true);
        if (error || !folder) return;
        if (doc) {
          setVaultData((v) => ({ ...v, docs: v.docs.map((x) => (x.id === doc.id ? { ...x, name: trimmed, folderId: folder, kind, updatedAt: nowISO() } : x)) }));
          toast('Entry updated');
        } else {
          setVaultData((v) => ({ ...v, docs: [...v.docs, { id: uid('vd'), folderId: folder, name: trimmed, kind, size: 0, updatedAt: nowISO() }] }));
          toast('Placeholder entry added');
        }
        onClose();
      }}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">{doc ? 'Save' : 'Add entry'}</Button></>}
    >
      <Field label="Name" error={touched ? error : null} htmlFor="vd-name">
        <Input id="vd-name" value={name} onChange={(e) => setName(e.target.value)} invalid={touched && !!error} maxLength={120} placeholder="e.g. Insurance policy — placeholder.pdf" />
      </Field>
      <FormRow>
        <Field label="Folder" htmlFor="vd-folder">
          <Select id="vd-folder" value={folder} onChange={(e) => setFolder(e.target.value)}>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
        </Field>
        <Field label="Type" htmlFor="vd-kind">
          <Select id="vd-kind" value={kind} onChange={(e) => setKind(e.target.value as VaultDoc['kind'])}>
            <option value="pdf">PDF</option>
            <option value="image">Image</option>
            <option value="text">Text</option>
            <option value="sheet">Spreadsheet</option>
          </Select>
        </Field>
      </FormRow>
    </Dialog>
  );
}

function FolderDialog({ open, onClose, folder, folders }: { open: boolean; onClose: () => void; folder?: VaultFolder; folders: VaultFolder[] }) {
  const { toast } = useFeedback();
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (open) { setName(folder?.name ?? ''); setTouched(false); } }, [open, folder]);
  const trimmed = name.trim();
  const error = !trimmed ? 'Enter a folder name.' : folders.some((f) => f.id !== folder?.id && f.name.toLowerCase() === trimmed.toLowerCase()) ? 'A folder with this name exists.' : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={folder ? 'Rename folder' : 'New folder'}
      width={400}
      onSubmit={() => {
        setTouched(true);
        if (error) return;
        if (folder) setVaultData((v) => ({ ...v, folders: v.folders.map((f) => (f.id === folder.id ? { ...f, name: trimmed } : f)) }));
        else setVaultData((v) => ({ ...v, folders: [...v.folders, { id: uid('vf'), name: trimmed }] }));
        toast(folder ? 'Folder renamed' : 'Folder created');
        onClose();
      }}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">{folder ? 'Rename' : 'Create'}</Button></>}
    >
      <Field label="Name" error={touched ? error : null} htmlFor="vf-name">
        <Input id="vf-name" value={name} onChange={(e) => setName(e.target.value)} invalid={touched && !!error} maxLength={40} />
      </Field>
    </Dialog>
  );
}

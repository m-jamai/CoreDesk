import { useEffect, useMemo, useState } from 'react';
import { Copy, Link2, Lock, Trash2, UserPlus } from 'lucide-react';
import type { AccessLevel, Collaborator, ID, LinkAccess, Share, ShareItemType } from '../../types';
import s from './sharing.module.css';
import {
  Avatar, Button, Dialog, Field, IconButton, Input, Notice, Segmented, Select, useFeedback,
} from '../../components/ui';
import { insert, patch, useWorkspace } from '../../store/workspace';
import { uid } from '../../lib/id';
import { nowISO } from '../../lib/format';
import { withinLimit } from '../../config/plans';
import { openPlanDialog, usePlan } from './plan';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Create or manage a share. A share always references an existing project or
 * board by id. Nothing is sent: invitations, links and permissions are simulated.
 */
export function ShareDialog({
  open, onClose, share, preselect,
}: {
  open: boolean;
  onClose: () => void;
  share?: Share;
  preselect?: { type: ShareItemType; id: ID } | null;
}) {
  const ws = useWorkspace();
  const { toast } = useFeedback();
  const { limits } = usePlan();

  const [item, setItem] = useState('');
  const [linkAccess, setLinkAccess] = useState<LinkAccess>('restricted');
  const [linkRole, setLinkRole] = useState<AccessLevel>('viewer');
  const [collabs, setCollabs] = useState<Collaborator[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AccessLevel>('viewer');
  const [addError, setAddError] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setItem(share ? `${share.itemType}:${share.itemId}` : preselect ? `${preselect.type}:${preselect.id}` : '');
    setLinkAccess(share?.linkAccess ?? 'restricted');
    setLinkRole(share?.linkRole ?? 'viewer');
    setCollabs(share?.collaborators ?? []);
    setName(''); setEmail(''); setRole('viewer'); setAddError(null); setItemError(null);
  }, [open, share, preselect]);

  // Only projects and boards — the Private Vault is never offered here.
  const options = useMemo(() => {
    const taken = new Set(ws.shares.filter((x) => x.id !== share?.id).map((x) => `${x.itemType}:${x.itemId}`));
    return {
      projects: ws.projects.map((p) => ({ value: `project:${p.id}`, label: p.name, taken: taken.has(`project:${p.id}`) })),
      boards: ws.boards.map((b) => ({ value: `board:${b.id}`, label: b.name, taken: taken.has(`board:${b.id}`) })),
    };
  }, [ws.projects, ws.boards, ws.shares, share]);

  const itemLabel = (() => {
    const [type, id] = item.split(':');
    return type === 'project' ? ws.projects.find((p) => p.id === id)?.name : ws.boards.find((b) => b.id === id)?.name;
  })();

  const collabLimitReached = !withinLimit(collabs.length, limits.collaboratorsPerShare);

  const addCollaborator = () => {
    const n = name.trim();
    const e = email.trim().toLowerCase();
    if (!n) return setAddError('Enter a name.');
    if (!EMAIL_RE.test(e)) return setAddError('Enter a valid email address.');
    if (collabs.some((c) => c.email === e)) return setAddError('This person already has access.');
    if (collabLimitReached) {
      openPlanDialog(`The ${limits.label} plan allows ${limits.collaboratorsPerShare} collaborators per share.`);
      return;
    }
    setCollabs((c) => [...c, { id: uid('u'), name: n, email: e, role: limits.editorAccess ? role : 'viewer' }]);
    setName(''); setEmail(''); setAddError(null);
  };

  const save = () => {
    if (!item) { setItemError('Choose a project or board to share.'); return; }
    const [itemType, itemId] = item.split(':') as [ShareItemType, ID];
    const data = { itemType, itemId, linkAccess, linkRole, collaborators: collabs, updatedAt: nowISO() };
    if (share) {
      patch('shares', share.id, data);
      toast('Sharing settings saved');
    } else {
      const active = ws.shares.filter((x) => x.status === 'active').length;
      if (!withinLimit(active, limits.activeShares)) {
        openPlanDialog(`The ${limits.label} plan allows ${limits.activeShares} active shares. Revoke one or switch plans.`);
        return;
      }
      insert('shares', { id: uid('sh'), status: 'active', createdAt: nowISO(), ...data });
      toast(collabs.length ? `Share created — ${collabs.length} demo invitation${collabs.length === 1 ? '' : 's'} recorded (not sent)` : 'Share created');
    }
    onClose();
  };

  const demoLink = share ? `https://coredesk.example/s/${share.id}` : 'Link is generated after the share is created';

  const roleOptions = (
    <>
      <option value="viewer">Viewer</option>
      <option value="editor" disabled={!limits.editorAccess}>{limits.editorAccess ? 'Editor' : 'Editor (Pro)'}</option>
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={share ? `Share “${itemLabel ?? 'item'}”` : 'New share'}
      subtitle="Prototype: no invitations are sent and no link is publicly reachable."
      width={600}
      onSubmit={save}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">{share ? 'Save' : 'Create share'}</Button></>}
    >
      {!share && (
        <Field label="Item to share" error={itemError} hint="Projects and boards only. Private Vault content can never be shared." htmlFor="sh-item">
          <Select id="sh-item" value={item} onChange={(e) => { setItem(e.target.value); setItemError(null); }}>
            <option value="">Choose…</option>
            <optgroup label="Projects">
              {options.projects.map((o) => <option key={o.value} value={o.value} disabled={o.taken}>{o.label}{o.taken ? ' — already shared' : ''}</option>)}
            </optgroup>
            <optgroup label="Boards">
              {options.boards.map((o) => <option key={o.value} value={o.value} disabled={o.taken}>{o.label}{o.taken ? ' — already shared' : ''}</option>)}
            </optgroup>
          </Select>
        </Field>
      )}

      <Field label="General access">
        <div className={s.accessRow}>
          <Segmented<LinkAccess>
            ariaLabel="General access"
            value={linkAccess}
            onChange={setLinkAccess}
            options={[
              { value: 'restricted', label: 'Only people added', icon: Lock },
              { value: 'link', label: 'Anyone with the link', icon: Link2 },
            ]}
          />
          {linkAccess === 'link' && (
            <Select value={linkRole} onChange={(e) => setLinkRole(e.target.value as AccessLevel)} className={s.roleSelect} aria-label="Link access level">
              {roleOptions}
            </Select>
          )}
        </div>
      </Field>

      {linkAccess === 'link' && (
        <div className={s.linkBox}>
          <span>{demoLink}</span>
          <Button size="sm" icon={Copy} disabled={!share} onClick={async () => {
            try { await navigator.clipboard.writeText(demoLink); toast('Demo link copied — it does not resolve anywhere', 'info'); }
            catch { toast('Clipboard unavailable', 'danger'); }
          }}>Copy</Button>
        </div>
      )}

      <Field label={`People with access (${collabs.length}${limits.collaboratorsPerShare !== null ? ` / ${limits.collaboratorsPerShare}` : ''})`}>
        <div className={s.collabList}>
          {collabs.length === 0 && <div className={s.collabEmpty}>No collaborators yet.</div>}
          {collabs.map((c) => (
            <div key={c.id} className={s.collab}>
              <Avatar name={c.name} size={26} />
              <div className={s.collabText}>
                <div className={s.collabName}>{c.name}</div>
                <div className={s.collabEmail}>{c.email}</div>
              </div>
              <Select
                value={c.role}
                className={s.roleSelect}
                aria-label={`Access for ${c.name}`}
                onChange={(e) => setCollabs((list) => list.map((x) => (x.id === c.id ? { ...x, role: e.target.value as AccessLevel } : x)))}
              >
                {roleOptions}
              </Select>
              <IconButton icon={Trash2} size="sm" label={`Remove ${c.name}`} onClick={() => setCollabs((list) => list.filter((x) => x.id !== c.id))} />
            </div>
          ))}
        </div>
      </Field>

      <div>
        <div className={s.addRow}>
          <Input value={name} onChange={(e) => { setName(e.target.value); setAddError(null); }} placeholder="Name" aria-label="Collaborator name" maxLength={60} />
          <Input
            value={email}
            onChange={(e) => { setEmail(e.target.value); setAddError(null); }}
            placeholder="email@example.com"
            aria-label="Collaborator email"
            type="email"
            invalid={!!addError && addError.includes('email')}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCollaborator(); } }}
          />
          <Select value={role} onChange={(e) => setRole(e.target.value as AccessLevel)} aria-label="Access level">{roleOptions}</Select>
          <Button icon={UserPlus} onClick={addCollaborator}>Add</Button>
        </div>
        {addError && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', marginTop: 6 }} role="alert">{addError}</div>}
        {!limits.editorAccess && (
          <div style={{ color: 'var(--text-2)', fontSize: 'var(--fs-xs)', marginTop: 6 }}>
            Editor access is a Pro feature. <button type="button" onClick={() => openPlanDialog()} style={{ background: 'none', border: 0, padding: 0, color: 'var(--accent)', textDecoration: 'underline' }}>Compare plans</button>
          </div>
        )}
      </div>

      <Notice>This is a demo. Added people are stored locally as sample data; they receive nothing and cannot sign in.</Notice>
    </Dialog>
  );
}

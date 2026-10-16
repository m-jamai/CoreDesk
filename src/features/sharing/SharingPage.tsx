import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Eye, GraduationCap, Layers, Link2, Lock, RotateCcw, Settings2, Share2, Shapes, ShieldOff, Sparkles, Trash2, Users,
} from 'lucide-react';
import type { ID, Share, ShareItemType } from '../../types';
import L from '../../components/layout/layout.module.css';
import s from './sharing.module.css';
import {
  AvatarStack, Button, EmptyState, MoreMenu, Notice, Pill, Progress, SearchInput, Segmented, Tabs, Toolbar,
  ToolbarSpacer, cx, useFeedback,
} from '../../components/ui';
import { patch, setWorkspace, useWorkspace } from '../../store/workspace';
import { clearQueryParam, navigate, useRoute } from '../../lib/router';
import { nowISO, relativeTime } from '../../lib/format';
import { formatLimit, withinLimit } from '../../config/plans';
import { openPlanDialog, usePlan } from './plan';
import { ShareDialog } from './ShareDialog';

/** Work Sharing container: "Shared work" and "Teacher" live here as internal areas. */
export function SharingPage({ tab, children }: { tab: 'shares' | 'teacher'; children?: ReactNode }) {
  const ws = useWorkspace();
  const { limits, isPro } = usePlan();
  return (
    <>
      <div className={s.bar}>
        <Tabs
          ariaLabel="Work Sharing areas"
          value={tab}
          items={[
            { id: 'shares', label: 'Projects & Boards', icon: Share2, count: ws.shares.filter((x) => x.status === 'active').length, href: '/sharing' },
            { id: 'teacher', label: 'Teacher', icon: GraduationCap, count: ws.courses.length, href: '/sharing/teacher' },
          ]}
        />
        <div className={s.barRight}>
          <button type="button" className={cx(s.planChip, isPro && s.planChipPro)} onClick={() => openPlanDialog()} title="Compare plans">
            <Sparkles size={12} />
            {limits.label} plan
          </button>
        </div>
      </div>
      {tab === 'shares' ? <SharesView /> : children}
    </>
  );
}

type Filter = 'all' | 'project' | 'board' | 'revoked';

function SharesView() {
  const ws = useWorkspace();
  const route = useRoute();
  const { confirm, toast } = useFeedback();
  const { limits } = usePlan();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [dialog, setDialog] = useState<{ share?: Share; preselect?: { type: ShareItemType; id: ID } } | null>(null);

  const active = ws.shares.filter((x) => x.status === 'active').length;
  const canCreate = withinLimit(active, limits.activeShares);

  const startNew = (preselect?: { type: ShareItemType; id: ID }) => {
    if (!canCreate) {
      openPlanDialog(`The ${limits.label} plan allows ${limits.activeShares} active shares. Revoke one or switch plans.`);
      return;
    }
    setDialog({ preselect });
  };

  // Deep link from Projects/Board: /sharing?new=project:<id>
  const newParam = route.query.get('new');
  useEffect(() => {
    if (!newParam) return;
    const [type, id] = newParam.split(':') as [ShareItemType, ID];
    clearQueryParam('new');
    const existing = ws.shares.find((x) => x.itemType === type && x.itemId === id);
    if (existing) setDialog({ share: existing });
    else startNew({ type, id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newParam]);

  const resolveItem = (sh: Share) =>
    sh.itemType === 'project' ? ws.projects.find((p) => p.id === sh.itemId)?.name : ws.boards.find((b) => b.id === sh.itemId)?.name;

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return [...ws.shares]
      .filter((sh) => filter === 'all' || (filter === 'revoked' ? sh.status === 'revoked' : sh.itemType === filter && sh.status === 'active'))
      .filter((sh) => !query || (resolveItem(sh) ?? '').toLowerCase().includes(query) || sh.collaborators.some((c) => c.name.toLowerCase().includes(query) || c.email.includes(query)))
      .sort((a, b) => (a.status === b.status ? b.updatedAt.localeCompare(a.updatedAt) : a.status === 'active' ? -1 : 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.shares, ws.projects, ws.boards, q, filter]);

  const revoke = async (sh: Share) => {
    if (await confirm({ title: `Revoke access to “${resolveItem(sh)}”?`, message: 'All collaborators and the link lose access (simulated). You can restore the share later.', confirmLabel: 'Revoke access', danger: true })) {
      patch('shares', sh.id, { status: 'revoked', updatedAt: nowISO() });
      toast('Access revoked');
    }
  };

  const restore = (sh: Share) => {
    if (!canCreate) {
      openPlanDialog(`Restoring this share would exceed the ${limits.label} plan's ${limits.activeShares} active shares.`);
      return;
    }
    patch('shares', sh.id, { status: 'active', updatedAt: nowISO() });
    toast('Share restored');
  };

  const remove = async (sh: Share) => {
    if (await confirm({ title: 'Delete this share record?', message: `The ${sh.itemType} itself is not affected — only its sharing settings are removed.`, confirmLabel: 'Delete share', danger: true })) {
      setWorkspace((st) => ({ ...st, shares: st.shares.filter((x) => x.id !== sh.id) }));
      toast('Share deleted');
    }
  };

  return (
    <>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search shares or people" />
        <Segmented<Filter>
          ariaLabel="Filter"
          value={filter}
          onChange={setFilter}
          options={[{ value: 'all', label: 'All' }, { value: 'project', label: 'Projects' }, { value: 'board', label: 'Boards' }, { value: 'revoked', label: 'Revoked' }]}
        />
        <ToolbarSpacer />
        <div className={cx(s.usage, 'hide-sm')} title="Active shares on your plan">
          <span className="mono">{active} / {formatLimit(limits.activeShares)}</span>
          {limits.activeShares !== null && <div className={s.usageMeter}><Progress value={(active / limits.activeShares) * 100} label="Active shares used" /></div>}
        </div>
        <Button variant="primary" icon={Share2} onClick={() => startNew()}>New share</Button>
      </Toolbar>

      <div className={L.scroll}>
        <div className={L.inner} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Notice>
            <strong>Sharing is simulated.</strong> This prototype has no accounts or server: invitations are not sent, links do not resolve, and access levels are illustrative. Private Vault content is never shareable.
          </Notice>

          {rows.length === 0 ? (
            ws.shares.length === 0 ? (
              <EmptyState icon={Share2} title="Nothing shared yet" text="Share a project or board with collaborators as viewers or editors." action={<Button variant="primary" icon={Share2} onClick={() => startNew()}>Create a share</Button>} />
            ) : (
              <EmptyState icon={Share2} title="No shares match" text="Try another filter or search." action={<Button onClick={() => { setQ(''); setFilter('all'); }}>Clear filters</Button>} />
            )
          ) : (
            <table className={L.table}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th className={L.hideSm}>Type</th>
                  <th>Status</th>
                  <th className={L.hideSm}>Access</th>
                  <th className={L.hideSm}>Collaborators</th>
                  <th className={L.hideSm}>Updated</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((sh) => {
                  const name = resolveItem(sh);
                  const Icon = sh.itemType === 'project' ? Layers : Shapes;
                  const editors = sh.collaborators.filter((c) => c.role === 'editor').length;
                  return (
                    <tr key={sh.id} className={cx(sh.status === 'revoked' && s.revokedRow)}>
                      <td style={{ maxWidth: 0, width: '32%' }}>
                        <div className={s.itemCell}>
                          <span className={s.itemIcon}><Icon size={14} strokeWidth={1.75} /></span>
                          <div style={{ minWidth: 0 }}>
                            <div className={s.itemName}>{name ?? 'Deleted item'}</div>
                            <div className={s.itemSub}>Shared {relativeTime(sh.createdAt)}</div>
                          </div>
                        </div>
                      </td>
                      <td className={L.hideSm} style={{ textTransform: 'capitalize' }}>{sh.itemType}</td>
                      <td>{sh.status === 'active' ? <Pill tone="success" dot>Active</Pill> : <Pill dot>Revoked</Pill>}</td>
                      <td className={L.hideSm}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {sh.linkAccess === 'link' ? <Link2 size={13} /> : <Lock size={13} />}
                          {sh.linkAccess === 'link' ? `Link · ${sh.linkRole}` : 'Restricted'}
                          {editors > 0 && <span className={L.mutedSm}>· {editors} editor{editors > 1 ? 's' : ''}</span>}
                        </span>
                      </td>
                      <td className={L.hideSm}>
                        {sh.collaborators.length ? <AvatarStack names={sh.collaborators.map((c) => c.name)} /> : <span className={L.mutedSm}>None</span>}
                      </td>
                      <td className={L.hideSm} style={{ fontSize: 'var(--fs-xs)', whiteSpace: 'nowrap' }}>{relativeTime(sh.updatedAt)}</td>
                      <td className={L.actionsCell}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          {sh.status === 'active' && (
                            <Button size="sm" icon={Eye} onClick={() => navigate(`/sharing/preview/${sh.id}`)} disabled={!name}>Preview</Button>
                          )}
                          <MoreMenu items={[
                            ...(sh.status === 'active'
                              ? [
                                { label: 'Manage access', icon: Settings2, onSelect: () => setDialog({ share: sh }) },
                                { label: 'Manage collaborators', icon: Users, onSelect: () => setDialog({ share: sh }) },
                                { label: 'Preview as collaborator', icon: Eye, onSelect: () => navigate(`/sharing/preview/${sh.id}`), disabled: !name },
                                { type: 'separator' as const },
                                { label: 'Revoke access', icon: ShieldOff, danger: true, onSelect: () => revoke(sh) },
                              ]
                              : [{ label: 'Restore share', icon: RotateCcw, onSelect: () => restore(sh), disabled: !name }]),
                            { label: 'Delete share record', icon: Trash2, danger: true, onSelect: () => remove(sh) },
                          ]} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ShareDialog open={!!dialog} share={dialog?.share} preselect={dialog?.preselect} onClose={() => setDialog(null)} />
    </>
  );
}

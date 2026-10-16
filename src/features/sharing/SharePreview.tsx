import { useMemo, useState } from 'react';
import { ArrowLeft, Eye, File, Folder, Link2, Lock, ShieldOff } from 'lucide-react';
import type { ID } from '../../types';
import L from '../../components/layout/layout.module.css';
import s from './sharing.module.css';
import { Canvas } from '../../components/canvas/Canvas';
import { AvatarStack, Button, EmptyState, Pill, Tag, toneColor } from '../../components/ui';
import { useWorkspace } from '../../store/workspace';
import { navigate } from '../../lib/router';
import { fileSize, shortDate } from '../../lib/format';
import { TASK_COLUMNS } from '../projects/taskMeta';

/**
 * Read-only rendition of a shared project or board, as a collaborator might see it.
 * Built only from the referenced project/board — Vault data is never read here.
 */
export function SharePreview({ shareId }: { shareId: ID }) {
  const ws = useWorkspace();
  const share = ws.shares.find((x) => x.id === shareId);

  if (!share) {
    return <EmptyState icon={ShieldOff} title="Share not found" text="It may have been deleted." action={<Button onClick={() => navigate('/sharing')}>Back to Work Sharing</Button>} />;
  }
  if (share.status === 'revoked') {
    return <EmptyState icon={ShieldOff} title="Access revoked" text="Collaborators would see this message. Restore the share to preview it again." action={<Button onClick={() => navigate('/sharing')}>Back to Work Sharing</Button>} />;
  }

  const role = share.linkAccess === 'link' ? share.linkRole : share.collaborators.some((c) => c.role === 'editor') ? 'editor / viewer' : 'viewer';

  return (
    <div className={s.previewFrame}>
      <div className={s.previewBanner}>
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={() => navigate('/sharing')}>Back</Button>
        <Pill tone="info" icon={Eye}>Collaborator preview</Pill>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {share.linkAccess === 'link' ? <Link2 size={12} /> : <Lock size={12} />}
          {share.linkAccess === 'link' ? 'Anyone with the link' : 'Restricted'} · {role}
        </span>
        <span style={{ flex: 1 }} />
        {share.collaborators.length > 0 && <AvatarStack names={share.collaborators.map((c) => c.name)} size={20} />}
        <span style={{ color: 'var(--text-2)' }}>Simulated view — nothing here is published</span>
      </div>
      {share.itemType === 'project' ? <ProjectPreview projectId={share.itemId} /> : <BoardPreview boardId={share.itemId} />}
    </div>
  );
}

function ProjectPreview({ projectId }: { projectId: ID }) {
  const ws = useWorkspace();
  const project = ws.projects.find((p) => p.id === projectId);
  if (!project) return <EmptyState icon={ShieldOff} title="The shared project no longer exists" />;
  const sections = ws.sections.filter((x) => x.projectId === projectId);
  const tasks = ws.tasks.filter((x) => x.projectId === projectId);
  const files = ws.files.filter((x) => x.projectId === projectId && x.parentId === null);

  return (
    <div className={L.scroll}>
      <div className={s.previewDoc}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: toneColor(project.tone) }} />
            <h1>{project.name}</h1>
          </div>
          <p className={L.headDesc}>{project.description}</p>
          <div style={{ display: 'flex', gap: 4 }}>{project.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
        </header>

        <section>
          <div className={L.sectionTitle}><span className="label">Sections · {sections.length}</span></div>
          <div className={s.previewSections}>
            {sections.map((x) => (
              <div key={x.id} className={s.previewSection}>
                <h3>{x.title}</h3>
                <p>{x.content}</p>
              </div>
            ))}
            {sections.length === 0 && <span className={L.muted}>No sections.</span>}
          </div>
        </section>

        <section>
          <div className={L.sectionTitle}><span className="label">Tasks · {tasks.length}</span></div>
          <div className={s.previewCols}>
            {TASK_COLUMNS.map((c) => {
              const list = tasks.filter((t) => t.status === c.id).sort((a, b) => a.order - b.order);
              return (
                <div key={c.id} className={s.previewCol}>
                  <header><span>{c.label}</span><span className="mono" style={{ color: 'var(--text-2)' }}>{list.length}</span></header>
                  <ul>
                    {list.map((t) => <li key={t.id}>{t.title}</li>)}
                    {list.length === 0 && <li style={{ color: 'var(--text-3)' }}>—</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className={L.sectionTitle}><span className="label">Files · top level</span></div>
          <table className={L.table}>
            <tbody>
              {files.map((f) => (
                <tr key={f.id}>
                  <td className={L.primaryCell}><span className={L.cellFlex}>{f.kind === 'folder' ? <Folder size={14} color="var(--accent)" /> : <File size={14} />}<span>{f.name}</span></span></td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 'var(--fs-xs)' }}>{f.kind === 'folder' ? '—' : fileSize(f.size)}</td>
                  <td style={{ textAlign: 'right', fontSize: 'var(--fs-xs)' }}>{shortDate(f.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function BoardPreview({ boardId }: { boardId: ID }) {
  const ws = useWorkspace();
  const [sel, setSel] = useState<ID | null>(null);
  const board = ws.boards.find((b) => b.id === boardId);
  const cards = useMemo(() => ws.cards.filter((c) => c.boardId === boardId), [ws.cards, boardId]);
  const links = useMemo(() => ws.links.filter((l) => l.boardId === boardId), [ws.links, boardId]);
  if (!board) return <EmptyState icon={ShieldOff} title="The shared board no longer exists" />;

  return (
    <Canvas
      readOnly
      viewKey={`preview-${boardId}`}
      ariaLabel={`${board.name} (read-only)`}
      nodes={cards.map((c) => ({ id: c.id, x: c.x, y: c.y, width: 240 }))}
      edges={links}
      selectedNodeId={sel}
      selectedEdgeId={null}
      onSelectNode={setSel}
      onSelectEdge={() => {}}
      onNodeMove={() => {}}
      onConnect={() => {}}
      onDeleteEdge={() => {}}
      renderNode={(n) => {
        const c = cards.find((x) => x.id === n.id)!;
        return (
          <div className={s.readOnlyCard} style={sel === c.id ? { borderColor: 'var(--accent)' } : undefined}>
            <i style={{ background: toneColor(c.tone) }} />
            <strong>{c.title}</strong>
            <span>{c.body}</span>
          </div>
        );
      }}
    />
  );
}

import { useMemo, useState } from 'react';
import { ExternalLink, Link2Off, Network, Plus, Unlink, X } from 'lucide-react';
import type { ID, MapRefType, Project } from '../../types';
import s from './projects.module.css';
import { Canvas, type CanvasEdge, type CanvasNode } from '../../components/canvas/Canvas';
import {
  Button, EmptyState, IconButton, Notice, SearchInput, Toolbar, ToolbarSep, ToolbarSpacer, cx, useFeedback,
} from '../../components/ui';
import { addMapNode, patch, removeMapNode, setWorkspace, useWorkspace } from '../../store/workspace';
import { navigate } from '../../lib/router';
import { uid } from '../../lib/id';
import { REF_LABEL, resolveRef } from './mapRefs';

const NODE_WIDTH = 220;
const TYPES: MapRefType[] = ['section', 'task', 'note', 'file'];

export function MapView({ project }: { project: Project }) {
  const ws = useWorkspace();
  const { toast } = useFeedback();
  const [selectedNode, setSelectedNode] = useState<ID | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<ID | null>(null);
  const [q, setQ] = useState('');

  const nodes = useMemo(() => ws.mapNodes.filter((n) => n.projectId === project.id), [ws.mapNodes, project.id]);
  const edges = useMemo(() => ws.mapEdges.filter((e) => e.projectId === project.id), [ws.mapEdges, project.id]);

  // Resolve each node against live project data — nodes are references, not copies.
  const resolved = useMemo(() => {
    const m = new Map<ID, NonNullable<ReturnType<typeof resolveRef>>>();
    for (const n of nodes) {
      const r = resolveRef(ws, n.refType, n.refId);
      if (r) m.set(n.id, r);
    }
    return m;
  }, [nodes, ws]);

  const canvasNodes: CanvasNode[] = useMemo(
    () => nodes.filter((n) => resolved.has(n.id)).map((n) => ({ id: n.id, x: n.x, y: n.y, width: NODE_WIDTH })),
    [nodes, resolved],
  );
  const canvasEdges: CanvasEdge[] = edges;

  // Palette: project items not yet on the Map
  const palette = useMemo(() => {
    const placed = new Set(nodes.map((n) => `${n.refType}:${n.refId}`));
    const query = q.trim().toLowerCase();
    const pick = <T extends { id: ID }>(type: MapRefType, items: T[], title: (t: T) => string) =>
      items
        .filter((i) => !placed.has(`${type}:${i.id}`))
        .map((i) => ({ type, id: i.id, title: title(i) }))
        .filter((i) => !query || i.title.toLowerCase().includes(query));
    return {
      section: pick('section', ws.sections.filter((x) => x.projectId === project.id), (x) => x.title),
      task: pick('task', ws.tasks.filter((x) => x.projectId === project.id), (x) => x.title),
      note: pick('note', ws.notes.filter((x) => x.projectId === project.id), (x) => x.title || 'Untitled note'),
      file: pick('file', ws.files.filter((x) => x.projectId === project.id), (x) => x.name),
    } as Record<MapRefType, { type: MapRefType; id: ID; title: string }[]>;
  }, [ws, nodes, project.id, q]);

  const paletteCount = TYPES.reduce((n, t) => n + palette[t].length, 0);
  const selected = selectedNode ? nodes.find((n) => n.id === selectedNode) : undefined;
  const selectedRef = selected ? resolved.get(selected.id) : undefined;

  const add = (type: MapRefType, id: ID) => {
    const nodeId = addMapNode(project.id, type, id);
    setSelectedNode(nodeId);
    setSelectedEdge(null);
  };

  const connect = (from: ID, to: ID) => {
    const exists = edges.some((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from));
    if (exists) { toast('Those items are already connected', 'info'); return; }
    setWorkspace((st) => ({ ...st, mapEdges: [...st.mapEdges, { id: uid('e'), projectId: project.id, from, to }] }));
    toast('Connected');
  };

  const removeEdge = (id: ID) => {
    setWorkspace((st) => ({ ...st, mapEdges: st.mapEdges.filter((e) => e.id !== id) }));
    setSelectedEdge(null);
    toast('Connection removed');
  };

  const removeNode = (id: ID) => {
    removeMapNode(id);
    setSelectedNode(null);
    toast('Removed from Map — the item itself is kept');
  };

  const openItem = (nodeId: ID) => {
    const n = nodes.find((x) => x.id === nodeId);
    const r = n && resolved.get(n.id);
    if (n && r) navigate(`/projects/${project.id}/${r.view}?open=${n.refId}`);
  };

  const connectionsOf = (id: ID) => edges.filter((e) => e.from === id || e.to === id).length;

  return (
    <>
      <Toolbar>
        <span className="label" style={{ whiteSpace: 'nowrap' }}>{canvasNodes.length} nodes · {edges.length} links</span>
        <ToolbarSep />
        <span style={{ color: 'var(--text-2)', fontSize: 'var(--fs-xs)' }} className="hide-sm">
          Drag nodes to arrange · drag the square handle onto another node to connect · double-click to open
        </span>
        <ToolbarSpacer />
        <Button icon={Unlink} disabled={!selectedEdge} onClick={() => selectedEdge && removeEdge(selectedEdge)}>Remove link</Button>
        <Button icon={X} disabled={!selectedNode} onClick={() => selectedNode && removeNode(selectedNode)}>Remove from Map</Button>
      </Toolbar>

      <div className={s.map}>
        <aside className={s.palette} aria-label="Project items">
          <div className={s.paletteHead}>
            <span className="label">Add to Map</span>
            <SearchInput value={q} onChange={setQ} placeholder="Find items" width="100%" />
          </div>
          <div className={s.paletteList}>
            {paletteCount === 0 && (
              <div className={s.paletteEmpty}>{q ? 'No items match.' : 'Every project item is on the Map.'}</div>
            )}
            {TYPES.map((t) => palette[t].length > 0 && (
              <div key={t}>
                <div className={cx('label', s.paletteGroup)}><span>{REF_LABEL[t]}</span><span>{palette[t].length}</span></div>
                {palette[t].map((item) => {
                  const r = resolveRef(ws, item.type, item.id);
                  const Icon = r?.icon ?? Network;
                  return (
                    <button key={item.id} type="button" className={s.paletteItem} onClick={() => add(item.type, item.id)} title={`Add “${item.title}” to the Map`}>
                      <Icon size={13} strokeWidth={1.75} />
                      <span>{item.title}</span>
                      <Plus size={13} className={s.addIcon} />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        <div className={s.mapCanvasWrap}>
          <Canvas
            viewKey={project.id}
            ariaLabel={`${project.name} map`}
            nodes={canvasNodes}
            edges={canvasEdges}
            selectedNodeId={selectedNode}
            selectedEdgeId={selectedEdge}
            onSelectNode={setSelectedNode}
            onSelectEdge={setSelectedEdge}
            onNodeMove={(id, x, y) => patch('mapNodes', id, { x, y })}
            onNodeActivate={openItem}
            onConnect={connect}
            onDeleteEdge={removeEdge}
            onDeleteNode={removeNode}
            empty={
              <EmptyState
                icon={Network}
                title="This Map is empty"
                text="Add sections, tasks, notes and files from the left panel, then connect them to show how the project fits together."
              />
            }
            renderNode={(n, { selected: sel }) => {
              const r = resolved.get(n.id)!;
              const Icon = r.icon;
              return (
                <div className={cx(s.mapNode, sel && s.mapNodeSelected)}>
                  <div className={s.mapNodeIcon}><Icon size={13} strokeWidth={1.75} /></div>
                  <div className={s.mapNodeText}>
                    <div className={s.mapNodeKind}>{r.kind}</div>
                    <div className={s.mapNodeTitle}>{r.title}</div>
                    <div className={s.mapNodeMeta}>{r.meta}</div>
                  </div>
                </div>
              );
            }}
          />
        </div>

        {selected && selectedRef && (
          <aside className={s.inspector} aria-label="Selected item">
            <div className={s.inspectorHead}>
              <span className="label" style={{ flex: 1 }}>{selectedRef.kind}</span>
              <IconButton icon={X} size="sm" label="Close inspector" onClick={() => setSelectedNode(null)} />
            </div>
            <div className={s.inspectorBody}>
              <div className={s.inspectorTitle}>{selectedRef.title}</div>
              <dl className={s.kv}>
                <dt>Type</dt><dd>{selectedRef.kind}</dd>
                <dt>Details</dt><dd>{selectedRef.meta || '—'}</dd>
                <dt>Links</dt><dd className="mono">{connectionsOf(selected.id)}</dd>
              </dl>
              {selectedRef.body && <div className={s.inspectorText}>{selectedRef.body}</div>}
              <div className={s.inspectorActions}>
                <Button variant="primary" icon={ExternalLink} onClick={() => openItem(selected.id)}>Open in {selectedRef.view[0]!.toUpperCase() + selectedRef.view.slice(1)}</Button>
                <Button icon={Link2Off} onClick={() => removeNode(selected.id)}>Remove from Map</Button>
              </div>
              <Notice>Removing a node only takes it off the Map. The {selectedRef.kind.toLowerCase()} stays in the project.</Notice>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}

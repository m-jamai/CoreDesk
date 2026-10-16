import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react';
import { Maximize, Minus, Plus, X } from 'lucide-react';
import type { ID } from '../../types';
import s from './Canvas.module.css';
import { cx } from '../ui/cx';

/* =====================================================================
 * Canvas — shared spatial engine for the project Map and the Board.
 * Pan (drag background / scroll), zoom (ctrl/⌘ + wheel or controls),
 * drag nodes, drag from a node's handle to connect, select & delete edges.
 * No dependencies; pointer events so it works with mouse, pen and touch.
 * ===================================================================== */

export interface CanvasNode { id: ID; x: number; y: number; width: number }
export interface CanvasEdge { id: ID; from: ID; to: ID }

interface View { x: number; y: number; zoom: number }
interface Size { w: number; h: number }

const GRID = 8;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.8;
const snap = (v: number) => Math.round(v / GRID) * GRID;

export interface CanvasProps {
  viewKey: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  renderNode: (node: CanvasNode, state: { selected: boolean; dragging: boolean }) => ReactNode;
  selectedNodeId: ID | null;
  selectedEdgeId: ID | null;
  onSelectNode: (id: ID | null) => void;
  onSelectEdge: (id: ID | null) => void;
  onNodeMove: (id: ID, x: number, y: number) => void;
  onNodeActivate?: (id: ID) => void;
  onConnect: (from: ID, to: ID) => void;
  onDeleteEdge: (id: ID) => void;
  onDeleteNode?: (id: ID) => void;
  onBackgroundDoubleClick?: (x: number, y: number) => void;
  /** Rendered over the canvas when there are no nodes. */
  empty?: ReactNode;
  ariaLabel: string;
  /** Read-only: pan/zoom and selection only (used by share previews). */
  readOnly?: boolean;
}

export function Canvas(props: CanvasProps) {
  const {
    viewKey, nodes, edges, renderNode, selectedNodeId, selectedEdgeId,
    onSelectNode, onSelectEdge, onNodeMove, onNodeActivate, onConnect, onDeleteEdge, onDeleteNode,
    onBackgroundDoubleClick, empty, ariaLabel, readOnly,
  } = props;

  const viewportRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 40, y: 40, zoom: 1 });
  const [sizes, setSizes] = useState<Record<ID, Size>>({});
  const [drag, setDrag] = useState<{ id: ID; x: number; y: number } | null>(null);
  const [link, setLink] = useState<{ from: ID; x: number; y: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const gesture = useRef<
    | { kind: 'pan'; startX: number; startY: number; viewX: number; viewY: number; moved: boolean }
    | { kind: 'node'; id: ID; startX: number; startY: number; nodeX: number; nodeY: number; moved: boolean }
    | { kind: 'link'; from: ID }
    | null
  >(null);

  /* ---------- measurement ---------- */
  const observer = useMemo(
    () =>
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver((entries) => {
            setSizes((prev) => {
              let next = prev;
              for (const e of entries) {
                const id = (e.target as HTMLElement).dataset.nodeId!;
                const el = e.target as HTMLElement;
                const size = { w: el.offsetWidth, h: el.offsetHeight };
                if (!prev[id] || prev[id].w !== size.w || prev[id].h !== size.h) {
                  if (next === prev) next = { ...prev };
                  next[id] = size;
                }
              }
              return next;
            });
          }),
    [],
  );
  useEffect(() => () => observer?.disconnect(), [observer]);

  const nodeRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (el && observer) observer.observe(el);
    },
    [observer],
  );

  const positioned = useMemo(
    () => nodes.map((n) => (drag && drag.id === n.id ? { ...n, x: drag.x, y: drag.y } : n)),
    [nodes, drag],
  );
  const byId = useMemo(() => new Map(positioned.map((n) => [n.id, n])), [positioned]);
  const sizeOf = (n: CanvasNode): Size => sizes[n.id] ?? { w: n.width, h: 72 };

  /* ---------- view helpers ---------- */
  const toWorld = (clientX: number, clientY: number) => {
    const r = viewportRef.current!.getBoundingClientRect();
    return { x: (clientX - r.left - view.x) / view.zoom, y: (clientY - r.top - view.y) / view.zoom };
  };

  const zoomAt = (factor: number, cx?: number, cy?: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = cx ?? r.width / 2;
    const py = cy ?? r.height / 2;
    setView((v) => {
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor));
      const k = zoom / v.zoom;
      return { zoom, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  };

  const fit = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!nodes.length) return setView({ x: 40, y: 40, zoom: 1 });
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      const sz = sizes[n.id] ?? { w: n.width, h: 72 };
      minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + sz.w); maxY = Math.max(maxY, n.y + sz.h);
    }
    const pad = 48;
    const natural = Math.min((r.width - pad * 2) / (maxX - minX), (r.height - pad * 2) / (maxY - minY));
    const FIT_MIN = 0.55; // keep text legible on small screens; pan to see the rest
    if (natural < FIT_MIN) {
      setView({ zoom: FIT_MIN, x: 24 - minX * FIT_MIN, y: 24 - minY * FIT_MIN });
      return;
    }
    const zoom = Math.min(1.1, natural);
    setView({
      zoom,
      x: (r.width - (maxX - minX) * zoom) / 2 - minX * zoom,
      y: (r.height - (maxY - minY) * zoom) / 2 - minY * zoom,
    });
  }, [nodes, sizes]);

  // Fit once per canvas (viewKey) after first layout.
  const fittedKey = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (fittedKey.current === viewKey) return;
    const measured = nodes.every((n) => sizes[n.id]) || !observer;
    if (!measured && nodes.length) return;
    fittedKey.current = viewKey;
    fit();
  }, [viewKey, nodes, sizes, fit, observer]);

  // Wheel: pan, or zoom with ctrl/⌘ (trackpad pinch also sends ctrlKey).
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect();
        zoomAt(Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top);
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  /* ---------- pointer gestures ---------- */
  const onBackgroundPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('[data-node-id], [data-canvas-ui]')) return;
    viewportRef.current?.focus({ preventScroll: true });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    gesture.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y, moved: false };
  };

  const onNodePointerDown = (e: ReactPointerEvent, n: CanvasNode) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const t = e.target as HTMLElement;
    if (t.closest('[data-nodrag], input, textarea, button, a')) return;
    e.stopPropagation();
    if (readOnly) { onSelectEdge(null); onSelectNode(n.id); return; }
    viewportRef.current?.focus({ preventScroll: true });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    gesture.current = { kind: 'node', id: n.id, startX: e.clientX, startY: e.clientY, nodeX: n.x, nodeY: n.y, moved: false };
  };

  const onHandlePointerDown = (e: ReactPointerEvent, n: CanvasNode) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    gesture.current = { kind: 'link', from: n.id };
    const p = toWorld(e.clientX, e.clientY);
    setLink({ from: n.id, ...p });
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pan') {
      const dx = e.clientX - g.startX, dy = e.clientY - g.startY;
      if (!g.moved && Math.hypot(dx, dy) > 3) { g.moved = true; setPanning(true); }
      if (g.moved) setView((v) => ({ ...v, x: g.viewX + dx, y: g.viewY + dy }));
    } else if (g.kind === 'node') {
      const dx = (e.clientX - g.startX) / view.zoom, dy = (e.clientY - g.startY) / view.zoom;
      if (!g.moved && Math.hypot(dx, dy) > 3) g.moved = true;
      if (g.moved) setDrag({ id: g.id, x: snap(g.nodeX + dx), y: snap(g.nodeY + dy) });
    } else if (g.kind === 'link') {
      setLink({ from: g.from, ...toWorld(e.clientX, e.clientY) });
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    setPanning(false);
    if (!g) return;
    if (g.kind === 'pan' && !g.moved) {
      onSelectNode(null);
      onSelectEdge(null);
    } else if (g.kind === 'node') {
      if (g.moved && drag) onNodeMove(g.id, drag.x, drag.y);
      else {
        onSelectEdge(null);
        onSelectNode(g.id);
      }
      setDrag(null);
    } else if (g.kind === 'link') {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-node-id]');
      const to = el?.dataset.nodeId;
      if (to && to !== g.from) onConnect(g.from, to);
      setLink(null);
    }
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea')) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (readOnly) return;
      if (selectedEdgeId) { e.preventDefault(); onDeleteEdge(selectedEdgeId); }
      else if (selectedNodeId && onDeleteNode) { e.preventDefault(); onDeleteNode(selectedNodeId); }
    } else if (e.key === 'Escape') {
      onSelectNode(null); onSelectEdge(null);
    } else if (e.key === '+' || e.key === '=') zoomAt(1.15);
    else if (e.key === '-') zoomAt(1 / 1.15);
    else if (e.key === '0') fit();
  };

  /* ---------- edge geometry ---------- */
  const edgeGeom = (a: CanvasNode, b: CanvasNode) => {
    const sa = sizeOf(a), sb = sizeOf(b);
    const ac = { x: a.x + sa.w / 2, y: a.y + sa.h / 2 };
    const bc = { x: b.x + sb.w / 2, y: b.y + sb.h / 2 };
    const dx = bc.x - ac.x, dy = bc.y - ac.y;
    let p1, p2, c1, c2;
    if (Math.abs(dx) * 0.6 > Math.abs(dy)) {
      const dir = Math.sign(dx) || 1;
      p1 = { x: ac.x + (dir * sa.w) / 2, y: ac.y };
      p2 = { x: bc.x - (dir * sb.w) / 2, y: bc.y };
      const off = Math.max(30, Math.abs(p2.x - p1.x) / 2);
      c1 = { x: p1.x + dir * off, y: p1.y };
      c2 = { x: p2.x - dir * off, y: p2.y };
    } else {
      const dir = Math.sign(dy) || 1;
      p1 = { x: ac.x, y: ac.y + (dir * sa.h) / 2 };
      p2 = { x: bc.x, y: bc.y - (dir * sb.h) / 2 };
      const off = Math.max(30, Math.abs(p2.y - p1.y) / 2);
      c1 = { x: p1.x, y: p1.y + dir * off };
      c2 = { x: p2.x, y: p2.y - dir * off };
    }
    const mid = {
      x: 0.125 * p1.x + 0.375 * c1.x + 0.375 * c2.x + 0.125 * p2.x,
      y: 0.125 * p1.y + 0.375 * c1.y + 0.375 * c2.y + 0.125 * p2.y,
    };
    return { d: `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`, mid, end: p2 };
  };

  const selectedEdge = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : undefined;
  const selectedEdgeMid = (() => {
    if (!selectedEdge) return null;
    const a = byId.get(selectedEdge.from), b = byId.get(selectedEdge.to);
    return a && b ? edgeGeom(a, b).mid : null;
  })();

  const linkFrom = link ? byId.get(link.from) : undefined;
  const gridSize = GRID * 3 * view.zoom;

  return (
    <div
      ref={viewportRef}
      className={cx(s.viewport, panning && s.panning, link && s.linking)}
      style={{ backgroundSize: `${gridSize}px ${gridSize}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
      tabIndex={0}
      role="application"
      aria-label={ariaLabel}
      onPointerDown={onBackgroundPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-node-id], [data-canvas-ui]')) return;
        if (onBackgroundDoubleClick && !readOnly) {
          const p = toWorld(e.clientX, e.clientY);
          onBackgroundDoubleClick(snap(p.x), snap(p.y));
        }
      }}
    >
      <div className={s.world} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
        <svg className={s.edges} width="1" height="1" aria-hidden>
          {edges.map((edge) => {
            const a = byId.get(edge.from), b = byId.get(edge.to);
            if (!a || !b) return null;
            const g = edgeGeom(a, b);
            const sel = edge.id === selectedEdgeId;
            const touches = selectedNodeId && (edge.from === selectedNodeId || edge.to === selectedNodeId);
            return (
              <g key={edge.id} className={cx(s.edge, sel && s.edgeSelected, touches && s.edgeRelated)}>
                <path
                  d={g.d}
                  className={s.edgeHit}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onSelectNode(null); onSelectEdge(edge.id); viewportRef.current?.focus({ preventScroll: true }); }}
                />
                <path d={g.d} className={s.edgeLine} />
                <circle cx={g.end.x} cy={g.end.y} r={2.5} className={s.edgeEnd} />
              </g>
            );
          })}
          {link && linkFrom && (() => {
            const sz = sizeOf(linkFrom);
            const x1 = linkFrom.x + sz.w, y1 = linkFrom.y + sz.h / 2;
            return <path className={s.linkPreview} d={`M ${x1} ${y1} C ${x1 + 60} ${y1}, ${link.x - 60} ${link.y}, ${link.x} ${link.y}`} />;
          })()}
        </svg>

        {positioned.map((n) => {
          const selected = n.id === selectedNodeId;
          const dragging = drag?.id === n.id;
          return (
            <div
              key={n.id}
              ref={nodeRef}
              data-node-id={n.id}
              className={cx(s.node, selected && s.nodeSelected, dragging && s.nodeDragging)}
              style={{ left: n.x, top: n.y, width: n.width }}
              onPointerDown={(e) => onNodePointerDown(e, n)}
              onDoubleClick={(e) => { if (!(e.target as HTMLElement).closest('[data-nodrag], input, textarea')) { e.stopPropagation(); onNodeActivate?.(n.id); } }}
            >
              {renderNode(n, { selected, dragging })}
              {!readOnly && <button
                type="button"
                className={s.handle}
                aria-label="Drag to connect"
                title="Drag to connect"
                data-nodrag
                onPointerDown={(e) => onHandlePointerDown(e, n)}
              />}
            </div>
          );
        })}

        {!readOnly && selectedEdgeMid && selectedEdge && (
          <button
            type="button"
            data-canvas-ui
            className={s.edgeDelete}
            style={{ left: selectedEdgeMid.x, top: selectedEdgeMid.y }}
            aria-label="Remove connection"
            title="Remove connection"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onDeleteEdge(selectedEdge.id)}
          >
            <X size={11} strokeWidth={2} />
          </button>
        )}
      </div>

      {!nodes.length && empty && <div className={s.empty} data-canvas-ui>{empty}</div>}

      <div className={s.controls} data-canvas-ui onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Zoom out" title="Zoom out (−)" onClick={() => zoomAt(1 / 1.2)}><Minus size={13} /></button>
        <button type="button" className={s.zoomValue} title="Reset to 100%" onClick={() => setView((v) => ({ ...v, zoom: 1 }))}>
          {Math.round(view.zoom * 100)}%
        </button>
        <button type="button" aria-label="Zoom in" title="Zoom in (+)" onClick={() => zoomAt(1.2)}><Plus size={13} /></button>
        <span className={s.controlSep} />
        <button type="button" aria-label="Fit to content" title="Fit to content (0)" onClick={fit}><Maximize size={13} /></button>
      </div>
    </div>
  );
}

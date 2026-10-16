import { useEffect, useMemo, useState } from 'react';
import { Copy, Pencil, Plus, Shapes, Share2, StickyNote, Trash2, Unlink } from 'lucide-react';
import type { Board, BoardCard, ID } from '../../types';
import s from './board.module.css';
import { Canvas } from '../../components/canvas/Canvas';
import {
  Button, Dialog, EmptyState, Field, IconButton, Input, MoreMenu, Textarea, TonePicker, Toolbar, ToolbarSep,
  ToolbarSpacer, cx, toneColor, useFeedback,
} from '../../components/ui';
import { deleteBoard, deleteCard, insert, patch, setWorkspace, updateCard, useWorkspace } from '../../store/workspace';
import { navigate } from '../../lib/router';
import { uid } from '../../lib/id';
import { nowISO, pluralize, relativeTime } from '../../lib/format';
import { useOpenParam } from '../../lib/useOpenParam';

const CARD_WIDTH = 240;

export function BoardPage({ boardId, openId }: { boardId: ID | null; openId: string | null }) {
  const ws = useWorkspace();
  const { confirm, toast } = useFeedback();
  const [dialog, setDialog] = useState<{ board?: Board } | null>(null);

  const boards = useMemo(() => [...ws.boards].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [ws.boards]);
  const board = boardId ? ws.boards.find((b) => b.id === boardId) : undefined;

  // /board → open the most recent board
  useEffect(() => {
    if (!boardId && boards[0]) navigate(`/board/${boards[0].id}`, { replace: true });
  }, [boardId, boards]);

  const cardCount = (id: ID) => ws.cards.filter((c) => c.boardId === id).length;

  const removeBoard = async (b: Board) => {
    if (await confirm({ title: `Delete “${b.name}”?`, message: `${pluralize(cardCount(b.id), 'idea')} and their connections will be removed. Any share of this board is revoked.`, confirmLabel: 'Delete board', danger: true })) {
      const next = boards.find((x) => x.id !== b.id);
      deleteBoard(b.id);
      navigate(next ? `/board/${next.id}` : '/board', { replace: true });
      toast('Board deleted');
    }
  };

  return (
    <div className={s.layout}>
      <aside className={s.rail} aria-label="Boards">
        <div className={s.railHead}>
          <span className="label">Boards</span>
          <IconButton icon={Plus} size="sm" label="New board" onClick={() => setDialog({})} />
        </div>
        <div className={s.railList}>
          {boards.map((b) => (
            <div key={b.id} className={cx(s.boardItem, b.id === boardId && s.boardItemActive)}>
              <a className={s.boardLink} href={`#/board/${b.id}`} aria-current={b.id === boardId ? 'page' : undefined}>
                <span className={s.boardName}>{b.name}</span>
                <span className={s.boardMeta}>{pluralize(cardCount(b.id), 'idea')} · {relativeTime(b.updatedAt)}</span>
              </a>
              <MoreMenu items={[
                { label: 'Rename', icon: Pencil, onSelect: () => setDialog({ board: b }) },
                { label: 'Share…', icon: Share2, onSelect: () => navigate(`/sharing?new=board:${b.id}`) },
                { type: 'separator' },
                { label: 'Delete board', icon: Trash2, danger: true, onSelect: () => removeBoard(b) },
              ]} />
            </div>
          ))}
          <Button variant="ghost" size="sm" icon={Plus} onClick={() => setDialog({})} style={{ justifyContent: 'flex-start', marginTop: 4 }}>New board</Button>
        </div>
      </aside>

      <div className={s.main}>
        {board ? (
          <BoardCanvas key={board.id} board={board} openId={openId} />
        ) : boards.length === 0 ? (
          <EmptyState icon={Shapes} title="No boards yet" text="Boards are open canvases for brainstorming: drop ideas, move them around, connect them." action={<Button variant="primary" icon={Plus} onClick={() => setDialog({})}>Create a board</Button>} />
        ) : boardId ? (
          <EmptyState icon={Shapes} title="Board not found" text="It may have been deleted." action={<Button onClick={() => navigate('/board')}>Open latest board</Button>} />
        ) : null}
      </div>

      <BoardDialog open={!!dialog} board={dialog?.board} onClose={() => setDialog(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BoardCanvas({ board, openId }: { board: Board; openId: string | null }) {
  const ws = useWorkspace();
  const { toast } = useFeedback();
  const [selectedCard, setSelectedCard] = useState<ID | null>(null);
  const [selectedLink, setSelectedLink] = useState<ID | null>(null);
  const [editing, setEditing] = useState<ID | null>(null);

  const cards = useMemo(() => ws.cards.filter((c) => c.boardId === board.id), [ws.cards, board.id]);
  const links = useMemo(() => ws.links.filter((l) => l.boardId === board.id), [ws.links, board.id]);
  const nodes = useMemo(() => cards.map((c) => ({ id: c.id, x: c.x, y: c.y, width: CARD_WIDTH })), [cards]);
  const selected = cards.find((c) => c.id === selectedCard);

  useOpenParam(openId, (id) => { if (cards.some((c) => c.id === id)) setSelectedCard(id); });

  const touch = () => patch('boards', board.id, { updatedAt: nowISO() });

  const addCard = (x?: number, y?: number, from?: BoardCard) => {
    const id = uid('c');
    const base = from ?? selected;
    const pos = x !== undefined && y !== undefined
      ? { x, y }
      : base ? { x: base.x + 40, y: base.y + 140 } : { x: 80 + (cards.length % 4) * 280, y: 80 + Math.floor(cards.length / 4) * 180 };
    insert('cards', { id, boardId: board.id, title: from ? `${from.title} (copy)` : 'New idea', body: from?.body ?? '', tone: from?.tone ?? base?.tone ?? 'neutral', ...pos });
    touch();
    setSelectedLink(null);
    setSelectedCard(id);
    if (!from) setEditing(id);
    else toast('Idea duplicated');
  };

  const removeCard = (id: ID) => {
    deleteCard(id);
    touch();
    setSelectedCard(null);
    setEditing(null);
    toast('Idea deleted');
  };

  const connect = (from: ID, to: ID) => {
    if (links.some((l) => (l.from === from && l.to === to) || (l.from === to && l.to === from))) {
      toast('Those ideas are already connected', 'info');
      return;
    }
    setWorkspace((st) => ({ ...st, links: [...st.links, { id: uid('l'), boardId: board.id, from, to }] }));
    touch();
    toast('Ideas connected');
  };

  const removeLink = (id: ID) => {
    setWorkspace((st) => ({ ...st, links: st.links.filter((l) => l.id !== id) }));
    touch();
    setSelectedLink(null);
    toast('Connection removed');
  };

  return (
    <>
      <Toolbar>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{board.name}</span>
        </div>
        <span className="label hide-sm" style={{ whiteSpace: 'nowrap' }}>{pluralize(cards.length, 'idea')} · {pluralize(links.length, 'link')}</span>
        <ToolbarSpacer />
        <span className="hide-sm" style={{ color: 'var(--text-2)', fontSize: 'var(--fs-xs)' }}>Double-click empty space to add · drag a handle to connect</span>
        <ToolbarSep />
        <Button variant="primary" icon={Plus} onClick={() => addCard()}>Add idea</Button>
      </Toolbar>

      <div className={s.canvasWrap}>
        {(selected || selectedLink) && (
          <div className={s.ctxBar} role="toolbar" aria-label="Selection tools">
            {selected && (
              <>
                <TonePicker value={selected.tone} onChange={(tone) => updateCard(selected.id, { tone })} size="sm" />
                <span className={s.ctxSep} />
                <IconButton icon={Pencil} size="sm" label="Edit idea" onClick={() => setEditing(selected.id)} />
                <IconButton icon={StickyNote} size="sm" label="Add connected idea" onClick={() => {
                  const id = uid('c');
                  insert('cards', { id, boardId: board.id, title: 'New idea', body: '', tone: selected.tone, x: selected.x + CARD_WIDTH + 80, y: selected.y });
                  setWorkspace((st) => ({ ...st, links: [...st.links, { id: uid('l'), boardId: board.id, from: selected.id, to: id }] }));
                  touch();
                  setSelectedCard(id);
                  setEditing(id);
                }} />
                <IconButton icon={Copy} size="sm" label="Duplicate" onClick={() => addCard(undefined, undefined, selected)} />
                <IconButton icon={Trash2} size="sm" label="Delete idea" onClick={() => removeCard(selected.id)} />
              </>
            )}
            {selectedLink && !selected && (
              <Button size="sm" variant="ghost" icon={Unlink} onClick={() => removeLink(selectedLink)}>Remove connection</Button>
            )}
          </div>
        )}

        <Canvas
          viewKey={board.id}
          ariaLabel={`${board.name} canvas`}
          nodes={nodes}
          edges={links}
          selectedNodeId={selectedCard}
          selectedEdgeId={selectedLink}
          onSelectNode={(id) => { setSelectedCard(id); if (id !== editing) setEditing(null); }}
          onSelectEdge={setSelectedLink}
          onNodeMove={(id, x, y) => updateCard(id, { x, y })}
          onNodeActivate={(id) => { setSelectedCard(id); setEditing(id); }}
          onConnect={connect}
          onDeleteEdge={removeLink}
          onDeleteNode={removeCard}
          onBackgroundDoubleClick={(x, y) => addCard(x - CARD_WIDTH / 2, y - 30)}
          empty={
            <EmptyState
              icon={StickyNote}
              title="An empty canvas"
              text="Double-click anywhere to drop your first idea, or use Add idea."
              action={<Button variant="primary" icon={Plus} onClick={() => addCard()}>Add idea</Button>}
            />
          }
          renderNode={(n, { selected: sel }) => {
            const c = cards.find((x) => x.id === n.id)!;
            return (
              <div className={cx(s.card, sel && s.cardSelected)}>
                <span className={s.cardTone} style={{ background: toneColor(c.tone) }} />
                {editing === c.id ? (
                  <CardEditor card={c} onDone={() => setEditing(null)} />
                ) : (
                  <div className={s.cardInner}>
                    <div className={s.cardTitle}>{c.title || 'Untitled'}</div>
                    {c.body ? <div className={s.cardBody}>{c.body}</div> : <div className={cx(s.cardBody, s.cardEmpty)}>Double-click to write</div>}
                  </div>
                )}
              </div>
            );
          }}
        />
      </div>
    </>
  );
}

function CardEditor({ card, onDone }: { card: BoardCard; onDone: () => void }) {
  const [title, setTitle] = useState(card.title);
  const [body, setBody] = useState(card.body);

  const commit = () => {
    const t = title.trim() || 'Untitled';
    if (t !== card.title || body !== card.body) updateCard(card.id, { title: t, body: body.trim() });
    onDone();
  };

  return (
    <div
      className={s.cardInner}
      data-nodrag
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) commit(); }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.stopPropagation(); commit(); }
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit();
      }}
    >
      <input
        className={s.editTitle}
        value={title}
        autoFocus
        maxLength={80}
        aria-label="Idea title"
        onFocus={(e) => e.target.select()}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLElement)?.focus(); } }}
      />
      <textarea className={s.editBody} value={body} aria-label="Idea details" placeholder="Details…" onChange={(e) => setBody(e.target.value)} />
      <span className={s.editHint}>Esc or ⌘↵ to save</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BoardDialog({ open, board, onClose }: { open: boolean; board?: Board; onClose: () => void }) {
  const { toast } = useFeedback();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(board?.name ?? '');
    setDescription(board?.description ?? '');
    setTouched(false);
  }, [open, board]);

  const error = name.trim().length < 2 ? 'Give the board a name (2+ characters).' : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={board ? 'Rename board' : 'New board'}
      onSubmit={() => {
        setTouched(true);
        if (error) return;
        if (board) {
          patch('boards', board.id, { name: name.trim(), description: description.trim(), updatedAt: nowISO() });
          toast('Board updated');
        } else {
          const id = uid('b');
          insert('boards', { id, name: name.trim(), description: description.trim(), updatedAt: nowISO() });
          toast('Board created');
          navigate(`/board/${id}`);
        }
        onClose();
      }}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">{board ? 'Save' : 'Create board'}</Button></>}
    >
      <Field label="Name" error={touched ? error : null} htmlFor="bd-name">
        <Input id="bd-name" value={name} onChange={(e) => setName(e.target.value)} invalid={touched && !!error} maxLength={80} placeholder="e.g. Launch campaign ideas" />
      </Field>
      <Field label="Description" htmlFor="bd-desc">
        <Textarea id="bd-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={200} placeholder="Optional" />
      </Field>
    </Dialog>
  );
}

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Box, chakra, HStack, Stack, Text } from '@chakra-ui/react';
import { Check } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Announcements,
  type DropAnimation,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSlideItems } from '../motion/flip';
import { useMotionSetting } from '../motion/setting';
import { curves } from '../motion/tokens';
import { between, withMoves } from './kanban-place';

export interface KanbanColumn {
  id: string;
  title: ReactNode;
  /** Shown under the title: a count, a WIP limit. */
  meta?: ReactNode;
  /** A column over its limit is marked. */
  over?: boolean;
}

export interface KanbanLane {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
}

export interface KanbanItem {
  id: string;
  column: string;
  /** The lane the card sits in; "" when the board has no lanes. */
  lane: string;
}

export interface KanbanMove {
  column: string;
  lane: string;
  /** The card it lands before, or after (in the target cell). */
  before?: string;
  after?: string;
}

export interface KanbanBoardProps<T extends KanbanItem> {
  'aria-label': string;
  columns: KanbanColumn[];
  /** Swimlanes; without them the board is one row. */
  lanes?: KanbanLane[];
  /**
   * Cards in order (rank). Keep the same array until the host's data changes: a new array is its answer to the
   * person's move, which the board shows until then.
   */
  items: T[];
  renderCard: (item: T, state: { dragging: boolean }) => ReactNode;
  /** Whether the dragged card may land in a cell: false dims it; undefined means not known yet (allowed). */
  canDrop?: (item: T, column: string, lane: string) => boolean | undefined;
  onDragStart?: (item: T) => void;
  /** The drag ended, dropped or cancelled (the host may refresh the board again). */
  onDragEnd?: () => void;
  onMove: (item: T, to: KanbanMove) => void;
  /**
   * The selected cards (several moved at once, ADR 0058 amended). The host keeps them; with `onSelect` the board
   * selects: a click takes one card, Ctrl or Cmd+click adds or takes one away, Shift+click the cards between in a cell,
   * Esc or a click on the board's empty space clears.
   */
  selected?: ReadonlySet<string>;
  onSelect?: (ids: ReadonlySet<string>) => void;
  /** Selected cards dropped together, in the board's order, the dragged one among them; without it only that one moves. */
  onMoveMany?: (items: T[], to: KanbanMove) => void;
  /** What the preview under the pointer says when it carries several ("3 cards"). */
  carrying?: (count: number) => string;
  /** Screen reader texts while dragging (translated by the host). */
  announcements?: Announcements;
  screenReaderInstructions?: string;
  /** Shown in an empty cell. */
  empty?: ReactNode;
}

const cellId = (lane: string, column: string) => `cell:${lane}::${column}`;

/**
 * A board of cards in columns, optionally in swimlanes (ADR 0027). Cards are sorted within a cell and moved between
 * cells by pointer or keyboard (space to lift, arrows to move, space to drop). The board doesn't change anything
 * itself: it reports the move, and the host decides (and reloads).
 *
 * A card the person drops shows where they put it at once, until the host's next items (its answer) arrive; a move the
 * host refuses then slides back. When cards change places for any other reason (someone else, a rule, a refresh), they
 * slide to their new cells instead of jumping (ADR 0058): not while the person drags, and not the card they just
 * dropped, which the drag itself brought there. The slide moves a wrapper inside each card, never the element the drag
 * moves.
 *
 * With `selected` and `onSelect`, cards can be selected and dragged together (ADR 0058, amended): the others wait,
 * faded, where they are, then land beside the dragged one in their order, shown at once; they travel there from where
 * they waited.
 */
export function KanbanBoard<T extends KanbanItem>({
  'aria-label': ariaLabel,
  columns,
  lanes,
  items,
  renderCard,
  canDrop,
  onDragStart,
  onDragEnd,
  onMove,
  selected,
  onSelect,
  onMoveMany,
  carrying,
  announcements,
  screenReaderInstructions,
  empty,
}: KanbanBoardProps<T>) {
  const rows = lanes && lanes.length > 0 ? lanes : [{ id: '', title: null } as KanbanLane];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const laned = !!lanes && lanes.length > 0;
  const [active, setActive] = useState<T | null>(null);
  // The cards a drag carries: the dragged one, with the others selected with it (in the board's order).
  const [carried, setCarried] = useState<T[]>([]);
  // The person's own move, shown until the items it was made on are replaced by the host's next ones.
  const [pending, setPending] = useState<{ ids: string[]; move: KanbanMove; on: T[] } | null>(null);
  const shown = useMemo(() => (pending && pending.on === items ? withMoves(items, pending.ids, pending.move, !laned) : items), [items, pending, laned]);
  const riding = useMemo(() => new Set(carried.map((i) => i.id)), [carried]);
  // Where Shift+click counts from, and when a drag last ended (its pointer's click isn't a selection).
  const anchor = useRef<string | null>(null);
  const draggedAt = useRef(0);
  const { reduce } = useMotionSetting();
  const region = useRef<HTMLDivElement>(null);
  const dropped = useRef<string | null>(null);
  // Where every card is (its cell and its place in it): a new value means cards moved.
  const placement = useMemo(() => shown.map((i) => `${i.id}@${lanes && lanes.length > 0 ? i.lane : ''}/${i.column}`).join('|'), [shown, lanes]);
  const notePlaces = useSlideItems(region, placement, {
    paused: active != null,
    skip: () => {
      const id = dropped.current;
      dropped.current = null;
      return id;
    },
  });
  const byCell = useMemo(() => {
    const map = new Map<string, T[]>();
    for (const item of shown) {
      const id = cellId(lanes && lanes.length > 0 ? item.lane : '', item.column);
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(item);
    }
    return map;
  }, [shown, lanes]);
  const cellOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const [cell, list] of byCell) for (const item of list) map.set(item.id, cell);
    return map;
  }, [byCell]);

  function start(e: DragStartEvent) {
    const item = shown.find((i) => i.id === e.active.id) ?? null;
    setActive(item);
    // A selected card carries the others selected; any other card goes alone.
    setCarried(item && onMoveMany && selected?.has(item.id) && selected.size > 1 ? shown.filter((i) => selected.has(i.id)) : item ? [item] : []);
    if (item) onDragStart?.(item);
  }

  function end(e: DragEndEvent) {
    const item = active;
    const going = carried.length > 0 ? carried : item ? [item] : [];
    const goingIds = new Set(going.map((i) => i.id));
    setActive(null);
    setCarried([]);
    draggedAt.current = Date.now();
    onDragEnd?.();
    if (!item || !e.over) return;
    const overId = String(e.over.id);
    // Over one of the cards it carries: nowhere new.
    if (overId !== item.id && goingIds.has(overId)) return;
    const target = overId.startsWith('cell:') ? overId : cellOf.get(overId);
    if (!target) return;
    const [lane, column] = target.slice(5).split('::');
    if (canDrop?.(item, column, lane) === false) return;
    const cell = (byCell.get(target) ?? []).filter((i) => !goingIds.has(i.id));
    let move: KanbanMove = { column, lane };
    if (!overId.startsWith('cell:') && overId !== item.id) {
      const index = cell.findIndex((i) => i.id === overId);
      const fromIndex = (byCell.get(target) ?? []).findIndex((i) => i.id === item.id);
      const overIndex = (byCell.get(target) ?? []).findIndex((i) => i.id === overId);
      // Within a cell, moving down lands after the card it's over; otherwise before it.
      move = fromIndex >= 0 && fromIndex < overIndex ? { column, lane, after: cell[index]?.id } : { column, lane, before: cell[index]?.id };
    } else if (overId.startsWith('cell:') && cell.length > 0 && cellOf.get(item.id) !== target) {
      move = { column, lane, after: cell[cell.length - 1].id };
    } else if (overId === item.id) {
      return;
    }
    if (going.every((i) => cellOf.get(i.id) === target) && !move.before && !move.after) return;
    // The cards slide on from where the drag left them (not yet redrawn: React hasn't rendered the drop): the dragged
    // one is where it was let go, the others travel from where they waited.
    notePlaces();
    dropped.current = item.id;
    setPending({ ids: going.map((i) => i.id), move, on: items });
    if (going.length > 1 && onMoveMany) onMoveMany(going, move);
    else onMove(item, move);
  }

  // Selecting: a click on a card's body (its links and buttons are theirs), never the click a drag ends with.
  function select(id: string, e: MouseEvent) {
    if (!onSelect || !selected || Date.now() - draggedAt.current < 300) return;
    if (e.target instanceof Element && e.target.closest('a, button, input, select, textarea, [role=menuitem]')) return;
    const next = new Set(selected);
    const cell = byCell.get(cellOf.get(id) ?? '')?.map((i) => i.id) ?? [];
    if (e.shiftKey && anchor.current) {
      for (const x of between(cell, anchor.current, id)) next.add(x);
    } else if (e.metaKey || e.ctrlKey) {
      if (next.has(id)) next.delete(id);
      else next.add(id);
      anchor.current = id;
    } else {
      const only = next.size === 1 && next.has(id);
      next.clear();
      if (!only) next.add(id);
      anchor.current = id;
    }
    onSelect(next);
  }
  const clear = () => {
    if (onSelect && selected && selected.size > 0) onSelect(new Set());
  };
  // Esc clears the selection (not while dragging, where it cancels the drag, nor inside a dialog or menu).
  useEffect(() => {
    if (!onSelect || !selected || selected.size === 0 || active) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (e.target instanceof Element && e.target.closest('[role=dialog], [role=menu], [role=listbox]')) return;
      onSelect(new Set());
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onSelect, selected, active]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={start}
      onDragEnd={end}
      onDragCancel={() => {
        setActive(null);
        onDragEnd?.();
      }}
      accessibility={{ announcements, screenReaderInstructions: screenReaderInstructions ? { draggable: screenReaderInstructions } : undefined }}
    >
      <Box
        ref={region}
        role="region"
        aria-label={ariaLabel}
        overflowX="auto"
        pb="2"
        userSelect={onSelect ? 'none' : undefined}
        onClick={(e) => {
          // A click on the board's empty space (not on a card, nor its links) clears the selection.
          if (Date.now() - draggedAt.current < 300) return;
          if (e.target instanceof Element && !e.target.closest('[data-card], a, button, input, select, textarea')) clear();
        }}
      >
        <Box display="grid" gridTemplateColumns={`repeat(${columns.length}, minmax(240px, 1fr))`} gap="3" minW="fit-content">
          {columns.map((c) => (
            <Box key={c.id} position="sticky" top="0" zIndex="1" bg="bg" pb="1" data-column-header={c.id}>
              <HStack justify="space-between" px="2" py="1.5" rounded="l2" bg={c.over ? 'red.subtle' : 'bg.muted'}>
                <Text textStyle="label" truncate>{c.title}</Text>
                {c.meta && <Text textStyle="caption" color={c.over ? 'fg.error' : 'fg.muted'} flexShrink={0}>{c.meta}</Text>}
              </HStack>
            </Box>
          ))}
          {rows.map((lane) => (
            <LaneRow key={lane.id} lane={lane} showTitle={!!lanes && lanes.length > 0} columns={columns} span={columns.length}>
              {columns.map((c) => {
                const id = cellId(lane.id, c.id);
                const list = byCell.get(id) ?? [];
                const allowed = active ? canDrop?.(active, c.id, lane.id) !== false : true;
                return (
                  <Cell key={id} id={id} allowed={allowed} dragging={!!active} items={list.map((i) => i.id)} column={c.id} lane={lane.id}>
                    {list.map((item) => (
                      <SortableCard
                        key={item.id}
                        id={item.id}
                        selected={!!selected?.has(item.id)}
                        riding={riding.has(item.id) && active?.id !== item.id}
                        onClick={onSelect ? (e) => select(item.id, e) : undefined}
                      >
                        {(dragging) => renderCard(item, { dragging })}
                      </SortableCard>
                    ))}
                    {list.length === 0 && empty && (
                      <Text textStyle="caption" color="fg.subtle" textAlign="center" py="4">{empty}</Text>
                    )}
                  </Cell>
                );
              })}
            </LaneRow>
          ))}
        </Box>
      </Box>
      <DragOverlay dropAnimation={reduce ? null : landing}>
        {active ? (
          <Lifted carried={carried.length} reduce={reduce} count={carried.length > 1 ? (carrying ? carrying(carried.length) : String(carried.length)) : undefined}>
            {renderCard(active, { dragging: true })}
          </Lifted>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function LaneRow({ lane, showTitle, span, children }: { lane: KanbanLane; showTitle: boolean; columns: KanbanColumn[]; span: number; children: ReactNode }) {
  return (
    <>
      {showTitle && (
        <HStack gridColumn={`1 / span ${span}`} gap="2" pt="2" borderTopWidth="1px" borderColor="border.muted" data-lane={lane.id}>
          <Text textStyle="label">{lane.title}</Text>
          {lane.meta && <Text textStyle="caption" color="fg.muted">{lane.meta}</Text>}
        </HStack>
      )}
      {children}
    </>
  );
}

function Cell({ id, items, allowed, dragging, column, lane, children }: {
  id: string; items: string[]; allowed: boolean; dragging: boolean; column: string; lane: string; children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !allowed });
  return (
    <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
      <Stack
        ref={setNodeRef}
        gap="2"
        minH="16"
        p="1.5"
        rounded="l2"
        bg={isOver && allowed ? 'bg.emphasized' : 'bg.subtle'}
        opacity={dragging && !allowed ? 0.45 : 1}
        borderWidth="1px"
        borderStyle={dragging && allowed ? 'dashed' : 'solid'}
        borderColor={dragging && allowed ? 'border.emphasized' : 'transparent'}
        data-cell={`${lane}::${column}`}
        data-allowed={dragging ? String(allowed) : undefined}
      >
        {children}
      </Stack>
    </SortableContext>
  );
}

function SortableCard({
  id,
  selected,
  riding,
  onClick,
  children,
}: {
  id: string;
  selected: boolean;
  /** Carried along with the dragged card: it waits, faded, where it is. */
  riding: boolean;
  onClick?: (e: MouseEvent) => void;
  children: (dragging: boolean) => ReactNode;
}) {
  // dnd-kit's own layout animation after a drop is off: the board slides cards from where the drop left them (ADR 0058),
  // and two of them at once would move a card twice as far.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, animateLayoutChanges: () => false });
  return (
    <Box
      ref={setNodeRef}
      position="relative"
      rounded="l2"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      opacity={isDragging || riding ? 0.4 : 1}
      outline={selected && !isDragging && !riding ? '2px solid' : undefined}
      outlineColor="accent.solid"
      outlineOffset="1px"
      {...attributes}
      {...listeners}
      onClick={onClick}
      data-card={id}
      data-selected={selected || undefined}
      cursor="grab"
      _focusVisible={{ outline: '2px solid', outlineColor: 'colorPalette.focusRing', rounded: 'l2' }}
    >
      <Box data-slide={id}>{children(isDragging)}</Box>
      {selected && !isDragging && !riding && <Mark />}
    </Box>
  );
}

const OUT = `cubic-bezier(${curves.out.join(', ')})`;
/** How the card under the pointer is held: lifted a little and tilted, as a card in a hand. */
const HELD = 'rotate(-2deg) scale(1.03)';
const LAND_MS = 220;

/**
 * Let go, the preview flies to its place (dnd-kit's drop animation, on Toda's out curve) and straightens as it lands; the
 * cards stacked behind it fade, since the others travel on the board itself.
 */
const landing: DropAnimation = {
  duration: LAND_MS,
  easing: OUT,
  sideEffects: (params) => {
    const restore = defaultDropAnimationSideEffects({ styles: { active: { opacity: '0' } } })(params);
    const node = params.dragOverlay.node;
    node.querySelector('[data-held]')?.animate([{ transform: HELD }, { transform: 'none' }], { duration: LAND_MS, easing: OUT, fill: 'forwards' });
    for (const layer of node.querySelectorAll('[data-layer]')) layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: LAND_MS / 2, fill: 'forwards' });
    node.querySelector('[data-testid=carry-count]')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: LAND_MS / 2, fill: 'forwards' });
    return restore;
  },
};

/**
 * The card under the pointer while it's dragged: it stays with the pointer where it was taken, lifted and tilted a
 * little (it eases into that as it's picked up); carrying several, two cards peek out behind it and a badge says how
 * many. With less motion it's simply the card, with a shadow.
 */
function Lifted({ carried, count, reduce, children }: { carried: number; count?: string; reduce: boolean; children: ReactNode }) {
  const held = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reduce) return;
    held.current?.animate?.([{ transform: 'none', boxShadow: 'var(--toda-shadows-sm)' }, { transform: HELD, boxShadow: 'var(--toda-shadows-xl)' }], { duration: 160, easing: OUT });
    // once, when it's picked up
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const layers = Math.min(2, Math.max(0, carried - 1));
  return (
    <Box position="relative" cursor="grabbing" data-testid="drag-preview">
      {Array.from({ length: layers }, (_, i) => (
        <Box
          key={i}
          data-layer
          position="absolute"
          inset="0"
          rounded="l2"
          bg="bg.panel"
          borderWidth="1px"
          borderColor="border"
          shadow="sm"
          style={{ transform: reduce ? `translate(${(i + 1) * 5}px, ${(i + 1) * 5}px)` : `translate(${(i + 1) * 6}px, ${(i + 1) * 5}px) rotate(${(i + 1) * 2.5}deg)`, zIndex: -1 - i }}
        />
      ))}
      <Box ref={held} data-held rounded="l2" shadow={reduce ? 'lg' : 'xl'} style={{ transform: reduce ? undefined : HELD, transformOrigin: '50% 40%' }}>
        {children}
      </Box>
      {count != null && <Count>{count}</Count>}
    </Box>
  );
}

/** The tick on a selected card's corner: it pops in (not with less motion). */
function Mark() {
  const ref = useRef<HTMLSpanElement>(null);
  const { reduce } = useMotionSetting();
  useLayoutEffect(() => {
    if (reduce) return;
    ref.current?.animate?.([{ transform: 'scale(0.4)', opacity: 0 }, { transform: 'scale(1.12)', opacity: 1, offset: 0.65 }, { transform: 'scale(1)', opacity: 1 }], {
      duration: 220,
      easing: OUT,
    });
    // once, when it appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <chakra.span
      ref={ref}
      position="absolute"
      top="-1.5"
      insetEnd="-1.5"
      display="grid"
      placeItems="center"
      boxSize="5"
      rounded="full"
      bg="accent.solid"
      color="accent.contrast"
      boxShadow="0 0 0 2px var(--toda-colors-bg)"
      pointerEvents="none"
      aria-hidden="true"
      _icon={{ boxSize: '3' }}
    >
      <Check strokeWidth={3} />
    </chakra.span>
  );
}

/** How many cards the preview carries, on its corner. */
function Count({ children }: { children: ReactNode }) {
  return (
    <chakra.span
      position="absolute"
      top="-3.5"
      insetEnd="-3"
      minW="6"
      h="6"
      px="1.5"
      display="grid"
      placeItems="center"
      rounded="full"
      bg="accent.solid"
      color="accent.contrast"
      textStyle="caption"
      fontWeight="semibold"
      boxShadow="0 0 0 2px var(--toda-colors-bg)"
      data-testid="carry-count"
    >
      {children}
    </chakra.span>
  );
}

import { useMemo, useState, type ReactNode } from 'react';
import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Announcements,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  /** Cards in order (rank). */
  items: T[];
  renderCard: (item: T, state: { dragging: boolean }) => ReactNode;
  /** Whether the dragged card may land in a cell: false dims it; undefined means not known yet (allowed). */
  canDrop?: (item: T, column: string, lane: string) => boolean | undefined;
  onDragStart?: (item: T) => void;
  onMove: (item: T, to: KanbanMove) => void;
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
 */
export function KanbanBoard<T extends KanbanItem>({
  'aria-label': ariaLabel,
  columns,
  lanes,
  items,
  renderCard,
  canDrop,
  onDragStart,
  onMove,
  announcements,
  screenReaderInstructions,
  empty,
}: KanbanBoardProps<T>) {
  const rows = lanes && lanes.length > 0 ? lanes : [{ id: '', title: null } as KanbanLane];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [active, setActive] = useState<T | null>(null);
  const byCell = useMemo(() => {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const id = cellId(lanes && lanes.length > 0 ? item.lane : '', item.column);
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(item);
    }
    return map;
  }, [items, lanes]);
  const cellOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const [cell, list] of byCell) for (const item of list) map.set(item.id, cell);
    return map;
  }, [byCell]);

  function start(e: DragStartEvent) {
    const item = items.find((i) => i.id === e.active.id) ?? null;
    setActive(item);
    if (item) onDragStart?.(item);
  }

  function end(e: DragEndEvent) {
    const item = active;
    setActive(null);
    if (!item || !e.over) return;
    const overId = String(e.over.id);
    const target = overId.startsWith('cell:') ? overId : cellOf.get(overId);
    if (!target) return;
    const [lane, column] = target.slice(5).split('::');
    if (canDrop?.(item, column, lane) === false) return;
    const cell = (byCell.get(target) ?? []).filter((i) => i.id !== item.id);
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
    if (cellOf.get(item.id) === target && !move.before && !move.after) return;
    onMove(item, move);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={start}
      onDragEnd={end}
      onDragCancel={() => setActive(null)}
      accessibility={{ announcements, screenReaderInstructions: screenReaderInstructions ? { draggable: screenReaderInstructions } : undefined }}
    >
      <Box role="region" aria-label={ariaLabel} overflowX="auto" pb="2">
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
                      <SortableCard key={item.id} id={item.id}>
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
      <DragOverlay>{active ? <Box shadow="lg" rounded="l2">{renderCard(active, { dragging: true })}</Box> : null}</DragOverlay>
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

function SortableCard({ id, children }: { id: string; children: (dragging: boolean) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <Box ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} opacity={isDragging ? 0.4 : 1} {...attributes} {...listeners}
      data-card={id} cursor="grab" _focusVisible={{ outline: '2px solid', outlineColor: 'colorPalette.focusRing', rounded: 'l2' }}>
      {children(isDragging)}
    </Box>
  );
}

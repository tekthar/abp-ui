import { useMemo, useState, type ReactNode } from 'react';
import { Box, Stack, Text } from '@chakra-ui/react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface SortableSection<T extends { id: string }> {
  id: string;
  /** The section's heading row: a name, counts, actions. */
  header: ReactNode;
  /** Items in order (rank). */
  items: T[];
  /** Shown when the section has no items (it still takes drops). */
  empty?: ReactNode;
}

export interface SectionMove {
  section: string;
  /** The item it lands before, or after, in the target section. */
  before?: string;
  after?: string;
}

export interface SortableSectionsProps<T extends { id: string }> {
  'aria-label': string;
  sections: SortableSection<T>[];
  renderItem: (item: T, state: { dragging: boolean }) => ReactNode;
  onMove: (item: T, to: SectionMove) => void;
  announcements?: Announcements;
  screenReaderInstructions?: string;
}

const sectionId = (id: string) => `section:${id}`;

/**
 * Lists in sections, each sortable, with items dragged within and between sections (ADR 0029: sprints and the
 * backlog). Pointer or keyboard (space to lift, arrows to move, space to drop). Like the board, it only reports the
 * move; the host decides and reloads.
 */
export function SortableSections<T extends { id: string }>({
  'aria-label': ariaLabel,
  sections,
  renderItem,
  onMove,
  announcements,
  screenReaderInstructions,
}: SortableSectionsProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [active, setActive] = useState<T | null>(null);
  const sectionOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sections) for (const item of s.items) map.set(item.id, s.id);
    return map;
  }, [sections]);

  function start(e: DragStartEvent) {
    setActive(sections.flatMap((s) => s.items).find((i) => i.id === e.active.id) ?? null);
  }

  function end(e: DragEndEvent) {
    const item = active;
    setActive(null);
    if (!item || !e.over) return;
    const overId = String(e.over.id);
    const target = overId.startsWith('section:') ? overId.slice(8) : sectionOf.get(overId);
    if (!target) return;
    const list = sections.find((s) => s.id === target)?.items ?? [];
    const others = list.filter((i) => i.id !== item.id);
    const from = sectionOf.get(item.id);
    let move: SectionMove = { section: target };
    if (!overId.startsWith('section:')) {
      if (overId === item.id) return;
      const fromIndex = list.findIndex((i) => i.id === item.id);
      const overIndex = list.findIndex((i) => i.id === overId);
      // Within a section, moving down lands after the item it's over; otherwise before it.
      move = fromIndex >= 0 && fromIndex < overIndex ? { section: target, after: overId } : { section: target, before: overId };
    } else if (from !== target && others.length > 0) {
      move = { section: target, after: others[others.length - 1].id };
    }
    if (from === target && !move.before && !move.after) return;
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
      <Stack role="region" aria-label={ariaLabel} gap="4">
        {sections.map((s) => (
          <Section key={s.id} section={s} dragging={!!active}>
            {s.items.map((item) => (
              <SortableItem key={item.id} id={item.id}>
                {(dragging) => renderItem(item, { dragging })}
              </SortableItem>
            ))}
            {s.items.length === 0 && s.empty && (
              <Text textStyle="caption" color="fg.subtle" textAlign="center" py="4">{s.empty}</Text>
            )}
          </Section>
        ))}
      </Stack>
      <DragOverlay>{active ? <Box shadow="lg" rounded="l2" bg="bg.panel">{renderItem(active, { dragging: true })}</Box> : null}</DragOverlay>
    </DndContext>
  );
}

function Section<T extends { id: string }>({ section, dragging, children }: { section: SortableSection<T>; dragging: boolean; children: ReactNode }) {
  const id = sectionId(section.id);
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <Box as="section" borderWidth="1px" borderColor="border" rounded="l3" bg="bg.panel" data-section={section.id}>
      <Box px="3" py="2" borderBottomWidth="1px" borderColor="border.muted">
        {section.header}
      </Box>
      <SortableContext id={id} items={section.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <Stack ref={setNodeRef} gap="0" minH="12" p="1" bg={isOver ? 'bg.emphasized' : undefined} borderStyle={dragging ? 'dashed' : undefined}
          rounded="l2">
          {children}
        </Stack>
      </SortableContext>
    </Box>
  );
}

function SortableItem({ id, children }: { id: string; children: (dragging: boolean) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <Box ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} opacity={isDragging ? 0.4 : 1} {...attributes} {...listeners}
      data-item={id} cursor="grab" _focusVisible={{ outline: '2px solid', outlineColor: 'colorPalette.focusRing', rounded: 'l2' }}>
      {children(isDragging)}
    </Box>
  );
}

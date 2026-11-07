import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Box, Grid, Stack, Text } from '@chakra-ui/react';
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useLoading } from '../skeleton/loading';
import { Bone } from '../skeleton/bones';

/** A thing on the calendar: its first day and, for a span, its last (yyyy-mm-dd). */
export interface CalendarItem {
  id: string;
  start: string;
  end?: string | null;
  /** False: shown but not draggable (a date the person can't change). */
  movable?: boolean;
}

export interface CalendarGridProps<T extends CalendarItem> {
  'aria-label': string;
  /** The days shown, in order, as yyyy-mm-dd: whole weeks (a month's grid, or one week). */
  days: string[];
  /** Days outside the period being looked at (a month's leading and trailing days) are dimmed. */
  inPeriod?: (day: string) => boolean;
  today?: string;
  /** Headings for the seven columns, starting with the grid's first weekday. */
  weekdays: string[];
  /** The day number or label shown in each cell. */
  dayLabel: (day: string) => ReactNode;
  /** Each day's full name, for screen readers ("Tuesday 12 May 2030"). */
  dayName: (day: string) => string;
  items: T[];
  renderItem: (item: T, state: { dragging: boolean; continued: boolean }) => ReactNode;
  /** A move to another day: by dragging, or Alt+arrow keys on a focused item (a day, or a week with up and down). */
  onMove: (item: T, day: string) => void;
  /** At most this many items per cell before "+n more". */
  maxPerDay?: number;
  more?: (count: number) => ReactNode;
  /** Week grids are taller: every item shows. */
  tall?: boolean;
  /** Its items are coming (ADR 0061): the grid as it is, a few days holding placeholders. The nearest `Loading` scope's when not given. */
  loading?: boolean;
}

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Records by date on a grid of weeks (ADR 0027). An item spanning days shows on each of them. Items move by dragging
 * to another day, or from the keyboard: Alt+Left/Right moves a day, Alt+Up/Down a week. Like the board, the grid only
 * reports the move.
 */
export function CalendarGrid<T extends CalendarItem>({
  'aria-label': ariaLabel,
  days,
  inPeriod,
  today,
  weekdays,
  dayLabel,
  dayName,
  items,
  renderItem,
  onMove,
  maxPerDay = 4,
  more,
  tall,
  loading: own,
}: CalendarGridProps<T>) {
  const loading = useLoading(own);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [active, setActive] = useState<T | null>(null);
  const root = useRef<HTMLDivElement>(null);
  // After a keyboard move the grid redraws: focus stays on the item that moved, so it can keep moving.
  const refocus = useRef<string | null>(null);
  useEffect(() => {
    if (!refocus.current) return;
    const chip = root.current?.querySelector<HTMLElement>(`[data-item="${CSS.escape(refocus.current)}"]`);
    if (chip && document.activeElement !== chip) chip.focus();
  }, [items]);
  const byDay = useMemo(() => {
    const map = new Map<string, { item: T; continued: boolean }[]>();
    const first = days[0], last = days[days.length - 1];
    for (const item of items) {
      const end = item.end && item.end >= item.start ? item.end : item.start;
      for (let day = item.start < first ? first : item.start; day <= end && day <= last; day = addDays(day, 1)) {
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push({ item, continued: day !== item.start });
      }
    }
    return map;
  }, [items, days]);

  function end(e: DragEndEvent) {
    const item = active;
    setActive(null);
    if (!item || !e.over) return;
    const day = String(e.over.id).replace('day:', '');
    if (day !== item.start) onMove(item, day);
  }

  function key(item: T, e: KeyboardEvent) {
    if (!e.altKey || item.movable === false) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    refocus.current = item.id;
    const rtl = getComputedStyle(e.currentTarget as Element).direction === 'rtl';
    onMove(item, addDays(item.start, rtl && Math.abs(step) === 1 ? -step : step));
  }

  return (
    <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActive(items.find((i) => i.id === e.active.id) ?? null)} onDragEnd={end}
      onDragCancel={() => setActive(null)}>
      <Box ref={root} role="grid" aria-label={ariaLabel} borderWidth="1px" borderColor="border" rounded="l3" overflow="hidden">
        <Grid role="row" templateColumns="repeat(7, minmax(0, 1fr))" bg="bg.muted" borderBottomWidth="1px" borderColor="border">
          {weekdays.map((w, i) => (
            <Text key={i} role="columnheader" textStyle="caption" fontWeight="medium" color="fg.muted" px="2" py="1.5" truncate>{w}</Text>
          ))}
        </Grid>
        {Array.from({ length: Math.ceil(days.length / 7) }, (_, week) => (
          <Grid key={week} role="row" templateColumns="repeat(7, minmax(0, 1fr))" borderBottomWidth={week < days.length / 7 - 1 ? '1px' : 0} borderColor="border">
            {days.slice(week * 7, week * 7 + 7).map((day, i) => {
              const list = byDay.get(day) ?? [];
              const shown = tall ? list : list.slice(0, maxPerDay);
              return (
                <DayCell key={day} day={day} name={dayName(day)} dim={inPeriod ? !inPeriod(day) : false} today={day === today} tall={tall} last={i === 6}
                  label={dayLabel(day)} dragging={!!active}>
                  {loading &&
                    Array.from({ length: (week * 7 + i) % 4 === 1 ? 2 : (week * 7 + i) % 3 === 0 ? 1 : 0 }, (_, n) => (
                      <Bone key={n} height="5" width={n === 0 ? 'full' : '3/4'} aria-hidden="true" />
                    ))}
                  {!loading && shown.map(({ item, continued }) => (
                    <Chip key={`${item.id}:${day}`} item={item} continued={continued} onKeyDown={(e) => key(item, e)}>
                      {(dragging) => renderItem(item, { dragging, continued })}
                    </Chip>
                  ))}
                  {list.length > shown.length && more && <Text textStyle="caption" color="fg.muted" px="1">{more(list.length - shown.length)}</Text>}
                </DayCell>
              );
            })}
          </Grid>
        ))}
      </Box>
      <DragOverlay>{active ? <Box shadow="lg" rounded="l2" bg="bg.panel">{renderItem(active, { dragging: true, continued: false })}</Box> : null}</DragOverlay>
    </DndContext>
  );
}

function DayCell({ day, name, dim, today, tall, last, label, dragging, children }: {
  day: string; name: string; dim: boolean; today: boolean; tall?: boolean; last: boolean; label: ReactNode; dragging: boolean; children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${day}` });
  return (
    <Stack ref={setNodeRef} role="gridcell" aria-label={name} gap="1" p="1" minH={tall ? '72' : '28'} minW="0"
      borderInlineEndWidth={last ? 0 : '1px'} borderColor="border" bg={isOver ? 'bg.emphasized' : dim ? 'bg.subtle' : 'bg.panel'}
      outline={dragging ? '1px dashed' : undefined} outlineColor="border.muted" outlineOffset="-3px" data-day={day}>
      {/* Today's number sits in a filled circle; the period's days read stronger than the days around it. */}
      <Text textStyle="caption" fontWeight="semibold" color={today ? 'accent.contrast' : dim ? 'fg.subtle' : 'fg'} aria-current={today ? 'date' : undefined}
        alignSelf="flex-start" px={today ? '1.5' : '1'} minW={today ? '6' : undefined} h="6" display="inline-flex" alignItems="center" justifyContent="center"
        rounded="full" bg={today ? 'accent.solid' : undefined}>
        {label}
      </Text>
      {children}
    </Stack>
  );
}

function Chip<T extends CalendarItem>({ item, continued, onKeyDown, children }: {
  item: T; continued: boolean; onKeyDown: (e: KeyboardEvent) => void; children: (dragging: boolean) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: continued ? `${item.id}:cont` : item.id, disabled: item.movable === false || continued });
  return (
    <Box ref={setNodeRef} {...attributes} {...listeners} onKeyDown={(e) => { listeners?.onKeyDown?.(e); onKeyDown(e); }} opacity={isDragging ? 0.4 : 1}
      data-item={continued ? undefined : item.id} cursor={item.movable === false || continued ? 'default' : 'grab'} minW="0" _focusVisible={{ outline: '2px solid', outlineColor: 'colorPalette.focusRing', rounded: 'l1' }}>
      {children(isDragging)}
    </Box>
  );
}

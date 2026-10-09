'use client';

import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Box, chakra } from '@chakra-ui/react';
import { GripVertical, MoveDiagonal2 } from 'lucide-react';
import { useTodaLocale } from '../provider/locale';

/** A widget's place on the grid, in cells: column, row, width and height. */
export interface GridItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardGridProps<T extends GridItem> {
  items: T[];
  /** Columns of the grid (12). Below the md breakpoint every item takes the full width, in reading order. */
  columns?: number;
  /** Height of one row, in pixels. */
  rowHeight?: number;
  /** Whether items can be moved and resized (with the pointer, or the arrow keys on their handles). */
  editing?: boolean;
  /** The layout after a move or a resize, compacted upwards. */
  onLayoutChange?: (items: GridItem[]) => void;
  renderItem: (item: T) => ReactNode;
  labels: {
    /** Name of an item's move handle, e.g. "Move Open bugs, column 1, row 3". */
    move: (item: T) => string;
    /** Name of an item's resize handle. */
    resize: (item: T) => string;
    /** How to use the handles from the keyboard. */
    instructions: string;
  };
  'aria-label': string;
}

const GAP = 16;
const MAX_HEIGHT = 12;

const overlaps = (a: GridItem, b: GridItem) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Packs a layout upwards: in reading order, each item drops below anything it overlaps, then floats up as far as the
 * items above it allow. Nothing overlaps afterwards. An item being moved goes before the items on its row when it
 * moves up and after them when it moves down, so it trades places with the item it lands on.
 */
export function compactLayout<T extends GridItem>(items: T[], moved?: string, direction: -1 | 0 | 1 = 0): T[] {
  const rank = (i: T) => (i.id === moved ? i.y + (direction > 0 ? 0.5 : -0.5) : i.y);
  const order = [...items].sort((a, b) => rank(a) - rank(b) || a.x - b.x);
  const placed: T[] = [];
  for (const item of order) {
    const next = { ...item };
    for (let hits = placed.filter((p) => overlaps(p, next)); hits.length > 0; hits = placed.filter((p) => overlaps(p, next))) {
      next.y = Math.max(...hits.map((p) => p.y + p.h));
    }
    while (next.y > 0 && !placed.some((p) => overlaps(p, { ...next, y: next.y - 1 }))) next.y -= 1;
    placed.push(next);
  }
  return placed.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Where a new item of a size goes: the first free place, top to bottom, start to end. */
export function placeItem(items: GridItem[], w: number, h: number, columns = 12): { x: number; y: number } {
  const width = Math.min(w, columns);
  for (let y = 0; ; y++) {
    for (let x = 0; x + width <= columns; x++) {
      if (!items.some((i) => overlaps(i, { id: '', x, y, w: width, h }))) return { x, y };
    }
  }
}

type Gesture = { id: string; mode: 'move' | 'resize'; startX: number; startY: number; origin: GridItem; colUnit: number; rowUnit: number };

/**
 * A free grid of widgets (ADR 0031): 12 columns, rows of a fixed height. While editing, each item has a move handle
 * and a resize handle that work with the pointer and with the arrow keys; the layout compacts upwards, and right to
 * left mirrors the columns.
 */
export function DashboardGrid<T extends GridItem>({
  items,
  columns = 12,
  rowHeight = 72,
  editing = false,
  onLayoutChange,
  renderItem,
  labels,
  'aria-label': ariaLabel,
}: DashboardGridProps<T>) {
  const { isRtl } = useTodaLocale();
  const ref = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [preview, setPreview] = useState<GridItem[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const layout = preview ?? items;
  const byId = new Map(items.map((i) => [i.id, i]));
  const instructionsId = `${ariaLabel.replace(/\W+/g, '-')}-grid-help`;

  function change(id: string, mode: 'move' | 'resize', dx: number, dy: number, origin: GridItem): GridItem[] {
    const next =
      mode === 'move'
        ? { ...origin, x: Math.min(Math.max(0, origin.x + dx), columns - origin.w), y: Math.max(0, origin.y + dy) }
        : { ...origin, w: Math.min(Math.max(1, origin.w + dx), columns - origin.x), h: Math.min(Math.max(1, origin.h + dy), MAX_HEIGHT) };
    return compactLayout(
      items.map((i) => (i.id === id ? next : { id: i.id, x: i.x, y: i.y, w: i.w, h: i.h })),
      id,
      mode === 'move' ? (Math.sign(dy) as -1 | 0 | 1) : 0,
    );
  }

  function start(e: ReactPointerEvent<HTMLElement>, item: T, mode: 'move' | 'resize') {
    if (!ref.current || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.focus(); // the handle keeps focus, so the arrow keys carry on from here
    e.currentTarget.setPointerCapture(e.pointerId);
    const width = ref.current.getBoundingClientRect().width;
    gesture.current = {
      id: item.id, mode, startX: e.clientX, startY: e.clientY, origin: { id: item.id, x: item.x, y: item.y, w: item.w, h: item.h },
      colUnit: (width + GAP) / columns, rowUnit: rowHeight + GAP,
    };
    setActive(item.id);
  }

  function move(e: ReactPointerEvent<HTMLElement>) {
    const g = gesture.current;
    if (!g) return;
    const dx = Math.round(((e.clientX - g.startX) * (isRtl ? -1 : 1)) / g.colUnit);
    const dy = Math.round((e.clientY - g.startY) / g.rowUnit);
    setPreview(change(g.id, g.mode, dx, dy, g.origin));
  }

  function end() {
    const g = gesture.current;
    gesture.current = null;
    if (g && preview) onLayoutChange?.(preview);
    setPreview(null);
    setActive(null);
  }

  function key(e: KeyboardEvent<HTMLElement>, item: T, mode: 'move' | 'resize') {
    const step: Record<string, [number, number]> = {
      ArrowLeft: [isRtl ? 1 : -1, 0], ArrowRight: [isRtl ? -1 : 1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    };
    const d = step[e.key];
    if (!d) return;
    e.preventDefault();
    // A step up or down that packs back to where it was goes on, a row at a time, until the layout changes.
    const same = (layout: GridItem[]) => layout.every((l) => {
      const i = items.find((x) => x.id === l.id);
      return i && i.x === l.x && i.y === l.y && i.w === l.w && i.h === l.h;
    });
    let next = change(item.id, mode, d[0], d[1], item);
    for (let k = 2; mode === 'move' && d[1] !== 0 && same(next) && k <= 50; k++) next = change(item.id, mode, 0, d[1] * k, item);
    if (!same(next)) onLayoutChange?.(next);
  }

  const handle = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'fg.subtle', bg: 'bg.panel', rounded: 'l1',
    touchAction: 'none', _hover: { color: 'fg', bg: 'bg.muted' }, _focusVisible: { outline: '2px solid', outlineColor: 'colorPalette.focusRing', outlineOffset: '1px' },
  } as const;

  return (
    <Box>
      {editing && (
        <chakra.p id={instructionsId} srOnly>
          {labels.instructions}
        </chakra.p>
      )}
      <Box
        ref={ref}
        role="list"
        aria-label={ariaLabel}
        display="grid"
        gridTemplateColumns={{ base: '1fr', md: `repeat(${columns}, minmax(0, 1fr))` }}
        gridAutoRows={`${rowHeight}px`}
        gap={`${GAP}px`}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {layout.map((place) => {
          const item = byId.get(place.id);
          if (!item) return null;
          const shown = { ...item, ...place };
          const moving = active === item.id;
          return (
            <Box
              key={item.id}
              role="listitem"
              position="relative"
              minW="0"
              gridColumn={{ base: '1 / -1', md: `${shown.x + 1} / span ${shown.w}` }}
              gridRow={{ base: `span ${shown.h}`, md: `${shown.y + 1} / span ${shown.h}` }}
              zIndex={moving ? 1 : undefined}
              opacity={moving ? 0.85 : undefined}
              transition={moving ? undefined : 'all 120ms ease'}
            >
              {renderItem(shown as T)}
              {editing && (
                <>
                  <chakra.button
                    type="button"
                    position="absolute"
                    top="2"
                    insetStart="2"
                    boxSize="6"
                    cursor="grab"
                    css={handle}
                    aria-label={labels.move(shown as T)}
                    aria-describedby={instructionsId}
                    onPointerDown={(e) => start(e, item, 'move')}
                    onKeyDown={(e) => key(e, item, 'move')}
                  >
                    <GripVertical size={14} aria-hidden />
                  </chakra.button>
                  <chakra.button
                    type="button"
                    position="absolute"
                    bottom="1"
                    insetEnd="1"
                    boxSize="6"
                    cursor={isRtl ? 'nesw-resize' : 'nwse-resize'}
                    css={handle}
                    aria-label={labels.resize(shown as T)}
                    aria-describedby={instructionsId}
                    onPointerDown={(e) => start(e, item, 'resize')}
                    onKeyDown={(e) => key(e, item, 'resize')}
                  >
                    <MoveDiagonal2 size={14} aria-hidden style={isRtl ? { transform: 'scaleX(-1)' } : undefined} />
                  </chakra.button>
                </>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';

/** A bar: its first and last day (yyyy-mm-dd); with only one of them, it's that one day. */
export interface TimelineItem {
  id: string;
  start?: string | null;
  end?: string | null;
  movable?: boolean;
}

export interface TimelineRow<T extends TimelineItem> {
  id: string;
  /** A group heading row (no bar), or a record row. */
  heading?: ReactNode;
  item?: T;
}

export interface TimelineChartProps<T extends TimelineItem> {
  'aria-label': string;
  /** The window shown, first and last day (yyyy-mm-dd). */
  from: string;
  to: string;
  /** Pixels per day: 32 shows days, 12 weeks, 4 months. */
  dayWidth: number;
  rows: TimelineRow<T>[];
  /** Dependencies: <c>from</c> must end before <c>to</c> starts (drawn red when it doesn't). */
  links?: { from: string; to: string }[];
  today?: string;
  /** The label column for a record row. */
  renderLabel: (item: T) => ReactNode;
  /** Text inside a bar. */
  renderBar?: (item: T) => ReactNode;
  /** What a bar says to screen readers: "PAY-3 Checkout, 1 to 14 June". */
  describe: (item: T) => string;
  /** Header ticks: the label for a day that starts a period (a month, or a week at finer zoom). */
  tick: (day: string) => string | null;
  /** A move: dragging the bar moves both ends, its right edge moves the end. Arrow keys move a focused bar a day; Shift+arrows its end. */
  onMove: (item: T, start: string, end: string) => void;
  labelWidth?: number;
  rowHeight?: number;
  instructions?: string;
}

const DAY = 86_400_000;
const toDay = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / DAY);
const fromDay = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);

/**
 * A timeline (ADR 0027): one row per record, its bar from start to end on a day axis, group headings, and dependency
 * arrows. Bars move by dragging (both ends) or by their right edge (the end), and from the keyboard; the chart only
 * reports the move. Horizontal scrolling keeps the label column in place.
 */
export function TimelineChart<T extends TimelineItem>({
  'aria-label': ariaLabel,
  from,
  to,
  dayWidth,
  rows,
  links = [],
  today,
  renderLabel,
  renderBar,
  describe,
  tick,
  onMove,
  labelWidth = 260,
  rowHeight = 36,
  instructions,
}: TimelineChartProps<T>) {
  const origin = toDay(from);
  const days = toDay(to) - origin + 1;
  const width = days * dayWidth;
  const [drag, setDrag] = useState<{ id: string; mode: 'move' | 'end'; x: number; delta: number } | null>(null);
  const moved = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  // After a keyboard move the bars redraw: focus stays on the one that moved, so arrows can keep moving it.
  const refocus = useRef<string | null>(null);
  useEffect(() => {
    if (!refocus.current) return;
    const bar = root.current?.querySelector<HTMLElement>(`[data-bar="${CSS.escape(refocus.current)}"]`);
    if (bar && document.activeElement !== bar) bar.focus();
  }, [rows]);

  const span = (item: T) => {
    const s = item.start ?? item.end!, e = item.end ?? item.start!;
    let a = toDay(s), b = toDay(e);
    if (drag?.id === item.id) {
      if (drag.mode === 'move') a += drag.delta;
      b += drag.delta;
      if (b < a) b = a;
    }
    return { a, b };
  };

  function down(item: T, mode: 'move' | 'end', e: ReactPointerEvent) {
    if (item.movable === false || e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    moved.current = false;
    setDrag({ id: item.id, mode, x: e.clientX, delta: 0 });
  }

  function move(e: ReactPointerEvent) {
    if (!drag) return;
    const dx = (e.clientX - drag.x) * (getComputedStyle(e.currentTarget as Element).direction === 'rtl' ? -1 : 1);
    const delta = Math.round(dx / dayWidth);
    if (delta !== drag.delta) {
      moved.current = true;
      setDrag({ ...drag, delta });
    }
  }

  function up(item: T) {
    if (drag && drag.id === item.id && drag.delta !== 0) {
      const { a, b } = span(item);
      onMove(item, fromDay(a), fromDay(b));
    }
    setDrag(null);
  }

  function key(item: T, e: KeyboardEvent) {
    if (item.movable === false) return;
    const rtl = getComputedStyle(e.currentTarget as Element).direction === 'rtl';
    const step = { ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    refocus.current = item.id;
    const s = toDay(item.start ?? item.end!), en = toDay(item.end ?? item.start!);
    if (e.shiftKey) {
      if (en + step >= s) onMove(item, fromDay(s), fromDay(en + step));
    } else {
      onMove(item, fromDay(s + step), fromDay(en + step));
    }
  }

  // Bar positions by record, for the dependency arrows.
  const ys = new Map<string, { y: number; a: number; b: number }>();
  rows.forEach((r, i) => {
    if (r.item && (r.item.start || r.item.end)) {
      const { a, b } = span(r.item);
      ys.set(r.item.id, { y: i * rowHeight + rowHeight / 2, a, b });
    }
  });
  const ticks: { day: number; label: string }[] = [];
  for (let n = 0; n < days; n++) {
    const label = tick(fromDay(origin + n));
    if (label) ticks.push({ day: n, label });
  }
  const todayAt = today ? toDay(today) - origin : -1;

  return (
    <Box ref={root} role="region" aria-label={ariaLabel} borderWidth="1px" borderColor="border" rounded="l3" overflow="auto" maxH="70vh" position="relative" bg="bg.panel">
      {instructions && <Text srOnly>{instructions}</Text>}
      <Box display="grid" gridTemplateColumns={`${labelWidth}px ${width}px`} minW="fit-content">
        {/* header */}
        <Box position="sticky" top="0" insetStart="0" zIndex="3" bg="bg.muted" borderBottomWidth="1px" borderInlineEndWidth="1px" borderColor="border" h="9" />
        <Box position="sticky" top="0" zIndex="2" bg="bg.muted" borderBottomWidth="1px" borderColor="border" h="9" aria-hidden>
          {ticks.map((t) => (
            <Text key={t.day} position="absolute" insetStart={`${t.day * dayWidth}px`} top="0" h="full" ps="1.5" textStyle="caption" color="fg.muted"
              borderInlineStartWidth="1px" borderColor="border" display="flex" alignItems="center" whiteSpace="nowrap">
              {t.label}
            </Text>
          ))}
        </Box>

        {/* labels */}
        <Box position="sticky" insetStart="0" zIndex="1" bg="bg.panel" borderInlineEndWidth="1px" borderColor="border">
          {rows.map((r) => (
            <HStack key={r.id} h={`${rowHeight}px`} px="3" gap="2" borderBottomWidth="1px" borderColor="border.muted" bg={r.heading ? 'bg.subtle' : undefined} minW="0">
              {r.heading ?? (r.item && renderLabel(r.item))}
            </HStack>
          ))}
        </Box>

        {/* bars */}
        <Box position="relative" h={`${rows.length * rowHeight}px`}>
          {ticks.map((t) => (
            <Box key={t.day} position="absolute" insetStart={`${t.day * dayWidth}px`} top="0" bottom="0" borderInlineStartWidth="1px" borderColor="border.muted" aria-hidden />
          ))}
          {todayAt >= 0 && todayAt < days && (
            <Box position="absolute" insetStart={`${todayAt * dayWidth + dayWidth / 2}px`} top="0" bottom="0" borderInlineStartWidth="2px" borderColor="accent.solid" opacity={0.5}
              aria-hidden />
          )}
          {rows.map((r, i) => (
            <Box key={r.id} position="absolute" insetStart="0" insetEnd="0" top={`${i * rowHeight}px`} h={`${rowHeight}px`} borderBottomWidth="1px"
              borderColor="border.muted" bg={r.heading ? 'bg.subtle' : undefined} aria-hidden={!r.item} />
          ))}
          {rows.map((r, i) => {
            const item = r.item;
            if (!item || (!item.start && !item.end)) return null;
            const { a, b } = span(item);
            if (b < origin || a > origin + days - 1) return null;
            const left = (Math.max(a, origin) - origin) * dayWidth;
            const right = (Math.min(b, origin + days - 1) - origin + 1) * dayWidth;
            const single = !item.start || !item.end;
            return (
              <Box key={item.id} role="button" tabIndex={0} aria-label={describe(item)} position="absolute" insetStart={`${left}px`} w={`${Math.max(right - left, 6)}px`}
                top={`${i * rowHeight + 6}px`} h={`${rowHeight - 12}px`} rounded="l2" bg={single ? 'transparent' : 'accent.solid'} color="accent.contrast"
                borderWidth={single ? '2px' : 0} borderStyle="dashed" borderColor="accent.solid" cursor={item.movable === false ? 'default' : 'grab'}
                display="flex" alignItems="center" px="1.5" overflow="hidden" whiteSpace="nowrap" textStyle="caption" userSelect="none" touchAction="none"
                opacity={drag?.id === item.id ? 0.85 : 1} _focusVisible={{ outline: '2px solid', outlineColor: 'colorPalette.focusRing', outlineOffset: '2px' }}
                onPointerDown={(e) => down(item, 'move', e)} onPointerMove={move} onPointerUp={() => up(item)} onPointerCancel={() => setDrag(null)}
                onKeyDown={(e) => key(item, e)} data-bar={item.id}>
                {!single && renderBar?.(item)}
                {item.movable !== false && !single && (
                  <Box position="absolute" insetEnd="0" top="0" bottom="0" w="2" cursor="ew-resize" onPointerDown={(e) => down(item, 'end', e)}
                    onPointerMove={move} onPointerUp={() => up(item)} aria-hidden />
                )}
              </Box>
            );
          })}
          {/* Arrows are drawn left to right; in right-to-left the layer is mirrored, like the bars. */}
          <Box position="absolute" insetInlineStart="0" top="0" w={`${width}px`} h={`${rows.length * rowHeight}px`} pointerEvents="none" zIndex="1" _rtl={{ transform: 'scaleX(-1)' }} aria-hidden>
          <svg width={width} height={rows.length * rowHeight} style={{ position: 'absolute', left: 0, top: 0 }}>
            <defs>
              <marker id="toda-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 8 4 L 0 8 z" fill="context-stroke" />
              </marker>
            </defs>
            {links.map((l) => {
              const f = ys.get(l.from), t = ys.get(l.to);
              if (!f || !t) return null;
              const x1 = (f.b - origin + 1) * dayWidth, x2 = (t.a - origin) * dayWidth;
              const late = t.a <= f.b;
              // Room to go straight: across, down, across. Otherwise around: down to the gap between rows, back, down.
              const gap = f.y + (t.y > f.y ? rowHeight / 2 : -rowHeight / 2);
              const d = x2 - x1 >= 16
                ? `M ${x1} ${f.y} H ${x1 + 8} V ${t.y} H ${x2}`
                : `M ${x1} ${f.y} H ${x1 + 8} V ${gap} H ${x2 - 8} V ${t.y} H ${x2}`;
              return (
                <path key={`${l.from}>${l.to}`} d={d} fill="none" strokeWidth={1.5} strokeDasharray={late ? '4 3' : undefined}
                  stroke={late ? 'var(--toda-colors-fg-error)' : 'var(--toda-colors-fg-muted)'} markerEnd="url(#toda-arrow)" />
              );
            })}
          </svg>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

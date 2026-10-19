import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';
import { useMotionSetting } from '../motion/setting';
import { useLoading } from '../skeleton/loading';
import { Bone, boneWidth, TextBone } from '../skeleton/bones';

/** A bar: its first and last day (yyyy-mm-dd); with only one of them, it's that one day. */
export interface TimelineItem {
  id: string;
  start?: string | null;
  end?: string | null;
  movable?: boolean;
  /** How the bar reads: its own dates (solid), dates it takes from elsewhere (dashed), or its children's span (a thin bar). */
  tone?: 'own' | 'inferred' | 'rollup';
  /** Done, 0 to 1: a strip along the bottom of the bar. */
  progress?: number | null;
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
  /** Fills the width it's given: when the window is narrower than the chart, the days go on past `to`. */
  fill?: boolean;
  rows: TimelineRow<T>[];
  /** Dependencies: <c>from</c> must end before <c>to</c> starts (drawn red when it doesn't). */
  links?: { from: string; to: string }[];
  today?: string;
  /** Scrolls this day to the middle of the timeline, each time a new object is given (a Today button). */
  reveal?: { day: string } | null;
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
  /** Its rows are coming (ADR 0061): `skeletonRows` rows of placeholders, each a row's height. The nearest `Loading` scope's when not given. */
  loading?: boolean;
  /** How many placeholder rows it draws while it loads (6). */
  skeletonRows?: number;
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
  fill = false,
  rows,
  links = [],
  today,
  reveal,
  renderLabel,
  renderBar,
  describe,
  tick,
  onMove,
  labelWidth = 260,
  rowHeight = 36,
  instructions,
  loading: own,
  skeletonRows = 6,
}: TimelineChartProps<T>) {
  const placeholders = useLoading(own) && rows.length === 0;
  const shown: TimelineRow<T>[] = placeholders ? Array.from({ length: skeletonRows }, (_, i) => ({ id: `skeleton-${i}` })) : rows;
  const root = useRef<HTMLDivElement>(null);
  // The room beside the labels, for `fill`: whole days past `to`, and the column stretches over what's left of a day.
  const [room, setRoom] = useState(0);
  useEffect(() => {
    const el = root.current;
    if (!fill || !el) return;
    const observer = new ResizeObserver(() => setRoom(Math.max(0, el.clientWidth - labelWidth)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [fill, labelWidth]);
  const origin = toDay(from);
  const days = Math.max(toDay(to) - origin + 1, fill ? Math.floor(room / dayWidth) : 0);
  const width = days * dayWidth;
  const [drag, setDrag] = useState<{ id: string; mode: 'move' | 'end'; x: number; delta: number } | null>(null);
  const moved = useRef(false);
  const { reduce } = useMotionSetting();
  useEffect(() => {
    const el = root.current;
    if (!reveal || !el) return;
    const at = toDay(reveal.day) - origin;
    if (at < 0 || at >= days) return;
    // The labels stay in place, so the middle is the middle of what's beside them. Right to left scrolls the other way.
    const x = Math.max(0, at * dayWidth + dayWidth / 2 - (el.clientWidth - labelWidth) / 2);
    el.scrollTo({ left: getComputedStyle(el).direction === 'rtl' ? -x : x, behavior: reduce ? 'auto' : 'smooth' });
    // Only a new request scrolls; a zoom or a resize leaves the chart where the person put it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal]);
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
      <Box display="grid" gridTemplateColumns={fill ? `${labelWidth}px minmax(${width}px, 1fr)` : `${labelWidth}px ${width}px`} minW="fit-content">
        {/* header */}
        <Box position="sticky" top="0" insetStart="0" zIndex="3" bg="bg.muted" borderBottomWidth="1px" borderInlineEndWidth="1px" borderColor="border" h="9" />
        {/* Clipped: a tick near the end mustn't widen the chart with its label. */}
        <Box position="sticky" top="0" zIndex="2" bg="bg.muted" borderBottomWidth="1px" borderColor="border" h="9" overflow="hidden" aria-hidden>
          {ticks.map((t) => (
            <Text key={t.day} position="absolute" insetStart={`${t.day * dayWidth}px`} top="0" h="full" ps="1.5" textStyle="caption" color="fg.muted"
              borderInlineStartWidth="1px" borderColor="border" display="flex" alignItems="center" whiteSpace="nowrap">
              {t.label}
            </Text>
          ))}
        </Box>

        {/* labels */}
        <Box position="sticky" insetStart="0" zIndex="1" bg="bg.panel" borderInlineEndWidth="1px" borderColor="border">
          {shown.map((r, i) => (
            <HStack key={r.id} h={`${rowHeight}px`} px="3" gap="2" borderBottomWidth="1px" borderColor="border.muted" bg={r.heading ? 'bg.subtle' : undefined} minW="0">
              {placeholders ? <TextBone width={boneWidth(i, 12, 26)} /> : (r.heading ?? (r.item && renderLabel(r.item)))}
            </HStack>
          ))}
        </Box>

        {/* bars */}
        <Box position="relative" h={`${shown.length * rowHeight}px`}>
          {ticks.map((t) => (
            <Box key={t.day} position="absolute" insetStart={`${t.day * dayWidth}px`} top="0" bottom="0" borderInlineStartWidth="1px" borderColor="border.muted" aria-hidden />
          ))}
          {todayAt >= 0 && todayAt < days && (
            <Box position="absolute" insetStart={`${todayAt * dayWidth + dayWidth / 2}px`} top="0" bottom="0" borderInlineStartWidth="2px" borderColor="accent.solid" opacity={0.5}
              aria-hidden />
          )}
          {shown.map((r, i) => (
            <Box key={r.id} position="absolute" insetStart="0" insetEnd="0" top={`${i * rowHeight}px`} h={`${rowHeight}px`} borderBottomWidth="1px"
              borderColor="border.muted" bg={r.heading ? 'bg.subtle' : undefined} aria-hidden={!r.item} />
          ))}
          {placeholders &&
            shown.map((r, i) => (
              <Bone key={`bar-${r.id}`} position="absolute" insetStart={`${Math.round(width * (((i * 13) % 40) / 100))}px`} w={`${Math.round(width * (0.15 + ((i * 7) % 25) / 100))}px`}
                top={`${i * rowHeight + 6}px`} height={`${rowHeight - 12}px`} borderRadius="l2" />
            ))}
          {rows.map((r, i) => {
            const item = r.item;
            if (!item || (!item.start && !item.end)) return null;
            const { a, b } = span(item);
            if (b < origin || a > origin + days - 1) return null;
            const left = (Math.max(a, origin) - origin) * dayWidth;
            const right = (Math.min(b, origin + days - 1) - origin + 1) * dayWidth;
            const single = !item.start || !item.end;
            const tone = item.tone ?? 'own';
            const hollow = single || tone === 'inferred';
            const thin = tone === 'rollup' && !single;
            return (
              <Box key={item.id} role="button" tabIndex={0} aria-label={describe(item)} position="absolute" insetStart={`${left}px`} w={`${Math.max(right - left, 6)}px`}
                top={thin ? `${i * rowHeight + rowHeight / 2 - 5}px` : `${i * rowHeight + 6}px`} h={thin ? '10px' : `${rowHeight - 12}px`} rounded={thin ? 'l1' : 'l2'}
                bg={thin ? 'fg.muted' : hollow ? (tone === 'inferred' && !single ? 'accent.subtle' : 'transparent') : 'accent.solid'}
                color={hollow ? 'accent.fg' : 'accent.contrast'}
                borderWidth={hollow ? '2px' : 0} borderStyle="dashed" borderColor="accent.solid" cursor={item.movable === false ? 'default' : 'grab'}
                display="flex" alignItems="center" px="1.5" overflow="hidden" whiteSpace="nowrap" textStyle="caption" userSelect="none" touchAction="none"
                opacity={drag?.id === item.id ? 0.85 : 1} _focusVisible={{ outline: '2px solid', outlineColor: 'colorPalette.focusRing', outlineOffset: '2px' }}
                onPointerDown={(e) => down(item, 'move', e)} onPointerMove={move} onPointerUp={() => up(item)} onPointerCancel={() => setDrag(null)}
                onKeyDown={(e) => key(item, e)} data-bar={item.id}>
                {!single && !thin && renderBar?.(item)}
                {item.progress != null && !single && (
                  <Box position="absolute" insetStart="0" bottom="0" h={thin ? 'full' : '3px'} w={`${Math.round(Math.min(1, Math.max(0, item.progress)) * 100)}%`}
                    bg="statusCategory.done.solid" roundedBottom="l2" pointerEvents="none" aria-hidden />
                )}
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

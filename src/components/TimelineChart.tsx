import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Box, HStack, Popover, Portal, Stack, Text } from '@chakra-ui/react';
import { Flag, Trash2 } from 'lucide-react';
import { useMotionSetting } from '../motion/setting';
import { useLoading } from '../skeleton/loading';
import { Bone, boneWidth, TextBone } from '../skeleton/bones';
import { Button } from './Button';
import { Tooltip } from './Tooltip';

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
  /** Whether a dependency can be drawn from this bar (with `onLink`): the person may change the record. */
  linkable?: boolean;
  /** Its colour: a colour palette's name (`blue`, `inProgress`, …); the accent when not given. */
  palette?: string;
  /** Picked out (ringed, as on a critical path) or set back (faded) while something else is picked out. */
  emphasis?: 'strong' | 'faint';
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
  /** Dependencies: <c>from</c> must end before <c>to</c> starts (drawn red when it doesn't). `strong` ones are picked out and the rest fade. */
  links?: { from: string; to: string; strong?: boolean }[];
  today?: string;
  /** Periods shown as labelled bands in a strip under the header (sprints); the `current` one is also shaded down the chart. */
  bands?: { id: string; start: string; end: string; label: string; detail?: ReactNode; current?: boolean }[];
  /** Days marked with a flag in a strip under the header and a line down the chart (releases' due dates). */
  markers?: { id: string; day: string; label: string; detail?: ReactNode; palette?: string }[];
  /** Days off (a calendar's weekend and holidays), shaded at the finer zooms (12px a day or more); a holiday is named. */
  offDays?: (day: string) => { kind: 'weekend' } | { kind: 'holiday'; label: string } | null;
  /** Scrolls this day to the middle of the timeline, each time a new object is given (a Today button). */
  reveal?: { day: string } | null;
  /** The label column for a record row. */
  renderLabel: (item: T) => ReactNode;
  /** Text inside a bar. */
  renderBar?: (item: T) => ReactNode;
  /** A card about a bar, shown while the pointer rests on it or it has keyboard focus (hidden while dragging). */
  renderCard?: (item: T) => ReactNode;
  /** What a bar says to screen readers: "PAY-3 Checkout, 1 to 14 June". */
  describe: (item: T) => string;
  /** Header ticks: the label for a day that starts a period (a month, or a week at finer zoom). */
  tick: (day: string) => string | null;
  /** A second header row under the ticks: a label centred on each day that has one (its number, at the finest zoom). */
  subTick?: (day: string) => string | null;
  /** A move: dragging the bar moves both ends, its right edge moves the end. Arrow keys move a focused bar a day; Shift+arrows its end. */
  onMove: (item: T, start: string, end: string) => void;
  /** A new dependency, drawn by dragging the dot at a bar's end onto another bar: `to` depends on `from`. */
  onLink?: (from: T, to: T) => void;
  /** Removing a dependency, from the menu its arrow opens. */
  onUnlink?: (link: { from: string; to: string }) => void;
  /** The words for drawing and removing dependencies: the dot's name, an arrow's ("PAY-2 depends on PAY-1"), the remove button. */
  linkTexts?: { handle: string; arrow: (from: string, to: string) => string; remove: string };
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
  bands = [],
  markers = [],
  offDays,
  reveal,
  renderLabel,
  renderBar,
  renderCard,
  describe,
  tick,
  subTick,
  onMove,
  onLink,
  onUnlink,
  linkTexts,
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
  // Drawing a dependency: where the line starts and where the pointer is, in the bars layer's own pixels (left to right
  // on screen, whatever the direction), and the bar it would land on.
  const layer = useRef<HTMLDivElement>(null);
  const [linking, setLinking] = useState<{ from: T; x0: number; y0: number; x: number; y: number; target: string | null } | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ from: string; to: string; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!linking) return;
    const cancel = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setLinking(null);
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, [linking]);
  // The card about a bar: one for the chart, placed by the bar it's about (where the pointer met it, or its start).
  const [card, setCard] = useState<{ id: string; x: number; top: number; bottom: number } | null>(null);
  const cardTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cardOff = () => {
    clearTimeout(cardTimer.current);
    setCard(null);
  };
  useEffect(() => () => clearTimeout(cardTimer.current), []);
  useEffect(() => {
    if (!card) return;
    // It's placed on the screen, so any scroll (the page's or the chart's) takes it away.
    window.addEventListener('scroll', cardOff, true);
    return () => window.removeEventListener('scroll', cardOff, true);
  }, [card]);
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

  function cardSoon(item: T, e: ReactPointerEvent) {
    if (!renderCard || drag || linking) return;
    clearTimeout(cardTimer.current);
    const r = (e.currentTarget as Element).getBoundingClientRect(), x = e.clientX;
    cardTimer.current = setTimeout(() => setCard({ id: item.id, x, top: r.top, bottom: r.bottom }), 450);
  }

  function cardNow(item: T, el: Element) {
    if (!renderCard || !el.matches(':focus-visible')) return;
    const r = el.getBoundingClientRect();
    setCard({ id: item.id, x: r.left + Math.min(r.width / 2, 24), top: r.top, bottom: r.bottom });
  }

  function key(item: T, e: KeyboardEvent) {
    if (e.key === 'Escape') cardOff();
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

  const items = new Map(rows.flatMap((r) => (r.item ? [[r.item.id, r.item] as const] : [])));
  const barAt = (x: number, y: number) =>
    document.elementsFromPoint(x, y).map((el) => el.closest<HTMLElement>('[data-bar]')?.dataset.bar).find((id): id is string => !!id) ?? null;

  function linkDown(item: T, e: ReactPointerEvent) {
    if (e.button !== 0 || !layer.current) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const box = layer.current.getBoundingClientRect(), dot = (e.currentTarget as Element).getBoundingClientRect();
    const x0 = dot.left + dot.width / 2 - box.left, y0 = dot.top + dot.height / 2 - box.top;
    setLinking({ from: item, x0, y0, x: x0, y: y0, target: null });
  }

  function linkMove(e: ReactPointerEvent) {
    if (!linking || !layer.current || !root.current) return;
    // Near an edge of the chart, it scrolls on, so a bar out of view can be reached.
    const view = root.current.getBoundingClientRect(), edge = 40, step = 16;
    const dx = e.clientX < view.left + edge ? -step : e.clientX > view.right - edge ? step : 0;
    const dy = e.clientY < view.top + edge ? -step : e.clientY > view.bottom - edge ? step : 0;
    if (dx || dy) root.current.scrollBy({ left: dx, top: dy });
    const box = layer.current.getBoundingClientRect();
    const target = barAt(e.clientX, e.clientY);
    setLinking({ ...linking, x: e.clientX - box.left, y: e.clientY - box.top, target: target && target !== linking.from.id ? target : null });
  }

  function linkUp(e: ReactPointerEvent) {
    if (!linking) return;
    const target = barAt(e.clientX, e.clientY);
    const to = target && target !== linking.from.id ? items.get(target) : undefined;
    setLinking(null);
    if (to) onLink?.(linking.from, to);
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
  const subTicks: { day: number; label: string }[] = [];
  for (let n = 0; n < days; n++) {
    const label = tick(fromDay(origin + n));
    if (label) ticks.push({ day: n, label });
    const sub = subTick?.(fromDay(origin + n));
    if (sub) subTicks.push({ day: n, label: sub });
  }
  const tickHeight = subTick ? 52 : 36;
  const STRIP = 24;
  // Bands and markers inside the window (a band cut to it), as day offsets from its first day.
  const shownBands = bands.flatMap((b) => {
    const a = Math.max(toDay(b.start) - origin, 0), z = Math.min(toDay(b.end) - origin, days - 1);
    return z >= a ? [{ ...b, a, z }] : [];
  });
  const shownMarkers = markers.flatMap((m) => {
    const at = toDay(m.day) - origin;
    return at >= 0 && at < days ? [{ ...m, at }] : [];
  });
  // Days off as runs (a weekend is one shape, not two), only where a day is wide enough to read.
  const offRuns: { a: number; z: number; kind: 'weekend' | 'holiday'; label?: string }[] = [];
  if (offDays && dayWidth >= 12) {
    for (let n = 0; n < days; n++) {
      const off = offDays(fromDay(origin + n));
      if (!off) continue;
      const label = off.kind === 'holiday' ? off.label : undefined;
      const last = offRuns[offRuns.length - 1];
      if (last && last.z === n - 1 && last.kind === off.kind && last.label === label) last.z = n;
      else offRuns.push({ a: n, z: n, kind: off.kind, label });
    }
  }
  const bandsTop = tickHeight, markersTop = tickHeight + (shownBands.length ? STRIP : 0);
  const headerHeight = markersTop + (shownMarkers.length ? STRIP : 0);
  const todayAt = today ? toDay(today) - origin : -1;

  return (
    <Box ref={root} role="region" aria-label={ariaLabel} borderWidth="1px" borderColor="border" rounded="l3" overflow="auto" maxH="70vh" position="relative" bg="bg.panel">
      {instructions && <Text srOnly>{instructions}</Text>}
      <Box display="grid" gridTemplateColumns={fill ? `${labelWidth}px minmax(${width}px, 1fr)` : `${labelWidth}px ${width}px`} minW="fit-content">
        {/* header */}
        <Box position="sticky" top="0" insetStart="0" zIndex="3" bg="bg.muted" borderBottomWidth="1px" borderInlineEndWidth="1px" borderColor="border" h={`${headerHeight}px`} />
        {/* Clipped, so a tick near the end can't widen the chart with its label; clip rather than hidden, which would
            make the header its own scroll container and stop the labels below sticking. */}
        <Box position="sticky" top="0" zIndex="2" bg="bg.muted" borderBottomWidth="1px" borderColor="border" h={`${headerHeight}px`} overflow="clip">
          {/* Each tick's label stays beside the labels column while its period is in view, so a scrolled chart still
              says which month it shows. */}
          {ticks.map((t, i) => (
            <Box key={t.day} position="absolute" insetStart={`${t.day * dayWidth}px`} w={`${((ticks[i + 1]?.day ?? days) - t.day) * dayWidth}px`} top="0"
              h={`${tickHeight}px`} borderInlineStartWidth="1px" borderColor="border" aria-hidden>
              <Text position="sticky" insetStart={`${labelWidth}px`} display="inline-flex" h={subTick ? undefined : 'full'} ps="1.5" pt={subTick ? '1' : undefined}
                textStyle="caption" color="fg.muted" alignItems="center" whiteSpace="nowrap">
                {t.label}
              </Text>
            </Box>
          ))}
          {subTicks.map((t) => (
            <Text key={t.day} position="absolute" insetStart={`${t.day * dayWidth}px`} w={`${dayWidth}px`} top={`${tickHeight - 20}px`} textStyle="caption"
              color="fg.subtle" textAlign="center" whiteSpace="nowrap" fontVariantNumeric="tabular-nums" aria-hidden>
              {t.label}
            </Text>
          ))}
          {/* Holidays: a mark along the foot of the ticks, named on hover or focus. */}
          {offRuns.filter((o) => o.kind === 'holiday').map((o) => (
            <Tooltip key={`h${o.a}`} content={o.label}>
              <Box position="absolute" insetStart={`${o.a * dayWidth}px`} w={`${(o.z - o.a + 1) * dayWidth}px`} top={`${tickHeight - 4}px`} h="4px" colorPalette="warning"
                bg="colorPalette.solid" tabIndex={0} focusVisibleRing="outside" aria-label={o.label} />
            </Tooltip>
          ))}
          {/* Sprints: a band each, its name kept in view like the ticks', what it is on hover or focus. */}
          {shownBands.map((b) => (
            <Tooltip key={b.id} content={b.detail ?? b.label}>
              <Box position="absolute" insetStart={`${b.a * dayWidth + 1}px`} w={`${(b.z - b.a + 1) * dayWidth - 2}px`} top={`${bandsTop + 3}px`} h={`${STRIP - 6}px`}
                rounded="l1" borderWidth="1px" colorPalette={b.current ? 'accent' : 'neutral'} bg={b.current ? 'colorPalette.subtle' : 'bg.subtle'}
                borderColor={b.current ? 'colorPalette.border' : 'border'} tabIndex={0} focusVisibleRing="inside" overflow="clip" aria-label={b.label}>
                <Text position="sticky" insetStart={`${labelWidth}px`} display="inline-block" maxW="full" px="1.5" textStyle="caption" lineHeight={`${STRIP - 8}px`}
                  color={b.current ? 'colorPalette.fg' : 'fg.muted'} fontWeight={b.current ? 'medium' : undefined} truncate>
                  <bdi>{b.label}</bdi>
                </Text>
              </Box>
            </Tooltip>
          ))}
          {/* Releases: a flag at the day, pointing down the line drawn through the chart. */}
          {shownMarkers.map((m) => (
            <Tooltip key={m.id} content={m.detail ?? m.label}>
              <Box position="absolute" insetStart={`${m.at * dayWidth + dayWidth / 2 - 1}px`} top={`${markersTop + 3}px`} h={`${STRIP - 6}px`} display="flex" alignItems="center"
                gap="1" ps="1.5" pe="1.5" roundedEnd="l1" colorPalette={m.palette ?? 'accent'} bg="colorPalette.solid" color="colorPalette.contrast" textStyle="caption"
                fontWeight="medium" whiteSpace="nowrap" borderInlineStartWidth="2px" borderColor="colorPalette.solid" tabIndex={0} focusVisibleRing="outside" aria-label={m.label}>
                <Flag size={11} aria-hidden />
                {/* Titles are people's own text, in their own direction ("1.0 Web beta" stays so in Arabic). */}
                <bdi>{m.label}</bdi>
              </Box>
            </Tooltip>
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
        <Box ref={layer} position="relative" h={`${shown.length * rowHeight}px`}>
          {offRuns.map((o) => (
            <Box key={`o${o.a}`} position="absolute" insetStart={`${o.a * dayWidth}px`} w={`${(o.z - o.a + 1) * dayWidth}px`} top="0" bottom="0" pointerEvents="none"
              bg={o.kind === 'holiday' ? 'warning.subtle' : 'bg.muted'} opacity={o.kind === 'holiday' ? 0.7 : 0.8} aria-hidden />
          ))}
          {ticks.map((t) => (
            <Box key={t.day} position="absolute" insetStart={`${t.day * dayWidth}px`} top="0" bottom="0" borderInlineStartWidth="1px" borderColor="border.muted" aria-hidden />
          ))}
          {/* The current sprint, shaded down the chart; the release days, as dashed lines. */}
          {shownBands.filter((b) => b.current).map((b) => (
            <Box key={b.id} position="absolute" insetStart={`${b.a * dayWidth}px`} w={`${(b.z - b.a + 1) * dayWidth}px`} top="0" bottom="0" bg="accent.subtle" opacity={0.45}
              pointerEvents="none" aria-hidden />
          ))}
          {shownMarkers.map((m) => (
            <Box key={m.id} position="absolute" insetStart={`${m.at * dayWidth + dayWidth / 2 - 1}px`} top="0" bottom="0" borderInlineStartWidth="2px" borderStyle="dashed"
              colorPalette={m.palette ?? 'accent'} borderColor="colorPalette.solid" opacity={0.7} pointerEvents="none" aria-hidden />
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
            const canLink = !!onLink && item.linkable !== false && !drag;
            return (
              <Fragment key={item.id}>
              <Box role="button" tabIndex={0} aria-label={describe(item)} position="absolute" insetStart={`${left}px`} w={`${Math.max(right - left, 6)}px`}
                top={thin ? `${i * rowHeight + rowHeight / 2 - 5}px` : `${i * rowHeight + 6}px`} h={thin ? '10px' : `${rowHeight - 12}px`} rounded={thin ? 'l1' : 'l2'}
                colorPalette={item.palette ?? 'accent'}
                bg={thin ? (item.palette ? 'colorPalette.solid' : 'fg.muted') : hollow ? (tone === 'inferred' && !single ? 'colorPalette.subtle' : 'transparent') : 'colorPalette.solid'}
                color={hollow ? 'colorPalette.fg' : 'colorPalette.contrast'}
                borderWidth={hollow ? '2px' : 0} borderStyle="dashed" borderColor="colorPalette.solid" cursor={item.movable === false ? 'default' : 'grab'}
                display="flex" alignItems="center" px="1.5" overflow="hidden" whiteSpace="nowrap" textStyle="caption" userSelect="none" touchAction="none"
                opacity={drag?.id === item.id ? 0.85 : item.emphasis === 'faint' ? 0.3 : 1}
                boxShadow={item.emphasis === 'strong' ? '0 0 0 2px var(--toda-colors-danger-solid)' : undefined} _focusVisible={{ outline: '2px solid', outlineColor: 'colorPalette.focusRing', outlineOffset: '2px' }}
                outline={linking?.target === item.id ? '2px solid' : undefined} outlineColor="accent.solid" outlineOffset="2px"
                onPointerDown={(e) => { cardOff(); down(item, 'move', e); }} onPointerMove={move} onPointerUp={() => up(item)} onPointerCancel={() => setDrag(null)}
                onPointerEnter={(e) => { setHot(item.id); cardSoon(item, e); }} onPointerLeave={() => { setHot((h) => (h === item.id ? null : h)); cardOff(); }}
                onFocus={(e) => cardNow(item, e.currentTarget)} onBlur={cardOff} aria-describedby={card?.id === item.id ? 'toda-timeline-card' : undefined}
                onKeyDown={(e) => key(item, e)} data-bar={item.id}>
                {!single && !thin && renderBar?.(item)}
                {item.progress != null && !single && (
                  <Box position="absolute" insetStart="0" bottom="0" h={thin ? 'full' : '3px'} w={`${Math.round(Math.min(1, Math.max(0, item.progress)) * 100)}%`}
                    bg="statusCategory.done.solid" roundedBottom="l2" pointerEvents="none" aria-hidden />
                )}
                {item.movable !== false && !single && (
                  // The edge sits inside the bar: its moves and release stop here, or the bar would handle them too and the
                  // change would be saved twice (the second refused as a conflict).
                  <Box position="absolute" insetEnd="0" top="0" bottom="0" w="2" cursor="ew-resize" onPointerDown={(e) => down(item, 'end', e)}
                    onPointerMove={(e) => { e.stopPropagation(); move(e); }} onPointerUp={(e) => { e.stopPropagation(); up(item); }} aria-hidden />
                )}
              </Box>
              {/* The dot to draw a dependency from, just past the bar's end, while the pointer is on the bar or the dot. */}
              {canLink && (hot === item.id || linking?.from.id === item.id) && (
                <Box position="absolute" insetStart={`${Math.max(right, left + 6)}px`} top={`${i * rowHeight}px`} w="4" h={`${rowHeight}px`} zIndex="2"
                  display="flex" alignItems="center" justifyContent="center" cursor="crosshair" touchAction="none" title={linkTexts?.handle}
                  onPointerEnter={() => setHot(item.id)} onPointerLeave={() => setHot((h) => (h === item.id ? null : h))}
                  onPointerDown={(e) => linkDown(item, e)} onPointerMove={linkMove} onPointerUp={linkUp} onPointerCancel={() => setLinking(null)} aria-hidden>
                  <Box w="2.5" h="2.5" rounded="full" bg="bg.panel" borderWidth="2px" borderColor="accent.solid" />
                </Box>
              )}
              </Fragment>
            );
          })}
          {/* Arrows are drawn left to right; in right-to-left the layer is mirrored, like the bars. */}
          <Box position="absolute" insetInlineStart="0" top="0" w={`${width}px`} h={`${rows.length * rowHeight}px`} pointerEvents="none" zIndex="1" _rtl={{ transform: 'scaleX(-1)' }}
            aria-hidden={!onUnlink}>
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
              const picked = menu?.from === l.from && menu.to === l.to;
              const faint = !l.strong && links.some((x) => x.strong);
              const open = (x: number, y: number) => setMenu({ from: l.from, to: l.to, x, y });
              return (
                <g key={`${l.from}>${l.to}`}>
                  <path d={d} fill="none" strokeWidth={picked || l.strong ? 2.5 : 1.5} strokeDasharray={late ? '4 3' : undefined} opacity={faint ? 0.25 : 1}
                    stroke={late || l.strong ? 'var(--toda-colors-fg-error)' : picked ? 'var(--toda-colors-accent-solid)' : 'var(--toda-colors-fg-muted)'}
                    markerEnd="url(#toda-arrow)" />
                  {/* A wider, invisible line over the arrow, easier to click; Enter opens the same menu from the keyboard. */}
                  {onUnlink && (
                    <path d={d} fill="none" stroke="transparent" strokeWidth={10} style={{ pointerEvents: 'stroke', cursor: 'pointer' }} tabIndex={0} role="button"
                      aria-label={linkTexts?.arrow(l.from, l.to)} onClick={(e) => open(e.clientX, e.clientY)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        e.preventDefault();
                        const r = (e.currentTarget as SVGPathElement).getBoundingClientRect();
                        open(r.left + r.width / 2, r.top + r.height / 2);
                      }} />
                  )}
                </g>
              );
            })}
          </svg>
          </Box>
          {/* The dependency being drawn: from the dot to the pointer, on screen as it is (not mirrored). */}
          {linking && (
            <svg width="100%" height={shown.length * rowHeight} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 3 }} aria-hidden>
              <line x1={linking.x0} y1={linking.y0} x2={linking.x} y2={linking.y} stroke="var(--toda-colors-accent-solid)" strokeWidth={2} strokeDasharray="5 4" />
              <circle cx={linking.x} cy={linking.y} r={4} fill="var(--toda-colors-accent-solid)" />
            </svg>
          )}
        </Box>
      </Box>
      {card && renderCard && items.has(card.id) && (
        <Portal>
          {/* Above the bar, or below it near the top of the screen; kept inside the window. */}
          <Box id="toda-timeline-card" role="tooltip" position="fixed" zIndex="popover" pointerEvents="none" w="80" maxW="calc(100vw - 16px)" bg="bg.panel"
            borderWidth="1px" borderColor="border" rounded="l3" shadow="lg" p="3"
            style={{
              left: Math.max(8, Math.min(card.x - 24, window.innerWidth - 328)),
              top: card.top > 280 ? card.top - 8 : card.bottom + 8,
              transform: card.top > 280 ? 'translateY(-100%)' : undefined,
            }}>
            {renderCard(items.get(card.id)!)}
          </Box>
        </Portal>
      )}
      {onUnlink && (
        <Popover.Root open={!!menu} onOpenChange={(e) => !e.open && setMenu(null)} lazyMount unmountOnExit autoFocus
          positioning={{ placement: 'bottom', getAnchorRect: () => (menu ? { x: menu.x, y: menu.y, width: 1, height: 1 } : null) }}>
          <Portal>
            <Popover.Positioner>
              <Popover.Content w="auto" maxW="calc(100vw - 32px)">
                <Popover.Body>
                  {menu && (
                    <Stack gap="2">
                      <Text textStyle="label">{linkTexts?.arrow(menu.from, menu.to)}</Text>
                      <Button size="sm" variant="secondary" onClick={() => { onUnlink(menu); setMenu(null); }}>
                        <Trash2 />
                        {linkTexts?.remove}
                      </Button>
                    </Stack>
                  )}
                </Popover.Body>
              </Popover.Content>
            </Popover.Positioner>
          </Portal>
        </Popover.Root>
      )}
    </Box>
  );
}

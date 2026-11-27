'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Box, chakra, HStack, Text } from '@chakra-ui/react';
import { ArrowDown, ArrowUp, GripVertical, Maximize2, Minimize2 } from 'lucide-react';
import { useAbpLocale } from '../provider/locale';
import { useLoading } from '../skeleton/loading';
import { shineCss } from '../skeleton/bones';
import { IconButton } from './Button';
import { RowMenu, type RowMenuEntry } from './RowMenu';
import { Tooltip } from './Tooltip';
import {
  boardHeight, dropTarget, fit, GAP, keyMove, NARROW, pack, PRESETS, renumber, resize as resized, spanPx, trackWidth, tracksFor, TRACKS, type BoardItem, type Placed,
} from './widget-board/layout';

export { fromTwelve, appendAt, renumber, TRACKS, PRESETS, type BoardItem } from './widget-board/layout';

export interface WidgetBoardLabels {
  /** The grip's name: "Move Open bugs". */
  move: (title: string) => string;
  /** The resize handle's name: "Width of Open bugs". */
  resize: (title: string) => string;
  /** The ⋯ menu's name: "Actions for Open bugs". */
  actions: (title: string) => string;
  expand: string;
  restore: string;
  half: string;
  twoThirds: string;
  full: string;
  moveUp: string;
  moveDown: string;
  /** How to use the grip and the handle from the keyboard, read with them. */
  instructions: string;
  /** Said after a move: "Open bugs moved: 2 of 5, column 1". */
  moved: (title: string, place: number, count: number, column: number) => string;
  /** Said after a width change: "Open bugs: 40 of 60 tracks". */
  resized: (title: string, tracks: number) => string;
}

export interface WidgetBoardProps<T extends BoardItem> {
  /**
   * The widgets: `x` the start column and `w` the width, in 60 tracks counted from the start edge (right to left
   * mirrors itself); `y` only their place in the order (0, 1, 2…), never a height: each widget is as tall as its
   * content, and the board packs them in (y, x) order as high as they fit.
   */
  items: T[];
  /** Whether the layout may change: the grip, the resize handle, the width presets and Move up / down. Expand is for everyone. */
  editable?: boolean;
  /**
   * The layout after a finished gesture: a drop, the end of a resize, one keyboard move or a menu choice; never on each
   * pointer move, so a host can save it as it comes. `y` comes renumbered 0, 1, 2… with no gaps.
   */
  onLayoutChange?: (items: T[]) => void;
  /** A widget's title, at the start of its header. */
  title: (item: T) => string;
  /** A widget's body. `expanded` while it's stretched across the board. */
  renderItem: (item: T, state: { expanded: boolean }) => ReactNode;
  /** The host's own ⋯ items (Edit settings, Duplicate, Remove); the board adds the width presets and moves when editable. */
  menu?: (item: T) => RowMenuEntry[];
  /** The narrowest a widget may be made, in px (its readable minimum); 200 when not given. */
  minWidth?: (item: T) => number;
  labels: WidgetBoardLabels;
  'aria-label': string;
  /** Its widgets are coming (ADR 0061): placeholder tiles. The nearest `Loading` scope's when not given. */
  loading?: boolean;
}

type Gesture =
  | { mode: 'move'; id: string; pointerX: number; pointerY: number; startLeft: number; startTop: number; dx: number; dy: number }
  | { mode: 'resize'; id: string; pointerX: number; origin: BoardItem };

const strip = <T extends BoardItem>(i: T): BoardItem => ({ id: i.id, x: i.x, y: i.y, w: i.w });

/**
 * A dashboard's widgets on 60 tracks (the design canvas's shared widget container and its rules). Every widget sits in
 * one container: its title at the start, then a move grip, Expand / Restore width and the ⋯ menu (grip and Expand show
 * on hover, focus, touch or while moving; their space is kept). Expand stretches it across the board in place, for as
 * long as the page is open. A handle on the end edge sets its width, with the pointer or the arrow keys, Home and End.
 * Dragging from the grip shows the widget following the pointer and a dashed slot where it will land, snapped to its
 * neighbours' edges; Escape cancels. With the grip focused, Left and Right move it 5 tracks (Shift: 1), Up and Down past
 * the neighbour above or below, Home to the top, End to the end; each move is announced. Below 720 px every widget is
 * full width, in order, without handles, and the saved layout is left alone.
 */
export function WidgetBoard<T extends BoardItem>({
  items, editable = false, onLayoutChange, title, renderItem, menu, minWidth, labels, 'aria-label': ariaLabel, loading: own,
}: WidgetBoardProps<T>) {
  const { isRtl } = useAbpLocale();
  const waiting = useLoading(own) && items.length === 0;
  const board = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [heights, setHeights] = useState<Map<string, number>>(new Map());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [draft, setDraftState] = useState<BoardItem[] | null>(null);
  const [gesture, setGestureState] = useState<Gesture | null>(null);
  // The gesture and the draft as they are now: pointer events can come before React has drawn the last change.
  const live = useRef<{ gesture: Gesture | null; draft: BoardItem[] | null }>({ gesture: null, draft: null });
  const setGesture = (g: Gesture | null) => {
    live.current.gesture = g;
    setGestureState(g);
  };
  const setDraft = (d: BoardItem[] | null) => {
    live.current.draft = d;
    setDraftState(d);
  };
  const [said, setSaid] = useState('');
  const observer = useRef<ResizeObserver | null>(null);
  const bodies = useRef(new Map<string, HTMLElement>());
  const help = `${ariaLabel.replace(/\W+/g, '-')}-board-help`;

  const narrow = width > 0 && width < NARROW;
  const layout = useMemo(() => (draft ?? items.map(strip)).map(fit), [draft, items]);
  const placed = useMemo(() => pack(layout, heights, { narrow, expanded }), [layout, heights, narrow, expanded]);
  const byId = new Map(items.map((i) => [i.id, i]));
  const at = new Map(placed.map((p) => [p.id, p]));
  const can = editable && !narrow;

  // The board's width, and each widget's content height, as they change.
  useLayoutEffect(() => {
    const el = board.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    observer.current = new ResizeObserver((entries) => {
      setHeights((old) => {
        let next: Map<string, number> | null = null;
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.widget!;
          const h = Math.ceil((entry.target as HTMLElement).offsetHeight);
          if (old.get(id) !== h) (next ??= new Map(old)).set(id, h);
        }
        return next ?? old;
      });
    });
    for (const el of bodies.current.values()) observer.current.observe(el);
    return () => observer.current?.disconnect();
  }, []);
  // One ref callback per widget, kept, so a render doesn't unhook and rehook every widget's observer.
  const refs = useRef(new Map<string, (el: HTMLElement | null) => void>());
  const measure = (id: string) => {
    let ref = refs.current.get(id);
    if (!ref) {
      ref = (el: HTMLElement | null) => {
        const old = bodies.current.get(id);
        if (old === el) return;
        if (old) observer.current?.unobserve(old);
        if (el) {
          bodies.current.set(id, el);
          observer.current?.observe(el);
        } else bodies.current.delete(id);
      };
      refs.current.set(id, ref);
    }
    return ref;
  };

  function commit(next: BoardItem[], announce?: string) {
    const numbered = renumber(next.map(fit));
    const merged = items.map((i) => ({ ...i, ...numbered.find((n) => n.id === i.id)! }));
    setDraft(null);
    onLayoutChange?.(merged);
    if (announce) setSaid(announce);
  }

  function announceMove(id: string, next: BoardItem[]) {
    const numbered = renumber(next.map(fit));
    const me = numbered.find((i) => i.id === id)!;
    return labels.moved(title(byId.get(id)!), me.y + 1, numbered.length, me.x + 1);
  }

  const minTracks = (item: T) => (width ? tracksFor(minWidth?.(item) ?? 200, width) : 1);

  // ---- Moving -------------------------------------------------------------------------------------------------------

  function grab(e: ReactPointerEvent<HTMLElement>, item: T) {
    if (!can || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = at.get(item.id)!;
    const start = p.x * trackWidth(width);
    setGesture({ mode: 'move', id: item.id, pointerX: e.clientX, pointerY: e.clientY, startLeft: start, startTop: p.top, dx: 0, dy: 0 });
  }

  function resizeStart(e: ReactPointerEvent<HTMLElement>, item: T) {
    if (!can || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    setGesture({ mode: 'resize', id: item.id, pointerX: e.clientX, origin: layout.find((l) => l.id === item.id)! });
  }

  function pointerMove(e: ReactPointerEvent<HTMLElement>) {
    const g = live.current.gesture;
    if (!g) return;
    const layout = (live.current.draft ?? items.map(strip)).map(fit);
    const dx = (e.clientX - g.pointerX) * (isRtl ? -1 : 1);
    if (g.mode === 'resize') {
      const item = byId.get(g.id)!;
      const w = g.origin.w + Math.round(dx / trackWidth(width));
      setDraft(layout.map((l) => (l.id === g.id ? resized(g.origin, w, minTracks(item)) : l)));
      return;
    }
    const dy = e.clientY - g.pointerY;
    setGesture({ ...g, dx, dy });
    const me = layout.find((l) => l.id === g.id)!;
    const target = dropTarget(g.id, { start: g.startLeft + dx, top: g.startTop + dy }, me.w, pack(layout.filter((l) => l.id !== g.id), heights, { expanded }), layout, width);
    setDraft(layout.map((l) => (l.id === g.id ? { ...l, ...target } : l)));
    // Near the edge of what scrolls, it scrolls.
    const edge = 48;
    if (e.clientY < edge) window.scrollBy(0, -12);
    else if (e.clientY > window.innerHeight - edge) window.scrollBy(0, 12);
  }

  function pointerUp() {
    const g = live.current.gesture;
    const draft = live.current.draft;
    setGesture(null);
    if (!g || !draft) return setDraft(null);
    const item = byId.get(g.id)!;
    if (g.mode === 'resize') commit(draft, labels.resized(title(item), draft.find((d) => d.id === g.id)!.w));
    else commit(draft, announceMove(g.id, draft));
  }

  function cancel() {
    setGesture(null);
    setDraft(null);
  }

  useEffect(() => {
    if (!gesture) return;
    const esc = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && cancel();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [gesture]);

  // ---- The keyboard -------------------------------------------------------------------------------------------------

  const toEnd = (key: string) => (key === 'ArrowRight' ? (isRtl ? -1 : 1) : key === 'ArrowLeft' ? (isRtl ? 1 : -1) : 0);

  function moveBy(item: T, move: Parameters<typeof keyMove>[1]) {
    const me = layout.find((l) => l.id === item.id)!;
    const next = layout.map((l) => (l.id === item.id ? keyMove(me, move, placed, layout) : l));
    if (JSON.stringify(next) === JSON.stringify(layout)) return;
    commit(next, announceMove(item.id, next));
  }

  function gripKey(e: KeyboardEvent<HTMLElement>, item: T) {
    const side = toEnd(e.key);
    const move = side ? { side: side * (e.shiftKey ? 1 : 5) } : e.key === 'ArrowUp' ? { vertical: 'up' as const } : e.key === 'ArrowDown' ? { vertical: 'down' as const }
      : e.key === 'Home' ? { home: true } : e.key === 'End' ? { end: true } : null;
    if (!move) return;
    e.preventDefault();
    moveBy(item, move);
  }

  function setWidthOf(item: T, w: number) {
    const me = layout.find((l) => l.id === item.id)!;
    const next = resized(me, w, minTracks(item));
    if (next.w === me.w && next.x === me.x) return;
    commit(layout.map((l) => (l.id === item.id ? next : l)), labels.resized(title(item), next.w));
  }

  function handleKey(e: KeyboardEvent<HTMLElement>, item: T) {
    const me = layout.find((l) => l.id === item.id)!;
    const side = toEnd(e.key);
    const w = side ? me.w + side * (e.shiftKey ? 5 : 1) : e.key === 'Home' ? minTracks(item) : e.key === 'End' ? TRACKS : null;
    if (w == null) return;
    e.preventDefault();
    if (e.key === 'End') commit(layout.map((l) => (l.id === item.id ? { ...l, x: 0, w: TRACKS } : l)), labels.resized(title(item), TRACKS));
    else setWidthOf(item, w);
  }

  function toggle(id: string) {
    setExpanded((old) => {
      const next = new Set(old);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  // ---- Drawing ------------------------------------------------------------------------------------------------------

  const unit = trackWidth(width);
  const shown = (p: Placed) => ({ start: p.x * unit, width: spanPx(p.w, width) });
  const height = waiting ? 320 : boardHeight(placed);
  const moving = gesture?.mode === 'move' ? gesture : null;
  const slot = moving ? at.get(moving.id) : null;
  // Faded, not hidden: a hidden control can't take focus, and the keyboard must reach the grip and the handle.
  const reveal = { opacity: 0 } as const;

  return (
    <Box>
      {can && <chakra.p id={help} srOnly>{labels.instructions}</chakra.p>}
      <chakra.p srOnly role="status" aria-live="polite">{said}</chakra.p>
      <Box ref={board} role="list" aria-label={ariaLabel} position="relative" h={`${height}px`} onPointerMove={pointerMove} onPointerUp={pointerUp}
        onPointerCancel={cancel} css={{ '@media (prefers-reduced-motion: reduce)': { '& [data-widget-slot]': { transition: 'none !important' } } }}>
        {waiting && [[0, 30, 0], [30, 30, 0], [0, 20, 1], [20, 20, 1], [40, 20, 1]].map(([x, w, row], i) => (
          <Box key={i} aria-hidden position="absolute" top={`${row * 168}px`} insetInlineStart={`${x * unit}px`} w={`${spanPx(w, width)}px`} h="152px" borderRadius="l3"
            css={shineCss} />
        ))}
        {slot && (
          <Box aria-hidden position="absolute" top={`${slot.top}px`} insetInlineStart={`${shown(slot).start}px`} w={`${shown(slot).width}px`} h={`${slot.height}px`}
            borderWidth="2px" borderStyle="dashed" borderColor="colorPalette.solid" colorPalette="accent" borderRadius="l3" bg="colorPalette.subtle" opacity={0.6} />
        )}
        {placed.map((p) => {
          const item = byId.get(p.id);
          if (!item) return null;
          const isOpen = expanded.has(p.id);
          const dragging = moving?.id === p.id;
          const sizing = gesture?.mode === 'resize' && gesture.id === p.id;
          const name = title(item);
          const start = dragging ? moving.startLeft + moving.dx : shown(p).start;
          const top = dragging ? moving.startTop + moving.dy : p.top;
          const presets: RowMenuEntry[] = can
            ? [
              { separator: true },
              { id: 'half', label: labels.half, onSelect: () => setWidthOf(item, PRESETS.half) },
              { id: 'two', label: labels.twoThirds, onSelect: () => setWidthOf(item, PRESETS.two) },
              { id: 'full', label: labels.full, onSelect: () => setWidthOf(item, PRESETS.full) },
              { separator: true },
              { id: 'up', label: labels.moveUp, icon: <ArrowUp />, onSelect: () => moveBy(item, { vertical: 'up' }) },
              { id: 'down', label: labels.moveDown, icon: <ArrowDown />, onSelect: () => moveBy(item, { vertical: 'down' }) },
            ]
            : [];
          // The host's items, the board's, then the host's red ones (Remove) last.
          const own = menu?.(item) ?? [];
          const red = own.filter((e) => 'danger' in e && e.danger);
          const entries = [...own.filter((e) => !red.includes(e)), ...presets, ...(red.length ? [{ separator: true } as const, ...red] : [])]
            .filter((e, i, all) => !('separator' in e) || (i > 0 && i < all.length - 1 && !('separator' in all[i - 1])));
          return (
            <Box key={p.id} role="listitem" data-widget-slot="" position="absolute" top={`${top}px`} insetInlineStart={`${start}px`}
              w={`${dragging || sizing ? spanPx(draftWidth(p, draft), width) : shown(p).width}px`} zIndex={dragging ? 3 : sizing ? 2 : undefined}
              visibility={width ? undefined : 'hidden'}
              transition={dragging || sizing ? undefined : 'top 200ms ease, inset-inline-start 200ms ease, width 150ms ease'}>
              <chakra.section data-widget={p.id} ref={measure(p.id)} aria-label={name} position="relative" display="flex" flexDirection="column"
                bg="bg.panel" borderWidth="1px" borderColor="border" borderRadius="l3" minW="0"
                boxShadow={dragging ? 'lg' : undefined} cursor={dragging ? 'grabbing' : undefined}
                css={{
                  '& [data-reveal]': dragging || sizing ? undefined : reveal,
                  '&:hover [data-reveal], &:focus-within [data-reveal]': { opacity: 1 },
                  '@media (hover: none)': { '& [data-reveal]': { opacity: 1 } },
                }}>
                <HStack gap="1" ps="4" pe="2" pt="2" minH="11">
                  <Text as="h3" flex="1" minW="0" truncate fontWeight="semibold" textStyle="body.sm">{name}</Text>
                  <HStack gap="0.5" flexShrink={0}>
                    {can && (
                      <chakra.span data-reveal="" display="inline-flex">
                        <IconButton size="xs" variant="ghost" color="fg.muted" aria-label={labels.move(name)} aria-describedby={help} cursor={dragging ? 'grabbing' : 'grab'}
                          css={{ touchAction: 'none' }} onPointerDown={(e) => grab(e, item)} onKeyDown={(e) => gripKey(e, item)}>
                          <GripVertical />
                        </IconButton>
                      </chakra.span>
                    )}
                    {!narrow && (
                      <chakra.span data-reveal="" display="inline-flex">
                        <Tooltip content={isOpen ? labels.restore : labels.expand}>
                          <IconButton size="xs" variant="ghost" color="fg.muted" aria-label={isOpen ? labels.restore : labels.expand} aria-pressed={isOpen} onClick={() => toggle(p.id)}>
                            {isOpen ? <Minimize2 /> : <Maximize2 />}
                          </IconButton>
                        </Tooltip>
                      </chakra.span>
                    )}
                    {entries.length > 0 && <RowMenu label={labels.actions(name)} items={entries} size="xs" />}
                  </HStack>
                </HStack>
                <Box px="4" pb="4" pt="1" minW="0" overflowX="auto">{renderItem(item, { expanded: isOpen })}</Box>
                {can && !isOpen && (
                  <chakra.span role="slider" tabIndex={0} aria-label={labels.resize(name)} aria-describedby={help} aria-orientation="horizontal"
                    aria-valuemin={minTracks(item)} aria-valuemax={TRACKS} aria-valuenow={draftWidth(p, draft)}
                    position="absolute" top="0" bottom="0" insetInlineEnd="-1.5" w="3" cursor="ew-resize" css={{ touchAction: 'none' }}
                    display="flex" alignItems="center" justifyContent="center" data-reveal=""
                    _focusVisible={{ outline: '2px solid', outlineColor: 'colorPalette.focusRing', outlineOffset: '1px', borderRadius: 'full' }}
                    onPointerDown={(e) => resizeStart(e, item)} onKeyDown={(e) => handleKey(e, item)}>
                    <chakra.span w="1" h="8" borderRadius="full" bg="border.emphasized" />
                  </chakra.span>
                )}
              </chakra.section>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/** A widget's width while it's being resized (the draft's), else as placed. */
function draftWidth(p: Placed, draft: BoardItem[] | null): number {
  return draft?.find((d) => d.id === p.id)?.w ?? p.w;
}

export { GAP as WIDGET_BOARD_GAP };

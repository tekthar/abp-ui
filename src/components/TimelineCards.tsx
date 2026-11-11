'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Box, chakra, Grid, Stack, Text } from '@chakra-ui/react';
import { useLoading } from '../skeleton/loading';
import { Bone } from '../skeleton/bones';
import { Tooltip } from './Tooltip';
import { columnWidth, dayNumber, placeCards } from './timeline-cards-math';

export type TimelineScale = 'day' | 'week' | 'month';

/** A record the card timeline places: its due day, and a start day when it spans a range. */
export interface TimelineCardItem {
  id: string;
  start?: string | null;
  due: string;
}

export interface TimelineCardsProps<T extends TimelineCardItem> {
  'aria-label': string;
  scale: TimelineScale;
  /** The period's days, in order (one for a day). */
  days: string[];
  today: string;
  items: T[];
  /** A day's head: its short weekday and its number. */
  weekday: (day: string) => string;
  dayLabel: (day: string) => string;
  /** The card's inside: title, then a line of who and which. */
  renderCard: (item: T, place: { range: boolean }) => ReactNode;
  /** The colour of the card's edge (a status category's), as a token. */
  accent?: (item: T) => string;
  /** What the card says to assistive tech. */
  describe: (item: T) => string;
  /** The hover card: the record's details. */
  details?: (item: T) => ReactNode;
  onOpen: (item: T) => void;
  /** D, W and M change the scale while focus is in the timeline. */
  onScale?: (scale: TimelineScale) => void;
  /** Shown in place of the lanes when nothing falls in the period. */
  empty?: ReactNode;
  /** Under the lanes (creating a record in place). */
  footer?: ReactNode;
  /** Its records are coming (ADR 0061): placeholder cards in a few lanes. The nearest `Loading` scope's when not given. */
  loading?: boolean;
}

const LANE = 60;
const KEYS: Record<string, TimelineScale> = { d: 'day', w: 'week', m: 'month' };

/**
 * The card timeline (UI round 9, step 48; the design canvas's Timeline): one day, week or month of records as cards on
 * their real dates, packed into lanes over day columns, with a today line. A card spans from its start to its due day
 * when it has both; else it sits on its due day. A day is a grid of its cards. Start and end follow the reading direction.
 * The bar chart with groups, zoom and links is the Gantt (`TimelineChart`).
 */
export function TimelineCards<T extends TimelineCardItem>(props: TimelineCardsProps<T>) {
  const { scale, onScale } = props;
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!onScale || e.altKey || e.ctrlKey || e.metaKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
    const next = KEYS[e.key.toLowerCase()];
    if (next && next !== scale) {
      e.preventDefault();
      onScale(next);
    }
  };

  return (
    <chakra.div role="region" aria-label={props['aria-label']} onKeyDown={onKeyDown} layerStyle="panel" borderRadius="l3" overflow="hidden"
      data-timeline-cards={scale}>
      {scale === 'day' ? <DayGrid {...props} /> : <Lanes {...props} scale={scale} />}
      {props.footer}
    </chakra.div>
  );
}

function Card<T extends TimelineCardItem>({ item, p, range, cutStart, cutEnd, style }: {
  item: T; p: TimelineCardsProps<T>; range: boolean; cutStart?: boolean; cutEnd?: boolean; style?: Record<string, unknown>;
}) {
  const card = (
    <chakra.button type="button" data-timeline-card={item.id} aria-label={p.describe(item)} onClick={() => p.onOpen(item)}
      display="flex" alignItems="stretch" gap="0" textAlign="start" bg="bg.panel" borderWidth="1px" borderColor="border" overflow="hidden"
      borderStartRadius={cutStart ? '0' : 'l2'} borderEndRadius={cutEnd ? '0' : 'l2'} h="52px" minW="0" cursor="pointer"
      _hover={{ borderColor: 'border.emphasized', bg: 'bg.subtle' }} _focusVisible={{ outline: '2px solid', outlineColor: 'colorPalette.focusRing', outlineOffset: '1px' }}
      transition="background 120ms, border-color 120ms" {...style}>
      <Box as="span" w="3px" flexShrink={0} bg={p.accent?.(item) ?? 'border.emphasized'} aria-hidden />
      <Stack as="span" gap="0.5" px="2.5" py="1.5" minW="0" flex="1" justify="center">
        {p.renderCard(item, { range })}
      </Stack>
    </chakra.button>
  );
  return p.details ? <Tooltip content={p.details(item)} positioning={{ placement: 'bottom-start' }} openDelay={250}>{card}</Tooltip> : card;
}

function Lanes<T extends TimelineCardItem>(p: TimelineCardsProps<T> & { scale: 'week' | 'month' }) {
  const { days, today, items, scale } = p;
  // The columns stretch to the width there is (a week's to a seventh of it), never below their least.
  const box = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setAvailable(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const colW = columnWidth(scale, days.length, available);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const { cards, lanes } = useMemo(() => placeCards(items, days[0], days.length, scale, colW), [items, days, scale, colW]);
  const todayIdx = days.indexOf(today);
  const gridW = days.length * colW;
  const placeholders = useLoading(p.loading) && items.length === 0;
  const height = (placeholders ? 4 : Math.max(lanes, 1)) * LANE + 16;

  return (
    <chakra.div overflowX="auto" ref={box}>
      <chakra.div position="relative" minW="full" w={`${gridW}px`}>
        {/* The day heads. */}
        <chakra.div display="flex" borderBottomWidth="1px" borderColor="border" bg="bg.subtle" position="sticky" top="0" zIndex="1">
          {days.map((d) => {
            const isToday = d === today;
            const weekStart = new Date(dayNumber(d) * 86_400_000).getUTCDay() === 0;
            return (
              <chakra.div key={d} w={`${colW}px`} flexShrink={0} py="1.5" display="flex" flexDirection={scale === 'week' ? 'row' : 'column'}
                gap={scale === 'week' ? '1.5' : '0'} alignItems="center" justifyContent="center" textStyle="xs"
                color={isToday ? 'fg.accent' : 'fg.muted'} fontWeight={isToday ? 'bold' : 'normal'}
                borderInlineStartWidth={weekStart && scale === 'month' ? '1px' : '0'} borderColor="border">
                <Text as="span">{p.weekday(d)}</Text>
                <Text as="span" fontVariantNumeric="tabular-nums" color={isToday ? 'fg.accent' : 'fg'}
                  bg={isToday ? 'colorPalette.subtle' : undefined} rounded="full" minW="6" px="1" textAlign="center">{p.dayLabel(d)}</Text>
              </chakra.div>
            );
          })}
        </chakra.div>
        {/* Day lines behind the lanes, and the today line. */}
        <chakra.div position="absolute" insetInlineStart="0" top="0" bottom="0" display="flex" pointerEvents="none" aria-hidden>
          {days.map((d) => (
            <chakra.div key={d} w={`${colW}px`} flexShrink={0} borderInlineEndWidth="1px" borderStyle="dashed" borderColor="border.muted" />
          ))}
        </chakra.div>
        {todayIdx >= 0 && (
          <chakra.div position="absolute" top="0" bottom="0" w="2px" bg="colorPalette.solid" opacity={0.7} pointerEvents="none" aria-hidden
            insetInlineStart={`${todayIdx * colW + colW / 2 - 1}px`} zIndex="1" />
        )}
        {placeholders ? (
          <chakra.div position="relative" h={`${height}px`} aria-hidden>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Bone key={i} position="absolute" top={`${8 + (i % 4) * LANE}px`} insetInlineStart={`${Math.round(gridW * (((i * 17) % 70) / 100)) + 3}px`}
                w={`${Math.min(scale === 'week' ? colW - 10 : 228, gridW - 6)}px`} height="52px" borderRadius="l2" />
            ))}
          </chakra.div>
        ) : cards.length === 0 && p.empty ? (
          <chakra.div position="relative" py="6">{p.empty}</chakra.div>
        ) : (
          <chakra.div position="relative" h={`${height}px`} role="list">
            {cards.map((c) => {
              const item = byId.get(c.id)!;
              return (
                <chakra.div key={c.id} role="listitem" position="absolute" top={`${8 + c.lane * LANE}px`} insetInlineStart={`${c.offset}px`} w={`${c.width}px`}
                  display="flex" zIndex="2">
                  <Card item={item} p={p} range={c.range} cutStart={c.cutStart} cutEnd={c.cutEnd} style={{ w: 'full' }} />
                </chakra.div>
              );
            })}
          </chakra.div>
        )}
      </chakra.div>
    </chakra.div>
  );
}

function DayGrid<T extends TimelineCardItem>(p: TimelineCardsProps<T>) {
  const day = p.days[0];
  const due = p.items.filter((i) => {
    const d = dayNumber(i.due);
    const s = i.start && dayNumber(i.start) <= d ? dayNumber(i.start) : d;
    const x = dayNumber(day);
    return s <= x && x <= d;
  });
  if (due.length === 0 && p.empty) return <chakra.div py="6">{p.empty}</chakra.div>;
  return (
    <Grid role="list" templateColumns="repeat(auto-fill, minmax(16rem, 1fr))" gap="2" p="3">
      {due.map((i) => (
        <chakra.div key={i.id} role="listitem" display="flex">
          <Card item={i} p={p} range={Boolean(i.start && i.start < i.due)} style={{ w: 'full' }} />
        </chakra.div>
      ))}
    </Grid>
  );
}

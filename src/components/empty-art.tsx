import { Box, chakra, Flex } from '@chakra-ui/react';
import { Search } from 'lucide-react';

/**
 * The empty state's drawings (the design canvas's EmptyState): a page-level illustration of the feature the empty page
 * belongs to, and small flat pieces of art for empty lists in panels and settings. Both are decorative (aria-hidden),
 * abstract (no numbers, no names) and static, and draw only with the theme's tokens, so they follow the host's brand
 * and the colour mode.
 */

// ---- Page illustration: a clear card in the middle, softer cards either side that fade into the surface ------------

/** The feature an empty page belongs to; it picks the three cards. */
export type EmptyIllustration =
  | 'records' | 'board' | 'views' | 'dashboards' | 'dashboard' | 'reports' | 'calendar' | 'timeline' | 'gantt'
  | 'backlog' | 'queue' | 'comments' | 'files';

/** A shape's kind: a light fill (the default), soft, strong, the one accent touch, a dot, grid cells, a checkbox, space. */
type Kind = '' | 'soft' | 'strong' | 'acc' | 'dot' | 'cell' | 'cellacc' | 'box' | 'sp' | 'gap';
type Item = [Kind, number?, number?];
interface Row { items: Item[]; sep?: boolean; end?: boolean; gap?: number; height?: number; mt?: number }

const R = (items: Item[], o: Omit<Row, 'items'> = {}): Row => ({ items, ...o });
const rows = (n: number, f: (i: number) => Row): Row[] => Array.from({ length: n }, (_, i) => f(i));

const CARDS: Record<string, Row[]> = {
  rec: [R([['dot', 18, 18], ['strong', 84, 7], ['sp'], ['soft', 26, 7]]), R([['', 140, 6]]), R([['soft', 96, 6]]), R([['soft', 40, 14], ['soft', 40, 14]], { mt: 4 })],
  list: [R([['strong', 64, 7], ['sp'], ['soft', 22, 7]], { sep: true }), ...rows(4, (i) => R([['dot', 10, 10], ['', [90, 70, 96, 60][i], 6], ['sp'], ['soft', 18, 6]]))],
  cal: [R([['strong', 52, 7], ['sp'], ['soft', 20, 7]]), ...rows(3, (r) => R(Array.from({ length: 6 }, (_, c): Item => [r === 1 && c === 2 ? 'cellacc' : 'cell', 18, 14]), { gap: 4 }))],
  num: [R([['soft', 48, 6]]), R([['strong', 76, 22]]), R([['', 58, 6]])],
  bars: [R([['strong', 60, 7], ['sp'], ['soft', 22, 7]]), R([['', 14, 26], ['', 14, 42], ['', 14, 34], ['acc', 14, 56], ['', 14, 38], ['', 14, 48], ['', 14, 30]], { end: true, height: 60, gap: 9 }), R([['soft', 160, 2]])],
  board: [R([['strong', 64, 7], ['sp'], ['soft', 22, 7]]), R([['soft', 56, 74], ['soft', 56, 74], ['soft', 56, 74]], { gap: 8 })],
  boardcard: [R([['acc', 34, 8]]), R([['strong', 120, 7]]), R([['', 80, 6]]), R([['dot', 12, 12], ['sp'], ['soft', 26, 6]])],
  tl: [R([['strong', 60, 7], ['sp'], ['soft', 22, 7]], { sep: true }), ...[[0, 92], [30, 110], [64, 70], [16, 128]].map(([g, w], i) => R([['gap', g, 8], [i === 1 ? 'acc' : '', w, 10]]))],
  rows: rows(3, (i) => R([['box', 12, 12], ['strong', [96, 80, 108][i], 7], ['sp'], ['dot', 14, 14]], { sep: i < 2 })),
  report: [R([['strong', 80, 8]]), R([['soft', 150, 5]]), ...[90, 130, 60, 110].map((w) => R([['soft', 30, 6], ['', w, 8]]))],
  table: rows(4, () => R([['cell', 36, 12], ['cell', 48, 12], ['cell', 36, 12]], { gap: 4 })),
  chat: [R([['dot', 18, 18], ['soft', 120, 22]], { gap: 8 }), R([['sp'], ['acc', 96, 18]]), R([['dot', 18, 18], ['soft', 80, 18]], { gap: 8 })],
  file: [R([['strong', 24, 30], ['strong', 100, 7]], { gap: 10 }), R([['', 150, 6]]), R([['soft', 104, 6]])],
  // A miniature dashboard: a title bar, three number tiles (one in the accent), a small bar chart beside a table block.
  minidash: [
    R([['strong', 64, 7], ['sp'], ['acc', 34, 10]], { sep: true }),
    R([['cell', 60, 30], ['cellacc', 60, 30], ['cell', 60, 30]], { gap: 6 }),
    R([['', 8, 16], ['', 8, 26], ['acc', 8, 36], ['', 8, 22], ['', 8, 30], ['gap', 10, 1], ['cell', 90, 36]], { end: true, gap: 6 }),
  ],
};

/** Feature → the cards at the start, in the middle and at the end. */
const TRIOS: Record<EmptyIllustration, [string, string, string]> = {
  dashboards: ['num', 'minidash', 'bars'], records: ['rec', 'list', 'rec'], board: ['boardcard', 'boardcard', 'boardcard'],
  views: ['list', 'board', 'cal'], dashboard: ['num', 'bars', 'list'], reports: ['table', 'report', 'num'],
  calendar: ['list', 'cal', 'list'], timeline: ['rows', 'tl', 'rows'], gantt: ['rows', 'tl', 'rows'],
  backlog: ['rec', 'rows', 'rec'], queue: ['rec', 'rows', 'rec'], comments: ['chat', 'chat', 'chat'], files: ['file', 'file', 'file'],
};

// Barely-there lines: card edges and inner dividers sit one step above the surface in either mode.
const EDGE = { base: 'neutral.100', _dark: 'neutral.800' };
const LINE = { base: 'neutral.100', _dark: 'neutral.800' };

function Shape({ item }: { item: Item }) {
  const [k, w, h] = item;
  const size = { w: w != null ? `${w}px` : undefined, h: h != null ? `${h}px` : undefined };
  if (k === 'sp') return <Box flex="1 1 auto" />;
  if (k === 'gap') return <Box flexShrink={0} {...size} />;
  const bg =
    k === 'soft' ? { base: 'neutral.50', _dark: 'neutral.850' }
    : k === 'strong' ? { base: 'neutral.200', _dark: 'neutral.700' }
    : k === 'acc' ? { base: 'accent.200', _dark: 'accent.800' }
    : k === 'cellacc' ? { base: 'accent.100', _dark: 'accent.900' }
    : k === 'cell' || k === 'box' ? 'transparent'
    : { base: 'neutral.100', _dark: 'neutral.800' };
  const border =
    k === 'cell' ? LINE
    : k === 'cellacc' ? { base: 'accent.200', _dark: 'accent.800' }
    : k === 'box' ? { base: 'neutral.300', _dark: 'neutral.600' }
    : undefined;
  return (
    <Box
      flexShrink={0}
      display="block"
      rounded={k === 'dot' ? 'full' : '3px'}
      bg={bg}
      borderWidth={border ? '1px' : undefined}
      borderColor={border}
      {...size}
    />
  );
}

function Card({ id, pos }: { id: string; pos: 'start' | 'main' | 'end' }) {
  const main = pos === 'main';
  // The side cards fade toward the outside, with a mask, so they meet whatever surface the empty state sits on.
  const fade = pos === 'start' ? 'to left' : 'to right';
  return (
    <Flex
      direction="column"
      justify="center"
      gap="8px"
      p="12px"
      flexShrink={0}
      position="relative"
      overflow="hidden"
      rounded="lg"
      bg="bg.panel"
      borderWidth="1px"
      borderColor={EDGE}
      w={main ? '220px' : '168px'}
      minH={main ? '132px' : '104px'}
      opacity={main ? 1 : 0.85}
      boxShadow={main ? { base: '0 2px 8px rgba(0,0,0,.025)', _dark: '0 8px 20px -10px rgba(0,0,0,.6)' } : undefined}
      css={main ? undefined : { maskImage: `linear-gradient(${fade}, #000 0%, rgba(0,0,0,.55) 45%, transparent 100%)` }}
      data-pos={pos}
    >
      {(CARDS[id] ?? CARDS.list).map((r, i) => (
        <Flex
          key={i}
          align={r.end ? 'flex-end' : 'center'}
          gap={`${r.gap ?? 6}px`}
          minW="0"
          h={r.height != null ? `${r.height}px` : undefined}
          mt={r.mt != null ? `${r.mt}px` : undefined}
          pb={r.sep ? '8px' : undefined}
          boxShadow={r.sep ? { base: 'inset 0 -1px 0 {colors.neutral.100}', _dark: 'inset 0 -1px 0 {colors.neutral.800}' } : undefined}
        >
          {r.items.map((it, j) => <Shape key={j} item={it} />)}
        </Flex>
      ))}
    </Flex>
  );
}

/**
 * The page-level illustration. `searching` adds a small search mark (nothing matches); `compact` shows the middle card
 * alone. The drawing is laid out left to right in either direction: it is a picture, not text.
 */
export function PageIllustration({ of, searching, scale = 1 }: { of: EmptyIllustration; searching?: boolean; scale?: number }) {
  const [start, main, end] = TRIOS[of] ?? TRIOS.records;
  return (
    <Flex
      aria-hidden
      dir="ltr"
      position="relative"
      flexShrink={0}
      align="center"
      justify="center"
      gap="14px"
      maxW="full"
      overflow="hidden"
      pt="10px"
      pb="14px"
      css={scale !== 1 ? { zoom: scale } : undefined}
      data-illustration={of}
    >
      <Card id={start} pos="start" />
      <Card id={main} pos="main" />
      <Card id={end} pos="end" />
      {searching && (
        <Flex
          position="absolute"
          right="calc(50% - 128px)"
          bottom="4px"
          zIndex={2}
          align="center"
          justify="center"
          boxSize="34px"
          rounded="full"
          bg="bg.panel"
          borderWidth="1px"
          borderColor={LINE}
          boxShadow="0 4px 10px -4px rgba(26,29,35,.18)"
          color="fg.muted"
          _icon={{ boxSize: '4' }}
        >
          <Search />
        </Flex>
      )}
    </Flex>
  );
}

// ---- Art: a few flat shapes on a 120 × 96 canvas, for empty lists in panels and settings -------------------------

/** Small drawings in place of the icon: first use, no results, all done, nothing new, away, agents, couldn't load. */
export type EmptyArt = 'records' | 'search' | 'done' | 'bell' | 'handover' | 'agent' | 'error';

type Fill = string | { base: string; _dark: string };
const C: Record<string, Fill> = {
  acc1: { base: 'accent.100', _dark: 'accent.950' },
  acc2: { base: 'accent.200', _dark: 'accent.800' },
  acc3: { base: 'accent.300', _dark: 'accent.600' },
  acc6: { base: 'accent.600', _dark: 'accent.400' },
  acc7: { base: 'accent.700', _dark: 'accent.300' },
  warm2: { base: 'amber.200', _dark: 'amber.800' },
  warm4: { base: 'amber.400', _dark: 'amber.400' },
  warm7: { base: 'amber.700', _dark: 'amber.200' },
  surface: 'bg.panel',
  gray: { base: 'neutral.100', _dark: 'neutral.800' },
  gray3: { base: 'neutral.300', _dark: 'neutral.600' },
  green1: { base: 'green.100', _dark: 'green.950' },
  green6: { base: 'green.600', _dark: 'green.400' },
};

const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${h - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;
const ci = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 -${2 * r} 0z`;

/** [path, fill key] pairs; a fill key of 'check' is the white tick drawn as a stroke. */
const ART: Record<EmptyArt, [string, string][]> = {
  // Away or handing over: a calendar with a warm "away" day and a stand-in person.
  handover: [[ci(60, 50, 42), 'acc1'], [rr(28, 24, 52, 48, 8), 'surface'], [rr(28, 24, 52, 14, 7), 'acc6'], [rr(28, 32, 52, 6, 0), 'acc6'], [rr(36, 46, 8, 8, 2), 'acc2'], [rr(50, 46, 8, 8, 2), 'warm4'], [rr(64, 46, 8, 8, 2), 'acc2'], [rr(36, 58, 8, 8, 2), 'acc2'], [ci(86, 66, 16), 'warm2'], [ci(86, 61, 5), 'warm7'], [rr(78, 68, 16, 8, 4), 'warm7'], [ci(40, 20, 3), 'warm4']],
  // Agents: a friendly assistant tile with a key it is trusted with.
  agent: [[ci(60, 50, 42), 'acc1'], [rr(36, 30, 48, 40, 12), 'acc6'], [ci(50, 48, 5), 'surface'], [ci(70, 48, 5), 'surface'], [rr(52, 58, 16, 4, 2), 'acc3'], [rr(58, 20, 4, 10, 2), 'acc7'], [ci(60, 18, 5), 'warm4'], [ci(90, 70, 12), 'warm2'], [ci(87, 70, 4), 'warm7'], [rr(90, 68, 12, 4, 2), 'warm7'], [ci(26, 34, 3), 'warm4'], [ci(96, 30, 2), 'acc3']],
  // Nothing new: a warm bell resting, with soft dots.
  bell: [[ci(60, 50, 42), 'acc1'], [rr(42, 30, 36, 38, 18), 'warm4'], [rr(38, 60, 44, 8, 4), 'warm4'], [ci(60, 72, 6), 'warm7'], [ci(60, 26, 4), 'warm7'], [rr(84, 26, 10, 3, 1.5), 'acc3'], [rr(88, 34, 8, 3, 1.5), 'acc2'], [ci(28, 40, 3), 'acc3'], [ci(32, 70, 2), 'warm4']],
  // No results: a magnifier over a stack of records.
  search: [[ci(60, 50, 42), 'acc1'], [rr(26, 26, 52, 12, 4), 'surface'], [rr(26, 42, 52, 12, 4), 'surface'], [rr(26, 58, 40, 12, 4), 'surface'], [rr(32, 30, 20, 4, 2), 'acc2'], [rr(32, 46, 28, 4, 2), 'acc2'], [ci(80, 58, 16), 'acc6'], [ci(80, 58, 10), 'acc1'], [rr(90, 70, 16, 8, 4), 'acc7'], [ci(98, 28, 3), 'warm4']],
  // All done: a big check with warm sparkles.
  done: [[ci(60, 50, 42), 'green1'], [ci(60, 50, 24), 'green6'], ['M50 50l7 7l14 -14', 'check'], [ci(28, 28, 4), 'warm4'], [ci(94, 34, 3), 'warm4'], [ci(92, 74, 5), 'warm2'], [ci(26, 70, 2), 'warm4']],
  // First use: stacked cards and a plus tile.
  records: [[ci(60, 50, 42), 'acc1'], [rr(30, 22, 48, 56, 8), 'acc2'], [rr(36, 28, 48, 56, 8), 'surface'], [rr(44, 38, 28, 5, 2.5), 'acc3'], [rr(44, 48, 20, 5, 2.5), 'gray3'], [rr(44, 58, 24, 5, 2.5), 'gray3'], [rr(76, 62, 24, 24, 8), 'warm4'], [rr(86, 67, 4, 14, 2), 'surface'], [rr(81, 72, 14, 4, 2), 'surface'], [ci(98, 24, 3), 'acc3']],
  // Couldn't load: a cable unplugged.
  error: [[ci(60, 50, 42), 'gray'], [rr(22, 44, 30, 12, 6), 'acc6'], [rr(50, 46, 8, 3, 1.5), 'acc7'], [rr(50, 51, 8, 3, 1.5), 'acc7'], [rr(66, 42, 32, 16, 8), 'warm4'], [rr(62, 46, 6, 8, 2), 'warm7'], [ci(60, 30, 3), 'acc3'], [ci(64, 70, 3), 'acc3']],
};

const Path = chakra('path');

/** One of the small drawings, `width` × `height` (its viewBox is 120 × 96). */
export function EmptyArtDrawing({ art, width, height }: { art: EmptyArt; width: string; height: string }) {
  return (
    <chakra.svg aria-hidden viewBox="0 0 120 96" w={width} h={height} flexShrink={0} display="block" data-art={art}>
      {ART[art].map(([d, key], i) =>
        key === 'check' ? (
          <Path key={i} d={d} fill="none" stroke="white" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <Path key={i} d={d} fill={C[key]} />
        ),
      )}
    </chakra.svg>
  );
}

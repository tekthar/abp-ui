import type { ReactNode } from 'react';
import { chakra, type HTMLChakraProps, type SystemStyleObject } from '@chakra-ui/react';
import { useArriving, useLoading } from './loading';

/**
 * What every placeholder shares: a flat gray block with a gentle pulse, no shine crossing it (the canvas's v12 skeleton,
 * UI round 9 step 66; ADR 0058's shine before). Still with less motion: the global rule ends keyframes at once when the
 * person chose less, and this one when the system asks for less and the person left it to the system.
 */
export const shineCss: SystemStyleObject = {
  backgroundColor: 'bg.muted',
  // Chakra's own `pulse` keyframes (half opacity at the middle).
  animation: 'pulse 1.8s ease-in-out infinite',
  'html:not([data-motion=full]) &': { '@media (prefers-reduced-motion: reduce)': { animation: 'none' } },
};

/**
 * A component drawn as its own placeholder (ADR 0061): the real element, at its real size, with its content hidden
 * and the shine where it will be. Its radius stays its own.
 */
export const ghostCss: SystemStyleObject = {
  ...shineCss,
  color: 'transparent !important',
  borderColor: 'transparent !important',
  boxShadow: 'none !important',
  outline: 'none',
  cursor: 'default',
  pointerEvents: 'none',
  userSelect: 'none',
  '&::before, &::after, & *': { visibility: 'hidden' },
};

/** What replaced a placeholder fades in there, nothing moving (150 ms on the `out` curve; none with less motion). */
export const arriveCss: SystemStyleObject = { animation: 'fade-in 150ms {easings.out}' };

/** A width as a slot gives it: a number is characters of the slot's own font (`ch`), a string is CSS. */
const widthOf = (width: number | string | undefined, otherwise: string) => (typeof width === 'number' ? `${width}ch` : (width ?? otherwise));

export interface BoneProps extends Omit<HTMLChakraProps<'span'>, 'children'> {
  /** A circle (an avatar, a dot): its width is its height. */
  circle?: boolean;
}

/** A placeholder shape: a box, a line or a circle, for anything a page draws itself. */
export function Bone({ circle, width, height = '4', borderRadius, css, ...rest }: BoneProps) {
  return (
    <chakra.span
      aria-hidden="true"
      display="inline-block"
      verticalAlign="middle"
      flexShrink={0}
      width={circle ? height : (width ?? 'full')}
      height={height}
      borderRadius={borderRadius ?? (circle ? 'full' : 'l1')}
      css={[shineCss, css]}
      {...rest}
    />
  );
}

export interface TextBoneProps {
  /** Its width: characters of the slot's own font (a number), or any CSS width. 12 characters by default. */
  width?: number | string;
  /** Several lines, the last one shorter: a paragraph. */
  lines?: number;
}

/** Word lengths for placeholder text: it breaks between words as text does. */
const WORDS = [5, 3, 7, 4, 6, 2, 5, 8, 3, 6, 4];

/** Placeholder text of about `chars` characters ("0" is one `ch` wide), in words. */
function filler(chars: number): string {
  let out = '';
  for (let i = 0; out.length < chars; i++) {
    out += (out ? ' ' : '') + '0'.repeat(WORDS[i % WORDS.length]);
  }
  return out.slice(0, Math.max(1, chars)).trimEnd();
}

/** Invisible text that shines like a highlighter: each line it wraps onto has its own rounded band. */
const highlightCss: SystemStyleObject = {
  ...shineCss,
  color: 'transparent',
  borderRadius: 'l1',
  boxDecorationBreak: 'clone',
  userSelect: 'none',
};

/**
 * Text that's coming (ADR 0061). Given a width in characters, it's text of that length, invisible, shining: it sits on
 * the line, wraps where the text would and takes the room the text will, in the text style of wherever it sits. Given
 * a CSS width ("full", "60%"), it's a bar one line box tall (CSS `1lh`). Several lines are a block of bars.
 */
export function TextBone({ width, lines = 1 }: TextBoneProps) {
  const bar = (w: string, key?: number) => (
    <chakra.span key={key} aria-hidden="true" display="flex" alignItems="center" height="1lh" width={w} maxW="full">
      <chakra.span display="block" width="full" height="0.75em" borderRadius="l1" css={shineCss} />
    </chakra.span>
  );
  if (lines <= 1) {
    if (typeof width === 'number' || width === undefined) {
      return (
        <chakra.span aria-hidden="true" css={highlightCss}>
          {filler(width ?? 12)}
        </chakra.span>
      );
    }

    return (
      <chakra.span aria-hidden="true" display="inline-flex" alignItems="center" verticalAlign="top" height="1lh" width={widthOf(width, '12ch')} maxW="full">
        <chakra.span display="block" width="full" height="0.75em" borderRadius="l1" css={shineCss} />
      </chakra.span>
    );
  }

  return (
    <chakra.span aria-hidden="true" display="block" width={widthOf(width, 'full')}>
      {Array.from({ length: lines }, (_, i) => bar(i === lines - 1 ? '60%' : '100%', i))}
    </chakra.span>
  );
}

export interface TextSlotProps extends TextBoneProps {
  /** Its own loading; the nearest `Loading` scope's when not given. */
  loading?: boolean;
  children?: ReactNode;
}

/**
 * A place for text whose data is coming: a `TextBone` while it loads, then the text, fading in where the bone was.
 * Pages use it for their own text (a heading, a sentence); components use it for their data slots.
 */
export function TextSlot({ loading: own, width, lines, children }: TextSlotProps) {
  const loading = useLoading(own);
  const arriving = useArriving(loading);
  if (loading) {
    return <TextBone width={width} lines={lines} />;
  }

  return arriving ? <chakra.span css={arriveCss}>{children}</chakra.span> : <>{children}</>;
}

/**
 * Widths for a list of placeholders that look like text, not like a ruler: the same for a position on every render,
 * between `min` and `max` characters.
 */
export function boneWidth(index: number, min = 8, max = 20): number {
  const spread = max - min + 1;
  return min + ((index * 7 + 3) % spread);
}

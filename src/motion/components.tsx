import { Children, cloneElement, isValidElement, useEffect, useLayoutEffect, useRef, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { chakra, type HTMLChakraProps, type SystemStyleObject } from '@chakra-ui/react';
import { useTodaLocale } from '../provider/locale';
import { cubicBezier } from './flip-math';
import { placeOf, slide, useSlideItems } from './flip';
import { hiddenPose, SHOWN, staggerDelay, type Arrival } from './presets';
import { useMotionSetting } from './setting';
import { curves, durations, springs } from './tokens';

/**
 * Motion's light elements with Chakra's style props: `transition` is Motion's here, not the CSS property of the same
 * name. Not exported: pages use the components below, never Motion itself. (Layout motion isn't Motion's here: the
 * FLIP helper in flip.ts moves things to their new places, ADR 0058 amended.)
 */
const MotionDiv = chakra(m.div, {}, { forwardProps: ['transition'] });
const MotionSpan = chakra(m.span, {}, { forwardProps: ['transition'] });
const MotionLi = chakra(m.li, {}, { forwardProps: ['transition'] });

/** Toda's out curve, for what eases in a frame loop or Web Animations. */
const OUT = `cubic-bezier(${curves.out.join(', ')})`;
const easeOut = cubicBezier(...curves.out);

/**
 * Where something that arrives once settles: in place, and then without a transform at all, so it doesn't become the
 * containing block of the fixed and sticky things inside it.
 */
const SETTLED = { ...SHOWN, transitionEnd: { transform: 'none' } };

type BoxProps = Omit<HTMLChakraProps<'div'>, 'transition' | 'translate' | 'rotate' | 'scale'>;

/** The hidden pose for an arrival in the current language, and whether movement is off. */
function useArrival(kind: Arrival) {
  const { isRtl } = useTodaLocale();
  const { reduce } = useMotionSetting();
  return hiddenPose(kind, { rtl: isRtl, reduce });
}

export interface FadeInProps extends BoxProps {
  /** Where it comes from; `fade` (in place) by default. */
  from?: Arrival;
  /** Seconds to wait first. */
  delay?: number;
}

/**
 * Arrives once, when it first shows: a page's content, a panel loaded late. Fades in place by default, since what
 * people open many times a day shouldn't travel.
 */
export function FadeIn({ from = 'fade', delay = 0, children, ...rest }: FadeInProps) {
  const hidden = useArrival(from);
  return (
    <MotionDiv initial={hidden} animate={SETTLED} transition={{ duration: durations.base, ease: curves.out, delay }} {...(rest as object)}>
      {children}
    </MotionDiv>
  );
}

export interface RevealProps extends BoxProps {
  /** Where each item comes from; `rise` by default. */
  from?: Arrival;
  /** The wrapper each item gets ("div" by default; "li" inside a list). */
  itemAs?: 'div' | 'li' | 'span';
}

/**
 * A group's items arrive in turn, 40 ms apart (capped), the first time it shows: cards on an overview, a dashboard's
 * panels. Each child is wrapped once; use RevealItem where a wrapper would break the layout.
 */
export function Reveal({ from = 'rise', itemAs = 'div', children, ...rest }: RevealProps) {
  let index = 0;
  return (
    <chakra.div {...(rest as object)}>
      {Children.map(children, (child) =>
        isValidElement(child) || (child != null && child !== false) ? (
          <RevealItem as={itemAs} index={index++} from={from}>
            {child}
          </RevealItem>
        ) : null,
      )}
    </chakra.div>
  );
}

export interface RevealItemProps extends Omit<BoxProps, 'as'> {
  /** Its place in the group: it waits that many steps. */
  index: number;
  from?: Arrival;
  as?: 'div' | 'li' | 'span';
}

/** One item of a group that arrives in turn (see Reveal). */
export function RevealItem({ index, from = 'rise', as = 'div', children, ...rest }: RevealItemProps) {
  const hidden = useArrival(from);
  const Element = as === 'span' ? MotionSpan : as === 'li' ? MotionLi : MotionDiv;
  return (
    <Element
      initial={hidden}
      animate={SETTLED}
      transition={{ duration: durations.panel, ease: curves.out, delay: staggerDelay(index) }}
      {...(rest as object)}
    >
      {children}
    </Element>
  );
}

export interface PresenceProps extends BoxProps {
  /** Whether it's there. Leaving plays the way back. */
  show: boolean;
  /** Where it comes from and goes back to; `pop` by default. */
  from?: Arrival;
  /** Animate when the page first renders it too (off by default: what's already there just is). */
  appear?: boolean;
}

/** Something that comes and goes: a hint, a banner, a panel's extra. It leaves the way it came. */
export function Presence({ show, from = 'pop', appear = false, children, ...rest }: PresenceProps) {
  const hidden = useArrival(from);
  return (
    <AnimatePresence initial={appear}>
      {show && (
        <MotionDiv key="presence" initial={hidden} animate={SHOWN} exit={hidden} transition={{ duration: durations.base, ease: curves.out }} {...(rest as object)}>
          {children}
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}

export interface PresenceListProps {
  children: ReactNode;
}

/**
 * A list whose items come and go (rows added, removed, filtered): new ones arrive, gone ones leave, and the rest slide
 * to their new places. What's there on first render just is. Each child must be a PresenceItem with a key.
 */
export function PresenceList({ children }: PresenceListProps) {
  const marker = useRef<HTMLSpanElement>(null);
  const parent = useRef<HTMLElement | null>(null);
  const keys = Children.toArray(children)
    .map((c) => (isValidElement(c) ? String(c.key) : ''))
    .join('|');
  // The list's own element is its parent's: the items are its children, measured against it.
  useLayoutEffect(() => {
    parent.current = marker.current?.parentElement ?? null;
  });
  useSlideItems(parent, keys);
  return (
    <>
      <chakra.span ref={marker} display="none" aria-hidden="true" />
      <AnimatePresence initial={false} mode="popLayout">
        {Children.map(children, (child) =>
          isValidElement(child) ? cloneElement(child as ReactElement<{ 'data-slide'?: string }>, { 'data-slide': String(child.key) }) : child,
        )}
      </AnimatePresence>
    </>
  );
}

export interface PresenceItemProps extends Omit<BoxProps, 'as'> {
  from?: Arrival;
  as?: 'div' | 'li';
}

/** One item of a PresenceList. */
export function PresenceItem({ from = 'rise', as = 'div', children, ...rest }: PresenceItemProps) {
  const hidden = useArrival(from);
  const Element = as === 'li' ? MotionLi : MotionDiv;
  return (
    <Element
      initial={hidden}
      animate={SHOWN}
      exit={{ ...hidden, transition: { duration: durations.quick, ease: curves.out } }}
      transition={{ ...springs.soft, opacity: { duration: durations.base, ease: curves.out } }}
      {...(rest as object)}
    >
      {children}
    </Element>
  );
}

export interface SlideListProps extends BoxProps {
  /** Changes when the items change (their order, or where they are): those that moved slide to their new places. */
  token: unknown;
}

/**
 * Items that change places slide there instead of jumping (a reordered list, cards moved between columns): each item
 * is a SlideItem with an id. Measured against this element, so scrolling isn't taken for a move.
 */
export function SlideList({ token, children, ...rest }: SlideListProps) {
  const ref = useRef<HTMLDivElement>(null);
  useSlideItems(ref, token);
  return (
    <chakra.div ref={ref} {...(rest as object)}>
      {children}
    </chakra.div>
  );
}

export interface SlideItemProps extends BoxProps {
  /** Stays the same wherever the item goes. */
  slideId: string;
}

/** One item of a SlideList. */
export function SlideItem({ slideId, children, ...rest }: SlideItemProps) {
  return (
    <chakra.div data-slide={slideId} {...(rest as object)}>
      {children}
    </chakra.div>
  );
}

export interface CollapseProps extends BoxProps {
  open: boolean;
}

/** Opens to its height and closes back: a group in a menu, details under a row. Short, since it costs layout. */
export function Collapse({ open, children, ...rest }: CollapseProps) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <MotionDiv
          key="collapse"
          overflow="hidden"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: durations.base, ease: curves.out }}
          {...(rest as object)}
        >
          {children}
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}

export interface SwapProps extends Omit<HTMLChakraProps<'span'>, 'transition' | 'translate' | 'rotate' | 'scale'> {
  /** Changes when the content does: the old gives way to the new. */
  swapKey: string | number;
  from?: Arrival;
}

/** One content gives way to another in place (a status, a label, a count) instead of changing in a blink. */
export function Swap({ swapKey, from = 'rise', children, ...rest }: SwapProps) {
  const hidden = useArrival(from);
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <MotionSpan
        key={swapKey}
        display="inline-block"
        initial={hidden}
        animate={SHOWN}
        exit={hidden}
        transition={{ duration: durations.quick, ease: curves.out }}
        {...(rest as object)}
      >
        {children}
      </MotionSpan>
    </AnimatePresence>
  );
}

export interface CounterProps extends Omit<HTMLChakraProps<'span'>, 'children'> {
  value: number;
  /** How the number is written; the locale's own digits and grouping by default. */
  format?: (value: number) => string;
  /** Count up from zero the first time it shows (on by default). */
  fromZero?: boolean;
}

/** A number counts to its value: a dashboard's totals the first time they show, and when they change. */
export function Counter({ value, format, fromZero = true, ...rest }: CounterProps) {
  const { locale } = useTodaLocale();
  const { reduce } = useMotionSetting();
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(fromZero ? 0 : value);
  const write = format ?? ((n: number) => new Intl.NumberFormat(locale, { numberingSystem: 'latn', maximumFractionDigits: Number.isInteger(value) ? 0 : 1 }).format(n));

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (reduce) {
      shown.current = value;
      element.textContent = write(value);
      return;
    }
    // A frame loop on Toda's out curve (Motion's own animate would cost more than the rest of it).
    const from = shown.current;
    const start = performance.now();
    const length = durations.count * 1000;
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / length);
      const n = from + (value - from) * easeOut(progress);
      shown.current = n;
      element.textContent = write(Number.isInteger(value) ? Math.round(n) : n);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // write depends on locale and value only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce, locale]);

  return (
    <chakra.span ref={ref} fontVariantNumeric="tabular-nums" {...(rest as object)}>
      {write(reduce || !fromZero ? value : shown.current)}
    </chakra.span>
  );
}

export interface IndicatorProps {
  /** Which group it slides within: one indicator per group (a menu, a tab list). */
  group: string;
  /** Its look and place: a bar under the item, or a pill behind it. */
  css?: SystemStyleObject;
}

/** Where each group's mark last was, so the next one slides from there. */
const lastMarks = new Map<string, { left: number; top: number; width: number; height: number }>();

/**
 * The mark under (or behind) the current item of a menu, tabs or a segmented control. Render it inside the current
 * item only: when the current item changes, it slides from the old one to the new (FLIP, measured against the menu
 * it's in, so a scroll isn't a move).
 */
export function Indicator({ group, css }: IndicatorProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const { reduce } = useMotionSetting();
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const menu = element.closest('nav, [role=tablist], [role=radiogroup], [data-indicator-group]');
    const now = placeOf(element, menu);
    const before = lastMarks.get(group);
    if (before && !reduce) slide(element, before, now, { scale: true });
    lastMarks.set(group, now);
  });
  return <chakra.span ref={ref} aria-hidden="true" css={css} />;
}

export type PressableProps = ComponentProps<typeof chakra.div> & {
  /** Lifts a little under a mouse (cards, tiles); presses always give. */
  lift?: boolean;
};

/**
 * Feels pressable: gives a little when pressed, and with `lift`, rises a little under a mouse. Plain CSS, so it costs
 * nothing; hover only where there's a real pointer, and no movement with reduced motion.
 */
export function Pressable({ lift = false, css, ...rest }: PressableProps) {
  return (
    <chakra.div
      css={{
        transitionProperty: 'transform, box-shadow',
        transitionDuration: 'press',
        transitionTimingFunction: 'out',
        _active: { transform: 'scale(0.98)' },
        ...(lift
          ? { '@media (hover: hover) and (pointer: fine)': { _hover: { transform: 'translateY(-2px)', boxShadow: 'md' } } }
          : {}),
        '@media (prefers-reduced-motion: reduce)': { 'html:not([data-motion=full]) &': { transitionProperty: 'box-shadow', _active: { transform: 'none' }, _hover: { transform: 'none' } } },
        'html[data-motion=reduced] &': { transitionProperty: 'box-shadow', _active: { transform: 'none' }, _hover: { transform: 'none' } },
        ...css,
      }}
      {...(rest as object)}
    />
  );
}

export interface ArriveOnChangeProps extends BoxProps {
  /** When it changes (the page's address), the content arrives again: a quick fade, nothing travels. */
  token: string;
}

/**
 * Shows that the page changed without remounting it: the content fades up from a little transparent in 150 ms when the
 * token changes. Pages change many times a day, so nothing moves and it's barely there; the first render just shows.
 */
export function ArriveOnChange({ token, children, ...rest }: ArriveOnChangeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // A fade only, so it plays with less motion too; Web Animations, no library.
    ref.current?.animate?.([{ opacity: 0.55 }, { opacity: 1 }], { duration: durations.quick * 1000, easing: OUT });
  }, [token]);
  return (
    <chakra.div ref={ref} {...(rest as object)}>
      {children}
    </chakra.div>
  );
}

export interface NudgeProps {
  /** A count: when it grows, the content gives a little wiggle (a bell when a notice comes). Not when it shrinks. */
  on: number;
  children: ReactNode;
}

/** A small wiggle that says something new arrived. Never on the first render, never with reduced motion. */
export function Nudge({ on, children }: NudgeProps) {
  const { reduce } = useMotionSetting();
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef<number | null>(null);
  useEffect(() => {
    const before = last.current;
    last.current = on;
    if (before == null || on <= before || reduce) return;
    ref.current?.animate?.(
      [{ rotate: '0deg' }, { rotate: '-14deg' }, { rotate: '11deg' }, { rotate: '-7deg' }, { rotate: '4deg' }, { rotate: '0deg' }],
      { duration: durations.burst * 1000, easing: OUT },
    );
  }, [on, reduce]);
  return (
    <chakra.span ref={ref} display="inline-flex" transformOrigin="top center">
      {children}
    </chakra.span>
  );
}

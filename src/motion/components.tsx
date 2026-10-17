import { Children, isValidElement, useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { animate, AnimatePresence, LayoutGroup, m, useAnimate } from 'motion/react';
import { chakra, type HTMLChakraProps, type SystemStyleObject } from '@chakra-ui/react';
import { useTodaLocale } from '../provider/locale';
import { hiddenPose, SHOWN, staggerDelay, type Arrival } from './presets';
import { useMotionSetting } from './setting';
import { curves, durations, springs } from './tokens';

/**
 * Motion's light elements with Chakra's style props: `transition` and `layout` are Motion's here, not the CSS
 * properties of the same name. Not exported: pages use the components below, never Motion itself.
 */
const MotionDiv = chakra(m.div, {}, { forwardProps: ['transition', 'layout'] });
const MotionSpan = chakra(m.span, {}, { forwardProps: ['transition', 'layout'] });
const MotionLi = chakra(m.li, {}, { forwardProps: ['transition', 'layout'] });

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
  return (
    <LayoutGroup>
      <AnimatePresence initial={false} mode="popLayout">
        {children}
      </AnimatePresence>
    </LayoutGroup>
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
      layout="position"
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

export interface MovesProps extends BoxProps {
  /** A stable id when the same thing moves between two containers (a card from one column to another). */
  layoutId?: string;
}

/** Slides to its new place when the layout around it changes (a board card, a reordered row) instead of jumping. */
export function Moves({ layoutId, children, ...rest }: MovesProps) {
  return (
    <MotionDiv layout layoutId={layoutId} transition={springs.soft} {...(rest as object)}>
      {children}
    </MotionDiv>
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
  const write = format ?? ((n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: Number.isInteger(value) ? 0 : 1 }).format(n));

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (reduce) {
      shown.current = value;
      element.textContent = write(value);
      return;
    }
    const controls = animate(shown.current, value, {
      duration: durations.count,
      ease: curves.out,
      onUpdate: (n) => {
        shown.current = n;
        element.textContent = write(Number.isInteger(value) ? Math.round(n) : n);
      },
    });
    return () => controls.stop();
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

/**
 * The mark under (or behind) the current item of a menu, tabs or a segmented control. Render it inside the current
 * item only: when the current item changes, it slides from the old one to the new.
 */
export function Indicator({ group, css }: IndicatorProps) {
  return <MotionSpan layoutId={`toda-indicator-${group}`} transition={springs.snappy} aria-hidden="true" css={css} />;
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
  const [scope, run] = useAnimate<HTMLDivElement>();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (scope.current) void run(scope.current, { opacity: [0.55, 1] }, { duration: durations.quick, ease: curves.out });
  }, [token, run, scope]);
  return (
    <chakra.div ref={scope} {...(rest as object)}>
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
  const [scope, run] = useAnimate<HTMLSpanElement>();
  const last = useRef<number | null>(null);
  useEffect(() => {
    const before = last.current;
    last.current = on;
    if (before == null || on <= before || reduce || !scope.current) return;
    void run(scope.current, { rotate: [0, -14, 11, -7, 4, 0] }, { duration: durations.burst, ease: curves.out });
  }, [on, reduce, run, scope]);
  return (
    <chakra.span ref={scope} display="inline-flex" transformOrigin="top center">
      {children}
    </chakra.span>
  );
}

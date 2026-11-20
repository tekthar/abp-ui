import { chakra, HStack, Text } from '@chakra-ui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DirectionalIcon } from './DirectionalIcon';
import { pagesShown, type PaginationForm } from './pageList';

export interface PaginationProps {
  /** The current page, from 1. */
  page: number;
  pages: number;
  onPage: (page: number) => void;
  /** The navigation's name ("Pages"). */
  label: string;
  previous: string;
  next: string;
  /** A page button's name: "Page 4". */
  pageLabel: (page: number) => string;
  disabled?: boolean;
  /** How it reads; `numbered` when left out (step 67's pages). */
  form?: PaginationForm;
  /** Which rows of how many ("26–50 of 112"), drawn before the arrows in the simple form. */
  range?: string;
  /** "Page 3 of 200", drawn between the arrows in the compact form. */
  pageOf?: string;
}

const button = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minW: '8',
  h: '8',
  px: '2',
  borderRadius: 'l2',
  color: 'fg',
  textStyle: 'sm',
  fontVariantNumeric: 'tabular-nums',
  cursor: 'pointer',
  transitionProperty: 'background, color',
  transitionDuration: 'fast',
  focusVisibleRing: 'outside',
  _hover: { bg: 'bg.muted' },
  _disabled: { color: 'fg.subtle', cursor: 'not-allowed', bg: 'transparent' },
  _icon: { boxSize: '3.5' },
  '&[aria-current=page], &[aria-current=page]:hover': { bg: 'accent.solid', color: 'accent.contrast', fontWeight: 'bold' },
} as const;

/**
 * Pages of a list, centred under it (the canvas's v12). Numbered (UI round 9 step 67): previous, the first and last pages
 * and the ones around the current one (gaps as "…"), next, the current page filled. Simple (round 10 step 73): the
 * range, then previous and next. Compact: "Page 3 of 200" between them. One page: only the simple form's range, if any.
 */
export function Pagination({ page, pages, onPage, label, previous, next, pageLabel, disabled, form = 'numbered', range, pageOf }: PaginationProps) {
  const rangeText = form === 'simple' && range ? (
    <Text as="span" textStyle="caption" color="fg.muted" fontVariantNumeric="tabular-nums" whiteSpace="nowrap" aria-live="polite">
      {range}
    </Text>
  ) : null;
  if (pages <= 1) return rangeText ? <chakra.nav aria-label={label} display="flex" justifyContent="center">{rangeText}</chakra.nav> : null;
  const go = (n: number) => onPage(Math.min(pages, Math.max(1, n)));
  return (
    <chakra.nav aria-label={label}>
      <HStack gap="1" justify="center" wrap="wrap">
        {rangeText && (
          <chakra.span marginEnd="3" display="inline-flex">
            {rangeText}
          </chakra.span>
        )}
        <chakra.button type="button" css={button} aria-label={previous} title={previous} disabled={disabled || page <= 1} onClick={() => go(page - 1)}>
          <DirectionalIcon>
            <ChevronLeft />
          </DirectionalIcon>
        </chakra.button>
        {form === 'compact' && pageOf && (
          <Text as="span" textStyle="sm" px="1" fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
            {pageOf}
          </Text>
        )}
        {pagesShown(form, page, pages).map((n, i) =>
          n === 'gap' ? (
            <chakra.span key={`gap-${i}`} minW="5" textAlign="center" color="fg.muted" aria-hidden="true">
              …
            </chakra.span>
          ) : (
            // Page buttons stay enabled while a page loads (a second click just asks again); the arrows wait.
            <chakra.button key={n} type="button" css={button} aria-label={pageLabel(n)} aria-current={n === page ? 'page' : undefined}
              onClick={() => n !== page && go(n)}>
              {n}
            </chakra.button>
          ),
        )}
        <chakra.button type="button" css={button} aria-label={next} title={next} disabled={disabled || page >= pages} onClick={() => go(page + 1)}>
          <DirectionalIcon>
            <ChevronRight />
          </DirectionalIcon>
        </chakra.button>
      </HStack>
    </chakra.nav>
  );
}

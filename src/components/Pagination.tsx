import { chakra, HStack } from '@chakra-ui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DirectionalIcon } from './DirectionalIcon';
import { pageList } from './pageList';

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
 * Pages of a list, centred under it (the canvas's v12, UI round 9 step 67): previous, the first and last pages and the
 * ones around the current one (gaps as "…"), next. The current page is filled. One page: nothing to show.
 */
export function Pagination({ page, pages, onPage, label, previous, next, pageLabel, disabled }: PaginationProps) {
  if (pages <= 1) return null;
  const go = (n: number) => onPage(Math.min(pages, Math.max(1, n)));
  return (
    <chakra.nav aria-label={label}>
      <HStack gap="1" justify="center" wrap="wrap">
        <chakra.button type="button" css={button} aria-label={previous} title={previous} disabled={disabled || page <= 1} onClick={() => go(page - 1)}>
          <DirectionalIcon>
            <ChevronLeft />
          </DirectionalIcon>
        </chakra.button>
        {pageList(page, pages).map((n, i) =>
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

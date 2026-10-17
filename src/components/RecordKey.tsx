import { forwardRef, ViewTransition, type ReactNode } from 'react';
import { chakra, useRecipe, type HTMLChakraProps } from '@chakra-ui/react';
import { useLinkComponent } from '../provider/link';

export interface RecordKeyProps extends Omit<HTMLChakraProps<'span'>, 'children'> {
  /** The key, e.g. "PAY-41". Children win when both are given. */
  value?: string;
  children?: ReactNode;
  /** Makes the key a link (rendered with the host's link component). */
  href?: string;
  variant?: 'plain' | 'chip' | 'muted';
  size?: 'xs' | 'sm' | 'md';
  /**
   * The key moves to where the next page shows the same key (its record's header), when the person opens it
   * (ADR 0058; the browser's view transitions). Only one key per record on a page may glide: give it to a list's key
   * column, never to a parent's key or to lists that can show a record twice.
   */
  glide?: boolean;
}

/** The view transition's name for a record's key: one per record, a valid CSS name whatever the key holds. */
export const glideName = (key: string) => `toda-key-${key.toUpperCase().replace(/[^A-Z0-9_-]/g, '_')}`;

/** A record key or identifier in mono, always left-to-right, never wrapped. */
export const RecordKey = forwardRef<HTMLElement, RecordKeyProps>(function RecordKey(
  { value, children, href, variant = 'plain', size = 'sm', glide = false, css, ...rest },
  ref,
) {
  const recipe = useRecipe({ key: 'todaRecordKey' });
  const styles = recipe({ variant, size, link: Boolean(href) });
  const Link = useLinkComponent();
  const content = children ?? value;
  const key = href ? (
    <chakra.span asChild css={[styles, css]} {...rest}>
      <Link href={href} dir="ltr" ref={ref as never}>
        {content}
      </Link>
    </chakra.span>
  ) : (
    <chakra.span ref={ref as never} dir="ltr" css={[styles, css]} {...rest}>
      {content}
    </chakra.span>
  );
  // A React without view transitions (before 19.3) shows the key as it is.
  if (!glide || !value || typeof ViewTransition === 'undefined') return key;
  return (
    <ViewTransition name={glideName(value)} share="morph" default="none">
      {key}
    </ViewTransition>
  );
});

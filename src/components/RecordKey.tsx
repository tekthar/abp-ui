import { forwardRef, type ReactNode } from 'react';
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
}

/** A record key or identifier in mono, always left-to-right, never wrapped. */
export const RecordKey = forwardRef<HTMLElement, RecordKeyProps>(function RecordKey(
  { value, children, href, variant = 'plain', size = 'sm', css, ...rest },
  ref,
) {
  const recipe = useRecipe({ key: 'todaRecordKey' });
  const styles = recipe({ variant, size, link: Boolean(href) });
  const Link = useLinkComponent();
  const content = children ?? value;
  if (href) {
    return (
      <chakra.span asChild css={[styles, css]} {...rest}>
        <Link href={href} dir="ltr" ref={ref as never}>
          {content}
        </Link>
      </chakra.span>
    );
  }
  return (
    <chakra.span ref={ref as never} dir="ltr" css={[styles, css]} {...rest}>
      {content}
    </chakra.span>
  );
});

import type { ReactNode } from 'react';
import { Alert } from '@chakra-ui/react';
import type { StatusTone } from './StatusPill';

export interface InlineAlertProps extends Omit<Alert.RootProps, 'status' | 'title'> {
  tone?: Exclude<StatusTone, 'accent'>;
  title?: ReactNode;
  children?: ReactNode;
}

const statusOf = { neutral: 'neutral', success: 'success', warning: 'warning', danger: 'error', info: 'info' } as const;

/**
 * A message inside the page flow (errors from a request, results of an action). Renders
 * nothing when there is neither a title nor content, so `<InlineAlert>{error}</InlineAlert>`
 * can stay in place.
 */
export function InlineAlert({ tone = 'info', title, children, size = 'md', ...rest }: InlineAlertProps) {
  const empty = (children == null || children === false || children === '') && title == null;
  if (empty) return null;
  return (
    <Alert.Root status={statusOf[tone]} size={size} role={tone === 'danger' ? 'alert' : 'status'} {...rest}>
      <Alert.Indicator />
      <Alert.Content>
        {title != null && <Alert.Title>{title}</Alert.Title>}
        {children != null && children !== false && <Alert.Description>{children}</Alert.Description>}
      </Alert.Content>
    </Alert.Root>
  );
}

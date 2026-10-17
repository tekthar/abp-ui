import { forwardRef, type ReactElement, type ReactNode } from 'react';
import { Portal, Tooltip as ChakraTooltip } from '@chakra-ui/react';

export interface TooltipProps extends Omit<ChakraTooltip.RootProps, 'children'> {
  content: ReactNode;
  children: ReactElement;
  /** Render nothing extra when true (keeps call sites simple). */
  disabled?: boolean;
  /** Kept in place but never shown: for a tooltip that comes and goes with a state, so its trigger isn't remounted. */
  inactive?: boolean;
}

/** Short helper text on hover and focus. Never the only place important information lives. */
export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(function Tooltip(
  { content, children, disabled, inactive, openDelay = 300, closeDelay = 0, ...rest },
  ref,
) {
  if (disabled) return children;
  return (
    <ChakraTooltip.Root openDelay={openDelay} closeDelay={closeDelay} disabled={inactive} {...rest}>
      <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
      <Portal>
        <ChakraTooltip.Positioner>
          <ChakraTooltip.Content ref={ref}>{content}</ChakraTooltip.Content>
        </ChakraTooltip.Positioner>
      </Portal>
    </ChakraTooltip.Root>
  );
});

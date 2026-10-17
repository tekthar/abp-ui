import { forwardRef } from 'react';
import {
  Button as ChakraButton,
  IconButton as ChakraIconButton,
  type ButtonProps as ChakraButtonProps,
  type IconButtonProps as ChakraIconButtonProps,
} from '@chakra-ui/react';
import { useLoading } from '../skeleton/loading';
import { ghostCss } from '../skeleton/bones';

/**
 * Toda button semantics on top of Chakra's button recipe:
 *   primary    the one main action of a view (accent, solid)
 *   secondary  every other action (outlined neutral); the default
 *   ghost      low-emphasis actions in toolbars and table rows
 *   link       inline text action
 * `danger` turns any of them red for destructive actions.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface TodaButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  danger?: boolean;
}

const chakraVariant = { primary: 'solid', secondary: 'outline', ghost: 'ghost', link: 'plain' } as const;

function palette(variant: ButtonVariant, danger: boolean | undefined): string {
  if (danger) return 'danger';
  return variant === 'primary' || variant === 'link' ? 'accent' : 'neutral';
}

export type ButtonProps = Omit<ChakraButtonProps, 'variant' | 'size' | 'colorPalette'> & TodaButtonProps;

/**
 * Inside a `Loading` scope a button is drawn as its own ghost, at its size, and can't be pressed (ADR 0061). Its own
 * `loading` is Chakra's: an action is running.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', danger, type = 'button', css, ...rest },
  ref,
) {
  const skeleton = useLoading();
  return (
    <ChakraButton
      ref={ref}
      type={type}
      size={size}
      variant={chakraVariant[variant]}
      colorPalette={palette(variant, danger)}
      css={skeleton ? [ghostCss, css] : css}
      tabIndex={skeleton ? -1 : undefined}
      aria-hidden={skeleton || undefined}
      {...rest}
    />
  );
});

export type IconButtonProps = Omit<ChakraIconButtonProps, 'variant' | 'size' | 'colorPalette'> &
  TodaButtonProps & { 'aria-label': string };

/** Square icon-only button. `aria-label` is required; it is also shown as the native tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'ghost', size = 'md', danger, type = 'button', title, css, ...rest },
  ref,
) {
  const skeleton = useLoading();
  return (
    <ChakraIconButton
      ref={ref}
      type={type}
      size={size}
      variant={chakraVariant[variant]}
      colorPalette={palette(variant, danger)}
      title={title ?? rest['aria-label']}
      css={skeleton ? [ghostCss, css] : css}
      tabIndex={skeleton ? -1 : undefined}
      aria-hidden={skeleton || undefined}
      {...rest}
    />
  );
});

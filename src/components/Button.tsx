import { forwardRef } from 'react';
import {
  Button as ChakraButton,
  IconButton as ChakraIconButton,
  type ButtonProps as ChakraButtonProps,
  type IconButtonProps as ChakraIconButtonProps,
} from '@chakra-ui/react';
import { Plus } from 'lucide-react';
import { useLoading } from '../skeleton/loading';
import { ghostCss } from '../skeleton/bones';

/**
 * The design system's button semantics on top of Chakra's button recipe:
 *   primary    the one main action of a view (accent, solid)
 *   secondary  every other action (outlined neutral); the default
 *   ghost      low-emphasis actions in toolbars and table rows
 *   link       inline text action
 *   cancel     every Cancel (a dialog's, a form's, a composer's): one quiet gray fill, no border
 * `danger` turns any of them red for destructive actions.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link' | 'cancel';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface AbpButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  danger?: boolean;
}

const chakraVariant = { primary: 'solid', secondary: 'outline', ghost: 'ghost', link: 'plain', cancel: 'ghost' } as const;

/** The canvas's one Cancel look: a gray fill a step above the surface in either mode, no border, darker on hover. */
const cancelLook = {
  bg: { base: 'neutral.100', _dark: 'neutral.700' },
  color: { base: 'neutral.700', _dark: 'neutral.100' },
  _hover: { bg: { base: 'neutral.200', _dark: 'neutral.600' } },
  _active: { bg: { base: 'neutral.300', _dark: 'neutral.800' } },
  _disabled: { bg: { base: 'neutral.100', _dark: 'neutral.800' }, color: 'fg.subtle' },
} as const;

function palette(variant: ButtonVariant, danger: boolean | undefined): string {
  if (danger) return 'danger';
  return variant === 'primary' || variant === 'link' ? 'accent' : 'neutral';
}

export type ButtonProps = Omit<ChakraButtonProps, 'variant' | 'size' | 'colorPalette'> & AbpButtonProps;

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
      {...(variant === 'cancel' && !danger ? cancelLook : {})}
      css={skeleton ? [ghostCss, css] : css}
      tabIndex={skeleton ? -1 : undefined}
      aria-hidden={skeleton || undefined}
      data-variant={variant === 'cancel' ? 'cancel' : undefined}
      {...rest}
    />
  );
});

export type AddButtonProps = Omit<ButtonProps, 'variant' | 'danger'>;

/**
 * The one look for every add action (Add filter, Add column, Add condition, Add member, a create row): link-coloured
 * bold text after a plus, no fill, no border, no chevron, underlined on hover. A page's one main action stays a
 * `primary` Button; this is for the adds inside a page, a panel or a dialog.
 */
export const AddButton = forwardRef<HTMLButtonElement, AddButtonProps>(function AddButton(
  { size = 'sm', children, ...rest },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant="link"
      size={size}
      color="fg.link"
      fontWeight="bold"
      px="2"
      minH="8"
      textStyle="sm"
      _icon={{ width: '4', height: '4' }}
      data-add=""
      {...rest}
    >
      <Plus aria-hidden />
      {children}
    </Button>
  );
});

export type IconButtonProps = Omit<ChakraIconButtonProps, 'variant' | 'size' | 'colorPalette'> &
  AbpButtonProps & {
    'aria-label': string;
    /** Removing something from a list or a form (not deleting it): gray at rest, red only on hover. */
    remove?: boolean;
  };

/**
 * Square icon-only button. `aria-label` is required; it is also shown as the native tooltip. A delete (trash) icon is
 * `danger`, red at all times; taking a row out of a list is `remove`, gray until hovered.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'ghost', size = 'md', danger, remove, type = 'button', title, css, ...rest },
  ref,
) {
  const skeleton = useLoading();
  return (
    <ChakraIconButton
      ref={ref}
      type={type}
      size={size}
      variant={chakraVariant[variant]}
      colorPalette={palette(variant, danger || remove)}
      {...(remove && { color: 'fg.muted', _hover: { bg: 'colorPalette.subtle', color: 'colorPalette.fg' } })}
      title={title ?? rest['aria-label']}
      css={skeleton ? [ghostCss, css] : css}
      tabIndex={skeleton ? -1 : undefined}
      aria-hidden={skeleton || undefined}
      {...rest}
    />
  );
});

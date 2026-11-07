import type { ReactNode } from 'react';
import { chakra } from '@chakra-ui/react';

export interface IconTileProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Raised: the picked tile of a choice, on the accent. */
  active?: boolean;
  /** A colour palette for the tile (a record type's own); the soft neutral when not given. */
  palette?: string;
}

const SIZES = { sm: { box: '6', icon: '3.5' }, md: { box: '8', icon: '4' }, lg: { box: '10', icon: '5' } } as const;

/** An icon on a soft rounded square: a record's type in a list, a view's layout, a choice of layouts. */
export function IconTile({ children, size = 'md', active = false, palette }: IconTileProps) {
  const s = SIZES[size];
  return (
    <chakra.span
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      boxSize={s.box}
      borderRadius="l2"
      borderWidth="1px"
      colorPalette={palette ?? 'accent'}
      borderColor={active ? 'colorPalette.muted' : palette ? 'colorPalette.subtle' : 'border.muted'}
      bg={active ? 'colorPalette.solid' : palette ? 'colorPalette.subtle' : 'bg.muted'}
      color={active ? 'colorPalette.contrast' : palette ? 'colorPalette.fg' : 'fg.muted'}
      transition="background 0.15s, color 0.15s"
      _icon={{ boxSize: s.icon }}
      aria-hidden="true"
    >
      {children}
    </chakra.span>
  );
}

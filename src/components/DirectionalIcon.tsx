import { chakra } from '@chakra-ui/react';

/**
 * Wraps an icon that points in reading direction (arrows, chevrons, panel toggles) so it
 * mirrors in right-to-left layouts. Icons with no direction (search, user) need no wrapper.
 */
export const DirectionalIcon = chakra('span', {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    _rtl: { transform: 'scaleX(-1)' },
  },
});

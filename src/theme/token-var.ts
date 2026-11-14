import { useChakraContext } from '@chakra-ui/react';

/**
 * A token's CSS variable in the host's system, with its own prefix (`var(--…-colors-accent-solid)`): for SVG attributes
 * and Web Animations, which take no token references. Style props and recipes write `{colors.accent.solid}` instead.
 */
export function useTokenVar(): (path: string) => string {
  const system = useChakraContext();
  return (path: string) => system.token.var(path);
}

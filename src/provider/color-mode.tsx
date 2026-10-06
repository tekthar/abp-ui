import { ClientOnly, IconButton, Skeleton } from '@chakra-ui/react';
import { Moon, Sun } from 'lucide-react';
import { ThemeProvider, useTheme, type ThemeProviderProps } from 'next-themes';
import { useTodaLabels } from './labels';

export type ColorMode = 'light' | 'dark';

/** next-themes, configured the way Chakra v3 expects: a `light`/`dark` class on <html>. */
export function ColorModeProvider(props: ThemeProviderProps) {
  return <ThemeProvider attribute="class" disableTransitionOnChange enableSystem {...props} />;
}

export function useColorMode(): {
  colorMode: ColorMode | undefined;
  setColorMode: (mode: ColorMode | 'system') => void;
  toggleColorMode: () => void;
} {
  const { resolvedTheme, forcedTheme, setTheme } = useTheme();
  const colorMode = (forcedTheme ?? resolvedTheme) as ColorMode | undefined;
  return {
    colorMode,
    setColorMode: setTheme,
    toggleColorMode: () => setTheme(colorMode === 'dark' ? 'light' : 'dark'),
  };
}

/** Icon button that flips between light and dark. Renders a placeholder until mounted (no hydration mismatch). */
export function ColorModeToggle({ size = 'sm' }: { size?: 'xs' | 'sm' | 'md' }) {
  const labels = useTodaLabels();
  const { colorMode, toggleColorMode } = useColorMode();
  const box = size === 'xs' ? 'control.xs' : size === 'sm' ? 'control.sm' : 'control.md';
  return (
    <ClientOnly fallback={<Skeleton boxSize={box} />}>
      {() => (
        <IconButton
          size={size}
          variant="ghost"
          colorPalette="neutral"
          onClick={toggleColorMode}
          aria-label={labels.toggleColorMode}
          title={colorMode === 'dark' ? labels.colorModeLight : labels.colorModeDark}
        >
          {colorMode === 'dark' ? <Sun /> : <Moon />}
        </IconButton>
      )}
    </ClientOnly>
  );
}

import type { ReactNode } from 'react';
import { ChakraProvider, LocaleProvider } from '@chakra-ui/react';
import { ConfirmProvider } from '../components/ConfirmDialog';
import { Toaster } from '../components/Toaster';
import { system } from '../theme/system';
import { ColorModeProvider } from './color-mode';
import { LabelsProvider, type TodaLabels } from './labels';
import { LinkComponentProvider, type LinkComponent } from './link';
import { PluginTextsProvider } from './texts';

export interface TodaProviderProps {
  children: ReactNode;
  /** BCP 47 locale ("en", "ar"). Sets direction for every component, portals included. */
  locale?: string;
  /** Translated strings for the components' own text (close, cancel, sort ...). */
  labels?: Partial<TodaLabels>;
  /** The host router's link component (next/link in the shell). */
  linkComponent?: LinkComponent;
  /** Initial colour mode when the user has not chosen one. */
  defaultColorMode?: 'light' | 'dark' | 'system';
  /** Each plugin's texts in the current language, from the site (see usePluginTexts). */
  pluginTexts?: Record<string, Record<string, unknown>>;
}

/**
 * Chakra (with the Toda system), colour mode (next-themes, class on <html>), locale and
 * direction, labels, confirm dialogs and the toaster. The host renders it once; plugins render
 * inside it and never render their own.
 *
 * The host must also set `<html lang dir>` and `suppressHydrationWarning` on <html>.
 */
export function TodaProvider({ children, locale = 'en', labels, linkComponent, defaultColorMode = 'system', pluginTexts }: TodaProviderProps) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider defaultTheme={defaultColorMode}>
        <LocaleProvider locale={locale}>
          <LabelsProvider value={labels}>
            <LinkComponentProvider value={linkComponent}>
              <PluginTextsProvider value={pluginTexts as never}>
                <ConfirmProvider>
                  {children}
                  <Toaster />
                </ConfirmProvider>
              </PluginTextsProvider>
            </LinkComponentProvider>
          </LabelsProvider>
        </LocaleProvider>
      </ColorModeProvider>
    </ChakraProvider>
  );
}

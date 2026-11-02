import type { ReactNode } from 'react';
import { TimeZoneProvider } from './time-zone';
import { ChakraProvider, LocaleProvider } from '@chakra-ui/react';
import { ConfirmProvider } from '../components/ConfirmDialog';
import { MotionProvider } from '../motion/MotionProvider';
import type { MotionSetting } from '../motion/setting';
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
  /** The product's name in the current language, which plugins' texts say for `{product}`; Toda when not given. */
  productName?: string;
  /** The person's time zone (IANA); times show in the browser's when it's not given. */
  timeZone?: string;
  /** How much the interface moves for the person (ADR 0058); as their system says when it's not given. */
  motion?: MotionSetting;
}

/**
 * Chakra (with the Toda system), colour mode (next-themes, class on <html>), locale and
 * direction, labels, motion (reduced motion respected, ADR 0058), confirm dialogs and the toaster. The host renders it once; plugins render
 * inside it and never render their own.
 *
 * The host must also set `<html lang dir>` and `suppressHydrationWarning` on <html>.
 */
export function TodaProvider({ children, locale = 'en', labels, linkComponent, defaultColorMode = 'system', pluginTexts, productName, timeZone, motion }: TodaProviderProps) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider defaultTheme={defaultColorMode}>
        <LocaleProvider locale={locale}>
          <TimeZoneProvider value={timeZone}>
          <LabelsProvider value={labels}>
            <LinkComponentProvider value={linkComponent}>
              <PluginTextsProvider value={pluginTexts as never} product={productName}>
                <MotionProvider setting={motion}>
                  <ConfirmProvider>
                    {children}
                    <Toaster />
                  </ConfirmProvider>
                </MotionProvider>
              </PluginTextsProvider>
            </LinkComponentProvider>
          </LabelsProvider>
          </TimeZoneProvider>
        </LocaleProvider>
      </ColorModeProvider>
    </ChakraProvider>
  );
}

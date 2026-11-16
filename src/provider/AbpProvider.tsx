import type { ReactNode } from 'react';
import { TimeZoneProvider } from './time-zone';
import { ChakraProvider, LocaleProvider, type SystemContext } from '@chakra-ui/react';
import { ConfirmProvider } from '../components/ConfirmDialog';
import { MotionProvider } from '../motion/MotionProvider';
import type { MotionSetting } from '../motion/setting';
import { Toaster } from '../components/Toaster';
import { createAbpSystem } from '../theme/system';
import { ColorModeProvider } from './color-mode';
import { LabelsProvider, type AbpLabelsInput } from './labels';
import { EmotionRegistry, type ServerInsertedHTML } from './emotion-registry';
import { HostProvider, type AbpHost } from '../host/HostContext';
import { StepUpDialog } from '../host/StepUpDialog';
import { LinkComponentProvider, type LinkComponent } from './link';
import { PluginTextsProvider } from './texts';

/** The package's own look, for a host that passes no system. */
const defaultSystem = createAbpSystem();

export interface AbpProviderProps {
  children: ReactNode;
  /** The host's Chakra system (`createAbpSystem` with its prefix and brand); the package's own when not given. */
  system?: SystemContext;
  /** What the host gives the screens (`@abpjs/ui/ai` and the other areas): its requests, paths, rights and words. */
  host?: AbpHost;
  /** BCP 47 locale ("en", "ar"). Sets direction for every component, portals included. */
  locale?: string;
  /** Translated strings for the components' own text (close, cancel, sort ...). */
  labels?: AbpLabelsInput;
  /** The host router's link component (next/link in the shell). */
  linkComponent?: LinkComponent;
  /** Initial colour mode when the user has not chosen one. */
  defaultColorMode?: 'light' | 'dark' | 'system';
  /** Each plugin's texts in the current language, from the site (see usePluginTexts). */
  pluginTexts?: Record<string, Record<string, unknown>>;
  /** The product's name in the current language, which plugins' texts say for `{product}`. */
  productName?: string;
  /** The person's time zone (IANA); times show in the browser's when it's not given. */
  timeZone?: string;
  /** How much the interface moves for the person (ADR 0058); as their system says when it's not given. */
  motion?: MotionSetting;
  /**
   * The framework's hook for HTML in the page's head while it streams (Next's `useServerInsertedHTML`): with it, Emotion's
   * styles go there on the server, so the first render hydrates without a mismatch. A host that renders on the client
   * only leaves it out.
   */
  useServerInsertedHTML?: ServerInsertedHTML;
}

/**
 * Chakra (with the host's system), colour mode (next-themes, class on <html>), locale and
 * direction, labels, motion (reduced motion respected, ADR 0058), confirm dialogs and the toaster. The host renders it once; plugins render
 * inside it and never render their own.
 *
 * The host must also set `<html lang dir>` and `suppressHydrationWarning` on <html>.
 */
export function AbpProvider({ children, useServerInsertedHTML, ...props }: AbpProviderProps) {
  const tree = <AbpTree {...props}>{children}</AbpTree>;
  return useServerInsertedHTML ? <EmotionRegistry useServerInsertedHTML={useServerInsertedHTML}>{tree}</EmotionRegistry> : tree;
}

function AbpTree({ children, system = defaultSystem, host, locale = 'en', labels, linkComponent, defaultColorMode = 'system', pluginTexts, productName, timeZone, motion }: Omit<AbpProviderProps, 'useServerInsertedHTML'>) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider defaultTheme={defaultColorMode}>
        <LocaleProvider locale={locale}>
          <TimeZoneProvider value={timeZone}>
          <HostProvider value={host}>
          <LabelsProvider value={labels}>
            <LinkComponentProvider value={linkComponent}>
              <PluginTextsProvider value={pluginTexts as never} product={productName}>
                <MotionProvider setting={motion}>
                  <ConfirmProvider>
                    {children}
                    {host?.paths.guard !== undefined && host.stepUpDialog !== false && <StepUpDialog />}
                    <Toaster />
                  </ConfirmProvider>
                </MotionProvider>
              </PluginTextsProvider>
            </LinkComponentProvider>
          </LabelsProvider>
          </HostProvider>
          </TimeZoneProvider>
        </LocaleProvider>
      </ColorModeProvider>
    </ChakraProvider>
  );
}

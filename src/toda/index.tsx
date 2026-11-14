/**
 * Toda's layer on the design system (ADR 0109): its prefix (`--toda-*`, which plugins and saved looks read), its colours
 * (@todahq/tokens) and its product name, and the names Toda's web and plugins have used (`TodaProvider`,
 * `useTodaLabels`...) as aliases of the neutral ones. This folder is what `@todahq/ui` keeps once the rest is
 * `@abpjs/ui`; the aliases go two releases after that.
 */
import { accent, amber, blue, green, neutral, red } from '@todahq/tokens';
import type { AbpBrand } from '../theme/brand';
import { abpConfig, createAbpSystem } from '../theme/system';
import { AbpProvider, type AbpProviderProps } from '../provider/AbpProvider';
import { ABP_UI_VERSION } from '../version';

/** Toda's colours, as the brand the design system takes. */
export const todaBrand: AbpBrand = { neutral, accent, green, amber, red, blue };

/** Toda's raw scales, for the design reference page. */
export const scales = todaBrand;

/** Toda's config (prefix `toda`, its colours), for a host that builds its system itself. */
export const todaConfig = abpConfig({ prefix: 'toda', brand: todaBrand });

/** The one Chakra system Toda's shell and every plugin render with. */
export const system = createAbpSystem({ prefix: 'toda', brand: todaBrand });

export type TodaProviderProps = Omit<AbpProviderProps, 'system'>;

/** The provider with Toda's system, and its name for `{product}` unless the host gives the site's. */
export function TodaProvider({ productName = 'Toda', ...props }: TodaProviderProps) {
  return <AbpProvider system={system} productName={productName} {...props} />;
}

export const TODA_UI_VERSION = ABP_UI_VERSION;
export { useAbpLabels as useTodaLabels, type AbpLabels as TodaLabels } from '../provider/labels';
export { useAbpLocale as useTodaLocale } from '../provider/locale';
export { useAbpTimeZone as useTodaTimeZone } from '../provider/time-zone';

import { createSystem, defaultConfig, defineConfig, mergeConfigs, type SystemConfig, type SystemContext } from '@chakra-ui/react';
import { abpRecipes, abpSlotRecipes } from './abp-recipes';
import { defaultBrand, type AbpBrand } from './brand';
import { recipes, slotRecipes } from './recipes';
import { semanticTokens } from './semantic-tokens';
import { globalCss, layerStyles, textStyles } from './styles';
import { tokensFor } from './tokens';

export interface AbpSystemOptions {
  /** The CSS variables' prefix (`--{prefix}-colors-bg`), the host's own; `abp` when not given. */
  prefix?: string;
  /** The host's colours; the package's neutral ones when not given. */
  brand?: AbpBrand;
  /** More of the host's own config, merged last (its tokens, recipes, global CSS). */
  config?: SystemConfig;
}

/** The design system's config for a prefix and a brand: for a host that builds its system itself. */
export function abpConfig({ prefix = 'abp', brand = defaultBrand }: Pick<AbpSystemOptions, 'prefix' | 'brand'> = {}): SystemConfig {
  return defineConfig({
    cssVarsPrefix: prefix,
    globalCss,
    theme: {
      tokens: tokensFor(prefix, brand),
      semanticTokens,
      textStyles,
      layerStyles,
      recipes: { ...recipes, ...abpRecipes },
      slotRecipes: { ...slotRecipes, ...abpSlotRecipes },
    },
  });
}

/** The Chakra system a host renders with (ADR 0109): its prefix and brand on the design system's tokens and recipes. */
export function createAbpSystem(options: AbpSystemOptions = {}): SystemContext {
  const base = abpConfig(options);
  return createSystem(defaultConfig, options.config ? mergeConfigs(base, options.config) : base);
}

import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';
import { todaRecipes, todaSlotRecipes } from './toda-recipes';
import { recipes, slotRecipes } from './recipes';
import { semanticTokens } from './semantic-tokens';
import { globalCss, layerStyles, textStyles } from './styles';
import { tokens } from './tokens';

/**
 * The Toda system config. Exported on its own so a host can extend it
 * (`createSystem(defaultConfig, todaConfig, hostConfig)`) without forking the package.
 */
export const todaConfig = defineConfig({
  cssVarsPrefix: 'toda',
  globalCss,
  theme: {
    tokens,
    semanticTokens,
    textStyles,
    layerStyles,
    recipes: { ...recipes, ...todaRecipes },
    slotRecipes: { ...slotRecipes, ...todaSlotRecipes },
  },
});

/** The one Chakra system the shell and every plugin render with. */
export const system = createSystem(defaultConfig, todaConfig);

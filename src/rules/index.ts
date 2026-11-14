/**
 * The design system's rules with no React and no Chakra (ADR 0109, decision 3): a query's conditions as the filter
 * builder writes them, a grouped query's rows, a long breadcrumb trail folded, and settings in order. The package's
 * `./rules` entry, for code that can't load Chakra (a phone app bundles them).
 */
export { foldBreadcrumbs } from './breadcrumbs';
export { LIST_OPS, NO_VALUE_OPS, mergeSameField, parseValue, valueText, type QueryConditionJson, type QueryField } from './conditions';
export { groupKey, inGroups, periodName } from './grouping';
export { findSettingsPage, heavierFirst, inSections, settingsArea, type MaybeVisible, type SettingsPageLike, type SettingsSectionLike } from './settings';

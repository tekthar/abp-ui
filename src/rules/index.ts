/**
 * The design system's rules with no React and no Chakra (ADR 0109, decision 3): a query's conditions as the filter
 * builder writes them, a grouped query's rows, and a long breadcrumb trail folded. `@todahq/ui/rules` (later
 * `@abpjs/ui/rules`); the client package bundles them for the phone, which can't load Chakra.
 */
export { foldBreadcrumbs } from './breadcrumbs';
export { LIST_OPS, NO_VALUE_OPS, mergeSameField, parseValue, valueText, type QueryConditionJson, type QueryField } from './conditions';
export { groupKey, inGroups, periodName } from './grouping';
export { findSettingsPage, heavierFirst, inSections, settingsArea, type MaybeVisible, type SettingsPageLike, type SettingsSectionLike } from './settings';

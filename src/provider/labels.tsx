import { createContext, useContext, type ReactNode } from 'react';

/**
 * Every string the components render on their own. The package ships English defaults and
 * knows nothing about i18n libraries: the host passes translated labels to AbpProvider.
 */
export interface AbpLabels {
  close: string;
  cancel: string;
  confirm: string;
  /** A confirm that needs a word typed first (deleting a project), `{value}` being the word. Optional: English by default. */
  typeToConfirm?: string;
  /** A wide form dialog's aside, what the form makes as it's filled in. Optional: English by default. */
  preview?: string;
  /** A page edited in place with unsaved changes (`SaveBar`): its question, the waiting changes (`{count}`, ICU plural), Discard and Save. Optional: English by default. */
  saveBar?: string;
  unsavedChanges?: string;
  discard?: string;
  save?: string;
  retry: string;
  loading: string;
  noData: string;
  navigation: string;
  breadcrumb: string;
  /** The folded middle of a long breadcrumb trail. */
  moreBreadcrumbs: string;
  skipToContent: string;
  openNavigation: string;
  collapseSidebar: string;
  expandSidebar: string;
  toggleColorMode: string;
  colorModeLight: string;
  colorModeDark: string;
  sortAscending: string;
  sortDescending: string;
  path: string;
  /** A form's field that's required and empty. */
  formRequired: string;
  /** Above a form with wrong fields, `{count}` of them (ICU plural). */
  formFix: string;
  queryList: QueryListLabels;
  translations: TranslationsLabels;
  picker: PickerLabels;
}

/** Strings of SearchPicker, PersonPicker and GroupPicker. `{count}` is filled in (ICU plural). */
export interface PickerLabels {
  placeholder: string;
  searching: string;
  noMatches: string;
  /** Nothing to offer when nothing can be searched. */
  noKnown: string;
  /** Above the options: how many match what's typed. */
  matches: string;
  /** Above the options when there are more than shown. */
  firstMatches: string;
  searchPeople: string;
  /** A person picker with no search: the people on the page. */
  choosePerson: string;
  noPeople: string;
  noKnownPeople: string;
  searchGroups: string;
  noGroups: string;
}

export const defaultPickerLabels: PickerLabels = {
  placeholder: 'Search…',
  searching: 'Searching…',
  noMatches: 'Nothing matches',
  noKnown: 'Nothing to choose from',
  matches: '{count, plural, one {# match} other {# matches}}',
  firstMatches: 'The first {count} matches',
  searchPeople: 'Search people…',
  choosePerson: 'Choose someone…',
  noPeople: 'No one matches.',
  noKnownPeople: 'No one to choose from.',
  searchGroups: 'Search groups…',
  noGroups: 'No groups match',
};

/** Strings of TranslatedInput. {name}, {filled}, {total}, {shown} are filled in by the component. */
export interface TranslationsLabels {
  /** Above the other languages' fields. */
  title: string;
  /** The button that opens them, for a screen reader. */
  open: string;
  /** The button's tooltip. */
  count: string;
  /** Under a language left empty: which name shows instead. */
  missing: string;
  /** The list of names already translated. */
  suggestions: string;
}

export const defaultTranslationsLabels: TranslationsLabels = {
  title: 'Name in other languages',
  open: 'Translations of “{name}”: {filled} of {total} languages',
  count: '{filled} of {total} other languages filled in',
  missing: 'Not given: shows “{shown}”',
  suggestions: 'Translations already made',
};

/** Strings of QueryableList. {name} placeholders are filled in by the component. */
export interface QueryListLabels {
  savedView: string;
  group: string;
  sortBy: string;
  sortField: string;
  defaultOrder: string;
  sortAscending: string;
  sortDescending: string;
  search: string;
  searchPlaceholder: string;
  visibleColumns: string;
  hiddenColumns: string;
  showAllColumns: string;
  columnsHint: string;
  dragColumn: string;
  expandAll: string;
  collapseAll: string;
  foldGroup: string;
  unfoldGroup: string;
  noGroupValue: string;
  /** A row's grip in a grouped list: its menu's title, the groups it can go to under it. */
  moveToGroup?: string;
  views: string;
  unsavedView: string;
  saveView: string;
  viewName: string;
  save: string;
  cancel: string;
  deleteView: string;
  groupBy: string;
  /** "Group by {field}" */
  groupByField: string;
  noGrouping: string;
  /** The group menu's second field (grouped by two fields). */
  thenBy: string;
  noSecondGrouping: string;
  /** A row's menu in rank order: "Move up", "Move down". */
  moveUp: string;
  moveDown: string;
  /** A week's group: "Week of {day}". */
  periodWeek: string;
  /** A quarter's group: "Q{quarter} {year}". */
  periodQuarter: string;
  groups: string;
  filterToGroup: string;
  columns: string;
  filterMode: string;
  basic: string;
  rql: string;
  rqlLabel: string;
  rqlPlaceholder: string;
  run: string;
  suggestions: string;
  addFilter: string;
  buildFilters: string;
  clearAll: string;
  matchAll: string;
  sameFieldAny: string;
  noConditions: string;
  addCondition: string;
  activeFilters: string;
  noneActive: string;
  matchCount: string;
  matchCountOnly: string;
  incompleteSkipped: string;
  applyFilters: string;
  incomplete: string;
  /** "Remove the {field} filter" */
  removeFilter: string;
  field: string;
  operator: string;
  value: string;
  valuesHint: string;
  add: string;
  /** "{from}–{to} of {total}" */
  range: string;
  previous: string;
  next: string;
  /** The pagination's name, and a page button's: "Page {page}". */
  pages: string;
  page: string;
  /** The compact pagination's "Page {page} of {pages}". */
  pageOf: string;
  empty: string;
  export: string;
  exportCsv: string;
  exportExcel: string;
  exporting: string;
  /** "The file holds {rows} of {total} rows: an export stops at {limit}." */
  exportCut: string;
  exportFailed: string;
  dismiss: string;
  /** Operator names by JSON-form op: eq, ne, in, notIn, contains… */
  operators: Record<string, string>;
  /** Comparisons as they read for numbers ("is at least") rather than dates ("is on or after"). */
  numberOperators: Record<string, string>;
  /** Suggestion kinds: field, operator, value, function, keyword, person. */
  kinds: Record<string, string>;
}

export const defaultQueryListLabels: QueryListLabels = {
  savedView: 'Saved view',
  group: 'Group:',
  sortBy: 'Sort',
  sortField: 'Sort: {field}',
  defaultOrder: 'Default order',
  sortAscending: 'Ascending: reverse the order',
  sortDescending: 'Descending: reverse the order',
  search: 'Search',
  searchPlaceholder: 'Search titles',
  visibleColumns: 'Visible columns',
  hiddenColumns: 'Other fields',
  showAllColumns: 'Show all',
  columnsHint: 'Drag to reorder. One column always stays.',
  dragColumn: 'Move {field}',
  expandAll: 'Expand all',
  collapseAll: 'Collapse all',
  foldGroup: 'Fold {group}',
  unfoldGroup: 'Unfold {group}',
  noGroupValue: 'None',
  moveToGroup: 'Move to',
  views: 'Saved views',
  unsavedView: 'Unsaved view',
  saveView: 'Save view',
  viewName: 'View name',
  save: 'Save',
  cancel: 'Cancel',
  deleteView: 'Delete this view',
  groupBy: 'Group by',
  groupByField: 'Group by {field}',
  noGrouping: 'No grouping',
  thenBy: 'Then by',
  noSecondGrouping: 'Nothing more',
  moveUp: 'Move up',
  moveDown: 'Move down',
  periodWeek: 'Week of {day}',
  periodQuarter: 'Q{quarter} {year}',
  groups: 'Groups',
  filterToGroup: 'Show only this group',
  columns: 'Columns',
  filterMode: 'Filter mode',
  basic: 'Basic',
  rql: 'RQL',
  rqlLabel: 'Query (RQL)',
  rqlPlaceholder: 'type = story AND status IN (open, in-progress) ORDER BY updatedAt DESC',
  run: 'Run',
  suggestions: 'Suggestions',
  addFilter: 'Add filter',
  buildFilters: 'Build your filters',
  clearAll: 'Clear all',
  matchAll: 'Match records that meet all of these conditions.',
  sameFieldAny: 'Conditions on the same field match any of their values.',
  noConditions: 'No conditions yet. Add one to narrow the records.',
  addCondition: 'Add condition',
  activeFilters: 'Active filters',
  noneActive: 'None — all records are shown',
  matchCount: '{count} records match of {total}',
  matchCountOnly: '{count} records match',
  incompleteSkipped: 'incomplete conditions are skipped',
  applyFilters: 'Apply filters',
  incomplete: 'Choose a value or remove this condition',
  removeFilter: 'Remove the {field} filter',
  field: 'Field',
  operator: 'Operator',
  value: 'Value',
  valuesHint: 'Values, separated by commas',
  add: 'Add',
  range: '{from}–{to} of {total}',
  previous: 'Previous page',
  next: 'Next page',
  pages: 'Pages',
  page: 'Page {page}',
  pageOf: 'Page {page} of {pages}',
  empty: 'Nothing matches this query.',
  export: 'Export',
  exportCsv: 'CSV (.csv)',
  exportExcel: 'Excel (.xlsx)',
  exporting: 'Exporting…',
  exportCut: 'The file holds {rows} of {total} rows: an export stops at {limit}. Narrow the query to get the rest.',
  exportFailed: 'The export failed',
  dismiss: 'Dismiss',
  operators: {
    eq: 'is',
    ne: 'is not',
    in: 'is any of',
    notIn: 'is none of',
    lt: 'is before',
    lte: 'is on or before',
    gt: 'is after',
    gte: 'is on or after',
    between: 'is between',
    contains: 'contains',
    notContains: 'doesn’t contain',
    isEmpty: 'is empty',
    isNotEmpty: 'is not empty',
    hasAny: 'has any of',
    hasAll: 'has all of',
  },
  numberOperators: { lt: 'is less than', lte: 'is at most', gt: 'is more than', gte: 'is at least' },
  kinds: { field: 'field', operator: 'operator', value: 'value', function: 'function', keyword: 'keyword', person: 'person' },
};

export const defaultLabels: AbpLabels = {
  close: 'Close',
  typeToConfirm: 'Type {value} to confirm',
  preview: 'Preview',
  saveBar: 'Save your changes?',
  unsavedChanges: "{count, plural, one {# change isn't saved yet} other {# changes aren't saved yet}}",
  discard: 'Discard',
  save: 'Save',
  cancel: 'Cancel',
  confirm: 'Confirm',
  retry: 'Retry',
  loading: 'Loading',
  noData: 'Nothing to show yet.',
  navigation: 'Main navigation',
  breadcrumb: 'Breadcrumb',
  moreBreadcrumbs: 'Show the levels between',
  skipToContent: 'Skip to content',
  openNavigation: 'Open navigation',
  collapseSidebar: 'Collapse sidebar',
  expandSidebar: 'Expand sidebar',
  toggleColorMode: 'Toggle colour mode',
  colorModeLight: 'Light',
  colorModeDark: 'Dark',
  sortAscending: 'Sort ascending',
  sortDescending: 'Sort descending',
  path: 'Path',
  formRequired: 'Fill this in',
  formFix: '{count, plural, one {Fix this field before saving} other {Fix these # fields before saving}}',
  queryList: defaultQueryListLabels,
  translations: defaultTranslationsLabels,
  picker: defaultPickerLabels,
};

const LabelsContext = createContext<AbpLabels>(defaultLabels);

/**
 * The labels a host gives: any of them, and any of a group's (the query list's, the pickers', the translations'); the
 * rest are the defaults, so a group the package adds later needs nothing from a host that doesn't use it.
 */
export type AbpLabelsInput = Partial<Omit<AbpLabels, 'queryList' | 'translations' | 'picker'>> & {
  queryList?: Partial<QueryListLabels>;
  translations?: Partial<TranslationsLabels>;
  picker?: Partial<PickerLabels>;
};

export function LabelsProvider({ value, children }: { value?: AbpLabelsInput; children: ReactNode }) {
  const merged = {
    ...defaultLabels,
    ...value,
    queryList: { ...defaultQueryListLabels, ...value?.queryList },
    translations: { ...defaultTranslationsLabels, ...value?.translations },
    picker: { ...defaultPickerLabels, ...value?.picker },
  };
  return <LabelsContext.Provider value={merged}>{children}</LabelsContext.Provider>;
}

export function useAbpLabels(): AbpLabels {
  return useContext(LabelsContext);
}

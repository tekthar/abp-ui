import { createContext, useContext, type ReactNode } from 'react';

/**
 * Every string the components render on their own. The package ships English defaults and
 * knows nothing about i18n libraries: the host passes translated labels to TodaProvider.
 */
export interface TodaLabels {
  close: string;
  cancel: string;
  confirm: string;
  retry: string;
  loading: string;
  noData: string;
  navigation: string;
  breadcrumb: string;
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
  queryList: QueryListLabels;
}

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
  removeFilter: 'Remove the {field} filter',
  field: 'Field',
  operator: 'Operator',
  value: 'Value',
  valuesHint: 'Values, separated by commas',
  add: 'Add',
  range: '{from}–{to} of {total}',
  previous: 'Previous page',
  next: 'Next page',
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

export const defaultLabels: TodaLabels = {
  close: 'Close',
  cancel: 'Cancel',
  confirm: 'Confirm',
  retry: 'Retry',
  loading: 'Loading',
  noData: 'Nothing to show yet.',
  navigation: 'Main navigation',
  breadcrumb: 'Breadcrumb',
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
  queryList: defaultQueryListLabels,
};

const LabelsContext = createContext<TodaLabels>(defaultLabels);

export function LabelsProvider({ value, children }: { value?: Partial<TodaLabels>; children: ReactNode }) {
  const merged = { ...defaultLabels, ...value, queryList: { ...defaultQueryListLabels, ...value?.queryList } };
  return <LabelsContext.Provider value={merged}>{children}</LabelsContext.Provider>;
}

export function useTodaLabels(): TodaLabels {
  return useContext(LabelsContext);
}

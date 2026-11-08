import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Box, chakra, HStack, Input, Menu, Portal, Stack, Text } from '@chakra-ui/react';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown, ChevronLeft, ChevronRight, Download, Filter, Plus, Rows3, Save, Trash2, X } from 'lucide-react';
import { useTodaLabels } from '../provider/labels';
import { useFormatters } from '../utils/format';
import { Button, IconButton } from './Button';
import { CountBadge } from './CountBadge';
import { ColumnsPopover } from './query/ColumnsPopover';
import { groupKey } from './query/grouping';
import { SearchInput } from './SearchInput';
import { SegmentedControl } from './SegmentedControl';
import { DataTable, type DataTableColumn, type DataTableSelection, type DataTableSort } from './DataTable';
import { DirectionalIcon } from './DirectionalIcon';
import { SelectField } from './Field';
import { InlineAlert } from './InlineAlert';
import { Panel } from './Panel';
import { useLoading } from '../skeleton/loading';

/** A field a query can use, as GET /api/query/{entity}/fields returns it. */
export interface QueryField {
  id: string;
  kind: string;
  label: string;
  sortable: boolean;
  groupable: boolean;
  /** JSON-form operator names: eq, ne, in, notIn, contains, isEmpty… */
  operators: string[];
}

export interface QuerySuggestion {
  text: string;
  label: string;
  kind: string;
  detail?: string | null;
}

export interface QuerySuggestions {
  replaceStart: number;
  replaceEnd: number;
  items: QuerySuggestion[];
}

export interface QueryGroup {
  value: string | null;
  label: string;
  count: number;
}

export interface QueryRow {
  id: string;
  key: string;
  values: Record<string, unknown>;
}

/** The JSON form of a query (ADR 0013): { where, groupBy, orderBy }. */
export type QueryJson = {
  where?: QueryNodeJson | null;
  groupBy?: { field: string; aggregates?: unknown[] } | null;
  orderBy?: { field: string; desc?: boolean }[];
};

export type QueryNodeJson = { and: QueryNodeJson[] } | { or: QueryNodeJson[] } | { not: QueryNodeJson } | QueryConditionJson | Record<string, unknown>;

export interface QueryConditionJson {
  field: string;
  op: string;
  value?: unknown;
}

/**
 * What the list shows: a query (as RQL text, or as JSON when the list just changed it) and the columns. The host keeps
 * it in the URL and runs it; the list never fetches.
 */
export interface QueryableListState {
  rql?: string;
  query?: QueryJson;
  columns: string[];
}

export interface QueryableListView {
  id: string;
  name: string;
  isOwner: boolean;
}

/** The files an export can be: CSV, or an Excel workbook. */
export type QueryExportFormat = 'csv' | 'xlsx';

/** What an export held (from the response's headers): rows in the file, rows that matched, and the limit that cut it. */
export interface QueryableListExport {
  rows: number;
  total: number;
  limit: number;
  truncated: boolean;
}

export interface QueryableListError {
  message: string;
  /** Where in the RQL the problem is, when the server knows. */
  start?: number;
  end?: number;
}

/**
 * A field's own control for a filter's value in the basic search (a field type's filter component, ADR 0077): it gets the
 * field, the operator and the value so far, and gives the value the condition takes (a list for in, has any…). Null
 * keeps the text box with its suggestions.
 */
export type QueryValueEditor = (props: { field: QueryField; op: string; value: unknown; onChange: (value: unknown) => void }) => ReactNode | null;

export interface QueryableListProps {
  'aria-label': string;
  /** undefined while loading. */
  fields: QueryField[] | undefined;
  state: QueryableListState;
  onStateChange: (next: QueryableListState) => void;
  /** The last result: rows, total, groups, and the query the server ran (canonical RQL and JSON). */
  result?: { total: number; items: QueryRow[]; groups?: QueryGroup[] | null; rql: string; query: QueryJson } | null;
  /** Its rows are coming (ADR 0061): a page of placeholder rows, each column's by its field. The nearest `Loading` scope's when not given. */
  loading?: boolean;
  error?: QueryableListError | null;
  renderCell: (columnId: string, value: unknown, row: QueryRow) => ReactNode;
  /** Draws a row its own way, across every column (a plugin's row view); null draws its cells. */
  renderRow?: (row: QueryRow) => ReactNode | null;
  /** One selected row, moved with the keyboard (↑ ↓ Home End), opened with Enter. */
  selection?: DataTableSelection<QueryRow>;
  /** RQL autocomplete at the caret; without it the RQL box is a plain input. */
  suggest?: (rql: string, caret: number) => Promise<QuerySuggestions>;
  /** A field's own value control in the basic search; without it, or when it gives null, the text box. */
  renderValueEditor?: QueryValueEditor;
  skip: number;
  take: number;
  onSkipChange: (skip: number) => void;
  views?: QueryableListView[];
  activeViewId?: string | null;
  onSelectView?: (id: string | null) => void;
  onSaveView?: (name: string, replaceId: string | null) => void;
  onDeleteView?: (id: string) => void;
  /**
   * Downloads what the list shows (its query and columns, every page) as a file; without it there's no Export menu.
   * Resolves with what the file held, so the list can say when it was cut short; a rejection is shown as an error.
   */
  onExport?: (format: QueryExportFormat) => Promise<QueryableListExport | void>;
  /** Extra buttons on the toolbar (e.g. "Create record"). */
  actions?: ReactNode;
  empty?: ReactNode;
  /** At the toolbar's start, before the saved views: the host's layout switch (List, Board, Timeline). */
  leading?: ReactNode;
  /** At the end of the filter row: what needs attention, as chips that filter ("1 Overdue", "2 Due in 7 days"). */
  attention?: ReactNode;
  /**
   * A quick search box in the basic filters: what's typed becomes a "contains" condition on this field (a record's
   * title), shown in the box rather than as a chip. With `keyField`, text shaped like a key ("FIN-12") looks for that
   * key instead (an "equals" on that field). Without it there's no box.
   */
  search?: { field: string; placeholder?: string; keyField?: string };
  /** Where the Export menu goes when not on the toolbar: the page header's actions (an element the host holds). */
  exportTarget?: HTMLElement | null;
  /** A column's header other than its field's name (the records list's "Record" over its titles). */
  columnLabels?: Record<string, ReactNode>;
  /** A row after each group's rows in a grouped list ("Create record" in that group); null for none. */
  renderGroupFooter?: (group: { field: string; value: string | null; label: string }) => ReactNode | null;
  /** After a group's name and count in its header: what else to say of the group ("1 overdue"); null for nothing. */
  renderGroupAside?: (group: { field: string; value: string | null; label: string }) => ReactNode | null;
  /**
   * Rows that move to another group while the list is grouped by `field` (a record to another status): each row's grip
   * drags onto a group's header, or opens a menu of the groups. `accepts` leaves out groups a row can't go to.
   */
  /**
   * Grouped by this field (parent), the list is a tree: each record under its parent, folding, at any depth. `context`
   * are parents the search left out, shown dimmed so their children sit under them; `contextLabel` says so to screen readers.
   */
  tree?: { field: string; context?: QueryRow[]; contextLabel: string };
  moveToGroup?: {
    field: string;
    label: (row: QueryRow) => string;
    accepts?: (row: QueryRow, group: QueryGroup) => boolean;
    onMove: (row: QueryRow, group: QueryGroup) => void;
  };
}

/** Text shaped like a record's key: letters (and digits) before a dash and a number, "FIN-12". */
const KEY_SHAPE = /^[A-Za-z][A-Za-z0-9_]*-\d+$/;

const NO_VALUE_OPS = new Set(['isEmpty', 'isNotEmpty']);
const LIST_OPS = new Set(['in', 'notIn', 'hasAny', 'hasAll', 'between']);

function isCondition(node: unknown): node is QueryConditionJson {
  return typeof node === 'object' && node !== null && 'field' in node && 'op' in node;
}

/** The flat AND of plain conditions the basic filters can show, or null when the query is more than that. */
export function basicConditions(where: QueryNodeJson | null | undefined): QueryConditionJson[] | null {
  if (!where) return [];
  if (isCondition(where)) return [where];
  if ('and' in where && Array.isArray(where.and) && where.and.every(isCondition)) return where.and as QueryConditionJson[];
  return null;
}

function valueText(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(valueText).join(', ');
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (typeof v.fn === 'string') return `${v.fn}(${Array.isArray(v.args) ? v.args.map(valueText).join(', ') : ''})`;
    if (typeof v.field === 'string') return `field(${v.field})`;
    if ('query' in v) return '(…)';
  }
  return String(value);
}

/** "currentUser()" becomes a function value; anything else stays text. */
function parseValue(text: string): unknown {
  const call = /^([A-Za-z]\w*)\((.*)\)$/.exec(text.trim());
  if (call) {
    const args = call[2].trim() === '' ? [] : call[2].split(',').map((a) => (Number.isFinite(Number(a.trim())) ? Number(a.trim()) : a.trim()));
    return { fn: call[1], args };
  }
  return text.trim();
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`));
}

/**
 * The dynamic list (catalog §6): basic filters or RQL with autocomplete, columns, server-side sort, grouping with
 * counts, saved views and paging, over any entity the query engine serves. Controlled: the host runs the query and
 * keeps the state in the URL.
 */
export function QueryableList({
  'aria-label': ariaLabel,
  fields,
  state,
  onStateChange,
  result,
  loading: own,
  error,
  renderCell,
  renderRow,
  selection,
  suggest,
  renderValueEditor,
  skip,
  take,
  onSkipChange,
  views,
  activeViewId,
  onSelectView,
  onSaveView,
  onDeleteView,
  onExport,
  actions,
  empty,
  leading,
  attention,
  search,
  renderGroupFooter,
  renderGroupAside,
  moveToGroup,
  tree,
  columnLabels,
  exportTarget,
}: QueryableListProps) {
  const labels = useTodaLabels().queryList;
  const fmt = useFormatters();
  const byId = useMemo(() => new Map((fields ?? []).map((f) => [f.id, f])), [fields]);
  const query: QueryJson = result?.query ?? state.query ?? {};
  const conditions = basicConditions(query.where ?? null);
  const [mode, setMode] = useState<'basic' | 'rql'>(conditions === null ? 'rql' : 'basic');
  const [adding, setAdding] = useState(false);
  const [naming, setNaming] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<{ tone: 'warning' | 'danger'; message: string } | null>(null);

  const complex = conditions === null;
  const failed = Boolean(error && state.rql);
  useEffect(() => {
    // A query the basic filters can't show, or one that failed: the RQL box shows it as typed.
    if (complex || failed) setMode('rql');
  }, [complex, failed]);

  const label = (id: string) => byId.get(id)?.label ?? id;
  const opLabel = (op: string, field?: string) => (byId.get(field ?? '')?.kind === 'number' ? labels.numberOperators[op] : undefined) ?? labels.operators[op] ?? op;
  const change = (next: QueryJson) => onStateChange({ query: next, columns: state.columns });

  function setConditions(next: QueryConditionJson[]) {
    change({ ...query, where: next.length === 0 ? null : next.length === 1 ? next[0] : { and: next } });
  }

  const sort: DataTableSort | null = query.orderBy?.[0] ? { columnId: query.orderBy[0].field, direction: query.orderBy[0].desc ? 'desc' : 'asc' } : null;
  const loading = useLoading(own);
  const columns: DataTableColumn<QueryRow>[] = state.columns.map((id) => ({
    id,
    header: columnLabels?.[id] ?? label(id),
    cell: (row) => renderCell(id, row.values[id], row),
    // Manual sort: the column reports the change and the server orders the rows.
    sortValue: byId.get(id)?.sortable ? () => null : undefined,
    nowrap: id !== 'title',
    skeleton: placeholderOf(id, byId.get(id)?.kind),
  }));

  const total = result?.total ?? 0;
  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(skip + take, total);
  const groupable = (fields ?? []).filter((f) => f.groupable);
  const activeView = views?.find((v) => v.id === activeViewId) ?? null;

  async function runExport(format: QueryExportFormat) {
    if (!onExport) return;
    setExporting(true);
    setExported(null);
    try {
      const done = await onExport(format);
      if (done?.truncated) {
        setExported({
          tone: 'warning',
          message: fill(labels.exportCut, { rows: fmt.number(done.rows), total: fmt.number(done.total), limit: fmt.number(done.limit) }),
        });
      }
    } catch (e) {
      setExported({ tone: 'danger', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setExporting(false);
    }
  }

  const groupField = query.groupBy?.field ?? null;
  const [folded, setFolded] = useState<Set<string>>(() => new Set());
  useEffect(() => setFolded(new Set()), [groupField]);
  const grouped = Boolean(groupField && result?.groups && result.groups.length > 0);
  // Grouped by the tree's field (parent), the rows are a hierarchy rather than groups.
  const asTree = Boolean(tree && groupField === tree.field);
  const groupOf = (row: QueryRow) => groupKey(groupField ? row.values[groupField] : null);
  const groupInfo = (key: string) => result?.groups?.find((g) => groupKey(g.value) === key);
  const groupKeys = useMemo(() => [...new Set((result?.items ?? []).map((r) => groupKey(groupField ? r.values[groupField] : null)))], [result, groupField]);

  // The quick search: a "contains" condition on its field, shown in the box rather than as a chip.
  const searching = search && conditions
    ? conditions.findIndex((c) => (c.field === search.field && c.op === 'contains') || (search.keyField != null && c.field === search.keyField && c.op === 'eq'))
    : -1;
  const searchText = searching >= 0 && conditions ? valueText(conditions[searching].value) : '';
  const chips = (conditions ?? []).map((c, i) => ({ c, i })).filter(({ i }) => i !== searching);
  function runSearch(text: string) {
    if (!search || !conditions) return;
    const rest = conditions.filter((_, i) => i !== searching);
    const typed = text.trim();
    const asKey = search.keyField != null && KEY_SHAPE.test(typed);
    setConditions(typed ? [...rest, asKey ? { field: search.keyField!, op: 'eq', value: typed.toUpperCase() } : { field: search.field, op: 'contains', value: typed }] : rest);
  }

  const sortable = (fields ?? []).filter((f) => f.sortable);
  const groupLabel = groupField ? label(groupField) : null;

  return (
    <Stack gap="3">
      <chakra.div layerStyle="panel" borderRadius="l3" data-query-toolbar="">
        <HStack gap="2" wrap="wrap" justify="space-between" px="2.5" py="2" borderBottomWidth="1px" borderColor="border.muted">
          <HStack gap="2" wrap="wrap" minW="0">
            {leading}
            {leading != null && views && onSelectView && <chakra.span w="1px" h="6" bg="border" mx="1" aria-hidden />}
            {views && onSelectView && (
              <HStack gap="2">
                <Text as="span" textStyle="xs" fontWeight="semibold" color="fg.muted" whiteSpace="nowrap" hideBelow="2xl">{labels.savedView}</Text>
                <SelectField
                  width="auto"
                  size="sm"
                  aria-label={labels.views}
                  value={activeViewId ?? ''}
                  onChange={(e) => onSelectView(e.target.value || null)}
                  options={[{ value: '', label: labels.unsavedView }, ...views.map((v) => ({ value: v.id, label: v.name }))]}
                />
              </HStack>
            )}
            {onSaveView &&
              (naming === null ? (
                <Button size="sm" variant="ghost" color="fg.accent" onClick={() => setNaming(activeView?.isOwner ? activeView.name : '')}>
                  <Save />
                  {labels.saveView}
                </Button>
              ) : (
                <HStack gap="1" as="form" onSubmit={(e) => {
                  e.preventDefault();
                  if (naming.trim()) onSaveView(naming.trim(), activeView?.isOwner && naming.trim() === activeView.name ? activeView.id : null);
                  setNaming(null);
                }}>
                  <Input size="sm" autoFocus aria-label={labels.viewName} placeholder={labels.viewName} value={naming} onChange={(e) => setNaming(e.target.value)} maxW="56" />
                  <Button size="sm" type="submit" variant="primary" disabled={!naming.trim()}>
                    {labels.save}
                  </Button>
                  <IconButton size="sm" variant="ghost" aria-label={labels.cancel} onClick={() => setNaming(null)}>
                    <X />
                  </IconButton>
                </HStack>
              ))}
            {activeView?.isOwner && onDeleteView && naming === null && (
              <IconButton size="sm" variant="ghost" aria-label={labels.deleteView} onClick={() => onDeleteView(activeView.id)}>
                <Trash2 />
              </IconButton>
            )}
          </HStack>
          <HStack gap="2" wrap="wrap">
            <Menu.Root positioning={{ placement: 'bottom-end' }}>
              <Menu.Trigger asChild>
                <Button size="sm" variant="secondary" aria-label={labels.groupBy} disabled={groupable.length === 0}>
                  <Rows3 />
                  <Text as="span" color="fg.muted" fontWeight="normal">{labels.group}</Text>
                  {groupLabel ?? labels.noGrouping}
                  <ChevronDown />
                </Button>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content minW="48">
                    <Menu.RadioItemGroup value={groupField ?? ''}
                      onValueChange={(d) => change({ ...query, groupBy: d.value ? { field: d.value, aggregates: [] } : null })}>
                      <Menu.RadioItem value="">
                        {labels.noGrouping}
                        <Menu.ItemIndicator />
                      </Menu.RadioItem>
                      {groupable.map((f) => (
                        <Menu.RadioItem key={f.id} value={f.id}>
                          {f.label}
                          <Menu.ItemIndicator />
                        </Menu.RadioItem>
                      ))}
                    </Menu.RadioItemGroup>
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
            <ColumnsPopover fields={fields ?? []} columns={state.columns} onChange={(next) => onStateChange({ ...state, rql: result?.rql ?? state.rql, query: undefined, columns: next })} />
            {onExport && !exportTarget && <ExportMenu busy={exporting} disabled={!result || Boolean(loading)} onExport={runExport} />}
            {onExport && exportTarget && createPortal(<ExportMenu busy={exporting} disabled={!result || Boolean(loading)} onExport={runExport} />, exportTarget)}
            {actions}
          </HStack>
        </HStack>

        <HStack gap="2" align="start" wrap="wrap" justify="space-between" px="2.5" py="2">
          <HStack gap="2" align="start" wrap="wrap" flex="1" minW="0">
            <SegmentedControl
              size="sm"
              aria-label={labels.filterMode}
              value={mode}
              onValueChange={(v) => setMode(v)}
              items={[
                { value: 'basic', label: labels.basic, disabled: conditions === null },
                { value: 'rql', label: labels.rql },
              ]}
            />
            {mode === 'basic' && conditions !== null ? (
              <HStack gap="2" wrap="wrap" flex="1" minW="0">
                {search && <QuickSearch key={searchText} initial={searchText} placeholder={search.placeholder ?? labels.searchPlaceholder} onRun={runSearch} />}
                {chips.map(({ c, i }) => (
                  <chakra.span
                    key={`${c.field}-${i}`}
                    display="inline-flex"
                    alignItems="center"
                    gap="1"
                    h="8"
                    ps="2.5"
                    pe="1"
                    borderWidth="1px"
                    borderColor="border.accent"
                    borderRadius="l2"
                    bg="bg.selected"
                    textStyle="sm"
                  >
                    <Text as="span" fontWeight="medium">{label(c.field)}</Text>
                    <Text as="span" color="fg.muted">{opLabel(c.op, c.field)}</Text>
                    {!NO_VALUE_OPS.has(c.op) && <Text as="span">{valueText(c.value)}</Text>}
                    <IconButton size="xs" variant="ghost" aria-label={fill(labels.removeFilter, { field: label(c.field) })} onClick={() => setConditions(conditions.filter((_, j) => j !== i))}>
                      <X />
                    </IconButton>
                  </chakra.span>
                ))}
                {adding ? (
                  <AddFilter
                    fields={fields ?? []}
                    suggest={suggest}
                    renderValueEditor={renderValueEditor}
                    onCancel={() => setAdding(false)}
                    onAdd={(c) => {
                      setAdding(false);
                      setConditions([...conditions, c]);
                    }}
                  />
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => setAdding(true)} disabled={!fields}>
                    <Plus />
                    {labels.addFilter}
                  </Button>
                )}
                {sortable.length > 0 && (
                  <HStack gap="1">
                    <SelectField
                      width="auto"
                      size="sm"
                      aria-label={labels.sortBy}
                      value={sort?.columnId ?? ''}
                      onChange={(e) => change({ ...query, orderBy: e.target.value ? [{ field: e.target.value, desc: sort?.direction === 'desc' }] : [] })}
                      options={[
                        { value: '', label: fill(labels.sortField, { field: labels.defaultOrder }) },
                        ...sortable.map((f) => ({ value: f.id, label: fill(labels.sortField, { field: f.label }) })),
                      ]}
                    />
                    {sort && (
                      <IconButton size="sm" variant="ghost" aria-label={sort.direction === 'desc' ? labels.sortDescending : labels.sortAscending}
                        title={sort.direction === 'desc' ? labels.sortDescending : labels.sortAscending}
                        onClick={() => change({ ...query, orderBy: [{ field: sort.columnId, desc: sort.direction !== 'desc' }] })}>
                        {sort.direction === 'desc' ? <ArrowDownWideNarrow /> : <ArrowUpNarrowWide />}
                      </IconButton>
                    )}
                  </HStack>
                )}
              </HStack>
            ) : (
              <RqlBox
                key={state.rql ?? result?.rql ?? ''}
                initial={state.rql ?? result?.rql ?? ''}
                suggest={suggest}
                error={error}
                onRun={(rql) => onStateChange({ rql, columns: state.columns })}
              />
            )}
          </HStack>
          {attention != null && (
            <HStack gap="2" wrap="wrap" flexShrink={0}>
              {attention}
            </HStack>
          )}
        </HStack>
      </chakra.div>

      {mode === 'basic' && error && <InlineAlert tone="danger">{error.message}</InlineAlert>}

      {exported && (
        <InlineAlert tone={exported.tone} title={exported.tone === 'danger' ? labels.exportFailed : undefined}>
          <HStack justify="space-between" gap="2" align="start">
            <Text as="span">{exported.message}</Text>
            <IconButton size="xs" variant="ghost" aria-label={labels.dismiss} onClick={() => setExported(null)}>
              <X />
            </IconButton>
          </HStack>
        </InlineAlert>
      )}

      <Panel
        flush
        footer={
          <HStack justify="space-between" gap="3" wrap="wrap">
            <HStack gap="3">
              {grouped && (
                <>
                  <Button size="xs" variant="ghost" color="fg.accent" disabled={folded.size === 0} onClick={() => setFolded(new Set())}>
                    {labels.expandAll}
                  </Button>
                  <Button size="xs" variant="ghost" color="fg.accent" disabled={groupKeys.every((k) => folded.has(k))} onClick={() => setFolded(new Set(groupKeys))}>
                    {labels.collapseAll}
                  </Button>
                </>
              )}
            </HStack>
            <HStack gap="2">
              <Text textStyle="caption" color="fg.muted">
                {result ? fill(labels.range, { from: fmt.number(from), to: fmt.number(to), total: fmt.number(total) }) : ' '}
              </Text>
              <IconButton size="sm" variant="secondary" aria-label={labels.previous} disabled={skip === 0 || loading} onClick={() => onSkipChange(Math.max(0, skip - take))}>
                <DirectionalIcon>
                  <ChevronLeft />
                </DirectionalIcon>
              </IconButton>
              <IconButton size="sm" variant="secondary" aria-label={labels.next} disabled={skip + take >= total || loading} onClick={() => onSkipChange(skip + take)}>
                <DirectionalIcon>
                  <ChevronRight />
                </DirectionalIcon>
              </IconButton>
            </HStack>
          </HStack>
        }
      >
        <DataTable
          aria-label={ariaLabel}
          columns={columns}
          rows={error && !result ? [] : result?.items}
          getRowId={(r) => r.id}
          loading={loading}
          skeletonRows={take}
          empty={empty ?? labels.empty}
          sortMode="manual"
          sort={sort}
          onSortChange={(next) => change({ ...query, orderBy: next ? [{ field: next.columnId, desc: next.direction === 'desc' }] : [] })}
          renderRow={renderRow ? (row) => renderRow(row) : undefined}
          selection={selection}
          tree={
            asTree && tree
              ? {
                  keyOf: (row) => row.key,
                  parentOf: (row) => {
                    const v = row.values[tree.field];
                    return v == null ? null : typeof v === 'string' ? v : ((v as { key?: string }).key ?? null);
                  },
                  context: tree.context,
                  contextLabel: tree.contextLabel,
                  foldLabel: (row, isFolded) => fill(isFolded ? labels.unfoldGroup : labels.foldGroup, { group: row.key }),
                }
              : undefined
          }
          grouping={
            grouped && groupField && !asTree
              ? {
                  of: groupOf,
                  folded,
                  onFold: (key) =>
                    setFolded((s) => {
                      const next = new Set(s);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    }),
                  foldLabel: (key, isFolded) => {
                    const name = groupInfo(key)?.label ?? labels.noGroupValue;
                    return fill(isFolded ? labels.unfoldGroup : labels.foldGroup, { group: name });
                  },
                  header: (key, rows) => {
                    const info = groupInfo(key);
                    const first = rows[0];
                    const raw = first?.values[groupField];
                    return (
                      <HStack gap="2.5" flex="1" minW="0">
                        <chakra.span display="inline-flex" alignItems="center" fontWeight="medium" textStyle="sm" minW="0">
                          {raw == null ? (info?.label ?? labels.noGroupValue) : renderCell(groupField, raw, first)}
                        </chakra.span>
                        <CountBadge value={info?.count ?? rows.length} />
                        {renderGroupAside?.({ field: groupField, value: info?.value ?? null, label: info?.label ?? '' })}
                        {conditions !== null && (
                          <Button size="xs" variant="ghost" color="fg.muted" ms="auto" title={labels.filterToGroup} opacity="0"
                            transition="opacity 0.15s" _focusVisible={{ opacity: 1 }} css={{ '[data-group]:hover &': { opacity: 1 } }}
                            onClick={() => setConditions([...conditions, info?.value == null ? { field: groupField, op: 'isEmpty' } : { field: groupField, op: 'eq', value: info.value }])}>
                            <Filter />
                            <chakra.span hideBelow="md">{labels.filterToGroup}</chakra.span>
                          </Button>
                        )}
                      </HStack>
                    );
                  },
                  move:
                    moveToGroup && moveToGroup.field === groupField
                      ? {
                          label: moveToGroup.label,
                          menuTitle: labels.moveToGroup ?? 'Move to',
                          targets: (row) =>
                            (result?.groups ?? [])
                              .filter((g) => g.value != null && groupKey(g.value) !== groupOf(row) && (moveToGroup.accepts?.(row, g) ?? true))
                              .map((g) => ({ group: groupKey(g.value), label: g.label })),
                          onMove: (row, key) => {
                            const info = groupInfo(key);
                            if (info) moveToGroup.onMove(row, info);
                          },
                        }
                      : undefined,
                  footer: renderGroupFooter ? (key) => renderGroupFooter({ field: groupField, value: groupInfo(key)?.value ?? null, label: groupInfo(key)?.label ?? '' }) : undefined,
                }
              : undefined
          }
        />
      </Panel>
    </Stack>
  );
}

/** The quick search box: runs as you stop typing (and on Enter), cleared with its button or Escape. */
function QuickSearch({ initial, placeholder, onRun }: { initial: string; placeholder: string; onRun: (text: string) => void }) {
  const labels = useTodaLabels().queryList;
  const [text, setText] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  function later(next: string) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => next.trim() !== initial.trim() && onRun(next), 400);
  }
  return (
    <chakra.form
      role="search"
      flex="1"
      minW="48"
      maxW="72"
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        if (text.trim() !== initial.trim()) onRun(text);
      }}
    >
      <SearchInput
        size="sm"
        aria-label={labels.search}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          later(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && text) {
            e.preventDefault();
            setText('');
            clearTimeout(timer.current);
            onRun('');
          }
        }}
      />
    </chakra.form>
  );
}

/** What a column's cells are while the list loads, by its field: keys, statuses as pills, people, dates, numbers, text. */
function placeholderOf(id: string, kind: string | undefined): DataTableColumn<QueryRow>['skeleton'] {
  if (id === 'key') return 'key';
  if (id === 'status' || kind === 'status') return 'pill';
  switch (kind) {
    case 'person':
    case 'people':
      return 'person';
    case 'date':
    case 'dateTime':
      return 'date';
    case 'number':
      return 'number';
    default:
      return 'text';
  }
}

/** Export: the list's query and columns as CSV or an Excel workbook, every page of it. */
function ExportMenu({ busy, disabled, onExport }: { busy: boolean; disabled: boolean; onExport: (format: QueryExportFormat) => void }) {
  const labels = useTodaLabels().queryList;
  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }} onSelect={(d) => onExport(d.value as QueryExportFormat)}>
      <Menu.Trigger asChild>
        <Button size="sm" variant="secondary" disabled={disabled || busy} loading={busy} loadingText={labels.exporting}>
          <Download />
          {labels.export}
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="48">
            <Menu.Item value="csv">{labels.exportCsv}</Menu.Item>
            <Menu.Item value="xlsx">{labels.exportExcel}</Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

function AddFilter({
  fields,
  suggest,
  renderValueEditor,
  onAdd,
  onCancel,
}: {
  fields: QueryField[];
  suggest?: (rql: string, caret: number) => Promise<QuerySuggestions>;
  renderValueEditor?: QueryValueEditor;
  onAdd: (c: QueryConditionJson) => void;
  onCancel: () => void;
}) {
  const labels = useTodaLabels().queryList;
  const [fieldId, setFieldId] = useState(fields[0]?.id ?? '');
  const field = fields.find((f) => f.id === fieldId);
  const [op, setOp] = useState(field?.operators[0] ?? 'eq');
  const [text, setText] = useState('');
  const [chosen, setChosen] = useState<unknown>(undefined);
  const [options, setOptions] = useState<QuerySuggestion[]>([]);
  const listId = useId();

  useEffect(() => {
    setOp(field?.operators[0] ?? 'eq');
    setText('');
    setChosen(undefined);
  }, [field]);
  // The field's own control, when it brings one; its value is the condition's.
  const own = field && renderValueEditor && !NO_VALUE_OPS.has(op) ? renderValueEditor({ field, op, value: chosen, onChange: setChosen }) : null;

  // Values come from the same autocomplete the RQL box uses, as if typing "field = …".
  useEffect(() => {
    if (!suggest || !field || NO_VALUE_OPS.has(op)) return;
    const typed = LIST_OPS.has(op) ? (text.split(',').pop() ?? '').trim() : text;
    const prefix = `"${field.id}" = `;
    let cancelled = false;
    const timer = setTimeout(() => {
      suggest(prefix + typed, prefix.length + typed.length)
        .then((s) => !cancelled && setOptions(s.items))
        .catch(() => !cancelled && setOptions([]));
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [suggest, field, op, text]);

  function submit() {
    if (!field) return;
    if (NO_VALUE_OPS.has(op)) {
      onAdd({ field: field.id, op });
      return;
    }
    if (own != null) {
      if (chosen == null || (Array.isArray(chosen) && chosen.length === 0)) return;
      onAdd({ field: field.id, op, value: chosen });
      return;
    }
    if (!text.trim()) return;
    const value = LIST_OPS.has(op) ? text.split(',').map((v) => v.trim()).filter(Boolean).map(parseValue) : parseValue(text);
    onAdd({ field: field.id, op, value });
  }

  return (
    <HStack
      gap="1.5"
      as="form"
      wrap="wrap"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <SelectField width="auto" size="sm" aria-label={labels.field} value={fieldId} onChange={(e) => setFieldId(e.target.value)} options={fields.map((f) => ({ value: f.id, label: f.label }))} />
      <SelectField
        width="auto"
        size="sm"
        aria-label={labels.operator}
        value={op}
        onChange={(e) => setOp(e.target.value)}
        options={(field?.operators ?? []).map((o) => ({ value: o, label: (field?.kind === 'number' ? labels.numberOperators[o] : undefined) ?? labels.operators[o] ?? o }))}
      />
      {own}
      {!NO_VALUE_OPS.has(op) && own == null && (
        <>
          <Input
            size="sm"
            maxW="64"
            autoFocus
            aria-label={labels.value}
            placeholder={LIST_OPS.has(op) ? labels.valuesHint : labels.value}
            list={listId}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <datalist id={listId}>
            {options
              .filter((o) => o.kind !== 'keyword')
              .map((o) => (
                <option key={o.text} value={o.text.replace(/^"|"$/g, '')}>
                  {o.label}
                </option>
              ))}
          </datalist>
        </>
      )}
      <Button size="sm" type="submit" variant="primary">
        {labels.add}
      </Button>
      <IconButton size="sm" variant="ghost" aria-label={labels.cancel} onClick={onCancel}>
        <X />
      </IconButton>
    </HStack>
  );
}

/** The RQL box: Enter runs, the suggestion list follows the caret (arrows, Tab or Enter to accept, Escape to close). */
function RqlBox({
  initial,
  suggest,
  error,
  onRun,
}: {
  initial: string;
  suggest?: (rql: string, caret: number) => Promise<QuerySuggestions>;
  error?: QueryableListError | null;
  onRun: (rql: string) => void;
}) {
  const labels = useTodaLabels().queryList;
  const [text, setText] = useState(initial);
  const [found, setFound] = useState<QuerySuggestions | null>(null);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const seq = useRef(0);
  const listId = useId();

  function ask(value: string, caret: number) {
    if (!suggest) return;
    clearTimeout(timer.current);
    const id = ++seq.current;
    timer.current = setTimeout(() => {
      suggest(value, caret)
        .then((s) => {
          if (id !== seq.current) return;
          setFound(s);
          setActive(0);
          setOpen(s.items.length > 0);
        })
        .catch(() => setOpen(false));
    }, 120);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function accept(item: QuerySuggestion) {
    if (!found) return;
    const before = text.slice(0, found.replaceStart);
    const after = text.slice(found.replaceEnd);
    const opens = item.text.endsWith('(');
    const inserted = item.text + (opens || after.startsWith(' ') ? '' : ' ');
    const next = before + inserted + after;
    const caret = before.length + inserted.length;
    setText(next);
    setOpen(false);
    requestAnimationFrame(() => {
      input.current?.setSelectionRange(caret, caret);
      input.current?.focus();
    });
    ask(next, caret);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const items = found?.items ?? [];
    if (open && items.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((active + 1) % items.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((active - 1 + items.length) % items.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        accept(items[active]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      setOpen(false);
      onRun(text.trim());
    }
  }

  const hasSpan = error?.start != null && error.end != null && error.end >= error.start && error.end <= text.length;
  return (
    <Stack gap="1.5" flex="1" minW="0" position="relative">
      <HStack gap="2">
        <Input
          ref={input}
          size="sm"
          fontFamily="mono"
          role="combobox"
          aria-label={labels.rqlLabel}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          placeholder={labels.rqlPlaceholder}
          spellCheck={false}
          autoComplete="off"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            ask(e.target.value, e.target.selectionStart ?? e.target.value.length);
          }}
          onFocus={(e) => ask(text, e.target.selectionStart ?? text.length)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
        />
        <Button size="sm" variant="primary" onClick={() => onRun(text.trim())}>
          {labels.run}
        </Button>
      </HStack>
      {open && found && (
        <Box
          id={listId}
          role="listbox"
          aria-label={labels.suggestions}
          position="absolute"
          top="9"
          insetStart="0"
          zIndex="dropdown"
          minW="64"
          maxW="md"
          maxH="72"
          overflowY="auto"
          bg="bg.panel"
          borderWidth="1px"
          borderRadius="md"
          boxShadow="md"
          py="1"
        >
          {found.items.map((item, i) => (
            <HStack
              key={`${item.kind}-${item.text}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              px="3"
              py="1"
              gap="3"
              justify="space-between"
              cursor="pointer"
              bg={i === active ? 'bg.subtle' : undefined}
              onMouseDown={(e) => {
                e.preventDefault();
                accept(item);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <Text as="span" textStyle="sm" fontFamily={item.kind === 'person' || item.kind === 'value' ? undefined : 'mono'} truncate>
                {item.kind === 'field' || item.kind === 'person' ? item.label : item.text}
              </Text>
              <Text as="span" textStyle="xs" color="fg.muted" truncate>
                {item.kind === 'field' || item.kind === 'person' ? item.text : item.label !== item.text ? item.label : labels.kinds[item.kind] ?? item.kind}
              </Text>
            </HStack>
          ))}
        </Box>
      )}
      {error && (
        <InlineAlert tone="danger" size="sm">
          {error.message}
          {hasSpan && (
            <chakra.code display="block" mt="1" fontFamily="mono" whiteSpace="pre-wrap">
              {text.slice(0, error.start)}
              <chakra.mark bg="red.subtle" color="fg" textDecoration="underline wavy" textDecorationColor="fg.error">
                {text.slice(error.start, error.end) || ' '}
              </chakra.mark>
              {text.slice(error.end)}
            </chakra.code>
          )}
        </InlineAlert>
      )}
    </Stack>
  );
}

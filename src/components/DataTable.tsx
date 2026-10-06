import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { chakra, Skeleton, Table, useSlotRecipe, type TableRowProps } from '@chakra-ui/react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useTodaLabels } from '../provider/labels';
import { useTodaLocale } from '../provider/locale';
import { EmptyState } from './EmptyState';
import { InlineAlert } from './InlineAlert';

export type SortDirection = 'asc' | 'desc';

export interface DataTableSort {
  columnId: string;
  direction: SortDirection;
}

type SortValue = string | number | boolean | Date | null | undefined;

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  /** Value the column sorts by. Giving one makes the column sortable. */
  sortValue?: (row: T) => SortValue;
  align?: 'start' | 'center' | 'end';
  /** Numbers: end-aligned, tabular figures. */
  numeric?: boolean;
  /** Fixed width as a size token ("24", "sidePanel") or CSS length. */
  width?: string;
  /** Prevent wrapping in this column. */
  nowrap?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  /** undefined while the first load is running. */
  rows: T[] | undefined;
  getRowId: (row: T) => string;
  /** Accessible name of the table. */
  'aria-label'?: string;
  loading?: boolean;
  /** An error message replaces the body. */
  error?: ReactNode;
  /** Shown when rows is an empty array. A string becomes an EmptyState title. */
  empty?: ReactNode;
  size?: 'sm' | 'md';
  /** Keep the header visible while the body scrolls; set maxHeight for a scrolling body. */
  stickyHeader?: boolean;
  /** Size token or CSS length; the body scrolls beyond it. */
  maxHeight?: string;
  /** Row hover highlight (for rows that open something). */
  interactive?: boolean;
  /** Controlled sort. */
  sort?: DataTableSort | null;
  defaultSort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort | null) => void;
  /**
   * "client" sorts the rows in the browser (default). "manual" only reports sort changes, for
   * server-side ordering (the M2 QueryableList builds on this).
   */
  sortMode?: 'client' | 'manual';
  /** Extra props per row, e.g. `{ 'data-selected': '' }` to highlight one (bg.selected). */
  rowProps?: (row: T) => TableRowProps | undefined;
  /** A full-width row rendered under a row (details, inline forms); return null for none. */
  renderSubRow?: (row: T) => ReactNode | null;
}

function compare(a: SortValue, b: SortValue, collator: Intl.Collator): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1; // empty values last in both directions
  if (b == null) return -1;
  if (a instanceof Date || b instanceof Date) return new Date(a as Date).getTime() - new Date(b as Date).getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(b) - Number(a);
  return collator.compare(String(a), String(b));
}

/**
 * A simple table: typed columns, sortable headers (aria-sort), sticky header, loading,
 * error and empty states. Server-side paging and filtering come with QueryableList in M2.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  loading,
  error,
  empty,
  size = 'md',
  stickyHeader = false,
  maxHeight,
  interactive = false,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  sortMode = 'client',
  rowProps,
  renderSubRow,
  'aria-label': ariaLabel,
}: DataTableProps<T>) {
  const labels = useTodaLabels();
  const { locale } = useTodaLocale();
  const recipe = useSlotRecipe({ key: 'todaDataTable' });
  const styles = recipe({});
  const [sortState, setSortState] = useState<DataTableSort | null>(defaultSort);
  const sort = sortProp !== undefined ? sortProp : sortState;

  const collator = useMemo(() => new Intl.Collator(locale, { numeric: true, sensitivity: 'base' }), [locale]);

  const sorted = useMemo(() => {
    if (!rows || !sort || sortMode === 'manual') return rows;
    const col = columns.find((c) => c.id === sort.columnId);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va == null || vb == null) return compare(va, vb, collator); // nulls stay last
      return dir * compare(va, vb, collator);
    });
  }, [rows, sort, sortMode, columns, collator]);

  function toggleSort(columnId: string) {
    const next: DataTableSort | null =
      sort?.columnId !== columnId
        ? { columnId, direction: 'asc' }
        : sort.direction === 'asc'
          ? { columnId, direction: 'desc' }
          : null;
    if (sortProp === undefined) setSortState(next);
    onSortChange?.(next);
  }

  const colCount = columns.length;
  const align = (c: DataTableColumn<T>) => (c.numeric ? 'end' : (c.align ?? 'start'));

  let body: ReactNode;
  if (error) {
    body = (
      <Table.Row>
        <Table.Cell colSpan={colCount} css={styles.state}>
          <InlineAlert tone="danger">{error}</InlineAlert>
        </Table.Cell>
      </Table.Row>
    );
  } else if (!sorted || (loading && sorted.length === 0)) {
    body = Array.from({ length: 3 }, (_, r) => (
      <Table.Row key={`skeleton-${r}`} aria-hidden="true">
        {columns.map((c) => (
          <Table.Cell key={c.id}>
            <Skeleton height="4" width={r === 2 ? '3/5' : 'full'} />
          </Table.Cell>
        ))}
      </Table.Row>
    ));
  } else if (sorted.length === 0) {
    body = (
      <Table.Row>
        <Table.Cell colSpan={colCount} p="0">
          {typeof empty === 'string' || empty == null ? <EmptyState title={empty ?? labels.noData} /> : empty}
        </Table.Cell>
      </Table.Row>
    );
  } else {
    body = sorted.map((row, index) => {
      const id = getRowId(row);
      const sub = renderSubRow?.(row);
      return (
        <Fragment key={id}>
          <Table.Row {...rowProps?.(row)}>
            {columns.map((c) => (
              <Table.Cell
                key={c.id}
                textAlign={align(c)}
                whiteSpace={c.nowrap ? 'nowrap' : undefined}
                textStyle={c.numeric ? 'numeric' : undefined}
              >
                {c.cell(row, index)}
              </Table.Cell>
            ))}
          </Table.Row>
          {sub != null && (
            <Table.Row>
              <Table.Cell colSpan={colCount} bg="bg.subtle">
                {sub}
              </Table.Cell>
            </Table.Row>
          )}
        </Fragment>
      );
    });
  }

  return (
    <chakra.div css={styles.root} aria-busy={loading || undefined}>
      <chakra.div css={[styles.scrollArea, maxHeight ? { maxH: maxHeight } : undefined]}>
        <Table.Root size={size} stickyHeader={stickyHeader} interactive={interactive} aria-label={ariaLabel}>
          <Table.Header>
            <Table.Row>
              {columns.map((c) => {
                const sortable = Boolean(c.sortValue);
                const active = sort?.columnId === c.id ? sort.direction : null;
                return (
                  <Table.ColumnHeader
                    key={c.id}
                    textAlign={align(c)}
                    w={c.width}
                    aria-sort={sortable ? (active === 'asc' ? 'ascending' : active === 'desc' ? 'descending' : 'none') : undefined}
                  >
                    {sortable ? (
                      <chakra.button
                        type="button"
                        css={styles.sortTrigger}
                        data-sorted={active ? '' : undefined}
                        onClick={() => toggleSort(c.id)}
                        title={active === 'asc' ? labels.sortDescending : labels.sortAscending}
                      >
                        {c.header}
                        <chakra.span css={styles.sortIcon} aria-hidden="true">
                          {active === 'asc' ? <ArrowUp /> : active === 'desc' ? <ArrowDown /> : <ChevronsUpDown />}
                        </chakra.span>
                      </chakra.button>
                    ) : (
                      c.header
                    )}
                  </Table.ColumnHeader>
                );
              })}
            </Table.Row>
          </Table.Header>
          <Table.Body>{body}</Table.Body>
        </Table.Root>
      </chakra.div>
    </chakra.div>
  );
}

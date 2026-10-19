import { Fragment, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { chakra, Table, useSlotRecipe, type TableRowProps } from '@chakra-ui/react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useTodaLabels } from '../provider/labels';
import { useTodaLocale } from '../provider/locale';
import { EmptyState } from './EmptyState';
import { InlineAlert } from './InlineAlert';
import { RecordKey } from './RecordKey';
import { StatusPill } from './StatusPill';
import { Loading, useLoading } from '../skeleton/loading';
import { boneWidth, TextBone } from '../skeleton/bones';

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
  /**
   * What the column's cells are while the table loads (ADR 0061), so a placeholder row is as tall as a real one: text
   * (the default), a record key, a status pill, a person's name, a number, a date, nothing, or the column's own
   * drawing for a row (drawn in a `Loading` scope, its buttons and pills as their ghosts).
   */
  skeleton?: 'text' | 'key' | 'pill' | 'person' | 'number' | 'date' | 'none' | ((index: number) => ReactNode);
  /** How many characters wide its text placeholder is. */
  skeletonWidth?: number;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  /** undefined while the first load is running. */
  rows: T[] | undefined;
  getRowId: (row: T) => string;
  /** Accessible name of the table. */
  'aria-label'?: string;
  /** Its rows are coming (ADR 0061): rows of placeholders. The nearest `Loading` scope's when not given. */
  loading?: boolean;
  /** How many placeholder rows it draws while it loads: as many as it's about to show (5). */
  skeletonRows?: number;
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
  /**
   * Draws a row its own way, in one cell across every column (a plugin's row view); null draws its cells as usual.
   * The row itself stays the table's: selection and the keyboard work the same.
   */
  renderRow?: (row: T, index: number) => ReactNode | null;
  /**
   * One selected row you move with the keyboard: ↑ ↓ Home End select the next row and focus it, Enter opens the
   * selected row, a click selects. The selected row is marked (aria-selected) and is the one Tab reaches.
   */
  selection?: DataTableSelection<T>;
}

export interface DataTableSelection<T> {
  /** The selected row's id; null selects none (Tab then reaches the first row). */
  selectedId: string | null;
  onSelect: (row: T) => void;
  /** Enter on the selected row. */
  onOpen?: (row: T) => void;
}

/** A column's cell while the table loads, as its `skeleton` says. */
function placeholder<T>(column: DataTableColumn<T>, row: number, at: number): ReactNode {
  const kind = column.skeleton ?? (column.numeric ? 'number' : 'text');
  // The column's own drawing, in a scope of its own: its buttons and pills draw as their ghosts, wherever the table is.
  if (typeof kind === 'function') return <Loading when>{kind(row)}</Loading>;
  switch (kind) {
    case 'none':
      return null;
    case 'key':
      return <RecordKey loading />;
    case 'pill':
      return <StatusPill loading skeletonWidth={column.skeletonWidth ?? boneWidth(at, 6, 11)} />;
    case 'number':
      return <TextBone width={column.skeletonWidth ?? 4} />;
    case 'date':
      return <TextBone width={column.skeletonWidth ?? 11} />;
    case 'person':
      return <TextBone width={column.skeletonWidth ?? boneWidth(at, 9, 15)} />;
    default:
      return <TextBone width={column.skeletonWidth ?? boneWidth(at, 8, 24)} />;
  }
}

/** Keys typed in a control inside a row stay with the control. */
function typing(target: HTMLElement) {
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
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
  loading: own,
  skeletonRows = 5,
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
  renderRow,
  selection,
  'aria-label': ariaLabel,
}: DataTableProps<T>) {
  const labels = useTodaLabels();
  const { locale } = useTodaLocale();
  const loading = useLoading(own);
  const recipe = useSlotRecipe({ key: 'todaDataTable' });
  const styles = recipe({});
  const [sortState, setSortState] = useState<DataTableSort | null>(defaultSort);
  const sort = sortProp !== undefined ? sortProp : sortState;
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());

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
    // Rows of placeholders, each as tall as a real one: every cell drawn as its column says (ADR 0061).
    body = Array.from({ length: skeletonRows }, (_, r) => (
      <Table.Row key={`skeleton-${r}`} aria-hidden="true">
        {columns.map((c, i) => (
          <Table.Cell key={c.id} textAlign={align(c)} whiteSpace={c.nowrap ? 'nowrap' : undefined} textStyle={c.numeric ? 'numeric' : undefined}>
            {placeholder(c, r, r * columns.length + i)}
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
    const ids = sorted.map(getRowId);
    const tabStop = selection?.selectedId != null && ids.includes(selection.selectedId) ? selection.selectedId : ids[0];
    const onKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, row: T, index: number) => {
      if (!selection || typing(e.target as HTMLElement)) return;
      const onRow = e.target === e.currentTarget;
      let next: number;
      switch (e.key) {
        case 'ArrowDown':
          next = Math.min(index + 1, sorted.length - 1);
          break;
        case 'ArrowUp':
          next = Math.max(index - 1, 0);
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = sorted.length - 1;
          break;
        case 'Enter':
          // On a link or button inside the row, Enter is theirs.
          if (onRow && selection.onOpen) {
            e.preventDefault();
            selection.onOpen(row);
          }
          return;
        case ' ':
          if (onRow) {
            e.preventDefault();
            selection.onSelect(row);
          }
          return;
        default:
          return;
      }
      e.preventDefault();
      selection.onSelect(sorted[next]);
      rowRefs.current.get(ids[next])?.focus();
    };
    body = sorted.map((row, index) => {
      const id = ids[index];
      const sub = renderSubRow?.(row);
      const own = renderRow?.(row, index);
      const selected = selection ? selection.selectedId === id : undefined;
      return (
        <Fragment key={id}>
          <Table.Row
            ref={(el: HTMLTableRowElement | null) => {
              if (el) rowRefs.current.set(id, el);
              else rowRefs.current.delete(id);
            }}
            data-row-id={selection ? id : undefined}
            tabIndex={selection ? (id === tabStop ? 0 : -1) : undefined}
            aria-selected={selected}
            onClick={selection ? () => selection.onSelect(row) : undefined}
            onKeyDown={selection ? (e: KeyboardEvent<HTMLTableRowElement>) => onKeyDown(e, row, index) : undefined}
            css={selection ? styles.navigableRow : undefined}
            {...rowProps?.(row)}
          >
            {own != null ? (
              <Table.Cell colSpan={colCount} data-own-row="">
                {own}
              </Table.Cell>
            ) : (
              columns.map((c) => (
                <Table.Cell
                  key={c.id}
                  textAlign={align(c)}
                  whiteSpace={c.nowrap ? 'nowrap' : undefined}
                  textStyle={c.numeric ? 'numeric' : undefined}
                >
                  {c.cell(row, index)}
                </Table.Cell>
              ))
            )}
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
        <Table.Root
          size={size}
          stickyHeader={stickyHeader}
          interactive={interactive || Boolean(selection)}
          aria-label={ariaLabel}
          // Rows you move through are a grid's rows: that's where aria-selected belongs.
          role={selection ? 'grid' : undefined}
        >
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

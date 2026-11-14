import { Fragment, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { chakra, Menu, Portal, Table, useSlotRecipe, type TableRowProps } from '@chakra-ui/react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ChevronsUpDown, GripVertical } from 'lucide-react';
import { DirectionalIcon } from './DirectionalIcon';
import { useAbpLabels } from '../provider/labels';
import { useAbpLocale } from '../provider/locale';
import { EmptyState } from './EmptyState';
import { InlineAlert } from './InlineAlert';
import { RecordKey } from './RecordKey';
import { StatusPill } from './StatusPill';
import { inGroups } from '../rules';
import { inTree, visibleInTree, type TreeRow } from './query/tree';
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
  /**
   * Rows under headers of their group (a grouped query's rows, which come in group order): a group's header row starts
   * it, and it folds. Rows of a folded group are skipped, by the eye and by the keyboard.
   */
  grouping?: DataTableGrouping<T>;
  /**
   * Rows as a hierarchy (a list grouped by parent): each row under its parent, indented, folding at any depth; rows whose
   * parent isn't here are roots. `context` rows are parents the search left out, drawn dimmed so their children have
   * somewhere to sit. Takes the place of `grouping`.
   */
  tree?: DataTableTree<T>;
}

export interface DataTableTree<T> {
  keyOf: (row: T) => string;
  parentOf: (row: T) => string | null;
  context?: readonly T[];
  /** The fold button's name: "Fold PAY-98", "Unfold PAY-98". */
  foldLabel: (row: T, folded: boolean) => string;
  /** What a context row says it is, for screen readers ("Not in your search"). */
  contextLabel: string;
}

export interface DataTableGrouping<T> {
  /** The row's group; rows of one group are next to each other. */
  of: (row: T) => string;
  /** What the group's header shows after its fold button: its name, its count. */
  header: (group: string, rows: T[]) => ReactNode;
  /** A row after the group's rows (a "Create record" row); null for none. Not drawn while the group is folded. */
  footer?: (group: string, rows: T[]) => ReactNode | null;
  folded: ReadonlySet<string>;
  onFold: (group: string) => void;
  /** The fold button's name: "Fold Draft", "Unfold Draft". */
  foldLabel: (group: string, folded: boolean) => string;
  /**
   * Groups within groups (grouped by two fields; UI round 9, step 63): each group's parent. A parent's header comes before
   * its first group and folds all of them; its key in `folded` and `onFold` is `parentFoldKey(parent)`.
   */
  parents?: {
    of: (group: string) => string;
    header: (parent: string, groups: { key: string; rows: T[] }[]) => ReactNode;
    foldLabel: (parent: string, folded: boolean) => string;
  };
  /**
   * Rows that move to another group (a record to another status): each row's grip drags onto a group's header, or
   * opens a menu of the groups it may go to (the keyboard's way). What moving means is the host's.
   */
  move?: DataTableGroupMove<T>;
}

/** The key a parent group folds under in `folded` (a group's own keys never start with it). */
export function parentFoldKey(parent: string): string {
  return `\u0001${parent}`;
}

export interface DataTableGroupMove<T> {
  /** The grip's name: "Move FIN-130 to another status". */
  label: (row: T) => string;
  /** The menu's title ("Move to"). */
  menuTitle: string;
  /** The groups this row may go to, by key, with their names; the row's own isn't one. */
  targets: (row: T) => { group: string; label: string }[];
  onMove: (row: T, group: string) => void;
  /**
   * Rows that also go to a position (a list in rank order; UI round 9, step 64): dropped on a row's upper or lower half,
   * a row lands before or after it, in that row's group; the grip's menu moves it up or down in its own. Without it, rows
   * only go to a group.
   */
  place?: {
    onPlace: (row: T, group: string, at: { before?: T; after?: T }) => void;
    /** The menu's "Move up", "Move down". */
    up: string;
    down: string;
  };
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
  grouping,
  tree,
  'aria-label': ariaLabel,
}: DataTableProps<T>) {
  const labels = useAbpLabels();
  const { locale } = useAbpLocale();
  const loading = useLoading(own);
  const recipe = useSlotRecipe({ key: 'abpDataTable' });
  const styles = recipe({});
  const [sortState, setSortState] = useState<DataTableSort | null>(defaultSort);
  const sort = sortProp !== undefined ? sortProp : sortState;
  // A row's grip being dragged, and the group header it's over (ADR 0058's list: drag a record onto a status).
  const [dragging, setDragging] = useState<string | null>(null);
  // A tree's folded rows, by key.
  const [treeFolded, setTreeFolded] = useState<ReadonlySet<string>>(() => new Set());
  const [over, setOver] = useState<string | null>(null);
  // The row a dragged row would land beside, and on which side.
  const [dropAt, setDropAt] = useState<{ id: string; side: 'before' | 'after' } | null>(null);
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
    // A folded group's rows aren't drawn: the keyboard moves through the rows that are.
    const treeRows: TreeRow<T>[] | null = tree ? visibleInTree(inTree(sorted, tree.keyOf, tree.parentOf, tree.context ?? []), treeFolded) : null;
    const hidden = (group: string) => grouping!.folded.has(group) || (grouping!.parents != null && grouping!.folded.has(parentFoldKey(grouping!.parents.of(group))));
    const visible = treeRows ? treeRows.map((t) => t.row) : grouping ? sorted.filter((r) => !hidden(grouping.of(r))) : sorted;
    const ids = visible.map(getRowId);
    const tabStop = selection?.selectedId != null && ids.includes(selection.selectedId) ? selection.selectedId : ids[0];
    const onKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, row: T, index: number) => {
      if (!selection || typing(e.target as HTMLElement)) return;
      const onRow = e.target === e.currentTarget;
      let next: number;
      switch (e.key) {
        case 'ArrowDown':
          next = Math.min(index + 1, visible.length - 1);
          break;
        case 'ArrowUp':
          next = Math.max(index - 1, 0);
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = visible.length - 1;
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
      selection.onSelect(visible[next]);
      rowRefs.current.get(ids[next])?.focus();
    };
    // Each row's neighbours in its group, for Move up and Move down.
    const place = grouping?.move?.place;
    const neighbours = new Map<string, { prev?: T; next?: T }>();
    if (place && grouping) {
      for (const g of inGroups(sorted, grouping.of)) {
        g.rows.forEach((r, i) => neighbours.set(getRowId(r), { prev: g.rows[i - 1], next: g.rows[i + 1] }));
      }
    }
    // Where a dragged row may land: its own group, or one it may go to.
    const mayLand = (moving: T, group: string) => grouping!.of(moving) === group || grouping!.move!.targets(moving).some((x) => x.group === group);
    const drawRow = (row: T, index: number) => {
      const id = ids[index];
      const line = dropAt?.id === id ? dropAt.side : null;
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
            boxShadow={line ? `inset 0 ${line === 'before' ? '2px' : '-2px'} 0 0 {colors.border.accent}` : undefined}
            data-drop-line={line ?? undefined}
            {...(place && grouping && dragging != null && dragging !== id
              ? {
                  onDragOver: (e: DragEvent<HTMLTableRowElement>) => {
                    const moving = sorted.find((r) => getRowId(r) === dragging);
                    if (!moving || !mayLand(moving, grouping.of(row))) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    const box = e.currentTarget.getBoundingClientRect();
                    const side = e.clientY < box.top + box.height / 2 ? 'before' : 'after';
                    if (dropAt?.id !== id || dropAt.side !== side) setDropAt({ id, side });
                    if (over != null) setOver(null);
                  },
                  onDragLeave: () => setDropAt((d) => (d?.id === id ? null : d)),
                  onDrop: (e: DragEvent<HTMLTableRowElement>) => {
                    e.preventDefault();
                    const moving = sorted.find((r) => getRowId(r) === dragging);
                    const side = dropAt?.id === id ? dropAt.side : 'after';
                    setDragging(null);
                    setDropAt(null);
                    if (moving) place.onPlace(moving, grouping.of(row), side === 'before' ? { before: row } : { after: row });
                  },
                }
              : {})}
          >
            {own != null ? (
              <Table.Cell colSpan={colCount} data-own-row="">
                {own}
              </Table.Cell>
            ) : (
              columns.map((c, ci) => (
                <Table.Cell
                  key={c.id}
                  textAlign={align(c)}
                  whiteSpace={c.nowrap ? 'nowrap' : undefined}
                  textStyle={c.numeric ? 'numeric' : undefined}
                >
                  {ci === 0 && treeRows ? (
                    <TreeCell node={treeRows[index]} folded={treeFolded.has(treeRows[index].key)} label={tree!.foldLabel(row, treeFolded.has(treeRows[index].key))}
                      contextLabel={tree!.contextLabel}
                      onFold={() => setTreeFolded((f) => {
                        const next = new Set(f);
                        const key = treeRows[index].key;
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      })}>
                      {c.cell(row, index)}
                    </TreeCell>
                  ) : ci === 0 && grouping?.move ? (
                    <chakra.div display="flex" alignItems="center" gap="1">
                      <RowGrip move={grouping.move} row={row} dragging={dragging === id} group={grouping.of(row)} {...neighbours.get(id)}
                        onDragStart={() => setDragging(id)} onDragEnd={() => { setDragging(null); setOver(null); setDropAt(null); }} />
                      {c.cell(row, index)}
                    </chakra.div>
                  ) : (
                    c.cell(row, index)
                  )}
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
    };
    if (treeRows || !grouping) {
      body = visible.map(drawRow);
    } else {
      // Each group: its header, then (unless folded) its rows and its footer.
      const groups = inGroups(sorted, grouping.of);
      const parents = grouping.parents;
      let at = 0;
      body = groups.map((g, gi) => {
        // A parent's header before its first group; its groups aren't drawn while it's folded.
        const parent = parents?.of(g.key);
        const parentFolded = parent != null && grouping.folded.has(parentFoldKey(parent));
        const parentRow = parents && parent != null && (gi === 0 || parents.of(groups[gi - 1].key) !== parent) ? (
          <Table.Row css={styles.groupRow} data-group-parent={parent} data-folded={parentFolded ? '' : undefined}>
            <Table.Cell colSpan={colCount} css={styles.groupCell}>
              <chakra.div css={styles.groupHeader}>
                <chakra.button type="button" css={styles.groupToggle} aria-expanded={!parentFolded} aria-label={parents.foldLabel(parent, parentFolded)}
                  onClick={() => grouping.onFold(parentFoldKey(parent))}>
                  <ChevronDown />
                </chakra.button>
                {parents.header(parent, groups.filter((x) => parents.of(x.key) === parent))}
              </chakra.div>
            </Table.Cell>
          </Table.Row>
        ) : null;
        if (parentFolded) return <Fragment key={`group-${g.key}`}>{parentRow}</Fragment>;
        const folded = grouping.folded.has(g.key);
        const footer = folded ? null : grouping.footer?.(g.key, g.rows);
        const start = at;
        if (!folded) at += g.rows.length;
        return (
          <Fragment key={`group-${g.key}`}>
            {parentRow}
            <Table.Row css={styles.groupRow} data-group={g.key} data-folded={folded ? '' : undefined} data-nested={parents ? '' : undefined}
              data-drop-over={over === g.key ? '' : undefined}
              {...(grouping.move && dragging != null
                ? {
                    onDragOver: (e: DragEvent<HTMLTableRowElement>) => {
                      const row = sorted.find((r) => getRowId(r) === dragging);
                      if (!row || !grouping.move!.targets(row).some((x) => x.group === g.key)) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (over !== g.key) setOver(g.key);
                    },
                    onDragLeave: () => setOver((o) => (o === g.key ? null : o)),
                    onDrop: (e: DragEvent<HTMLTableRowElement>) => {
                      e.preventDefault();
                      const row = sorted.find((r) => getRowId(r) === dragging);
                      setDragging(null);
                      setOver(null);
                      if (row) grouping.move!.onMove(row, g.key);
                    },
                  }
                : {})}>
              <Table.Cell colSpan={colCount} css={styles.groupCell}>
                <chakra.div css={styles.groupHeader} ps={parents ? '6' : undefined}>
                  <chakra.button type="button" css={styles.groupToggle} aria-expanded={!folded} aria-label={grouping.foldLabel(g.key, folded)}
                    onClick={() => grouping.onFold(g.key)}>
                    <ChevronDown />
                  </chakra.button>
                  {grouping.header(g.key, g.rows)}
                </chakra.div>
              </Table.Cell>
            </Table.Row>
            {!folded && g.rows.map((row, i) => drawRow(row, start + i))}
            {footer != null && (
              <Table.Row css={styles.groupFooterRow}>
                <Table.Cell colSpan={colCount} css={styles.groupFooterCell}>
                  {footer}
                </Table.Cell>
              </Table.Row>
            )}
          </Fragment>
        );
      });
    }
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

/**
 * A row's grip in a grouped list whose rows move between groups: dragged, it carries the row to a group's header;
 * pressed (or Enter), it opens a menu of the groups the row may go to. It shows on the row's hover and focus.
 */
/** The grip menu's own values: never a group's key. */
const UP = '\u0002up';
const DOWN = '\u0002down';

function RowGrip<T>({ move, row, dragging, group, prev, next, onDragStart, onDragEnd }: {
  move: DataTableGroupMove<T>;
  row: T;
  dragging: boolean;
  /** Its group, and the rows before and after it there (for Move up and Move down). */
  group: string;
  prev?: T;
  next?: T;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const targets = move.targets(row);
  const place = move.place;
  const steps = place ? [prev && { value: UP, label: place.up }, next && { value: DOWN, label: place.down }].filter((x): x is { value: string; label: string } => Boolean(x)) : [];
  return (
    <Menu.Root lazyMount unmountOnExit positioning={{ placement: 'bottom-start' }}
      onSelect={(e) => {
        if (e.value === UP && prev) place?.onPlace(row, group, { before: prev });
        else if (e.value === DOWN && next) place?.onPlace(row, group, { after: next });
        else move.onMove(row, e.value);
      }}>
      <Menu.Trigger asChild>
        <chakra.button type="button" draggable aria-label={move.label(row)} title={move.label(row)} disabled={targets.length === 0 && steps.length === 0}
          display="inline-flex" alignItems="center" justifyContent="center" w="5" h="6" flexShrink="0" rounded="l1" color="fg.subtle"
          cursor="grab" opacity={dragging ? 1 : 0} transition="opacity 0.12s" _hover={{ color: 'fg', bg: 'bg.muted' }}
          _focusVisible={{ opacity: 1, outline: '2px solid', outlineColor: 'colorPalette.focusRing' }} _disabled={{ display: 'none' }}
          css={{ 'tr:hover &': { opacity: 1 }, '& svg': { width: '3.5', height: '3.5' } }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            // The row's own keys (↑ ↓ Enter) stay the row's; the grip opens its menu with Enter or Space.
            if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
          }}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', move.label(row));
            onDragStart();
          }}
          onDragEnd={onDragEnd}>
          <GripVertical />
        </chakra.button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="44" onClick={(e) => e.stopPropagation()}>
            {steps.length > 0 && (
              <Menu.ItemGroup>
                {steps.map((x) => (
                  <Menu.Item key={x.value} value={x.value}>
                    {x.value === UP ? <ArrowUp /> : <ArrowDown />}
                    {x.label}
                  </Menu.Item>
                ))}
              </Menu.ItemGroup>
            )}
            {steps.length > 0 && targets.length > 0 && <Menu.Separator />}
            {targets.length > 0 && (
              <Menu.ItemGroup>
                <Menu.ItemGroupLabel>{move.menuTitle}</Menu.ItemGroupLabel>
                {targets.map((x) => (
                  <Menu.Item key={x.group} value={x.group}>
                    {x.label}
                  </Menu.Item>
                ))}
              </Menu.ItemGroup>
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

/**
 * A tree row's first cell: indented by its depth, a fold button when it has children here (a spacer when not, so titles
 * line up), and, for a parent the search left out, dimmed with a word for screen readers.
 */
function TreeCell<T>({ node, folded, label, contextLabel, onFold, children }: {
  node: TreeRow<T>;
  folded: boolean;
  label: string;
  contextLabel: string;
  onFold: () => void;
  children: ReactNode;
}) {
  return (
    <chakra.div display="flex" alignItems="center" gap="1" ps={`calc(${node.depth} * 1.5rem)`} opacity={node.context ? 0.6 : undefined}
      data-tree-depth={node.depth} data-context={node.context ? '' : undefined}>
      {node.hasChildren ? (
        <chakra.button type="button" aria-expanded={!folded} aria-label={label} title={label} onClick={(e) => { e.stopPropagation(); onFold(); }}
          display="inline-flex" alignItems="center" justifyContent="center" boxSize="6" flexShrink="0" rounded="l1" color="fg.muted"
          _hover={{ bg: 'bg.muted', color: 'fg' }} _focusVisible={{ outline: '2px solid', outlineColor: 'colorPalette.focusRing' }}
          css={{ '& svg': { width: '3.5', height: '3.5', transition: 'transform 0.15s' } }}>
          {folded ? <DirectionalIcon><ChevronRight /></DirectionalIcon> : <ChevronDown />}
        </chakra.button>
      ) : (
        <chakra.span boxSize="6" flexShrink="0" aria-hidden />
      )}
      {node.context && <chakra.span srOnly>{contextLabel}</chakra.span>}
      {children}
    </chakra.div>
  );
}

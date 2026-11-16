import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { errorText } from '../host/errors';
import { useAreaRequest } from '../host/HostContext';
import { abpListSource, emptyQuery, pageCount, type AbpListOptions, type ListQuery, type ListSource } from './list-source';

export interface ListState<T> {
  /** The list's place: its page, size, sort, filters, and what's typed in its search (asked once typing settles). */
  query: ListQuery;
  /** The page's rows; undefined until the first page comes. */
  rows: T[] | undefined;
  total: number;
  pages: number;
  /** The first page is coming. */
  loading: boolean;
  /** Another page or a new search is coming: the rows shown are the last ones until it does. */
  refreshing: boolean;
  error: string | null;
  setSearch: (search: string) => void;
  /** One filter by name; null or '' removes it. */
  setFilter: (name: string, value: string | null) => void;
  setSort: (sort: ListQuery['sort']) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  /** Reads the page again (after a change made elsewhere). */
  reload: () => void;
  /** For `DataTable`: the rows, the first load's placeholders, the error, and the sort, which the source applies. */
  table: {
    rows: T[] | undefined;
    loading: boolean;
    error: string | null;
    sort: ListQuery['sort'];
    onSortChange: (sort: ListQuery['sort']) => void;
    sortMode: 'manual';
  };
  /** For `Pagination`: the page and how many. */
  pagination: { page: number; pages: number; onPage: (page: number) => void };
}

/**
 * A list's page, search, filters and sort, read from its source (ADR 0109 amendment): a change of search, filters, sort
 * or page size goes back to the first page; typing waits `searchDelay` ms; only the latest answer counts; a different
 * source (its `key`) starts empty. `onQueryChange` hears every change, for a screen that keeps the list's place in its
 * address.
 */
export function useListState<T>(
  source: ListSource<T>,
  options: { initial?: Partial<ListQuery>; searchDelay?: number; onQueryChange?: (query: ListQuery) => void } = {},
): ListState<T> {
  const { searchDelay = 250 } = options;
  const [query, setQuery] = useState<ListQuery>(() => emptyQuery(options.initial));
  const [typed, setTyped] = useState(query.search);
  const [rows, setRows] = useState<T[] | undefined>(undefined);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const told = useRef(options.onQueryChange);
  useEffect(() => {
    told.current = options.onQueryChange;
  });

  // A different list starts empty.
  const [shownKey, setShownKey] = useState(source.key);
  if (shownKey !== source.key) {
    setShownKey(source.key);
    setRows(undefined);
    setTotal(0);
  }

  useEffect(() => {
    const abort = new AbortController();
    setBusy(true);
    source.load(query, abort.signal).then(
      (page) => {
        if (abort.signal.aborted) return;
        setRows(page.items);
        setTotal(page.total);
        setError(null);
        setBusy(false);
      },
      (e: unknown) => {
        if (abort.signal.aborted) return;
        setError(errorText(e));
        setBusy(false);
      },
    );
    return () => abort.abort();
    // The source is read by its key, so a source built afresh each render doesn't ask again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, round, source.key]);

  const change = useCallback((next: (q: ListQuery) => ListQuery) => {
    setQuery((q) => {
      const n = next(q);
      told.current?.(n);
      return n;
    });
  }, []);

  // Typing settles before it asks.
  useEffect(() => {
    if (typed === query.search) return;
    const timer = setTimeout(() => change((q) => ({ ...q, search: typed, page: 1 })), searchDelay);
    return () => clearTimeout(timer);
  }, [typed, query.search, searchDelay, change]);

  const setFilter = useCallback(
    (name: string, value: string | null) =>
      change((q) => {
        const filters = { ...q.filters };
        if (value) filters[name] = value;
        else delete filters[name];
        return { ...q, filters, page: 1 };
      }),
    [change],
  );
  const setSort = useCallback((sort: ListQuery['sort']) => change((q) => ({ ...q, sort, page: 1 })), [change]);
  const setPage = useCallback((page: number) => change((q) => ({ ...q, page })), [change]);
  const setPageSize = useCallback((pageSize: number) => change((q) => ({ ...q, pageSize, page: 1 })), [change]);
  const reload = useCallback(() => setRound((r) => r + 1), []);
  const pages = pageCount(total, query.pageSize);
  const loading = busy && rows === undefined;

  return useMemo(
    () => ({
      query: { ...query, search: typed },
      rows,
      total,
      pages,
      loading,
      refreshing: busy && rows !== undefined,
      error,
      setSearch: setTyped,
      setFilter,
      setSort,
      setPage,
      setPageSize,
      reload,
      table: { rows, loading, error, sort: query.sort, onSortChange: setSort, sortMode: 'manual' as const },
      pagination: { page: query.page, pages, onPage: setPage },
    }),
    [query, typed, rows, total, pages, loading, busy, error, setFilter, setSort, setPage, setPageSize, reload],
  );
}

/** An area's list served in ABP's shape at a path on this host (`/accounts/page`): the same source while the path is. */
export function useAreaListSource<T>(area: string, path: string, options: AbpListOptions = {}): ListSource<T> {
  const request = useAreaRequest(area);
  const key = JSON.stringify(options);
  // The options by their value, so an object written inline doesn't make a new source each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => abpListSource<T>(request, path, options), [request, path, key]);
}

import type { HostRequest } from '../host/request.ts';

/** What a list shows: a page of rows, sorted and narrowed (ADR 0109 amendment). */
export interface ListQuery {
  /** From 1. */
  page: number;
  pageSize: number;
  /** A column's id and its direction; null for the list's own order. */
  sort: { columnId: string; direction: 'asc' | 'desc' } | null;
  /** What's typed in the list's search. */
  search: string;
  /** The list's other filters by name (a status, a directory); an empty value is no filter. */
  filters: Record<string, string>;
}

/** A page of a list: its rows and how many there are in all. */
export interface ListPage<T> {
  items: T[];
  total: number;
}

/**
 * Where a list's rows come from: the server package's own paging, or the host's (its query engine), which a host gives
 * an area in place of the package's. `key` names what it lists: a different key is a different list, read afresh.
 */
export interface ListSource<T> {
  key: string;
  load: (query: ListQuery, signal: AbortSignal) => Promise<ListPage<T>>;
}

export const DEFAULT_PAGE_SIZE = 25;

export function emptyQuery(initial: Partial<ListQuery> = {}): ListQuery {
  return { page: 1, pageSize: DEFAULT_PAGE_SIZE, sort: null, search: '', filters: {}, ...initial };
}

/** How a list's query maps onto a server's: the search's parameter, and each sortable column's field. */
export interface AbpListOptions {
  /** The parameter the search goes in (ABP's lists: `filter`). */
  searchParam?: string;
  /** A column's id to the server's field for `sorting`; a column not here sorts by its id. */
  sortFields?: Record<string, string>;
  /** Parameters every page asks with (a fixed scope, a kind). */
  fixed?: Record<string, string>;
}

/** ABP's paging parameters for a query: `skipCount`, `maxResultCount`, `sorting` ("username desc"), the search and filters. */
export function abpListParams(query: ListQuery, options: AbpListOptions = {}): URLSearchParams {
  const params = new URLSearchParams(options.fixed);
  params.set('skipCount', String((query.page - 1) * query.pageSize));
  params.set('maxResultCount', String(query.pageSize));
  if (query.sort) params.set('sorting', `${options.sortFields?.[query.sort.columnId] ?? query.sort.columnId} ${query.sort.direction}`);
  if (query.search.trim()) params.set(options.searchParam ?? 'filter', query.search.trim());
  for (const [name, value] of Object.entries(query.filters)) if (value) params.set(name, value);
  return params;
}

/** A list served in ABP's shape (`PagedAndSortedResultRequestDto` in, `{ totalCount, items }` out) at a path. */
export function abpListSource<T>(request: HostRequest, path: string, options: AbpListOptions = {}): ListSource<T> {
  return {
    key: `${path}?${new URLSearchParams(options.fixed).toString()}`,
    load: async (query, signal) => {
      const answer = await request<{ totalCount: number | string; items: T[] }>(`${path}?${abpListParams(query, options)}`, { signal });
      return { items: answer.items, total: Number(answer.totalCount) };
    },
  };
}

/** How many pages a list has (at least one). */
export const pageCount = (total: number, pageSize: number) => Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

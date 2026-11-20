/**
 * How a pagination reads (UI round 10, step 73): `simple` (the default for lists: which rows of how many, then previous
 * and next; people narrow a long list with search and filters, not by jumping to a page), `numbered` (the pages
 * themselves, for long reports) or `compact` ("Page 3 of 200" between previous and next, for narrow places).
 */
export type PaginationForm = 'simple' | 'numbered' | 'compact';

/** The page buttons a form shows between its arrows: only the numbered form has any. */
export function pagesShown(form: PaginationForm, page: number, pages: number): (number | 'gap')[] {
  return form === 'numbered' ? pageList(page, pages) : [];
}

/**
 * The pages a pagination shows (UI round 9, step 67): the first and the last, the current one and its neighbours, and
 * near either end the first or last four, in order, with 'gap' where pages are left out.
 */
export function pageList(page: number, pages: number): (number | 'gap')[] {
  const want = new Set([1, pages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => want.add(n));
  if (page >= pages - 2) [pages - 1, pages - 2, pages - 3].forEach((n) => want.add(n));
  const list = [...want].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  list.forEach((n, i) => {
    if (i > 0 && n - list[i - 1] > 1) out.push('gap');
    out.push(n);
  });
  return out;
}

// A list's query as ABP's paging asks it, and a page read from a source in ABP's shape (ADR 0109 amendment).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abpListParams, abpListSource, emptyQuery, pageCount } from '../src/lists/list-source.ts';

test('a query as ABP asks it: skip and take, sorting by the server field, the search and the filters set', () => {
  const q = emptyQuery({ page: 3, pageSize: 20, sort: { columnId: 'name', direction: 'desc' }, search: '  lama ', filters: { status: 'active', kind: '' } });
  const p = abpListParams(q, { sortFields: { name: 'displayName' }, fixed: { directoryId: 'd1' } });
  assert.equal(p.get('skipCount'), '40');
  assert.equal(p.get('maxResultCount'), '20');
  assert.equal(p.get('sorting'), 'displayName desc');
  assert.equal(p.get('filter'), 'lama');
  assert.equal(p.get('status'), 'active');
  assert.equal(p.has('kind'), false, 'an empty filter is no filter');
  assert.equal(p.get('directoryId'), 'd1');
  const plain = abpListParams(emptyQuery({ search: ' ' }), { searchParam: 'search' });
  assert.equal(plain.has('sorting'), false);
  assert.equal(plain.has('search'), false);
});

test('a source reads a page in ABP shape; its key names the list, not the page', async () => {
  const asked = [];
  const request = async (path) => (asked.push(path), { totalCount: '42', items: [{ id: 1 }] });
  const source = abpListSource(request, '/accounts/page', { fixed: { status: 'active' } });
  const page = await source.load(emptyQuery({ page: 2 }), new AbortController().signal);
  assert.deepEqual(page, { items: [{ id: 1 }], total: 42 });
  assert.match(asked[0], /^\/accounts\/page\?status=active&skipCount=25&maxResultCount=25$/);
  assert.equal(source.key, '/accounts/page?status=active');
  assert.equal(pageCount(42, 25), 2);
  assert.equal(pageCount(0, 25), 1);
});

// Pagination's pages (UI round 9, step 67): first, last, around the current one, gaps between.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageList } from '../src/components/pageList.ts';

test('a few pages are all shown', () => {
  assert.deepEqual(pageList(1, 3), [1, 2, 3]);
  assert.deepEqual(pageList(2, 5), [1, 2, 3, 4, 5]);
});

test('many pages: the ends and the neighbours, gaps between', () => {
  assert.deepEqual(pageList(40, 200), [1, 'gap', 39, 40, 41, 'gap', 200]);
  assert.deepEqual(pageList(1, 200), [1, 2, 3, 4, 'gap', 200]);
  assert.deepEqual(pageList(200, 200), [1, 'gap', 197, 198, 199, 200]);
});

test('one page is just itself', () => {
  assert.deepEqual(pageList(1, 1), [1]);
});

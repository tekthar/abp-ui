// Pagination's pages (UI round 9, step 67): first, last, around the current one, gaps between.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageList, pagesShown } from '../src/components/pageList.ts';

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

// UI round 10, step 73: only the numbered form shows page buttons; simple and compact keep to the arrows.
test('the forms: numbered shows its pages, simple and compact none', () => {
  assert.deepEqual(pagesShown('numbered', 40, 200), [1, 'gap', 39, 40, 41, 'gap', 200]);
  assert.deepEqual(pagesShown('simple', 40, 200), []);
  assert.deepEqual(pagesShown('compact', 40, 200), []);
});

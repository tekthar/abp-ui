// The documents area's rules: refusals before sending, how long until documents are read again, page numbers, and the
// type a fetched file is shown as.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageOf, pollDelay, refusalOf, shownType } from '../src/areas/documents/rules.ts';

test('a file is refused before it is sent when empty, too big, or of a kind not read', () => {
  const exts = ['.pdf', '.docx', '.txt', '.md', '.png', '.jpg', '.jpeg', '.webp'];
  assert.equal(refusalOf({ name: 'a.pdf', size: 0 }, 100, exts), 'empty');
  assert.equal(refusalOf({ name: 'a.pdf', size: 101 }, '100', exts), 'tooBig');
  assert.equal(refusalOf({ name: 'setup.EXE', size: 10 }, 100, exts), 'kind');
  assert.equal(refusalOf({ name: 'noext', size: 10 }, 100, exts), 'kind');
  assert.equal(refusalOf({ name: 'Lease.PDF', size: 10 }, 100, exts), null);
  assert.equal(refusalOf({ name: 'anything.bin', size: 10 }, null, null), null);
});

test('documents being read are read again every few seconds; waiting ones at their retry, within bounds', () => {
  const now = Date.parse('2026-11-27T12:00:00Z');
  assert.equal(pollDelay([{ status: 'ready' }, { status: 'indexing' }], now), 3000);
  assert.equal(pollDelay([{ status: 'ready' }, { status: 'failed' }], now), null);
  assert.equal(pollDelay([{ status: 'waiting', retryAt: '2026-11-27T12:01:00Z' }], now), 61_000);
  assert.equal(pollDelay([{ status: 'waiting', retryAt: '2026-11-27T11:00:00Z' }], now), 15_000);
  assert.equal(pollDelay([{ status: 'waiting', retryAt: '2026-11-27T15:00:00Z' }], now), 300_000);
  assert.equal(pollDelay([{ status: 'waiting', retryAt: null }], now), 15_000);
});

test('a page number is a whole number from 1, within the pages', () => {
  assert.equal(pageOf('abc'), 1);
  assert.equal(pageOf(NaN, 3), 1);
  assert.equal(pageOf('2.7', 3), 2);
  assert.equal(pageOf(9, 3), 3);
  assert.equal(pageOf(-4, 3), 1);
  assert.equal(pageOf(5), 5);
});

test('a fetched file is shown as its kind, never as what the response said', () => {
  assert.equal(shownType('pdf'), 'application/pdf');
  assert.equal(shownType('webp'), 'image/webp');
  assert.equal(shownType('docx'), null);
});

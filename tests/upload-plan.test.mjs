// The upload queue's rules (ADR 0011, amended): what goes next, what's refused before sending, how far along the queue
// is, the folders a dropped folder needs, and a pasted file's name. `pnpm --dir packages/ui test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { covers, folderOf, foldersFor, pastedName, progressOf, refusal, toStart, UPLOADS_AT_ONCE } from '../src/files/upload-plan.ts';

const job = (id, name, state = 'waiting', folder = '', size = 100, sent = 0) => ({ id, name, size, folder, state, sent });
const ids = (jobs) => jobs.map((j) => j.id).join(',');

test('three go at once, in the order they came', () => {
  const jobs = ['a', 'b', 'c', 'd', 'e'].map((n) => job(n, `${n}.pdf`));
  assert.equal(UPLOADS_AT_ONCE, 3);
  assert.equal(ids(toStart(jobs)), 'a,b,c');
  jobs[0].state = 'sending';
  jobs[1].state = 'done';
  assert.equal(ids(toStart(jobs)), 'c,d', 'one still going leaves room for two');
});

test('never two of the same name into the same folder at once, whatever its case', () => {
  const jobs = [job('1', 'Spec.pdf'), job('2', 'spec.PDF'), job('3', 'spec.pdf', 'waiting', 'folder-b'), job('4', 'notes.txt')];
  assert.equal(ids(toStart(jobs)), '1,3,4', 'the second Spec waits for the first');
  jobs[0].state = 'sending';
  assert.equal(ids(toStart(jobs, 3)), '3,4', 'and keeps waiting while it goes');
  jobs[0].state = 'done';
  assert.equal(ids(toStart(jobs)), '2,3,4', 'then takes its turn, a new version');
});

test('only waiting files start; failed, cancelled and refused ones stay as they are', () => {
  const jobs = [job('a', 'a', 'failed'), job('b', 'b', 'cancelled'), job('c', 'c', 'refused'), job('d', 'd')];
  assert.equal(ids(toStart(jobs)), 'd');
});

test('a file is refused before sending when empty or over the limit, never when there is no limit', () => {
  assert.equal(refusal(0, 1000), 'empty');
  assert.equal(refusal(1001, 1000), 'tooBig');
  assert.equal(refusal(1000, 1000), null, 'exactly the limit is fine');
  assert.equal(refusal(5_000_000_000, undefined), null);
});

test('the queue counts what is done and what needs the person, and how much is sent', () => {
  const jobs = [job('a', 'a', 'done', '', 300), job('b', 'b', 'sending', '', 100, 50), job('c', 'c', 'waiting', '', 100), job('d', 'd', 'failed'), job('e', 'e', 'cancelled'), job('f', 'f', 'refused', '', 0)];
  const p = progressOf(jobs);
  assert.deepEqual({ total: p.total, done: p.done, failed: p.failed, refused: p.refused, active: p.active }, { total: 4, done: 1, failed: 1, refused: 1, active: 2 },
    'a refused file is not one of those that go');
  assert.equal(p.fraction, 350 / 500);
  assert.equal(progressOf([]).fraction, 0);
});

test('a dropped folder needs its folders, parents first', () => {
  assert.deepEqual(foldersFor(['Specs/v2/a.pdf', 'Specs/b.pdf', 'top.txt', 'Art/logo.png', 'Specs//v2/c.pdf']), ['Art', 'Specs', 'Specs/v2']);
  assert.deepEqual(foldersFor(['a.pdf']), []);
  assert.equal(folderOf('Specs/v2/a.pdf'), 'Specs/v2');
  assert.equal(folderOf('a.pdf'), '');
});

test('a pasted screenshot is named with the time, a pasted file keeps its name', () => {
  const at = new Date(2026, 9, 17, 13, 5, 42);
  assert.equal(pastedName('image.png', 'image/png', at), 'Pasted image 2026-10-17 13.05.42.png');
  assert.equal(pastedName(undefined, 'image/jpeg', at), 'Pasted image 2026-10-17 13.05.42.jpg');
  assert.equal(pastedName('blob', 'application/octet-stream', at), 'Pasted file 2026-10-17 13.05.42');
  assert.equal(pastedName(' design.fig ', 'application/octet-stream', at), 'design.fig');
});

test('an answer replaces what is shown only when it has every file shown', () => {
  assert.equal(covers(['a', 'b'], ['a', 'b', 'c']), true);
  assert.equal(covers(['a', 'b', 'c'], ['a', 'b']), false, 'an older answer, sent before c was stored');
  assert.equal(covers([], []), true);
});

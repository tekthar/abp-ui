// The board shows the person's own move at once, before the host answers (ADR 0058): where the dropped card lands.
// `pnpm --dir packages/ui test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withMove } from '../src/components/kanban-place.ts';

const card = (id, column, lane = '') => ({ id, column, lane, title: `Card ${id}` });
const board = [card('A', 'todo'), card('B', 'todo'), card('C', 'doing'), card('D', 'doing')];
const where = (items) => items.map((i) => `${i.id}@${i.column}`).join(' ');

test('dropped before a card in another column, it lands right there', () => {
  assert.equal(where(withMove(board, 'A', { column: 'doing', lane: '', before: 'D' })), 'B@todo C@doing A@doing D@doing');
});

test('dropped after a card, it lands just below it', () => {
  assert.equal(where(withMove(board, 'A', { column: 'doing', lane: '', after: 'C' })), 'B@todo C@doing A@doing D@doing');
  assert.equal(where(withMove(board, 'A', { column: 'todo', lane: '', after: 'B' })), 'B@todo A@todo C@doing D@doing', 'moved down its own column');
});

test('dropped on the cell itself, it goes last; the card keeps everything but its place', () => {
  const moved = withMove(board, 'B', { column: 'done', lane: 'x' });
  assert.equal(where(moved), 'A@todo C@doing D@doing B@done');
  assert.deepEqual(moved[3], { id: 'B', column: 'done', lane: 'x', title: 'Card B' });
  assert.equal(board[1].column, 'todo', 'the items given are left as they were');
});

test('a card or an anchor it no longer knows changes nothing it should not', () => {
  assert.equal(withMove(board, 'Z', { column: 'doing', lane: '' }), board);
  assert.equal(where(withMove(board, 'A', { column: 'doing', lane: '', before: 'gone' })), 'B@todo C@doing D@doing A@doing');
});

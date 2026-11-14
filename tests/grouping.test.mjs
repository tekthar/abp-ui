// A grouped list (UI round 6, step 23): rows find their group by key, in the order they came; and priorities as bars.
// `pnpm --dir packages/ui test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupKey, inGroups } from '../src/rules/grouping.ts';
import { priorityLevel } from '../src/components/priority-level.ts';

test('a row keys its group the way the query keys its groups', () => {
  assert.equal(groupKey({ key: 'paid', name: 'Paid', category: 'done' }), 'paid'); // a status, by its key
  assert.equal(groupKey({ id: 'fc1a', username: 'areej', displayName: 'Areej' }), 'fc1a'); // a person, by id
  assert.equal(groupKey('high'), 'high');
  assert.equal(groupKey(3), '3');
  assert.equal(groupKey(null), '');
  assert.equal(groupKey(undefined), '');
});

test('rows stay in their order, a new group where the key changes', () => {
  const rows = [{ g: 'a' }, { g: 'a' }, { g: 'b' }, { g: '' }];
  assert.deepEqual(
    inGroups(rows, (r) => r.g).map((x) => [x.key, x.rows.length]),
    [['a', 2], ['b', 1], ['', 1]],
  );
  assert.deepEqual(inGroups([], (r) => r), []);
});

test('a priority fills bars by its place in the list, warmer at the top', () => {
  // Five priorities, highest first.
  assert.deepEqual(priorityLevel(0, 5), { bars: 4, palette: 'red' });
  assert.deepEqual(priorityLevel(1, 5), { bars: 3, palette: 'red' });
  assert.deepEqual(priorityLevel(2, 5), { bars: 2, palette: 'orange' });
  assert.deepEqual(priorityLevel(3, 5), { bars: 2, palette: 'blue' });
  assert.deepEqual(priorityLevel(4, 5), { bars: 1, palette: 'blue' });
  // Three: high, medium, low.
  assert.deepEqual(priorityLevel(0, 3), { bars: 4, palette: 'red' });
  assert.deepEqual(priorityLevel(1, 3), { bars: 3, palette: 'orange' });
  assert.deepEqual(priorityLevel(2, 3), { bars: 1, palette: 'blue' });
  // Not in the list: no bars, grey.
  assert.deepEqual(priorityLevel(-1, 3), { bars: 0, palette: 'gray' });
  assert.deepEqual(priorityLevel(0, 0), { bars: 0, palette: 'gray' });
});

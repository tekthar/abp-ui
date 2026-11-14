// Grouped by a date period (UI round 9, step 63): a group's name from its first day, in the reader's language.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupKey, periodName } from '../src/rules/grouping.ts';

const labels = { week: 'Week of {day}', quarter: 'Q{quarter} {year}' };

test('each period reads as itself in English', () => {
  assert.equal(periodName('2026-11-01', 'month', 'en', labels), 'November 2026');
  assert.equal(periodName('2026-10-01', 'quarter', 'en', labels), 'Q4 2026');
  assert.equal(periodName('2026-01-01', 'year', 'en', labels), '2026');
  assert.equal(periodName('2026-11-02', 'week', 'en', labels), 'Week of Nov 2, 2026');
  assert.equal(periodName('2026-11-02', 'day', 'en', labels), 'Nov 2, 2026');
});

test('the first day is never shifted by a time zone', () => {
  // The first of a month stays in that month whatever the machine's zone.
  assert.match(periodName('2026-01-01', 'month', 'en', labels), /^January 2026$/);
});

test('anything that is not a day is shown as it came', () => {
  assert.equal(periodName('soon', 'month', 'en', labels), 'soon');
});

test('a pair of groups keys by both values', () => {
  assert.equal(groupKey({ key: 'todo', name: 'To do' }), 'todo');
  assert.equal(groupKey(null), '');
});

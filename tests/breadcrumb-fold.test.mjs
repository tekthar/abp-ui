// Long breadcrumb trails fold their middle into "…" (UI round 9, step 66).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foldBreadcrumbs } from '../src/components/breadcrumbFold.ts';

test('four levels or fewer stay as they are', () => {
  const { shown, hidden } = foldBreadcrumbs(['Projects', 'Group', 'Project', 'Records']);
  assert.deepEqual(shown.map((x) => x?.item), ['Projects', 'Group', 'Project', 'Records']);
  assert.deepEqual(hidden, []);
});

test('past four, the first and the last two stay and the middle folds', () => {
  const { shown, hidden } = foldBreadcrumbs(['Projects', 'Portfolio', 'Programme', 'Project', 'Records', 'PAY-1']);
  assert.deepEqual(shown.map((x) => x?.item ?? '…'), ['Projects', '…', 'Records', 'PAY-1']);
  assert.deepEqual(shown.map((x) => x?.index ?? -1), [0, -1, 4, 5]);
  assert.deepEqual(hidden, ['Portfolio', 'Programme', 'Project']);
});

// A list grouped by parent as a tree (UI round 7, step 38). `pnpm --dir packages/ui test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inTree, visibleInTree } from '../src/components/query/tree.ts';

const r = (key, parent = null) => ({ key, parent });
const keyOf = (x) => x.key;
const parentOf = (x) => x.parent;
const shape = (tree) => tree.map((t) => `${'  '.repeat(t.depth)}${t.key}${t.context ? '*' : ''}${t.hasChildren ? '+' : ''}`);

test('children sit under their parents at any depth, in the order they came', () => {
  const rows = [r('S-2', 'E-1'), r('E-1'), r('T-3', 'S-2'), r('S-4', 'E-1'), r('X-9')];
  assert.deepEqual(shape(inTree(rows, keyOf, parentOf)), ['E-1+', '  S-2+', '    T-3', '  S-4', 'X-9']);
});

test('a row whose parent the search left out is a root, unless the parent comes as context', () => {
  const rows = [r('S-2', 'E-1'), r('S-4', 'E-1')];
  assert.deepEqual(shape(inTree(rows, keyOf, parentOf)), ['S-2', 'S-4']);
  assert.deepEqual(shape(inTree(rows, keyOf, parentOf, [r('E-1', 'I-0'), r('I-0')])), ['I-0*+', '  E-1*+', '    S-2', '    S-4']);
});

test('context that leads to nothing in the result is left out, and a result row is never context', () => {
  const rows = [r('S-2', 'E-1'), r('E-1')];
  assert.deepEqual(shape(inTree(rows, keyOf, parentOf, [r('E-7'), r('E-1')])), ['E-1+', '  S-2']);
});

test('a loop breaks where it would repeat, losing no row', () => {
  const rows = [r('A', 'B'), r('B', 'A')];
  assert.deepEqual(inTree(rows, keyOf, parentOf).map((t) => t.key).sort(), ['A', 'B']);
  assert.deepEqual(shape(inTree([r('A', 'A')], keyOf, parentOf)), ['A']);
});

test('folding a row hides everything under it, at any depth', () => {
  const tree = inTree([r('E-1'), r('S-2', 'E-1'), r('T-3', 'S-2'), r('X-9')], keyOf, parentOf);
  assert.deepEqual(visibleInTree(tree, new Set(['E-1'])).map((t) => t.key), ['E-1', 'X-9']);
  assert.deepEqual(visibleInTree(tree, new Set(['S-2'])).map((t) => t.key), ['E-1', 'S-2', 'X-9']);
});

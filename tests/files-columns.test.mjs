// Matching a file's columns to fields (src/files/columns.ts): value kinds, first guesses, counts and problems.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { columnCounts, columnProblems, guessTargets, guessType } from '../src/files/columns.ts';

test('a column’s kind comes from all its values', () => {
  assert.equal(guessType(['1', '42', '', '-7']), 'integer');
  assert.equal(guessType(['1', '2.5', '3']), 'decimal');
  assert.equal(guessType(['true', 'No', 'yes']), 'boolean');
  assert.equal(guessType(['2026-11-27', '2027-01-01']), 'date');
  assert.equal(guessType(['2026-11-27T08:00:00Z', '2026-11-27 09:30']), 'timestamp');
  assert.equal(guessType(['5f0c2a9e-1b2c-4d3e-8f90-0a1b2c3d4e5f']), 'uuid');
  assert.equal(guessType(['12', 'twelve']), 'text');
  assert.equal(guessType(['', ' ']), 'text');
});

test('headers go to fields by name or label, each field once; the rest are new, or skipped when new isn’t allowed', () => {
  const headers = ['Title', 'due date', 'Amount', 'Title'];
  const samples = [['Laptops', '2026-12-05', '1250.5', 'x'], ['Desks', '2027-01-10', '80', 'y']];
  const fields = [{ name: 'title', label: 'Title' }, { name: 'dueDate', label: 'Due date' }];
  assert.deepEqual(guessTargets(headers, samples, fields, { allowNew: true, typeOf: (k) => (k === 'decimal' || k === 'integer' ? 'number' : k) }), [
    { kind: 'field', name: 'title' },
    { kind: 'field', name: 'dueDate' },
    { kind: 'new', name: 'Amount', type: 'number' },
    { kind: 'new', name: 'Title', type: 'text' },
  ]);
  assert.deepEqual(guessTargets(['x'], [['1']], fields), [{ kind: 'skip' }], 'fields given and no allowNew: skipped');
  assert.deepEqual(guessTargets(['Order ID'], [['5']]), [{ kind: 'new', name: 'Order ID', type: 'integer' }], 'no fields: every column is new');
});

test('counts and problems', () => {
  const targets = [{ kind: 'field', name: 'title' }, { kind: 'field', name: 'title' }, { kind: 'new', name: ' ', type: 'text' },
    { kind: 'new', name: 'Notes', type: 'text' }, { kind: 'new', name: 'notes', type: 'text' }, { kind: 'skip' }];
  assert.deepEqual(columnCounts(targets), { total: 6, created: 3, matched: 2, skipped: 1 });
  assert.deepEqual(columnProblems(targets), { twice: ['title'], unnamed: [2], sameName: ['notes'] });
});

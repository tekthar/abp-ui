// The filter builder (UI round 9, step 57): conditions on one field saying "is" become one "is any of".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeSameField } from '@todahq/client/rules';

const fields = [
  { id: 'status', kind: 'choice', label: 'Status', sortable: true, groupable: true, operators: ['eq', 'ne', 'in', 'notIn'] },
  { id: 'title', kind: 'text', label: 'Title', sortable: true, groupable: false, operators: ['contains', 'eq'] },
];

test('two "is" on one field become one "is any of"', () => {
  assert.deepEqual(mergeSameField([{ field: 'status', op: 'eq', value: 'draft' }, { field: 'status', op: 'eq', value: 'coding' }], fields),
    [{ field: 'status', op: 'in', value: ['draft', 'coding'] }]);
});

test('other fields, other operators, and fields without "in" stay apart', () => {
  const conds = [
    { field: 'status', op: 'ne', value: 'done' },
    { field: 'title', op: 'eq', value: 'a' },
    { field: 'title', op: 'eq', value: 'b' },
    { field: 'status', op: 'eq', value: 'draft' },
  ];
  assert.deepEqual(mergeSameField(conds, fields), conds);
});

test('the conditions given are left as they were', () => {
  const conds = [{ field: 'status', op: 'eq', value: 'draft' }, { field: 'status', op: 'eq', value: 'coding' }];
  mergeSameField(conds, fields);
  assert.equal(conds[0].op, 'eq');
});

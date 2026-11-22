// The export dialog's preview (UI round 10 step 76): plain text for values, CSV fields quoted as the server quotes them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvField, exportText } from '../src/components/query/exportText.ts';

test('values read as a file shows them', () => {
  assert.equal(exportText(null), '');
  assert.equal(exportText(60), '60');
  assert.equal(exportText({ displayName: 'Sara Ali', username: 'sara' }), 'Sara Ali');
  assert.equal(exportText(['service', { name: 'Software' }]), 'service; Software');
  assert.equal(exportText({}), '');
});

test('a field is quoted when it holds the separator, a quote or a line break', () => {
  assert.equal(csvField('plain', ','), 'plain');
  assert.equal(csvField('a,b', ','), '"a,b"');
  assert.equal(csvField('a,b', ';'), 'a,b');
  assert.equal(csvField('a;b', ';'), '"a;b"');
  assert.equal(csvField('say "hi"', ','), '"say ""hi"""');
  assert.equal(csvField('two\nlines', '\t'), '"two\nlines"');
});

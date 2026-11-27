// CSV in the browser (src/files/csv.ts): reading what a person uploads, writing it back remapped, and telling files apart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessSeparator, parseCsv, remapCsv, tableKind, writeCsv } from '../src/files/csv.ts';

test('a file is a CSV, an Excel workbook, an older Excel file, or neither', () => {
  assert.equal(tableKind({ name: 'a.csv' }), 'csv');
  assert.equal(tableKind({ name: 'export', type: 'text/csv' }), 'csv');
  assert.equal(tableKind({ name: 'Budget.XLSX' }), 'xlsx');
  assert.equal(tableKind({ name: 'old.xls' }), 'old');
  assert.equal(tableKind({ name: 'notes.txt', type: 'text/plain' }), null);
});


test('a file is read by its own separator, with quotes, a byte order mark and blank lines', () => {
  assert.deepEqual(parseCsv('﻿Key,Name\r\nPRC,"Procurement, central"\r\n\r\nMKT,Marketing\n'), [['Key', 'Name'], ['PRC', 'Procurement, central'], ['MKT', 'Marketing']]);
  assert.deepEqual(parseCsv('Title;Notes\nLaptops;"two\nlines"'), [['Title', 'Notes'], ['Laptops', 'two\nlines']]);
  assert.deepEqual(parseCsv('a\tb\n1\t"say ""hi"""'), [['a', 'b'], ['1', 'say "hi"']]);
  assert.equal(guessSeparator('"a;b",c,d\n'), ',');
});

test('columns are renamed or left out for the import, and written back with commas', () => {
  const rows = remapCsv([['Request', 'Owner', 'Notes'], ['Laptops', 'omar', 'x, y'], ['Desks']], ['title', null, 'Notes']);
  assert.deepEqual(rows, [['title', 'Notes'], ['Laptops', 'x, y'], ['Desks', '']]);
  assert.equal(writeCsv(rows), 'title,Notes\r\nLaptops,"x, y"\r\nDesks,\r\n');
});

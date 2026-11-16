// Names by language and lists typed as text (the rules entry, ADR 0109 amendment).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromNamesValue, languageChain, pickName, splitList, toNamesValue } from '../src/rules/names.ts';

test('the chain: the reader, their base language, the default, English, each once', () => {
  assert.deepEqual(languageChain('ar-SA', 'fr'), ['ar-SA', 'ar', 'fr', 'en']);
  assert.deepEqual(languageChain('en', 'en'), ['en']);
  assert.deepEqual(languageChain('ar'), ['ar', 'en']);
});

test('a name in the first language that has one, else any, else the fallback; blanks count as none', () => {
  const names = { en: 'Triage', ar: '  ', fr: 'Tri' };
  assert.equal(pickName(['ar', 'en'], names, 'key'), 'Triage');
  assert.equal(pickName(['de'], names, 'key'), 'Triage');
  assert.equal(pickName(['ar'], { ar: '' }, 'key'), 'key');
  assert.equal(pickName(['en'], null, 'key'), 'key');
});

test('a list typed with commas or lines, trimmed, blanks dropped', () => {
  assert.deepEqual(splitList(' a, b\n\nc ,'), ['a', 'b', 'c']);
  assert.deepEqual(splitList(''), []);
});

test('a written name and its other languages, as one map and back', () => {
  assert.deepEqual(toNamesValue('Sales', { ar: 'المبيعات', fr: ' ' }), { ar: 'المبيعات', en: 'Sales' });
  assert.deepEqual(fromNamesValue({ en: ' Sales ', ar: ' المبيعات ', fr: '' }), { name: 'Sales', names: { ar: 'المبيعات' } });
  assert.deepEqual(fromNamesValue(toNamesValue('Ventes', { en: 'Sales' }, 'fr'), 'fr'), { name: 'Ventes', names: { en: 'Sales' } });
});

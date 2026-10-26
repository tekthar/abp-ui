// A plugin's texts (ADR 0026) and the identity of its translate function (ADR 0078). `pnpm --dir packages/ui test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bundlesFor, translate } from '../src/provider/texts-lookup.ts';

const en = { title: 'Seed data', run: { done: 'Done in {seconds} s' }, 'type.epic': 'Epic' };
const ar = { title: 'تعبئة البيانات' };

test('the translate function depends on the files, not on the object a plugin wraps them in', () => {
  // What `usePluginTexts('x', { en, ar })` gives the hook on two renders: two objects, the same files.
  const first = bundlesFor({ en, ar }, 'ar-SA');
  const second = bundlesFor({ en, ar }, 'ar-SA');
  assert.equal(first.length, second.length);
  first.forEach((files, i) => assert.equal(files, second[i], `bundle ${i} is the same file on every render`));
  assert.deepEqual(bundlesFor({ en, ar }, 'ar'), [ar, ar, en]);
  assert.deepEqual(bundlesFor({ en, ar }, 'ar-SA'), [undefined, ar, en], 'a regional language reads its base language');
});

test('the site wins, then the language, then English, then the key', () => {
  const bundles = bundlesFor({ en, ar }, 'ar');
  assert.equal(translate({ title: 'Seeder' }, bundles, 'title'), 'Seeder', "an admin's wording");
  assert.equal(translate(undefined, bundles, 'title'), 'تعبئة البيانات');
  assert.equal(translate(undefined, bundles, 'run.done', { seconds: 12 }), 'Done in 12 s', 'English for a key Arabic lacks, nested');
  assert.equal(translate(undefined, bundles, 'type.epic'), 'Epic', 'a flat dotted key');
  assert.equal(translate(undefined, bundles, 'nothing.here'), 'nothing.here');
  assert.equal(translate(undefined, bundles, 'run.done'), 'Done in {seconds} s', 'a value not given stays a placeholder');
});

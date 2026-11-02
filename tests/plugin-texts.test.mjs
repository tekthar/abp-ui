// A plugin's texts (ADR 0026) and the identity of its translate function (ADR 0078). `pnpm --dir packages/ui test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bundlesFor, DEFAULT_PRODUCT_NAME, translate, withProductValue } from '../src/provider/texts-lookup.ts';

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

test("{product} is the product's name in any file, unless the plugin gives a product of its own", () => {
  const bundles = bundlesFor({ en: { intro: 'Bring a project into {product}.', item: '{product} × {count}' } }, 'en');
  assert.equal(translate(undefined, bundles, 'intro', withProductValue('Toda')), 'Bring a project into Toda.', 'a shipped text');
  assert.equal(translate({ intro: 'Into {product}, now.' }, bundles, 'intro', withProductValue('أكمي')), 'Into أكمي, now.', "the site's text");
  assert.equal(translate(undefined, bundles, 'item', withProductValue('Toda', { product: 'Widget', count: 2 })), 'Widget × 2', "the plugin's value wins");
  assert.equal(DEFAULT_PRODUCT_NAME, 'Toda');
});

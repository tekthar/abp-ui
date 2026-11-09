// The browser tab's title: what a page claims, which claim wins, and how the parts read. `pnpm --dir packages/ui test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeTitle, partsOf, TitleStore } from '../src/provider/title-claims.ts';

const RLM = '‏';
const FSI = '⁨';
const PDI = '⁩';

test('a claim keeps its text parts, trimmed, and drops the empty ones', () => {
  assert.deepEqual(partsOf(['  PAY-41  Retry\nfailed ', null, '', undefined, false, 'Payments']), ['PAY-41 Retry failed', 'Payments']);
  assert.deepEqual(partsOf('Groups'), ['Groups']);
  assert.deepEqual(partsOf(41), ['41']);
  assert.deepEqual(partsOf(undefined), []);
  assert.deepEqual(partsOf(['', '  ']), [], 'a title still loading claims nothing');
});

test('most specific first, then the site, with a part said twice in a row once', () => {
  assert.equal(composeTitle(['PAY-41 Retry failed payouts', 'Payments'], 'Toda', false), 'PAY-41 Retry failed payouts · Payments · Toda');
  assert.equal(composeTitle([], 'Toda', false), 'Toda', 'no claim: the site');
  assert.equal(composeTitle(['Partnerships', 'Partnerships'], 'Toda', false), 'Partnerships · Toda');
  assert.equal(composeTitle(['Toda'], 'Toda', false), 'Toda');
  assert.equal(composeTitle(['Groups'], undefined, false), 'Groups', 'no site name');
  assert.equal(composeTitle([], undefined, false), '');
});

test('right to left: the title starts right to left and each part is isolated, so a Latin key keeps the order', () => {
  assert.equal(composeTitle(['PAY-41 تسديد الدفعات', 'المدفوعات'], 'تودا', true), `${RLM}${FSI}PAY-41 تسديد الدفعات${PDI} · ${FSI}المدفوعات${PDI} · ${FSI}تودا${PDI}`);
  assert.equal(composeTitle([], 'تودا', true), `${RLM}تودا`);
  // An English page about an Arabic name: isolated, still left to right.
  assert.equal(composeTitle(['شركة أكمي', 'Companies'], 'Toda', false), `${FSI}شركة أكمي${PDI} · ${FSI}Companies${PDI} · ${FSI}Toda${PDI}`);
});

test('the claim set last wins; one that leaves gives way to the one before; the same parts again change nothing', () => {
  const store = new TitleStore();
  let told = 0;
  store.subscribe(() => told++);
  const shell = store.open();
  const page = store.open();
  store.setParts(shell, ['Partnerships']);
  store.setParts(page, ['Acme', 'Companies']);
  assert.deepEqual(store.current().parts, ['Acme', 'Companies']);
  store.setParts(shell, ['Partnerships']);
  assert.deepEqual(store.current().parts, ['Acme', 'Companies'], 'an unchanged claim stays where it was');
  const before = store.current();
  store.setParts(page, ['Acme', 'Companies']);
  assert.equal(store.current(), before, 'the snapshot is the same object while nothing changes');
  store.setParts(page, null);
  assert.deepEqual(store.current().parts, ['Partnerships'], 'leaving a record for the list shows the list again');
  store.setParts(shell, []);
  assert.deepEqual(store.current().parts, [], 'an empty claim is no claim');
  assert.equal(told, 4, "told once per change of the winning parts");
});

test("a portal's name stands in the site's place while it claims it", () => {
  const store = new TitleStore();
  const portal = store.open();
  store.setSite(portal, 'Help center');
  assert.equal(store.current().site, 'Help center');
  store.setSite(portal, '  ');
  assert.equal(store.current().site, undefined);
});

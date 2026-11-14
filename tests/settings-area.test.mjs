// Settings areas (ADR 0095; in the design system since ADR 0109): heavier first then by title, invisible pages left
// out, a host's section taken once, and the page an address opens. `pnpm --dir packages/ui test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findSettingsPage, heavierFirst, inSections, settingsArea } from '../src/rules/settings.ts';

const sections = [{ key: 'system', title: 'System', weight: 100 }, { key: 'people', title: 'People', weight: 600 }, { key: 'extra', title: 'Extra', weight: 350 }];
const pages = [
  { id: 'storage', section: 'system', weight: 700, title: 'Storage', href: '/admin/storage' },
  { id: 'accounts', section: 'people', weight: 600, title: 'Accounts', href: '/admin/accounts' },
  { id: 'directories', section: 'people', weight: 700, title: 'Directories', href: '/admin/directories' },
  { id: 'x:one', section: 'people', weight: 650, title: 'Between', href: '/admin/apps/x/one', plugin: 'x' },
  { id: 'hidden', section: 'system', weight: 800, title: 'Hidden', href: '/admin/hidden', visible: false },
  { id: 'asked', section: 'system', weight: 50, title: 'Asked', href: '/admin/asked', visible: () => true },
];

test('heavier first, then by title', () => {
  assert.deepEqual([{ weight: 1, title: 'b' }, { weight: 2, title: 'z' }, { weight: 1, title: 'a' }].sort(heavierFirst).map((x) => x.title), ['z', 'a', 'b']);
});

test('sections heaviest first with their pages; a section with none is left out', () => {
  assert.deepEqual(inSections(sections, pages).map((s) => [s.section.key, s.pages.map((p) => p.id)]), [
    ['people', ['directories', 'x:one', 'accounts']],
    ['system', ['hidden', 'storage', 'asked']],
  ]);
});

test("an area shows only the pages this person may see, and a host's section once", () => {
  const area = settingsArea([...sections, { key: 'people', title: 'Plugin people', weight: 1 }], pages);
  assert.deepEqual(area.map((s) => [s.section.title, s.pages.map((p) => p.id)]), [['People', ['directories', 'x:one', 'accounts']], ['System', ['storage', 'asked']]]);
});

test('the page an address opens is the longest href at or above it', () => {
  assert.equal(findSettingsPage(pages, '/admin/apps/x/one/deeper')?.id, 'x:one');
  assert.equal(findSettingsPage(pages, '/admin/accounts')?.id, 'accounts');
  assert.equal(findSettingsPage(pages, '/admin/accountsx'), undefined);
});

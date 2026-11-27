// guard › Directories' form rules (UI round 10's People boards): editing starts without secrets, which types sync, moving.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editInput, forType, moved, syncs } from '../src/areas/guard/directoryRules.ts';

const ldap = {
  name: 'Corp', names: { ar: 'الشركة' }, type: 'ldap', isActive: true, authenticationEnabled: false, syncIntervalMinutes: '60',
  settings: { host: 'ldap.example.test', bindPassword: '********', apiKey: 'shown-but-secret' },
};

test("editing starts from the directory, its secrets empty so they're kept", () => {
  const input = editInput(ldap, new Set(['apiKey']));
  assert.deepEqual(input.settings, { host: 'ldap.example.test', bindPassword: '', apiKey: '' });
  assert.equal(input.syncIntervalMinutes, 60);
  assert.deepEqual([input.name, input.type, input.isActive, input.authenticationEnabled], ['Corp', 'ldap', true, false]);
  assert.equal(editInput({ ...ldap, syncIntervalMinutes: null }).syncIntervalMinutes, null);
  assert.equal(editInput({ ...ldap, syncIntervalMinutes: 'x' }).syncIntervalMinutes, null);
  // 0 is on request, as empty is.
  assert.equal(editInput({ ...ldap, syncIntervalMinutes: 0 }).syncIntervalMinutes, null);
});

test('only a type that syncs has a sync interval', () => {
  assert.equal(syncs(['Authenticate', 'Sync', 'NestedGroups']), true);
  assert.equal(syncs(['IncrementalSync']), true);
  assert.equal(syncs(['Authenticate']), false);
  assert.equal(syncs(undefined), false);
});

test('moving a directory a step up or down; the ends stay', () => {
  assert.deepEqual(moved(['a', 'b', 'c'], 'b', -1), ['b', 'a', 'c']);
  assert.deepEqual(moved(['a', 'b', 'c'], 'b', 1), ['a', 'c', 'b']);
  assert.deepEqual(moved(['a', 'b', 'c'], 'a', -1), ['a', 'b', 'c']);
  assert.deepEqual(moved(['a', 'b', 'c'], 'c', 1), ['a', 'b', 'c']);
  assert.deepEqual(moved(['a', 'b'], 'z', 1), ['a', 'b']);
});

test("a type that doesn't sync saves no interval", () => {
  const input = { name: 'x', type: 'internal', syncIntervalMinutes: 60 };
  assert.equal(forType(input, ['Authenticate']).syncIntervalMinutes, null);
  assert.equal(forType(input, ['Authenticate', 'Sync']).syncIntervalMinutes, 60);
  assert.equal(forType(input, undefined).syncIntervalMinutes, null);
});

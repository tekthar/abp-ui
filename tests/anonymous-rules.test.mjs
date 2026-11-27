// guard › Anonymous access's choosing rules (UI round 10's People boards): which roles and places the dialog offers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeKept, placesOffering, rolesOffered, takenBy, takenKey } from '../src/areas/guard/anonymousRules.ts';

const viewer = { id: 'r-viewer' };
const member = { id: 'r-member' };
const requester = { id: 'r-requester' };
const care = { scopeKey: 'project:care', roles: [member, viewer, requester] };
const kb = { scopeKey: 'project:kb', roles: [viewer] };
const empty = { scopeKey: 'project:empty', roles: [] };
const places = [care, kb, empty];
const ids = (xs) => xs.map((x) => x.id ?? x.scopeKey);

test('roles: every role some place offers, each once; a chosen place offers its own', () => {
  assert.deepEqual(ids(rolesOffered(places)), ['r-member', 'r-viewer', 'r-requester']);
  assert.deepEqual(ids(rolesOffered(places, kb)), ['r-viewer']);
  assert.deepEqual(rolesOffered([]), []);
});

test('places: those that offer the chosen role, any while none is chosen; one with no roles never', () => {
  assert.deepEqual(ids(placesOffering(places, '')), ['project:care', 'project:kb']);
  assert.deepEqual(ids(placesOffering(places, 'r-viewer')), ['project:care', 'project:kb']);
  assert.deepEqual(ids(placesOffering(places, 'r-requester')), ['project:care']);
});

test('a role already given in a place is not offered there again', () => {
  const taken = new Set([takenKey('r-viewer', 'project:kb')]);
  // KB's only role is given: KB isn't offered, and Viewer is offered only for Customer care.
  assert.deepEqual(ids(placesOffering(places, '', taken)), ['project:care']);
  assert.deepEqual(ids(placesOffering(places, 'r-viewer', taken)), ['project:care']);
  assert.deepEqual(ids(rolesOffered(places, kb, taken)), []);
  assert.deepEqual(ids(rolesOffered(places, undefined, taken)), ['r-member', 'r-viewer', 'r-requester']);
  assert.deepEqual(ids(rolesOffered([kb], undefined, taken)), []);
});

test("the grants' pairs, leaving out the one being changed", () => {
  const grants = [
    { id: 'g1', roleId: 'r-viewer', scopeKey: 'project:kb' },
    { id: 'g2', roleId: 'r-member', scopeKey: 'project:care' },
    { id: 'g3', roleId: null, scopeKey: 'project:care' },
  ];
  assert.deepEqual([...takenBy(grants)].sort(), [takenKey('r-member', 'project:care'), takenKey('r-viewer', 'project:kb')].sort());
  assert.deepEqual([...takenBy(grants, 'g2')], [takenKey('r-viewer', 'project:kb')]);
});

test('a place that does not offer the new role is let go', () => {
  assert.equal(placeKept(places, 'project:kb', 'r-viewer'), 'project:kb');
  assert.equal(placeKept(places, 'project:kb', 'r-requester'), '');
  assert.equal(placeKept(places, 'project:kb', 'r-viewer', new Set([takenKey('r-viewer', 'project:kb')])), '');
  assert.equal(placeKept(places, 'project:gone', 'r-viewer'), '');
  assert.equal(placeKept(places, '', 'r-viewer'), '');
  assert.equal(placeKept(places, 'project:kb', ''), 'project:kb');
});

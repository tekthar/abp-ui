// guard › Anonymous access's choosing rules (UI round 10's People boards): which roles and places the dialog offers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeKept, placesOffering, rolesOffered } from '../src/areas/guard/anonymousRules.ts';

const viewer = { id: 'r-viewer' };
const member = { id: 'r-member' };
const requester = { id: 'r-requester' };
const care = { scopeKey: 'project:care', roles: [member, viewer, requester] };
const kb = { scopeKey: 'project:kb', roles: [viewer] };
const places = [care, kb];

test('roles: every role some place offers, each once; a chosen place offers its own', () => {
  assert.deepEqual(rolesOffered(places).map((r) => r.id), ['r-member', 'r-viewer', 'r-requester']);
  assert.deepEqual(rolesOffered(places, kb).map((r) => r.id), ['r-viewer']);
  assert.deepEqual(rolesOffered([]), []);
});

test('places: those that offer the chosen role, all while none is chosen', () => {
  assert.deepEqual(placesOffering(places, '').map((p) => p.scopeKey), ['project:care', 'project:kb']);
  assert.deepEqual(placesOffering(places, 'r-viewer').map((p) => p.scopeKey), ['project:care', 'project:kb']);
  assert.deepEqual(placesOffering(places, 'r-requester').map((p) => p.scopeKey), ['project:care']);
});

test('a place that does not offer the new role is let go', () => {
  assert.equal(placeKept(places, 'project:kb', 'r-viewer'), 'project:kb');
  assert.equal(placeKept(places, 'project:kb', 'r-requester'), '');
  assert.equal(placeKept(places, 'project:gone', 'r-viewer'), '');
  assert.equal(placeKept(places, '', 'r-viewer'), '');
});

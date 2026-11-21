// guard › Sign-up's form rules (UI round 10's People boards): a typed domain as it's kept, and how many changes wait.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalDomain, signUpChanges } from '../src/areas/guard/signUpRules.ts';

test('a domain is kept lowercase, without a leading @ or a trailing dot', () => {
  assert.equal(normalDomain('@Acme.com.'), 'acme.com');
  assert.equal(normalDomain('  mail.Example.org '), 'mail.example.org');
  assert.equal(normalDomain('xn--mgbh0fb.xn--kgbechtv'), 'xn--mgbh0fb.xn--kgbechtv');
});

test('what is not a domain is refused', () => {
  for (const typed of ['acme', 'a..b', '-x.com', 'x-.com', 'acme.c', 'acme.com/x', 'me@acme.com', '', ' ']) {
    assert.equal(normalDomain(typed), null, typed);
  }
});

test('each change counts once: the switch, the directory, each domain added or taken out', () => {
  const saved = { enabled: false, directoryId: '', domains: ['old.example'] };
  assert.equal(signUpChanges(saved, saved), 0);
  assert.equal(signUpChanges(saved, { enabled: true, directoryId: 'd1', domains: ['acme.com'] }), 4);
  assert.equal(signUpChanges(saved, { ...saved, domains: ['old.example', 'acme.com', 'example.org'] }), 2);
  // The same domains in another order are no change.
  assert.equal(signUpChanges({ ...saved, domains: ['a.com', 'b.com'] }, { ...saved, domains: ['b.com', 'a.com'] }), 0);
});

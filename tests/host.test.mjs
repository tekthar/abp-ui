// The host contract's parts with no React (ADR 0109 amendment): the text formatter (plurals in English and Arabic,
// choices, nesting, Latin digits) and the host request (ABP's errors, a 401, one retry after a step-up, files).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMessage } from '../src/texts/format.ts';
import { createHostRequest, fileNameOf } from '../src/host/request.ts';
import { AbpApiError } from '../src/host/errors.ts';
import { createHostEvents } from '../src/host/events.ts';
import { requestStepUp, setStepUpHandler, stepUpNeedOf } from '../src/host/step-up.ts';

test('a text fills its values and keeps a missing one as it was', () => {
  assert.equal(formatMessage('en', 'Hello {name}', { name: 'Lama' }), 'Hello Lama');
  assert.equal(formatMessage('en', 'Hello {name}'), 'Hello {name}');
});

test('plurals follow the language, # is the count in Latin digits', () => {
  const fix = '{count, plural, one {Fix this field} other {Fix these # fields}}';
  assert.equal(formatMessage('en', fix, { count: 1 }), 'Fix this field');
  assert.equal(formatMessage('en', fix, { count: 3 }), 'Fix these 3 fields');
  const ar = '{count, plural, zero {لا شيء} one {واحد} two {اثنان} few {# قليلة} many {# كثيرة} other {# أخرى}}';
  assert.deepEqual([0, 1, 2, 5, 11, 100].map((n) => formatMessage('ar', ar, { count: n })), ['لا شيء', 'واحد', 'اثنان', '5 قليلة', '11 كثيرة', '100 أخرى']);
  assert.equal(formatMessage('en', '{n, plural, =0 {none} other {#}}', { n: 0 }), 'none', 'an exact match wins');
});

test('choices and nesting', () => {
  const t = '{kind, select, agent {{count, plural, one {# agent} other {# agents}}} other {{count} people}}';
  assert.equal(formatMessage('en', t, { kind: 'agent', count: 2 }), '2 agents');
  assert.equal(formatMessage('en', t, { kind: 'person', count: 2 }), '2 people');
});

function server(answers) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, ...init });
    const [status, body, headers = {}] = answers.shift();
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
  };
  return { calls, fetch };
}

test('a refusal comes back as ABP says it, read as JSON whatever the content type', async () => {
  const s = server([[409, { error: { code: 'taken', message: 'That name is taken', validationErrors: [{ message: 'x', members: ['name'] }] } }, { 'Content-Type': 'application/octet-stream' }]]);
  const request = createHostRequest({ fetch: s.fetch });
  await assert.rejects(request('/api/ai/aliases/x', { method: 'PUT', body: { a: 1 } }), (e) => e instanceof AbpApiError && e.status === 409 && e.code === 'taken' && e.message === 'That name is taken' && e.validationErrors.length === 1);
  assert.equal(s.calls[0].headers['Content-Type'], 'application/json');
  assert.equal(s.calls[0].body, '{"a":1}');
});

test('a refusal at the top level (AbpAi 422) gives its code and message, the rest as data', async () => {
  const s = server([[422, { code: 'over_limit', message: 'Over the monthly limit', limit: { amount: 5 } }]]);
  await assert.rejects(createHostRequest({ fetch: s.fetch })('/try', { method: 'POST', body: {} }), (e) =>
    e instanceof AbpApiError && e.status === 422 && e.code === 'over_limit' && e.message === 'Over the monthly limit' && e.data.limit.amount === 5);
});

test('a 401 tells the host; a step-up is asked once and the call retried', async () => {
  let told = 0;
  let asked = 0;
  const s = server([[401, { error: { message: 'Sign in' } }], [403, { error: { code: 'step_up_required', message: 'Confirm' } }], [200, { ok: true }]]);
  const request = createHostRequest({ fetch: s.fetch, onUnauthorized: () => told++, stepUp: async () => (asked++, true) });
  await assert.rejects(request('/a'));
  assert.equal(told, 1);
  assert.deepEqual(await request('/b', { method: 'DELETE' }), { ok: true });
  assert.equal(asked, 1);
  assert.equal(s.calls.length, 3);
});

test('by default the step-up dialog asks: none registered fails as the server said; calls waiting together ask once', async () => {
  const refuse = () => [403, { error: { code: 'step_up_required', message: 'Confirm' } }];
  const none = server([refuse()]);
  await assert.rejects(createHostRequest({ fetch: none.fetch })('/a', { method: 'POST' }), (e) => e instanceof AbpApiError && e.code === 'step_up_required');
  let asked = 0;
  let confirm;
  setStepUpHandler(() => (asked++, new Promise((resolve) => (confirm = resolve))));
  try {
    const s = server([refuse(), refuse(), [200, { n: 1 }], [200, { n: 2 }]]);
    const request = createHostRequest({ fetch: s.fetch });
    const both = Promise.all([request('/a', { method: 'POST' }), request('/b', { method: 'POST' })]);
    await new Promise((r) => setTimeout(r, 0));
    confirm(true);
    assert.deepEqual((await both).map((r) => r.n).sort(), [1, 2]);
    assert.equal(asked, 1);
    const later = requestStepUp();
    assert.equal(asked, 2, 'a later step-up asks again');
    confirm(false);
    assert.equal(await later, false);
  } finally {
    setStepUpHandler(null);
  }
});

test("the need a step-up carries: the level, the person's ways best first, a strong factor to set up", () => {
  assert.deepEqual(stepUpNeedOf('step_up_required', { level: 'strong', category: 'plugins', methods: ['passkey', 'app', 'password'], maxAgeSeconds: 600 }),
    { code: 'step_up_required', level: 'strong', category: 'plugins', methods: ['passkey', 'app', 'password'] });
  assert.deepEqual(stepUpNeedOf('strong_factor_required', { category: 'roles' }), { code: 'strong_factor_required', level: 'strong', category: 'roles', methods: [] });
  assert.equal(stepUpNeedOf('step_up_required', null).level, 'password', 'an older server: the password level');
});

test('a strong factor set up, then the strong step-up with it, then the call; a call that opts out is refused as is', async () => {
  const asked = [];
  const s = server([
    [403, { error: { code: 'strong_factor_required', message: 'Set one up', data: { category: 'plugins' } } }],
    [403, { error: { code: 'step_up_required', message: 'Confirm', data: { level: 'strong', category: 'plugins', methods: ['passkey', 'password'] } } }],
    [200, { installed: true }],
    [403, { error: { code: 'step_up_required', message: 'Confirm', data: { level: 'password' } } }],
  ]);
  const request = createHostRequest({ fetch: s.fetch, stepUp: async (need) => (asked.push(`${need.code}:${need.level}:${need.methods.join('|')}`), true) });
  assert.deepEqual(await request('/plugins', { method: 'POST' }), { installed: true });
  assert.deepEqual(asked, ['strong_factor_required:strong:', 'step_up_required:strong:passkey|password']);
  await assert.rejects(request('/x', { method: 'POST', stepUp: false }), (e) => e.code === 'step_up_required');
  assert.equal(asked.length, 2);
});

test('a file comes back with the name the server gives', async () => {
  const s = server([[200, 'csv,data', { 'Content-Disposition': "attachment; filename*=UTF-8''usage%20Nov.csv", 'Content-Type': 'text/csv' }]]);
  const file = await createHostRequest({ fetch: s.fetch })('/x', { method: 'POST', as: 'file' });
  assert.equal(file.name, 'usage Nov.csv');
  assert.equal(await file.blob.text(), 'csv,data');
  assert.equal(fileNameOf('attachment; filename="a.json"'), 'a.json');
});

test('server-sent events: each event with its id, resumed from the last, a refusal before the stream thrown', async () => {
  const sent = [];
  const fetch = async (url, init) => {
    sent.push(init.headers['Last-Event-ID'] ?? null);
    if (sent.length === 1) return new Response(JSON.stringify({ error: { code: 'nope', message: 'No' } }), { status: 403 });
    return new Response('event: step\nid: 7\ndata: {"n":1}\n\ndata: {"n":2}\nid: 8\n\n', { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  };
  const events = createHostEvents({ fetch });
  await assert.rejects(events('/chats/1/events', () => {}), (e) => e instanceof AbpApiError && e.code === 'nope');
  const got = [];
  const last = await events('/chats/1/events', (name, data, id) => got.push([name, data.n, id]), { lastEventId: '6' });
  assert.deepEqual(got, [['step', 1, '7'], ['message', 2, '8']]);
  assert.equal(last, '8');
  assert.equal(sent[1], '6');
});

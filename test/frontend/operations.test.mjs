import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { OperationsApi } from '../../js/operations/operations-api.js';

test('operations API routes booking, packages, tracking, pricing, and assignments through the central request function', async () => {
  const calls = [];
  const api = new OperationsApi(async (path, options = {}) => { calls.push({ path, options }); return { items: [] }; });
  await api.createRequest({ recipientName: 'Test' });
  await api.submitRequest('request-id');
  await api.packages({ limit: 25 });
  await api.publicTracking('CSW-2026-ABC');
  await api.calculate({ weightKg: 1 });
  await api.assign('package-id', 'rider-id', 1);
  assert.deepEqual(calls.map(call => call.path), ['/customer-requests', '/customer-requests/request-id/submit', '/packages?limit=25', '/tracking/CSW-2026-ABC', '/pricing/calculate', '/packages/package-id/assign']);
  assert.equal(calls[3].options.authenticated, false);
  assert.equal(calls[4].options.authenticated, false);
  assert.ok(calls[0].options.headers['Idempotency-Key']);
  assert.ok(calls[1].options.headers['Idempotency-Key']);
});

test('idempotent mutations reuse a key and one pending promise, then issue a new key after success', async () => {
  const calls = []; let resolveFirst;
  const request = (path, options) => { calls.push({ path, options }); return new Promise(resolve => { resolveFirst = resolve; }); };
  let sequence = 0; const api = new OperationsApi(request, () => `idempotency-${++sequence}`);
  const first = api.createRequest({ recipientName: 'Same' });
  const duplicate = api.createRequest({ recipientName: 'Same' });
  assert.equal(first, duplicate); assert.equal(calls.length, 1); assert.equal(calls[0].options.headers['Idempotency-Key'], 'idempotency-1');
  resolveFirst({ id: 'request' }); await first;
  const next = api.createRequest({ recipientName: 'Same' });
  assert.equal(calls.length, 2); assert.equal(calls[1].options.headers['Idempotency-Key'], 'idempotency-2');
  resolveFirst({ id: 'request-2' }); await next;
});

test('a failed retry keeps the same in-memory idempotency key and form changes get a different key', async () => {
  const calls = []; let sequence = 0; let fail = true;
  const api = new OperationsApi(async (_path, options) => { calls.push(options); if (fail) { fail = false; throw Object.assign(new Error('timeout'), { code: 'REQUEST_TIMEOUT' }); } return { id: 'ok' }; }, () => `idempotency-${++sequence}`);
  await assert.rejects(api.createPackage({ recipientName: 'Original' }));
  await api.createPackage({ recipientName: 'Original' });
  await api.createPackage({ recipientName: 'Changed' });
  assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
  assert.notEqual(calls[1].headers['Idempotency-Key'], calls[2].headers['Idempotency-Key']);
});

test('API mode ignores every legacy operational localStorage collection without deleting it', async () => {
  const source = await readFile(new URL('../../app.js', import.meta.url), 'utf8');
  for (const key of ['packages', 'customerRequests', 'hubs', 'activities']) {
    assert.match(source, new RegExp(`\\['employees', 'pendingSignups', 'packages', 'customerRequests', 'hubs', 'activities'\\]\\.includes\\(stateKey\\)`));
    assert.equal(source.includes(`localStorage.removeItem('ceylonswift_${key}')`) && !source.includes('API mode data is backend-managed'), false);
  }
  assert.match(source, /applyBackendOperationsCompatibility/);
});

test('frontend pricing and tracking delegate to backend APIs in API mode', async () => {
  const source = await readFile(new URL('../../app.js', import.meta.url), 'utf8');
  assert.match(source, /ceylonSwiftOperations\.calculate\('cust'\)/);
  assert.match(source, /ceylonSwiftOperations\.calculate\('home'\)/);
  assert.match(source, /ceylonSwiftOperations\.track\(\)/);
  assert.match(source, /ceylonSwiftOperations\.submitCustomerRequest\(event\)/);
});

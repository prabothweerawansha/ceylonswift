import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { OperationsApi } from '../../js/operations/operations-api.js';
import { mapCustomerRequestCreatePayload, normalizeSriLankanMobile, CustomerRequestPayloadError } from '../../js/operations/customer-request-payload.js';

const normalCustomerOrder = {
  recipientName: '  Nimmi Perera  ', recipientPhone: '077 456 7890', weightKg: '1.20', serviceLevel: 'express', paymentMode: 'Prepaid',
  originHubId: '11111111-1111-4111-8111-111111111111', destinationHubId: '22222222-2222-4222-8222-222222222222',
  pickupAddress: { line1: ' 45 Flower Road ', locality: ' Colombo ', countryCode: 'lk' },
  deliveryAddress: { line1: ' 12 Galle Road ', locality: ' Galle ', countryCode: 'LK' },
};

test('customer request mapper sends the exact backend create DTO shape for a normal order', () => {
  assert.deepEqual(mapCustomerRequestCreatePayload(normalCustomerOrder), {
    recipientName: 'Nimmi Perera', recipientPhone: '+94774567890', weightKg: 1.2, serviceLevel: 'EXPRESS', paymentMode: 'PREPAID',
    originHubId: normalCustomerOrder.originHubId, destinationHubId: normalCustomerOrder.destinationHubId,
    pickupAddress: { type: 'PICKUP', line1: '45 Flower Road', locality: 'Colombo', countryCode: 'LK' },
    deliveryAddress: { type: 'DELIVERY', line1: '12 Galle Road', locality: 'Galle', countryCode: 'LK' },
  });
});

test('customer request mapper drops legacy, display-only, computed, and authoritative fields', () => {
  const payload = mapCustomerRequestCreatePayload({
    ...normalCustomerOrder, fee: 480, quotedAmount: 480, finalFee: 480, trackingCode: 'FORGED', status: 'APPROVED', version: 9,
    userId: 'user', customerId: 'customer', organizationId: 'organization', branchId: 'branch', role: 'OWNER', permissions: ['*'],
    legacyId: 'legacy', pickupAddress: { ...normalCustomerOrder.pickupAddress, label: 'display', unexpected: true },
  });
  for (const field of ['fee', 'quotedAmount', 'finalFee', 'trackingCode', 'status', 'version', 'userId', 'customerId', 'organizationId', 'branchId', 'role', 'permissions', 'legacyId']) assert.equal(field in payload, false);
  assert.equal('label' in payload.pickupAddress, false);
  assert.equal('unexpected' in payload.pickupAddress, false);
});

test('customer request mapper omits empty optional values and normalizes COD numbers', () => {
  const prepaid = mapCustomerRequestCreatePayload({ ...normalCustomerOrder, recipientPhone: ' ', codAmount: '', pickupAddress: { ...normalCustomerOrder.pickupAddress, line2: '', district: ' ', postalCode: '' } });
  assert.equal('recipientPhone' in prepaid, false); assert.equal('codAmount' in prepaid, false); assert.deepEqual(Object.keys(prepaid.pickupAddress).sort(), ['countryCode', 'line1', 'locality', 'type']);
  const cod = mapCustomerRequestCreatePayload({ ...normalCustomerOrder, paymentMode: 'cod', codAmount: '1250.50' });
  assert.equal(cod.paymentMode, 'COD'); assert.equal(cod.codAmount, 1250.5);
});

test('Sri Lankan mobile normalization accepts supported user formats', () => {
  for (const value of ['0771234567', '77 123 4567', '077-123-4567', '+94 77 123 4567', '+94771234567']) {
    assert.equal(normalizeSriLankanMobile(value), '+94771234567');
  }
  assert.equal(normalizeSriLankanMobile('   '), undefined);
});

test('Sri Lankan mobile normalization rejects invalid, alphabetic, long, and unsupported values', () => {
  for (const value of ['077123', '07712CALL7', '077123456789', '0731234567', '+94111234567']) {
    assert.throws(() => normalizeSriLankanMobile(value), error => Boolean(error instanceof CustomerRequestPayloadError && error.fieldErrors.recipientPhone));
  }
});

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

test('customer request creation never spreads the pricing payload into the DTO mapper', async () => {
  const source = await readFile(new URL('../../js/operations/operations-controller.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /mapCustomerRequestCreatePayload\(\{\s*\.\.\.this\.pricingPayload/);
  assert.match(source, /weightKg: document\.getElementById\('cust-weight'\)\?\.value/);
  assert.match(source, /originHubId: this\.selectedHub\('cust-origin-hub'\)\?\.id/);
  assert.match(source, /destinationHubId: this\.selectedHub\('cust-hub'\)\?\.id/);
});

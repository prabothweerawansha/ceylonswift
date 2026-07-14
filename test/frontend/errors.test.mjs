import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ApiError, NetworkError, RequestTimeoutError } from '../../js/api/api-errors.js';
import { errorMessageFor } from '../../js/errors/error-messages.js';
import { mapFieldErrors } from '../../js/errors/field-error-mapper.js';
import { normalizeError } from '../../js/errors/error-normalizer.js';
import { FormErrorController } from '../../js/errors/error-state-controller.js';

test('backend validation strings and future structured details map to safe field messages', () => {
  assert.deepEqual(mapFieldErrors([
    'recipientPhone must be a valid phone number', 'weightKg must be a positive number', 'originHubId should not be empty',
    'destinationHubId should not be empty', { field: 'pickupAddress.line1', code: 'REQUIRED' }, { field: 'deliveryAddress.locality', code: 'REQUIRED' },
  ]), {
    recipientPhone: 'Enter a valid Sri Lankan mobile number, for example 077 123 4567.',
    weightKg: 'Enter a weight greater than 0 kg.', originHubId: 'Choose an origin hub.', destinationHubId: 'Choose a destination hub.',
    'pickupAddress.line1': 'Enter the pickup address.', 'deliveryAddress.locality': 'Enter the destination city or locality.',
  });
});

test('global error catalog covers validation, auth, authorization, not found, conflict, rate limit, server, unavailable, timeout, network, offline, and unknown', () => {
  const cases = [
    ['REQUEST_INVALID', 400, 'validation'], ['AUTH_INVALID_CREDENTIALS', 401, 'authentication'], ['AUTH_SESSION_INVALID', 401, 'authentication'],
    ['ACCESS_DENIED', 403, 'authorization'], ['RESOURCE_NOT_FOUND', 404, 'not-found'], ['IDEMPOTENCY_PAYLOAD_MISMATCH', 409, 'conflict'],
    ['RATE_LIMITED', 429, 'rate-limit'], ['INTERNAL_ERROR', 500, 'server'], ['SERVICE_UNAVAILABLE', 503, 'unavailable'],
    ['REQUEST_TIMEOUT', 0, 'timeout'], ['NETWORK_ERROR', 0, 'network'], ['UNKNOWN', 0, 'unknown'],
  ];
  for (const [code, status, kind] of cases) assert.equal(errorMessageFor({ code, status }).kind, kind);
  assert.equal(errorMessageFor({ code: 'NETWORK_ERROR', online: false }).kind, 'offline');
});

test('normalizer preserves safe support references, maps fields, and hides raw backend text', () => {
  const state = normalizeError(new ApiError('The request contains invalid fields.', { code: 'REQUEST_INVALID', status: 400, details: ['recipientPhone must be a valid phone number'], requestId: 'request-123' }));
  assert.equal(state.requestId, 'request-123'); assert.equal(state.kind, 'validation');
  assert.equal(state.fieldErrors.recipientPhone, 'Enter a valid Sri Lankan mobile number, for example 077 123 4567.');
  assert.doesNotMatch(state.message, /recipientPhone/);
  assert.equal(normalizeError(new NetworkError()).kind, 'network');
  assert.equal(normalizeError(new RequestTimeoutError()).kind, 'timeout');
  assert.equal(normalizeError(new Error('raw internal failure')).message, 'Something unexpected happened. Please try again.');
});

test('support references are optional and copied without attaching sensitive values', async () => {
  const source = await readFile(new URL('../../js/errors/error-presenter.js', import.meta.url), 'utf8');
  assert.match(source, /if \(!requestId\) return null/);
  assert.match(source, /clipboard\?\.writeText\(requestId\)/);
  assert.doesNotMatch(source, /accessToken|refreshToken|password|authorization/i);
});

test('error states include accessible 404, restricted, 500, 503, offline, retry, mobile, and reduced-motion behavior', async () => {
  const [html, controller, presenter, css] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../js/errors/error-state-controller.js', import.meta.url), 'utf8'),
    readFile(new URL('../../js/errors/error-presenter.js', import.meta.url), 'utf8'),
    readFile(new URL('../../css/components/errors.css', import.meta.url), 'utf8'),
  ]);
  assert.match(html, /id="global-error-view"[^>]+role="dialog"/); assert.match(controller, /This route could not be delivered/);
  assert.match(controller, /You do not have access to this area/); assert.match(controller, /hit an unexpected problem/); assert.match(controller, /temporarily unavailable/);
  assert.match(controller, /addEventListener\('offline'/); assert.match(controller, /data-requires-online/); assert.match(presenter, /Try Again/);
  assert.match(css, /@media \(max-width: 600px\)/); assert.match(css, /prefers-reduced-motion: reduce/); assert.match(css, /min-height: 44px/);
});

test('Book Delivery form has linked help, inline error, summary, and optional phone semantics', async () => {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="customerRequestErrorSummary"[^>]+role="alert"[^>]+aria-live="assertive"/);
  assert.match(html, /id="cust-phone"[^>]+aria-describedby="cust-phone-help"/);
  assert.match(html, /id="cust-phone-error" class="field-error" hidden/);
  assert.doesNotMatch(html.match(/<input type="tel" id="cust-phone"[^>]+>/)?.[0] || '', /required/);
});

test('form errors focus the first invalid field and clear only the corrected field', () => {
  const originalDocument = globalThis.document;
  const makeElement = id => ({ id, hidden: false, textContent: '', children: [], attributes: new Map(), listeners: {},
    setAttribute(name, value) { this.attributes.set(name, String(value)); }, removeAttribute(name) { this.attributes.delete(name); }, getAttribute(name) { return this.attributes.get(name) || ''; },
    addEventListener(name, handler) { this.listeners[name] = handler; }, append(...nodes) { this.children.push(...nodes); }, replaceChildren(...nodes) { this.children = [...nodes]; }, focus() { this.focused = true; },
    get childElementCount() { return this.children.length; },
  });
  const phone = makeElement('cust-phone'); const weight = makeElement('cust-weight'); const phoneError = makeElement('cust-phone-error'); const weightError = makeElement('cust-weight-error'); const summary = makeElement('summary');
  const elements = new Map([['cust-phone', phone], ['cust-weight', weight], ['cust-phone-error', phoneError], ['cust-weight-error', weightError], ['summary', summary]]);
  globalThis.document = { getElementById: id => elements.get(id) || null, createElement: tag => ({ ...makeElement(), tag, href: '' }) };
  const form = { querySelector: selector => selector === '[aria-invalid=true]' && [phone, weight].find(input => input.getAttribute('aria-invalid') === 'true') };
  try {
    const controller = new FormErrorController(form, { summaryId: 'summary', fields: { recipientPhone: 'cust-phone', weightKg: 'cust-weight' } });
    controller.show({ code: 'REQUEST_INVALID', status: 400, fieldErrors: { recipientPhone: 'Enter a valid phone.', weightKg: 'Enter a valid weight.' } });
    assert.equal(phone.focused, true); assert.equal(phone.getAttribute('aria-invalid'), 'true'); assert.equal(weight.getAttribute('aria-invalid'), 'true');
    phone.listeners.input();
    assert.equal(phone.getAttribute('aria-invalid'), ''); assert.equal(phoneError.hidden, true); assert.equal(weight.getAttribute('aria-invalid'), 'true');
  } finally { globalThis.document = originalDocument; }
});

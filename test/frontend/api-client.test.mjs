import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../../js/api/api-client.js';
import { ApiError, NetworkError, RequestTimeoutError } from '../../js/api/api-errors.js';

const jsonResponse = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
test('parses success envelopes, includes credentials, auth, and request IDs', async () => {
  let options; const client = new ApiClient({ baseUrl: 'http://api.test', requestIdFactory: () => 'browser-request', fetchImpl: async (_url, init) => { options = init; return jsonResponse({ success: true, data: { ok: true }, requestId: 'server-request' }); } });
  client.setAccessToken('memory-token'); const result = await client.request('/secure', { authenticated: true });
  assert.deepEqual(result, { data: { ok: true }, requestId: 'server-request', replayed: false, traceparent: null }); assert.equal(options.credentials, 'include'); assert.equal(options.headers.Authorization, 'Bearer memory-token'); assert.equal(options.headers['X-Request-Id'], 'browser-request');
});
test('parses safe error envelopes and captures request ID', async () => {
  const client = new ApiClient({ baseUrl: 'http://api.test', fetchImpl: async () => jsonResponse({ success: false, error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Unable to complete authentication.', details: null }, requestId: 'r' }, 401) });
  await assert.rejects(client.request('/auth/login'), error => error instanceof ApiError && error.code === 'AUTH_INVALID_CREDENTIALS' && error.requestId === 'r');
});
test('separates network failure and timeout', async () => {
  const network = new ApiClient({ baseUrl: 'http://api.test', fetchImpl: async () => { throw new TypeError('offline'); } }); await assert.rejects(network.request('/x'), NetworkError);
  const timeout = new ApiClient({ baseUrl: 'http://api.test', timeoutMs: 5, fetchImpl: (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))) }); await assert.rejects(timeout.request('/x'), RequestTimeoutError);
});
test('retries once after one deduplicated concurrent refresh and never loops', async () => {
  let secureCalls = 0; let refreshCalls = 0; const client = new ApiClient({ baseUrl: 'http://api.test', fetchImpl: async url => { if (url.endsWith('/secure')) { secureCalls++; return secureCalls <= 2 ? jsonResponse({ success: false, error: { code: 'AUTH_REQUIRED', message: 'required' } }, 401) : jsonResponse({ success: true, data: { ok: true } }); } return jsonResponse({ success: true, data: {} }); } });
  client.setRefreshHandler(async () => { refreshCalls++; await new Promise(resolve => setTimeout(resolve, 5)); client.setAccessToken('new-token'); });
  const results = await Promise.all([client.request('/secure', { authenticated: true }), client.request('/secure', { authenticated: true })]); assert.equal(refreshCalls, 1); assert.equal(results.length, 2);
  const failing = new ApiClient({ baseUrl: 'http://api.test', fetchImpl: async () => jsonResponse({ success: false, error: { code: 'AUTH_REQUIRED', message: 'required' } }, 401) }); let attempts = 0; failing.setRefreshHandler(async () => { attempts++; }); await assert.rejects(failing.request('/secure', { authenticated: true }), ApiError); assert.equal(attempts, 1);
});

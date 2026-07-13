import { ApiError, NetworkError, RequestTimeoutError } from './api-errors.js';
import { createRequestId } from './request-id.js';

export class ApiClient {
  #accessToken = null; #refreshPromise = null; #onRefresh = null; #onAuthFailure = null;
  constructor({ baseUrl, timeoutMs = 10000, fetchImpl = globalThis.fetch, requestIdFactory = createRequestId }) { this.baseUrl = baseUrl; this.timeoutMs = timeoutMs; this.fetchImpl = fetchImpl === globalThis.fetch ? (...args) => globalThis.fetch(...args) : fetchImpl; this.requestIdFactory = requestIdFactory; }
  setAccessToken(token) { this.#accessToken = token || null; }
  getAccessToken() { return this.#accessToken; }
  setRefreshHandler(handler) { this.#onRefresh = handler; }
  setAuthenticationFailureHandler(handler) { this.#onAuthFailure = handler; }
  async request(path, { method = 'GET', body, headers = {}, authenticated = false, retryAfterRefresh = true, signal } = {}) {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort('timeout'), this.timeoutMs);
    const abort = () => controller.abort(signal?.reason); signal?.addEventListener('abort', abort, { once: true });
    const requestId = this.requestIdFactory();
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, { method, credentials: 'include', signal: controller.signal, headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), 'X-Request-Id': requestId, ...(authenticated && this.#accessToken ? { Authorization: `Bearer ${this.#accessToken}` } : {}), ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
      const payload = await this.#parse(response, requestId);
      if (!response.ok || payload?.success === false) {
        const error = this.#error(response.status, payload, requestId);
        if (authenticated && response.status === 401 && retryAfterRefresh && this.#onRefresh) {
          try { await this.#refreshOnce(); return this.request(path, { method, body, headers, authenticated, retryAfterRefresh: false, signal }); }
          catch (refreshError) { this.#accessToken = null; this.#onAuthFailure?.(refreshError); throw refreshError; }
        }
        throw error;
      }
      if (!payload || payload.success !== true) throw new ApiError('The service returned an invalid response.', { code: 'INVALID_RESPONSE', status: response.status, requestId });
      return { data: payload.data, requestId: payload.requestId ?? response.headers?.get?.('x-request-id') ?? requestId, replayed: response.headers?.get?.('idempotency-replayed') === 'true', traceparent: response.headers?.get?.('traceparent') ?? null };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (controller.signal.aborted) throw new RequestTimeoutError({ requestId, cause: error });
      throw new NetworkError('Unable to connect to the service.', { requestId, cause: error });
    } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
  }
  async #parse(response, requestId) { const text = await response.text(); if (!text) return null; try { return JSON.parse(text); } catch (cause) { throw new ApiError('The service returned an invalid response.', { code: 'INVALID_RESPONSE', status: response.status, requestId, cause }); } }
  #error(status, payload, fallbackId) { const error = payload?.error ?? {}; return new ApiError(error.message || 'Unable to complete the request.', { code: error.code || 'REQUEST_FAILED', status, details: error.details ?? null, requestId: payload?.requestId ?? fallbackId }); }
  async #refreshOnce() { if (!this.#refreshPromise) this.#refreshPromise = Promise.resolve().then(() => this.#onRefresh()).finally(() => { this.#refreshPromise = null; }); return this.#refreshPromise; }
}

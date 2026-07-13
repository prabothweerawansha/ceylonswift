export function createRequestId(cryptoApi = globalThis.crypto) {
  return typeof cryptoApi?.randomUUID === 'function' ? cryptoApi.randomUUID() : `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

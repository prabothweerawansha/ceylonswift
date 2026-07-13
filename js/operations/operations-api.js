const queryString = values => {
  const query = new URLSearchParams();
  Object.entries(values || {}).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') query.set(key, String(value)); });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
};

export class OperationsApi {
  constructor(request, keyFactory = () => globalThis.crypto?.randomUUID?.() || `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`) { this.request = request; this.keyFactory = keyFactory; this.idempotencyKeys = new Map(); this.pending = new Map(); }
  idempotent(path, body) {
    const signature = `${path}:${JSON.stringify(body ?? {})}`;
    if (this.pending.has(signature)) return this.pending.get(signature);
    const key = this.idempotencyKeys.get(signature) || this.keyFactory();
    this.idempotencyKeys.set(signature, key);
    const operation = this.request(path, { method: 'POST', body, headers: { 'Idempotency-Key': key } })
      .then(result => { this.idempotencyKeys.delete(signature); return result; })
      .finally(() => this.pending.delete(signature));
    this.pending.set(signature, operation);
    return operation;
  }
  hubs(query, signal) { return this.request(`/hubs${queryString(query)}`, { signal, authenticated: false }); }
  calculate(body, signal) { return this.request('/pricing/calculate', { method: 'POST', body, signal, authenticated: false }); }
  publicTracking(code, signal) { return this.request(`/tracking/${encodeURIComponent(code)}`, { signal, authenticated: false }); }
  requests(query, signal) { return this.request(`/customer-requests${queryString(query)}`, { signal }); }
  createRequest(body) { return this.idempotent('/customer-requests', body); }
  updateRequest(id, body) { return this.request(`/customer-requests/${id}`, { method: 'PATCH', body }); }
  submitRequest(id) { return this.idempotent(`/customer-requests/${id}/submit`, {}); }
  cancelRequest(id) { return this.request(`/customer-requests/${id}/cancel`, { method: 'POST', body: {} }); }
  convertRequest(id) { return this.idempotent(`/customer-requests/${id}/convert-to-package`, {}); }
  packages(query, signal) { return this.request(`/packages${queryString(query)}`, { signal }); }
  createPackage(body) { return this.idempotent('/packages', body); }
  package(id, signal) { return this.request(`/packages/${id}`, { signal }); }
  tracking(id, signal) { return this.request(`/packages/${id}/tracking`, { signal }); }
  assignments(id, signal) { return this.request(`/packages/${id}/assignments`, { signal }); }
  assign(id, riderId, expectedVersion) { return this.idempotent(`/packages/${id}/assign`, { riderId, expectedVersion }); }
  reassign(id, riderId, expectedVersion) { return this.idempotent(`/packages/${id}/reassign`, { riderId, expectedVersion }); }
  transition(id, status, expectedVersion, publicMessage) { return this.idempotent(`/packages/${id}/status`, { status, expectedVersion, publicMessage }); }
  cancelPackage(id, expectedVersion, reason) { return this.request(`/packages/${id}/cancel`, { method: 'POST', body: { expectedVersion, reason } }); }
  myAssignments(signal) { return this.request('/me/rider/assignments', { signal }); }
}

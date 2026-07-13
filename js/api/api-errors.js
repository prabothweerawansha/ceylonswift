export class ApiError extends Error {
  constructor(message, { code = 'REQUEST_FAILED', status = 0, details = null, requestId = null, cause } = {}) {
    super(message, { cause }); this.name = 'ApiError'; this.code = code; this.status = status; this.details = details; this.requestId = requestId;
  }
  get isAuthenticationError() { return this.status === 401; }
}
export class NetworkError extends ApiError { constructor(message = 'Unable to connect to the service.', options = {}) { super(message, { ...options, code: 'NETWORK_ERROR' }); this.name = 'NetworkError'; } }
export class RequestTimeoutError extends ApiError { constructor(options = {}) { super('The request timed out. Please try again.', { ...options, code: 'REQUEST_TIMEOUT' }); this.name = 'RequestTimeoutError'; } }

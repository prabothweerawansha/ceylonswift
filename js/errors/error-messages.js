const DEFAULTS = Object.freeze({
  validation: { title: 'Check the information you entered', message: 'Some details are missing or invalid. Review the highlighted fields and try again.', severity: 'error', kind: 'validation', retryable: false },
  authentication: { title: 'Sign in required', message: 'Your session has expired. Sign in again to continue.', severity: 'warning', kind: 'authentication', retryable: false },
  authorization: { title: 'Access restricted', message: 'You do not have permission to perform this action.', severity: 'warning', kind: 'authorization', retryable: false },
  notFound: { title: 'Not found', message: 'We could not find what you were looking for.', severity: 'info', kind: 'not-found', retryable: false },
  conflict: { title: 'This action has changed', message: 'This action is no longer available because the item has already changed.', severity: 'warning', kind: 'conflict', retryable: true },
  rateLimit: { title: 'Please wait', message: 'Too many attempts. Wait a moment and try again.', severity: 'warning', kind: 'rate-limit', retryable: true },
  server: { title: 'Something went wrong', message: 'Something went wrong on our side. Your data was not intentionally changed.', severity: 'error', kind: 'server', retryable: true },
  unavailable: { title: 'Service temporarily unavailable', message: 'The service is temporarily unavailable. Please try again shortly.', severity: 'warning', kind: 'unavailable', retryable: true },
  timeout: { title: 'Request timed out', message: 'The request took too long. Check your connection and try again.', severity: 'warning', kind: 'timeout', retryable: true },
  network: { title: 'Connection problem', message: 'We could not connect to CeylonSwift. Check your internet connection.', severity: 'warning', kind: 'network', retryable: true },
  offline: { title: 'You are offline', message: 'You appear to be offline. Reconnect to continue.', severity: 'warning', kind: 'offline', retryable: true },
  unknown: { title: 'Unexpected problem', message: 'Something unexpected happened. Please try again.', severity: 'error', kind: 'unknown', retryable: true },
});

const CODE_MESSAGES = Object.freeze({
  REQUEST_INVALID: DEFAULTS.validation,
  AUTH_INVALID_CREDENTIALS: { ...DEFAULTS.authentication, title: 'Unable to sign in', message: 'Your email, phone number, or password is incorrect.' },
  AUTH_SESSION_INVALID: DEFAULTS.authentication,
  AUTH_REQUIRED: DEFAULTS.authentication,
  ACCESS_DENIED: DEFAULTS.authorization,
  AUTHORIZATION_DENIED: DEFAULTS.authorization,
  AUTH_PERMISSION_DENIED: DEFAULTS.authorization,
  AUTH_STEP_UP_REQUIRED: { ...DEFAULTS.authorization, title: 'Verification required', message: 'Additional verification is required before you can continue.' },
  RESOURCE_NOT_FOUND: DEFAULTS.notFound,
  IDEMPOTENCY_PAYLOAD_MISMATCH: { ...DEFAULTS.conflict, title: 'Review this action', message: 'This action was already started with different information. Review the form and try again.' },
  RESOURCE_CONFLICT: DEFAULTS.conflict,
  RATE_LIMITED: DEFAULTS.rateLimit,
  AUTH_RATE_LIMITED: DEFAULTS.rateLimit,
  INTERNAL_ERROR: DEFAULTS.server,
  SERVICE_UNAVAILABLE: DEFAULTS.unavailable,
  REQUEST_TIMEOUT: DEFAULTS.timeout,
  NETWORK_ERROR: DEFAULTS.network,
  OFFLINE: DEFAULTS.offline,
});

export function errorMessageFor({ code, status, online = true } = {}) {
  if (!online) return DEFAULTS.offline;
  if (CODE_MESSAGES[code]) return CODE_MESSAGES[code];
  if (status === 400) return DEFAULTS.validation;
  if (status === 401) return DEFAULTS.authentication;
  if (status === 403) return DEFAULTS.authorization;
  if (status === 404) return DEFAULTS.notFound;
  if (status === 409) return DEFAULTS.conflict;
  if (status === 429) return DEFAULTS.rateLimit;
  if (status === 503) return DEFAULTS.unavailable;
  if (status >= 500) return DEFAULTS.server;
  return DEFAULTS.unknown;
}

export { DEFAULTS as ERROR_MESSAGES };

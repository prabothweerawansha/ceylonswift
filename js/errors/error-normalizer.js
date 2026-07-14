import { errorMessageFor } from './error-messages.js';
import { mapFieldErrors } from './field-error-mapper.js';

export function normalizeError(error, { online = globalThis.navigator?.onLine !== false } = {}) {
  const code = online ? (error?.code || 'REQUEST_FAILED') : 'OFFLINE';
  const status = Number(error?.status || 0);
  const catalog = errorMessageFor({ code, status, online });
  const fieldErrors = { ...mapFieldErrors(error?.details), ...(error?.fieldErrors || {}) };
  return Object.freeze({
    ...catalog,
    code,
    status,
    fieldErrors,
    requestId: typeof error?.requestId === 'string' && error.requestId.trim() ? error.requestId.trim() : null,
  });
}

export function safeDevelopmentLog(error, context = 'request') {
  if (!globalThis.CEYLONSWIFT_RUNTIME_CONFIG || globalThis.CEYLONSWIFT_RUNTIME_CONFIG.environment !== 'development') return;
  console.warn(`[CeylonSwift] ${context} failed`, { code: error?.code, status: error?.status, requestId: error?.requestId });
}

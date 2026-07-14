import { normalizeError, safeDevelopmentLog } from './error-normalizer.js';
import { showToast } from './error-presenter.js';

export function installErrorBoundary({ onFatal } = {}) {
  const handle = error => {
    const state = normalizeError(error); safeDevelopmentLog(error, 'unexpected frontend error');
    if (state.kind === 'server' || state.kind === 'unknown') onFatal?.(error, state);
    else showToast(state);
  };
  addEventListener('error', event => handle(event.error));
  addEventListener('unhandledrejection', event => { event.preventDefault(); handle(event.reason); });
  return handle;
}

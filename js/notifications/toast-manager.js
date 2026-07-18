const DEFAULT_DURATION = 4500;
const ERROR_DURATION = 8000;
const EXIT_DURATION = 220;

let dismissTimer = null;
let cleanupTimer = null;
let activeNotification = false;
let notificationVersion = 0;
let initialized = false;

function elements() {
  const root = document.getElementById('operations-live-status');
  if (!root) return null;
  return {
    root,
    title: document.getElementById('operations-toast-title'),
    message: document.getElementById('operations-toast-message'),
    close: document.getElementById('operations-toast-close'),
  };
}

function reducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function clearToastTimer() {
  if (dismissTimer !== null) clearTimeout(dismissTimer);
  if (cleanupTimer !== null) clearTimeout(cleanupTimer);
  dismissTimer = null;
  cleanupTimer = null;
}

function resetToast(elementSet, version) {
  if (!elementSet || version !== notificationVersion || activeNotification) return;
  elementSet.root.hidden = true;
  elementSet.root.classList.remove('is-exiting');
  elementSet.root.dataset.kind = 'info';
  elementSet.root.setAttribute('role', 'status');
  elementSet.root.setAttribute('aria-live', 'polite');
  elementSet.message.textContent = '';
  elementSet.title.textContent = '';
  elementSet.title.hidden = true;
}

export function dismissToast({ immediate = false } = {}) {
  const elementSet = elements();
  clearToastTimer();
  activeNotification = false;
  notificationVersion += 1;
  const version = notificationVersion;
  if (!elementSet) return;

  elementSet.root.classList.remove('is-visible');
  elementSet.root.classList.add('is-exiting');
  elementSet.root.setAttribute('aria-hidden', 'true');
  const delay = immediate || reducedMotion() ? 0 : EXIT_DURATION;
  cleanupTimer = setTimeout(() => resetToast(elementSet, version), delay);
}

export function showToast(message, type = 'info', options = {}) {
  const normalizedMessage = String(message || '').trim();
  if (!normalizedMessage) {
    dismissToast({ immediate: true });
    return null;
  }

  initializeToast();
  const elementSet = elements();
  if (!elementSet) return null;

  clearToastTimer();
  notificationVersion += 1;
  activeNotification = true;
  const normalizedType = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';
  const assertive = normalizedType === 'error';
  const duration = Number.isFinite(options.duration)
    ? Math.max(0, options.duration)
    : assertive ? ERROR_DURATION : DEFAULT_DURATION;

  elementSet.root.hidden = false;
  elementSet.root.classList.remove('is-exiting');
  elementSet.root.dataset.kind = normalizedType;
  elementSet.root.setAttribute('role', assertive ? 'alert' : 'status');
  elementSet.root.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
  elementSet.root.setAttribute('aria-hidden', 'false');
  elementSet.message.textContent = normalizedMessage;
  elementSet.title.textContent = String(options.title || '').trim();
  elementSet.title.hidden = !elementSet.title.textContent;

  requestAnimationFrame(() => {
    if (activeNotification) elementSet.root.classList.add('is-visible');
  });

  if (options.autoDismiss !== false) {
    dismissTimer = setTimeout(() => dismissToast(), duration);
  }
  return elementSet.root;
}

export function initializeToast({ publicView = false } = {}) {
  const elementSet = elements();
  if (!elementSet) return null;
  if (!initialized) {
    elementSet.close.addEventListener('click', () => dismissToast());
    initialized = true;
  }
  if (!activeNotification) dismissToast({ immediate: true });
  if (publicView && !activeNotification) elementSet.root.hidden = true;
  return elementSet.root;
}

export function initializePublicToastView() {
  return initializeToast({ publicView: true });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeToast(), { once: true });
  } else {
    initializeToast();
  }
}

if (!globalThis.ceylonSwiftToast) {
  globalThis.ceylonSwiftToast = Object.freeze({
    showToast,
    dismissToast,
    clearToastTimer,
    initializePublicView: initializePublicToastView,
  });
}

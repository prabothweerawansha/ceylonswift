const ICONS = Object.freeze({ error: '!', warning: '!', info: 'i', success: '✓' });
const recentToasts = new Map();

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function appendSupportReference(container, requestId) {
  if (!requestId) return null;
  const details = element('details', 'support-reference');
  const summary = element('summary', '', 'Support details');
  const row = element('div', 'support-reference-row');
  const value = element('code', '', `Support reference: ${requestId}`);
  const copy = element('button', 'btn btn-secondary support-copy', 'Copy');
  copy.type = 'button';
  copy.addEventListener('click', async () => {
    await navigator.clipboard?.writeText(requestId);
    copy.textContent = 'Copied';
    setTimeout(() => { copy.textContent = 'Copy'; }, 1500);
  });
  row.append(value, copy); details.append(summary, row); container.append(details);
  return details;
}

export function renderState(container, state, { retry, home, track, back, dashboard, switchWorkspace, continuePublic } = {}) {
  if (!container) return null;
  container.replaceChildren();
  container.dataset.severity = state.severity;
  const icon = element('span', 'error-state-icon', ICONS[state.severity] || '!'); icon.setAttribute('aria-hidden', 'true');
  const copy = element('div', 'error-state-copy');
  copy.append(element('h2', '', state.title), element('p', '', state.message));
  const actions = element('div', 'error-state-actions');
  const addAction = (label, action, primary = false) => { if (!action) return; const button = element('button', `btn ${primary ? 'btn-primary' : 'btn-secondary'}`, label); button.type = 'button'; button.addEventListener('click', action); actions.append(button); };
  addAction('Try Again', retry, true); addAction('Go to Home', home, !retry); addAction('Track a Package', track); addAction('Return to Dashboard', dashboard); addAction('Switch Workspace', switchWorkspace); addAction('Continue browsing', continuePublic); addAction('Go Back', back);
  copy.append(actions); appendSupportReference(copy, state.requestId); container.append(icon, copy);
  return container;
}

export function showToast(state, { duration = 5000 } = {}) {
  const key = `${state.code}:${state.message}`; const now = Date.now();
  if (now - (recentToasts.get(key) || 0) < 4000) return null;
  recentToasts.set(key, now);
  let host = document.getElementById('error-toast-region');
  if (!host) { host = element('div', 'error-toast-region'); host.id = 'error-toast-region'; host.setAttribute('aria-live', 'polite'); host.setAttribute('aria-label', 'Notifications'); document.body.append(host); }
  const toast = element('div', 'error-toast'); toast.dataset.severity = state.severity; toast.setAttribute('role', 'status');
  const content = element('div', 'error-toast-copy'); content.append(element('strong', '', state.title), element('span', '', state.message));
  const close = element('button', 'error-toast-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Dismiss notification'); close.addEventListener('click', () => toast.remove());
  toast.append(content, close); host.append(toast); setTimeout(() => toast.remove(), duration);
  return toast;
}

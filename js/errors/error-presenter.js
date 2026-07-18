import { showToast as showManagedToast } from '../notifications/toast-manager.js';

const ICONS = Object.freeze({ error: '!', warning: '!', info: 'i', success: '✓' });

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

export function showToast(state, { duration } = {}) {
  const options = { title: state.title };
  if (Number.isFinite(duration)) options.duration = duration;
  return showManagedToast(state.message, state.severity, options);
}

import { normalizeError } from './error-normalizer.js';
import { renderState, showToast } from './error-presenter.js';
import { AUTH_ROUTE_IDS } from '../auth/auth-view-controller.js?v=post-login-routing-1';
import { NAVIGATION_REGISTRY } from '../navigation/navigation-registry.js';

const PUBLIC_ROUTES = new Set(['home', 'public-home', 'home-track', 'home-services', 'home-hubs', 'home-about', 'home-help', 'privacy', 'terms']);
const AUTH_ROUTES = new Set(AUTH_ROUTE_IDS);
const PROTECTED_ROUTES = new Set(NAVIGATION_REGISTRY.map(item => item.section));

export class FormErrorController {
  constructor(form, { fields = {}, summaryId } = {}) {
    this.form = form; this.fields = fields; this.summary = document.getElementById(summaryId);
    for (const [field, id] of Object.entries(fields)) document.getElementById(id)?.addEventListener('input', () => this.clearField(field));
  }
  clearField(field) {
    const input = document.getElementById(this.fields[field]); if (!input) return;
    input.removeAttribute('aria-invalid');
    const error = document.getElementById(`${input.id}-error`); if (error) { error.textContent = ''; error.hidden = true; }
    const described = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== `${input.id}-error`); input.setAttribute('aria-describedby', described.join(' '));
    if (this.summary && !this.form.querySelector('[aria-invalid=true]')) { this.summary.hidden = true; this.summary.replaceChildren(); }
  }
  clearAll() { Object.keys(this.fields).forEach(field => this.clearField(field)); }
  show(error) {
    const state = normalizeError(error); const entries = Object.entries(state.fieldErrors);
    this.clearAll();
    if (this.summary) {
      this.summary.replaceChildren(); this.summary.hidden = false;
      const heading = document.createElement('strong'); heading.textContent = state.title;
      const message = document.createElement('p'); message.textContent = state.message;
      const list = document.createElement('ul');
      entries.forEach(([field, text]) => { const id = this.fields[field]; if (!id) return; const item = document.createElement('li'); const link = document.createElement('a'); link.href = `#${id}`; link.textContent = text; link.addEventListener('click', event => { event.preventDefault(); document.getElementById(id)?.focus(); }); item.append(link); list.append(item); });
      this.summary.append(heading, message); if (list.childElementCount) this.summary.append(list);
    }
    entries.forEach(([field, text]) => {
      const input = document.getElementById(this.fields[field]); if (!input) return;
      const errorElement = document.getElementById(`${input.id}-error`); if (errorElement) { errorElement.textContent = text; errorElement.hidden = false; }
      input.setAttribute('aria-invalid', 'true');
      const described = new Set((input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean)); described.add(`${input.id}-error`); input.setAttribute('aria-describedby', [...described].join(' '));
    });
    const first = entries.map(([field]) => document.getElementById(this.fields[field])).find(Boolean);
    (first || this.summary)?.focus();
    return state;
  }
}

export class ConnectivityController {
  constructor() { this.banner = null; this.observer = null; }
  init() {
    this.banner = document.getElementById('offline-banner') || document.createElement('div');
    this.banner.id = 'offline-banner'; this.banner.className = 'offline-banner'; this.banner.setAttribute('role', 'status'); this.banner.setAttribute('aria-live', 'polite');
    if (!this.banner.isConnected) document.body.prepend(this.banner);
    addEventListener('online', () => this.update(true)); addEventListener('offline', () => this.update(false));
    this.observer = new MutationObserver(() => this.update(navigator.onLine)); this.observer.observe(document.body, { childList: true, subtree: true }); this.update(navigator.onLine); return this;
  }
  update(online) {
    this.banner.hidden = online; this.banner.textContent = online ? '' : 'You appear to be offline. Reconnect to continue. Your form values will be kept.';
    document.querySelectorAll('[data-requires-online], form button[type=submit]').forEach(button => { if (!online) { button.dataset.offlineDisabled = String(button.disabled); button.disabled = true; } else if (button.dataset.offlineDisabled !== undefined) { button.disabled = button.dataset.offlineDisabled === 'true'; delete button.dataset.offlineDisabled; } });
    if (online && this.wasOffline) showToast({ code: 'BACK_ONLINE', title: 'Back online', message: 'Your connection has been restored.', severity: 'success' }, { duration: 3000 });
    this.wasOffline = !online;
  }
}

export class ErrorStateController {
  constructor({ getAuth } = {}) { this.getAuth = getAuth; this.overlay = null; }
  init() {
    this.overlay = document.getElementById('global-error-view');
    document.getElementById('global-error-close')?.addEventListener('click', () => this.hide());
    addEventListener('hashchange', () => this.handleRoute()); this.handleRoute(); return this;
  }
  show(error, kind) {
    if (!this.overlay) return;
    const state = normalizeError(error); const body = this.overlay.querySelector('[data-error-state-body]');
    const authenticated = this.getAuth?.()?.status === 'authenticated';
    const routeState = kind === '404' ? { ...state, title: 'This route could not be delivered.', message: 'The page may have moved, or the address may be incorrect.', kind: 'not-found' }
      : kind === '403' ? { ...state, title: 'You do not have access to this area.', message: 'Return to your workspace or go back to a page you can use.', kind: 'authorization' }
      : kind === '503' ? { ...state, title: 'CeylonSwift is temporarily unavailable.', message: 'The public site is still available. Some account and delivery features may not work until the service reconnects.', kind: 'unavailable' }
      : { ...state, title: 'CeylonSwift hit an unexpected problem.', message: 'Your request could not be completed. Try again, or return to a safe page.', kind: 'server' };
    const auth = this.getAuth?.();
    this.overlay.dataset.kind = routeState.kind; renderState(body, routeState, { retry: routeState.retryable ? () => location.reload() : null, home: () => this.navigate('#home'), track: kind === '404' ? () => this.navigate('#home-track') : null, dashboard: authenticated ? () => { this.hide(); globalThis.openAppDashboard?.(); } : null, switchWorkspace: kind === '403' && authenticated && auth?.workspaces?.length > 1 ? () => { this.hide(); globalThis.ceylonSwiftAuth?.openWorkspaceSelector?.(); } : null, continuePublic: kind === '503' ? () => this.navigate('#home') : null, back: () => history.back() });
    this.overlay.hidden = false; this.overlay.setAttribute('aria-hidden', 'false'); body?.focus?.();
  }
  hide() { if (!this.overlay) return; this.overlay.hidden = true; this.overlay.setAttribute('aria-hidden', 'true'); }
  navigate(hash) { this.hide(); history.replaceState(null, '', `${location.pathname}${location.search}${hash}`); document.querySelector(hash === '#home' ? '#public-home' : hash)?.scrollIntoView?.(); }
  handleRoute() {
    const route = location.hash.slice(1); if (!route || PUBLIC_ROUTES.has(route) || AUTH_ROUTES.has(route)) return this.hide();
    if (PROTECTED_ROUTES.has(route)) {
      const allowed = Boolean(document.querySelector(`#sidebar-nav-menu [data-tab="${route}"]`)); if (!allowed) this.show({ code: 'ACCESS_DENIED', status: 403 }, '403'); else this.hide(); return;
    }
    this.show({ code: 'RESOURCE_NOT_FOUND', status: 404 }, '404');
  }
}

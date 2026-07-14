import { loadRuntimeConfig } from '../config/runtime-config.js';
import { AuthService } from '../auth/auth-service.js?v=phase4-1';
import { mapLegacyRole } from './legacy-role-map.js';
import { renderPermissionNavigation, activateNavigation } from '../navigation/navigation-renderer.js';
import { WorkspaceSelector } from '../workspaces/workspace-selector.js';
import { AuthenticatedShell } from '../shell/authenticated-shell.js?v=logout-routing-1';
import { AUTH_ROUTE_IDS, AuthViewController } from '../auth/auth-view-controller.js?v=post-login-routing-1';
import { WorkforceApi } from '../workforce/workforce-api.js';
import { WorkforceController } from '../workforce/workforce-controller.js';
import { OperationsApi } from '../operations/operations-api.js';
import { OperationsController } from '../operations/operations-controller.js?v=reliable-errors-2';
import { normalizeError } from '../errors/error-normalizer.js';
import { ConnectivityController, ErrorStateController } from '../errors/error-state-controller.js?v=post-login-routing-1';
import { installErrorBoundary } from '../errors/error-boundary.js';
import { showToast } from '../errors/error-presenter.js';

const config = loadRuntimeConfig();
const service = new AuthService(config, { legacyHooks: globalThis.ceylonSwiftLegacyAuthHooks ?? {} });
const workspaceSelector = new WorkspaceSelector();
const workforce = new WorkforceController(new WorkforceApi((path, options) => service.request(path, options)));
const operations = new OperationsController(new OperationsApi((path, options) => service.request(path, options)));
let authViewController;
let errorStates;
globalThis.ceylonSwiftNavigation = Object.freeze({ render: renderPermissionNavigation, activate: activateNavigation });
function backendRoles(snapshot) { return snapshot.capabilities?.roles ?? snapshot.activeWorkspace?.roles ?? snapshot.workspaces?.find(item => item.id === snapshot.activeWorkspace?.membershipId)?.roles ?? []; }
function compatibleRole(snapshot) { const roles = backendRoles(snapshot); if (roles.some(role => role === 'PARTNER_USER' || role === 'PARTNER_ADMIN')) return 'Partner'; return mapLegacyRole(roles); }
function renderMessage(message = '', kind = 'error') { const element = document.getElementById('auth-status-message'); if (!element) return; element.textContent = message; element.dataset.kind = kind; element.hidden = !message; }
function setBusy(busy) { document.querySelectorAll('#authPortalModal .auth-submit-btn, #authPortalModal .google-auth-btn').forEach(button => { button.disabled = busy; button.setAttribute('aria-busy', String(busy)); }); }
function completeAuthenticatedNavigation(snapshot, { force = false } = {}) { if (snapshot.status !== 'authenticated' || snapshot.capabilityStatus !== 'ready') return false; const route = location.hash.slice(1); if (!force && !AUTH_ROUTE_IDS.includes(route)) return false; authViewController?.close(); return globalThis.openAppDashboard?.() || false; }
function sync(snapshot) { globalThis.applyBackendAuthCompatibility?.({ status: snapshot.status, role: compatibleRole(snapshot), roles: backendRoles(snapshot), user: snapshot.user, workspace: snapshot.activeWorkspace, capabilities: snapshot.capabilities, capabilityStatus: snapshot.capabilityStatus, workspaceSelectionPending: snapshot.status === 'authenticated' && snapshot.workspaces.length > 1 && !snapshot.activeWorkspace, mode: config.authMode }); document.documentElement.dataset.authStatus = snapshot.status; shell.render(snapshot); if (snapshot.lastError?.message) { const state = normalizeError(snapshot.lastError); renderMessage(state.message, snapshot.status === 'unavailable' ? 'warning' : 'error'); } else if (snapshot.capabilityError?.message) renderMessage('Your workspace permissions could not be loaded. Try switching workspace or sign in again.', 'warning'); else renderMessage(); completeAuthenticatedNavigation(snapshot); if (snapshot.status === 'unavailable') errorStates?.show(snapshot.lastError, '503'); else errorStates?.handleRoute(); }
async function attempt(operation) { setBusy(true); renderMessage(); try { return await operation(); } catch (error) { const state = normalizeError(error); renderMessage(`${state.message}${state.requestId ? ` Support reference: ${state.requestId}` : ''}`); throw error; } finally { setBusy(false); } }
async function login({ identifier, password, selectedUiRole }) { const snapshot = await attempt(() => service.login({ identifier, password, selectedUiRole })); if (snapshot.status === 'authenticated') { completeAuthenticatedNavigation(snapshot, { force: true }); closeModal('authPortalModal'); renderMessage(); } return snapshot; }
async function requestOtp({ identifier, channel = identifier.includes('@') ? 'EMAIL' : 'SMS', purpose = 'LOGIN' }) { const result = await attempt(() => service.requestOtp({ identifier, channel, purpose })); globalThis.showBackendOtpChallenge?.(result); return result; }
async function verifyOtp(code) { const challengeId = globalThis.getBackendOtpChallengeId?.(); if (!challengeId) throw new Error('No active verification challenge.'); const result = await attempt(() => service.verifyOtp({ challengeId, code })); renderMessage('Verification completed. Sign in with your password to continue.', 'success'); return result; }
async function startGoogleLogin() { try { return await attempt(() => service.startGoogleLogin()); } catch { return null; } }
async function logout(allDevices = false) { const result = await service.logout(allDevices); if (result.warning) renderMessage(`${result.warning.message} Local sign-out completed.`, 'warning'); return result; }
async function selectWorkspaceAndRoute(id) { const snapshot = await attempt(() => service.selectWorkspace(id)); completeAuthenticatedNavigation(snapshot, { force: true }); return snapshot; }
function showWorkspaceSelector(workspaces, required = false) { workspaceSelector.open(workspaces, { activeWorkspace: service.state.snapshot.activeWorkspace, required, onSelect: selectWorkspaceAndRoute }); }

const shell = new AuthenticatedShell({ getAuth: () => globalThis.ceylonSwiftAuth, onWorkspaceSwitch: () => showWorkspaceSelector(service.state.snapshot.workspaces, false), onSecurity: () => globalThis.openAppSection?.('security-center') });

service.state.subscribe(snapshot => { sync(snapshot); void workforce.sync(snapshot); void operations.sync(snapshot); if (snapshot.status === 'authenticated') authViewController?.close(); if (snapshot.status === 'authenticated' && snapshot.workspaces.length > 1 && !snapshot.activeWorkspace && config.enableWorkspaceSelector) showWorkspaceSelector(snapshot.workspaces, true); });
globalThis.ceylonSwiftAuth = Object.freeze({ mode: config.authMode, login, requestOtp, verifyOtp, startGoogleLogin, logout, logoutAll: () => logout(true), selectWorkspace: selectWorkspaceAndRoute, openWorkspaceSelector: () => showWorkspaceSelector(service.state.snapshot.workspaces, false), getState: () => service.state.snapshot });
globalThis.ceylonSwiftWorkforce = Object.freeze({ renderTeam: filter => workforce.renderTeam(filter), renderApprovals: () => workforce.renderApprovals(), openInvite: () => workforce.openInvite(), toggleRider: id => workforce.toggleRider(id), decideApproval: (id, approve) => workforce.decideApproval(id, approve), reload: () => workforce.reload() });
globalThis.ceylonSwiftOperations = Object.freeze({ reload: () => operations.reload(), calculate: prefix => operations.calculate(prefix), createPackage: event => operations.createPackage(event), submitCustomerRequest: event => operations.submitCustomerRequest(event), track: (code, target) => operations.track(code, target), convertRequest: id => operations.convertRequest(id), cancelRequest: id => operations.cancelRequest(id), assignPackage: (id, riderId, version, reassign) => operations.assignPackage(id, riderId, version, reassign), dispatchPackage: id => operations.dispatchPackage(id), transitionPackage: (id, status, version) => operations.transitionPackage(id, status, version) });
console.info(`[CeylonSwift] Authentication mode: ${config.authMode}`);
document.addEventListener('DOMContentLoaded', () => {
  errorStates = new ErrorStateController({ getAuth: () => service.state.snapshot }).init();
  new ConnectivityController().init();
  installErrorBoundary({ onFatal: error => errorStates.show(error, '500') });
  globalThis.ceylonSwiftErrors = Object.freeze({ normalize: normalizeError, notify: error => showToast(normalizeError(error)), showNotFound: () => errorStates.show({ code: 'RESOURCE_NOT_FOUND', status: 404 }, '404'), showRestricted: () => errorStates.show({ code: 'ACCESS_DENIED', status: 403 }, '403'), showUnexpected: error => errorStates.show(error, '500'), showUnavailable: error => errorStates.show(error, '503'), hide: () => errorStates.hide() });
  authViewController = new AuthViewController({ getAuth: () => globalThis.ceylonSwiftAuth });
  authViewController.init();
  document.documentElement.dataset.authStatus = 'initializing';
  if (config.authMode === 'api') {
    const simulator = document.getElementById('device-simulator-widget'); if (simulator) simulator.style.display = 'none';
    const simulatedBanner = document.getElementById('security-otp-banner'); if (simulatedBanner) simulatedBanner.style.display = 'none';
    const simulatedGoogle = document.getElementById('googleAuthModal'); if (simulatedGoogle) { simulatedGoogle.hidden = true; simulatedGoogle.setAttribute('aria-hidden', 'true'); }
  }
  void operations.initializePublic();
  void service.initialize();
});

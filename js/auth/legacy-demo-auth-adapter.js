import { AuthAdapter } from './auth-adapter.js';

/** @deprecated Development prototype authentication only. Never loaded in API mode. */
export class LegacyDemoAuthAdapter extends AuthAdapter {
  constructor(hooks = {}) { super(); this.hooks = hooks; console.warn('[CeylonSwift] DEVELOPMENT ONLY: insecure legacy demo authentication is active.'); }
  identify() { return 'legacy-demo'; }
  async login({ identifier, password, selectedUiRole }) {
    if (selectedUiRole === 'Owner') {
      if (identifier !== 'prabothweerawansha@gmail.com' || password !== 'admin123') throw new Error('Unable to complete authentication.');
      return { user: { id: 'EMP-001', normalizedEmail: identifier, profile: { displayName: 'Praboth Weerasinghe' } }, session: { id: 'legacy-demo' }, legacyRole: 'Owner' };
    }
    return this.hooks.login?.({ identifier, selectedUiRole }) ?? { user: null, session: null, legacyRole: selectedUiRole };
  }
  requestOtp(payload) { return this.hooks.requestOtp?.(payload); }
  verifyOtp(payload) { return this.hooks.verifyOtp?.(payload); }
  restoreSession() { return Promise.resolve(null); }
  getCurrentUser() { return Promise.resolve(null); }
  getWorkspaces() { return Promise.resolve({ workspaces: [] }); }
  getCapabilities() { return Promise.resolve({ workspace: null, roles: [], permissions: [] }); }
  selectWorkspace() { return Promise.resolve(null); }
  refreshSession() { return Promise.resolve(null); }
  logout() { this.hooks.logout?.(); return Promise.resolve({ loggedOut: true }); }
  logoutAll() { return this.logout(); }
  startGoogleLogin() { return this.hooks.google?.(); }
}

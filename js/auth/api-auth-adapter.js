import { AuthAdapter } from './auth-adapter.js';
export class ApiAuthAdapter extends AuthAdapter {
  constructor(client) { super(); this.client = client; }
  identify() { return 'api'; }
  async login({ identifier, password, deviceName = 'CeylonSwift Web' }) { return (await this.client.request('/auth/login', { method: 'POST', body: { identifier, password, clientType: 'WEB', deviceName } })).data; }
  async requestOtp({ identifier, channel, purpose = 'LOGIN' }) { return (await this.client.request('/auth/otp/request', { method: 'POST', body: { identifier, channel, purpose } })).data; }
  async verifyOtp({ challengeId, code }) { return (await this.client.request('/auth/otp/verify', { method: 'POST', body: { challengeId, code } })).data; }
  async refreshSession() { return (await this.client.request('/auth/refresh', { method: 'POST', body: {}, retryAfterRefresh: false })).data; }
  async restoreSession() { return this.refreshSession(); }
  async getCurrentUser() { return (await this.client.request('/auth/me', { authenticated: true })).data; }
  async getWorkspaces() { return (await this.client.request('/auth/workspaces', { authenticated: true })).data; }
  async getCapabilities() { return (await this.client.request('/auth/capabilities', { authenticated: true })).data; }
  async selectWorkspace(workspaceId) { return (await this.client.request('/auth/workspaces/select', { method: 'POST', body: { workspaceId }, authenticated: true })).data; }
  async logout() { return (await this.client.request('/auth/logout', { method: 'POST', body: {} })).data; }
  async logoutAll() { return (await this.client.request('/auth/logout-all', { method: 'POST', body: {}, authenticated: true })).data; }
  async startGoogleLogin() { return (await this.client.request('/auth/google/start')).data; }
}

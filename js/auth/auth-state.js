const INITIAL = Object.freeze({ status: 'initializing', user: null, accessToken: null, session: null, workspaces: [], activeWorkspace: null, capabilities: null, capabilityStatus: 'idle', capabilityError: null, authenticationMode: 'api', lastError: null });
export class AuthState {
  #value; #listeners = new Set();
  constructor(mode = 'api') { this.#value = { ...INITIAL, authenticationMode: mode }; }
  get snapshot() { const capabilities = this.#value.capabilities ? { ...this.#value.capabilities, roles: [...this.#value.capabilities.roles], permissions: [...this.#value.capabilities.permissions], workspace: this.#value.capabilities.workspace ? { ...this.#value.capabilities.workspace } : null } : null; return { ...this.#value, workspaces: [...this.#value.workspaces], capabilities }; }
  update(patch) { this.#value = { ...this.#value, ...patch }; this.#listeners.forEach(listener => listener(this.snapshot)); return this.snapshot; }
  authenticated(data) { return this.update({ status: 'authenticated', user: data.user ?? this.#value.user, accessToken: data.accessToken ?? this.#value.accessToken, session: data.session ?? this.#value.session, workspaces: data.workspaces ?? this.#value.workspaces, activeWorkspace: Object.hasOwn(data, 'activeWorkspace') ? data.activeWorkspace : this.#value.activeWorkspace, capabilities: Object.hasOwn(data, 'capabilities') ? data.capabilities : this.#value.capabilities, capabilityStatus: data.capabilityStatus ?? this.#value.capabilityStatus, capabilityError: Object.hasOwn(data, 'capabilityError') ? data.capabilityError : this.#value.capabilityError, lastError: null }); }
  guest(status = 'guest', error = null) { return this.update({ status, user: null, accessToken: null, session: null, workspaces: [], activeWorkspace: null, capabilities: null, capabilityStatus: 'idle', capabilityError: null, lastError: error }); }
  subscribe(listener) { this.#listeners.add(listener); listener(this.snapshot); return () => this.#listeners.delete(listener); }
}

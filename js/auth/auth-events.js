export const AUTH_EVENT = Object.freeze({ STATE_CHANGED: 'ceylonswift:auth-state-changed', WORKSPACE_REQUIRED: 'ceylonswift:workspace-required' });
export function dispatchAuthEvent(name, detail) { globalThis.dispatchEvent?.(new CustomEvent(name, { detail })); }

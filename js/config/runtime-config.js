const DEFAULTS = Object.freeze({ environment: 'development', apiBaseUrl: 'http://localhost:4000/api/v1', authMode: 'api', enableLegacyDemoAuth: false, enableGoogleAuth: true, enableWorkspaceSelector: true, requestTimeoutMs: 10000 });

export function loadRuntimeConfig(source = globalThis.CEYLONSWIFT_RUNTIME_CONFIG ?? {}) {
  const config = { ...DEFAULTS, ...source };
  config.apiBaseUrl = String(config.apiBaseUrl).replace(/\/$/, '');
  config.requestTimeoutMs = Math.max(1000, Number(config.requestTimeoutMs) || DEFAULTS.requestTimeoutMs);
  const production = config.environment === 'production';
  if (production && (config.authMode !== 'api' || config.enableLegacyDemoAuth)) {
    console.error('[CeylonSwift] Legacy demo authentication is forbidden in production; API mode enforced.');
    config.authMode = 'api'; config.enableLegacyDemoAuth = false;
  }
  if (!['api', 'legacy-demo'].includes(config.authMode)) throw new Error('Unsupported authentication mode.');
  if (config.authMode === 'legacy-demo' && !config.enableLegacyDemoAuth) throw new Error('Legacy demo authentication requires an explicit development flag.');
  return Object.freeze(config);
}

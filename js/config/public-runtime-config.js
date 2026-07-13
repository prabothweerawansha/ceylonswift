(function configureCeylonSwiftRuntime(global) {
  global.CEYLONSWIFT_RUNTIME_CONFIG = Object.freeze({
    environment: 'development',
    apiBaseUrl: 'http://localhost:4000/api/v1',
    authMode: 'api',
    enableLegacyDemoAuth: false,
    enableGoogleAuth: true,
    enableWorkspaceSelector: true,
    requestTimeoutMs: 10000
  });
})(window);

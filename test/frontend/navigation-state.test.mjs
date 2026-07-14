import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const appSource = await readFile(new URL('../../app.js', import.meta.url), 'utf8');
const shellSource = await readFile(new URL('../../js/shell/authenticated-shell.js', import.meta.url), 'utf8');
const indexSource = await readFile(new URL('../../index.html', import.meta.url), 'utf8');

function loadNavigationContext(initialStorage = {}) {
  const values = new Map(Object.entries(initialStorage));
  const replacedUrls = [];
  const localStorage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  const location = { pathname: '/', search: '', hash: '' };
  const context = vm.createContext({
    console,
    localStorage,
    location,
    history: { replaceState: (_state, _title, url) => { replacedUrls.push(url); location.hash = url.includes('#') ? `#${url.split('#')[1]}` : ''; } },
    setInterval: () => 0,
    clearInterval: () => {},
    setTimeout: () => 0,
    clearTimeout: () => {},
    Event: class Event {},
    window: {
      CEYLONSWIFT_RUNTIME_CONFIG: { authMode: 'api' },
      addEventListener: () => {},
      dispatchEvent: () => {},
      matchMedia: () => ({ matches: false })
    },
    document: { addEventListener: () => {} }
  });
  vm.runInContext(appSource, context);
  return { context, values, replacedUrls };
}

function evaluate(context, expression) {
  return vm.runInContext(expression, context);
}

test('customer navigation restores Track and Book Delivery only from the customer allowlist', () => {
  const { context } = loadNavigationContext();
  assert.equal(evaluate(context, "resolveNavigationSection('Customer', 'customerrequest')"), 'customerrequest');
  assert.equal(evaluate(context, "resolveNavigationSection('Customer', 'customertrack')"), 'customertrack');
  assert.equal(evaluate(context, "resolveNavigationSection('Customer', 'dashboard')"), 'customertrack');
});

test('rider navigation restores an allowed rider section and rejects foreign role sections', () => {
  const { context } = loadNavigationContext();
  assert.equal(evaluate(context, "resolveNavigationSection('Rider', 'simulator')"), 'simulator');
  assert.equal(evaluate(context, "resolveNavigationSection('Rider', 'customerrequest')"), 'packages');
});

test('guest and workspace role changes fall back to the safest permitted section', () => {
  const { context } = loadNavigationContext();
  assert.equal(evaluate(context, "resolveNavigationSection(null, 'dashboard')"), 'public-home');
  assert.equal(evaluate(context, "resolveNavigationSection('Office', 'accesscontrol')"), 'accesscontrol');
  assert.equal(evaluate(context, "resolveNavigationSection('Customer', 'accesscontrol')"), 'customertrack');
});

test('canonical dashboard resolver preserves only an authorized destination for every workspace role', () => {
  const cases = [
    ['Owner', ['dashboard', 'packages'], 'dashboard'],
    ['Office', ['dashboard', 'packages'], 'dashboard'],
    ['Rider', ['packages', 'security-center'], 'packages'],
    ['Customer', ['customertrack', 'customerrequest'], 'customertrack'],
    ['Partner', ['partner-home', 'security-center'], 'partner-home'],
  ];
  for (const [role, allowed, expected] of cases) {
    const { context } = loadNavigationContext({ ceylonswift_active_section: 'deprecated-dashboard' });
    evaluate(context, `state.activeRole = ${JSON.stringify(role)}; state.allowedNavigationSections = ${JSON.stringify(allowed)}`);
    assert.equal(evaluate(context, 'resolveDashboardSection()'), expected);
  }
});

test('canonical dashboard opener replaces an auth route with the authorized restored section', () => {
  const { context, values } = loadNavigationContext({ ceylonswift_active_section: 'customerrequest' });
  evaluate(context, `
    const sections = new Map(['customertrack', 'customerrequest'].map(id => [id, { id, classList: { add() {}, remove() {} } }]));
    document.querySelectorAll = selector => selector === '.tab-section' ? [...sections.values()] : [];
    document.getElementById = id => id === 'sidebar-nav-menu' ? {} : sections.get(id) || null;
    window.ceylonSwiftNavigation = { activate() {} };
    state.activeRole = 'Customer';
    state.authStatus = 'authenticated';
    state.allowedNavigationSections = ['customertrack', 'customerrequest'];
    location.hash = '#login';
  `);
  assert.equal(evaluate(context, 'openResolvedDashboard()'), 'customerrequest');
  assert.equal(evaluate(context, 'location.hash'), '#customerrequest');
  assert.equal(evaluate(context, 'state.activeTab'), 'customerrequest');
  assert.equal(values.get('ceylonswift_active_section'), 'customerrequest');
});

test('pending workspace selection preserves navigation until backend role routing is complete', () => {
  const { context, values } = loadNavigationContext({ ceylonswift_active_section: 'customerrequest' });
  assert.equal(evaluate(context, "shouldResetSavedNavigationSection(null, 'authenticated', true)"), false);
  assert.equal(values.get('ceylonswift_active_section'), 'customerrequest');
  assert.equal(evaluate(context, "resolveNavigationSection('Customer')"), 'customerrequest');
  assert.equal(evaluate(context, "shouldResetSavedNavigationSection(null, 'guest', false)"), true);
});

test('navigation persistence stores only an allowlisted section identifier', () => {
  const { context, values } = loadNavigationContext();
  evaluate(context, "state.activeRole = 'Customer'");
  assert.equal(evaluate(context, "persistNavigationSection('customerrequest')"), true);
  assert.deepEqual([...values.entries()], [['ceylonswift_active_section', 'customerrequest']]);
  assert.equal(evaluate(context, "persistNavigationSection('dashboard')"), false);
  assert.deepEqual([...values.entries()], [['ceylonswift_active_section', 'customerrequest']]);
});

test('logout replaces a protected route and hides restricted state before publishing guest auth', async () => {
  const { context, values, replacedUrls } = loadNavigationContext({ ceylonswift_active_section: 'customerrequest' });
  evaluate(context, `
    const logoutEvents = [];
    location.hash = '#customerrequest';
    window.ceylonSwiftErrors = { hide: () => logoutEvents.push({ type: 'hide', hash: location.hash }) };
    window.ceylonSwiftAuth = { logout: async () => logoutEvents.push({ type: 'logout', hash: location.hash, saved: localStorage.getItem('ceylonswift_active_section') }) };
    document.querySelectorAll = () => [{ classList: { remove: className => logoutEvents.push({ type: 'modal', className, hash: location.hash }) } }];
    addActivityLog = () => {};
    resetOwnerAuthFlow = () => {};
    applyRoleRouting = () => {};
    playSound = () => {};
    state.activeRole = 'Customer';
    state.currentUser = { name: 'Development Customer' };
    state.activeTab = 'customerrequest';
  `);
  await evaluate(context, 'handleLogout()');
  assert.equal(values.get('ceylonswift_active_section'), 'public-home');
  assert.equal(evaluate(context, 'location.hash'), '#home');
  assert.deepEqual(replacedUrls, ['/#home']);
  assert.deepEqual(JSON.parse(evaluate(context, 'JSON.stringify(logoutEvents)')), [
    { type: 'hide', hash: '#home' },
    { type: 'modal', className: 'active', hash: '#home' },
    { type: 'logout', hash: '#home', saved: 'public-home' },
  ]);
  assert.equal(evaluate(context, 'state.activeRole'), null);
  assert.equal(evaluate(context, 'state.activeTab'), 'public-home');
});

test('every sign-out-all control uses the canonical logout navigation flow', async () => {
  const { context } = loadNavigationContext({ ceylonswift_active_section: 'packages' });
  evaluate(context, `
    location.hash = '#packages';
    let logoutAllCalls = 0;
    window.ceylonSwiftErrors = { hide() {} };
    window.ceylonSwiftAuth = { logout: async () => { throw new Error('normal logout must not run'); }, logoutAll: async () => { logoutAllCalls += 1; } };
    document.querySelectorAll = () => [];
    addActivityLog = () => {};
    resetOwnerAuthFlow = () => {};
    applyRoleRouting = () => {};
    playSound = () => {};
  `);
  await evaluate(context, 'handleLogout(true)');
  assert.equal(evaluate(context, 'logoutAllCalls'), 1);
  assert.equal(evaluate(context, 'location.hash'), '#home');
  assert.match(shellSource, /session-logout-all[^\n]+handleLogout\(true\)/);
  assert.match(indexSource, /onclick="handleLogout\(true\)">Sign out all devices/);
});

test('canonical logout returns every role fixture from its protected route to public home', async () => {
  const cases = [
    ['Owner', 'dashboard'],
    ['Admin', 'dashboard'],
    ['Office', 'dashboard'],
    ['Branch Manager', 'dashboard'],
    ['Rider', 'packages'],
    ['Customer', 'customertrack'],
    ['Partner User', 'partner-home'],
    ['Partner Admin', 'partner-home'],
  ];
  for (const [role, route] of cases) {
    const { context, values } = loadNavigationContext({ ceylonswift_active_section: route });
    evaluate(context, `
      location.hash = '#${route}';
      window.ceylonSwiftErrors = { hide() {} };
      window.ceylonSwiftAuth = { logout: async () => {} };
      document.querySelectorAll = () => [];
      addActivityLog = () => {};
      resetOwnerAuthFlow = () => {};
      applyRoleRouting = () => {};
      playSound = () => {};
      state.activeRole = ${JSON.stringify(role)};
      state.currentUser = { name: ${JSON.stringify(role)} };
    `);
    await evaluate(context, 'handleLogout()');
    assert.equal(evaluate(context, 'location.hash'), '#home', role);
    assert.equal(values.get('ceylonswift_active_section'), 'public-home', role);
    assert.equal(evaluate(context, 'state.activeRole'), null, role);
  }
});

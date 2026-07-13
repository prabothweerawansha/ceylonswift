import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const appSource = await readFile(new URL('../../app.js', import.meta.url), 'utf8');

function loadNavigationContext(initialStorage = {}) {
  const values = new Map(Object.entries(initialStorage));
  const localStorage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  const context = vm.createContext({
    console,
    localStorage,
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
  return { context, values };
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

test('logout resets protected navigation and returns to the public section', async () => {
  const { context, values } = loadNavigationContext({ ceylonswift_active_section: 'customerrequest' });
  evaluate(context, `
    window.ceylonSwiftAuth = { logout: async () => {} };
    document.querySelectorAll = () => [];
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
  assert.equal(evaluate(context, 'state.activeRole'), null);
  assert.equal(evaluate(context, 'state.activeTab'), 'public-home');
});

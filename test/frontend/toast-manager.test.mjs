import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('global operation toast is hidden and empty on initial homepage render', async () => {
  const html = await read('index.html');
  const toast = html.match(/<div id="operations-live-status"[\s\S]*?<\/div>\s*<button[\s\S]*?<\/button>\s*<\/div>/)?.[0] || '';
  assert.match(toast, /hidden/);
  assert.match(toast, /aria-hidden="true"/);
  assert.match(toast, /aria-label="Dismiss notification"/);
  assert.doesNotMatch(toast, /Delivery operation completed\./);
});

test('toast manager centralizes replacement, timing, ARIA, and cleanup behavior', async () => {
  const source = await read('js/notifications/toast-manager.js');
  assert.match(source, /const DEFAULT_DURATION = 4500/);
  assert.match(source, /const ERROR_DURATION = 8000/);
  assert.match(source, /clearToastTimer\(\)/);
  assert.match(source, /classList\.remove\('is-visible'\)/);
  assert.match(source, /message\.textContent = ''/);
  assert.match(source, /assertive \? 'alert' : 'status'/);
  assert.match(source, /assertive \? 'assertive' : 'polite'/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});

test('operations and errors use the same toast manager', async () => {
  const [operations, errors] = await Promise.all([
    read('js/operations/operations-controller.js'),
    read('js/errors/error-presenter.js'),
  ]);
  assert.match(operations, /notifications\/toast-manager\.js/);
  assert.match(errors, /notifications\/toast-manager\.js/);
  assert.doesNotMatch(errors, /error-toast-region/);
});

test('mobile toast stays viewport-safe and respects safe areas', async () => {
  const css = await read('css/components/operations.css');
  assert.match(css, /env\(safe-area-inset-bottom, 0px\)/);
  assert.match(css, /max-width: calc\(100vw - 32px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('toast lifecycle supports auto-dismiss, manual close, replacement, and public rerender', async () => {
  class FakeClassList {
    constructor() { this.values = new Set(); }
    add(...values) { values.forEach(value => this.values.add(value)); }
    remove(...values) { values.forEach(value => this.values.delete(value)); }
    contains(value) { return this.values.has(value); }
  }
  class FakeElement {
    constructor() {
      this.hidden = false;
      this.textContent = '';
      this.dataset = {};
      this.attributes = new Map();
      this.classList = new FakeClassList();
      this.listeners = new Map();
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    click() { this.listeners.get('click')?.(); }
  }

  const nodes = new Map([
    ['operations-live-status', new FakeElement()],
    ['operations-toast-title', new FakeElement()],
    ['operations-toast-message', new FakeElement()],
    ['operations-toast-close', new FakeElement()],
  ]);
  globalThis.document = { readyState: 'complete', getElementById: id => nodes.get(id) || null };
  globalThis.matchMedia = () => ({ matches: true });
  globalThis.requestAnimationFrame = callback => { callback(); return 1; };

  const manager = await import(`../../js/notifications/toast-manager.js?test=${Date.now()}`);
  const rootNode = nodes.get('operations-live-status');
  const messageNode = nodes.get('operations-toast-message');
  const closeNode = nodes.get('operations-toast-close');
  await new Promise(resolve => setTimeout(resolve, 0));

  manager.showToast('Delivery operation completed.', 'success', { duration: 20 });
  assert.equal(rootNode.hidden, false);
  assert.equal(rootNode.getAttribute('role'), 'status');
  assert.equal(rootNode.getAttribute('aria-live'), 'polite');
  assert.equal(messageNode.textContent, 'Delivery operation completed.');
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(rootNode.hidden, true);
  assert.equal(messageNode.textContent, '');

  manager.showToast('Dismiss me', 'info', { autoDismiss: false });
  closeNode.click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(rootNode.hidden, true);

  manager.showToast('First', 'success', { duration: 40 });
  await new Promise(resolve => setTimeout(resolve, 20));
  manager.showToast('Second', 'success', { duration: 80 });
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(rootNode.hidden, false);
  assert.equal(messageNode.textContent, 'Second');
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(rootNode.hidden, true);

  manager.showToast('Current session notification', 'info', { autoDismiss: false });
  manager.initializePublicToastView();
  assert.equal(rootNode.hidden, false);
  manager.dismissToast({ immediate: true });
  await new Promise(resolve => setTimeout(resolve, 0));
  manager.initializePublicToastView();
  assert.equal(rootNode.hidden, true);

  delete globalThis.document;
  delete globalThis.matchMedia;
  delete globalThis.requestAnimationFrame;
  delete globalThis.ceylonSwiftToast;
});

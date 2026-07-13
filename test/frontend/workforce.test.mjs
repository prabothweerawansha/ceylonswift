import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { WorkforceController } from '../../js/workforce/workforce-controller.js';

const appSource = await readFile(new URL('../../app.js', import.meta.url), 'utf8');

test('API mode ignores legacy employee and pending-signup localStorage without deleting it', () => {
  const values = new Map([
    ['ceylonswift_employees', JSON.stringify([{ id: 'FAKE', role: 'System Owner' }])],
    ['ceylonswift_pending_signups', JSON.stringify([{ id: 'FAKE-APPROVAL', approved: true }])]
  ]);
  const context = vm.createContext({ console, structuredClone, localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) }, setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, Event: class Event {}, window: { CEYLONSWIFT_RUNTIME_CONFIG: { authMode: 'api' }, addEventListener: () => {}, dispatchEvent: () => {}, matchMedia: () => ({ matches: false }) }, document: { addEventListener: () => {} } });
  vm.runInContext(appSource, context);
  vm.runInContext('initLocalStorage()', context);
  assert.equal(vm.runInContext('state.employees.length', context), 0);
  assert.equal(vm.runInContext('state.pendingSignups.length', context), 0);
  assert.match(values.get('ceylonswift_employees'), /FAKE/);
  assert.match(values.get('ceylonswift_pending_signups'), /FAKE-APPROVAL/);
});

const snapshot = permissions => ({ status: 'authenticated', authenticationMode: 'api', capabilityStatus: 'ready', capabilities: { workspace: { type: 'ORGANIZATION', organizationId: 'org-a', branchId: 'branch-a' }, roles: ['ADMIN'], permissions } });
const employee = { id: 'employee-a', employeeNumber: 'CS-001', jobTitle: 'Coordinator', employeeStatus: 'ACTIVE', primaryBranch: { id: 'branch-a', name: 'Colombo' }, user: { id: 'user-a', accountStatus: 'ACTIVE', profile: { displayName: 'Test Employee' }, roles: [{ name: 'Office staff' }] } };
const rider = { id: 'rider-a', riderStatus: 'AVAILABLE', user: { id: 'user-a' } };

test('directory loads backend records and reloads when workspace changes', async () => {
  let employeeLoads = 0; let published;
  globalThis.applyBackendWorkforceCompatibility = value => { published = value; };
  const api = { employees: async () => { employeeLoads += 1; return { items: [employee], nextCursor: null }; }, riders: async () => ({ items: [rider], nextCursor: null }), invitations: async () => ({ items: [], nextCursor: null }), approvals: async () => ({ items: [], nextCursor: null }), branches: async () => [{ id: 'branch-a', name: 'Colombo' }] };
  const controller = new WorkforceController(api); controller.render = () => {};
  await controller.sync(snapshot(['staff.read', 'rider.read', 'branch.read']));
  assert.equal(employeeLoads, 1); assert.equal(published.employees[0].id, 'employee-a');
  const changed = snapshot(['staff.read', 'rider.read', 'branch.read']); changed.capabilities.workspace.branchId = 'branch-b';
  await controller.sync(changed);
  assert.equal(employeeLoads, 2);
  delete globalThis.applyBackendWorkforceCompatibility;
});

test('action markup is capability-driven and ordinary office access fails closed', () => {
  const controller = new WorkforceController({}); controller.snapshot = snapshot(['staff.read']); controller.data.riders = [rider]; controller.data.branches = [];
  const restricted = controller.employeeCard(employee, true);
  assert.doesNotMatch(restricted, /Suspend account|Suspend rider|Assign branch/);
  controller.snapshot = snapshot(['staff.read', 'staff.suspend', 'rider.suspend', 'branch.manage']);
  const authorized = controller.employeeCard(employee, true);
  assert.match(authorized, /Suspend account/); assert.match(authorized, /Suspend rider/);
});

test('pagination appends backend data and logout clears memory state', async () => {
  const api = { employees: async query => ({ items: [{ ...employee, id: query.cursor ? 'employee-b' : 'employee-a' }], nextCursor: query.cursor ? null : 'next' }) };
  const controller = new WorkforceController(api); controller.snapshot = snapshot(['staff.read']); controller.render = () => {}; controller.publishCompatibility = () => {};
  await controller.load('employees', () => api.employees({}), false);
  await controller.more('employees');
  assert.equal(controller.data.employees.length, 2);
  controller.clear();
  assert.deepEqual(controller.data.employees, []);
});

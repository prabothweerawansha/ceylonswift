import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedNavigationItems, allowedSectionIds, isSectionAllowed } from '../../js/navigation/navigation-policy.js';

const context = (roles, permissions, type = 'ORGANIZATION') => ({ capabilityStatus: 'ready', capabilities: { workspace: { type }, roles, permissions } });

test('customer navigation contains only personal capabilities', () => {
  const sections = allowedSectionIds(context(['CUSTOMER'], ['tracking.read.public', 'package.create', 'hub.read', 'session.revoke.own'], 'PERSONAL'));
  assert.deepEqual(sections, ['customertrack', 'customerrequest', 'hubs', 'security-center']);
  assert.equal(sections.includes('dashboard'), false);
  assert.equal(sections.includes('accesscontrol'), false);
});

test('rider sees assigned work only and no internal approval or administration UI', () => {
  const sections = allowedSectionIds(context(['RIDER'], ['package.read.own', 'hub.read', 'session.revoke.own']));
  assert.deepEqual(sections, ['packages', 'hubs', 'security-center']);
  assert.equal(sections.includes('employees'), false);
});

test('office approval and admin items require explicit permissions', () => {
  const office = allowedSectionIds(context(['OFFICE_STAFF'], ['package.read.branch', 'hub.read', 'session.revoke.own']));
  assert.equal(office.includes('accesscontrol'), false);
  const manager = allowedSectionIds(context(['BRANCH_MANAGER'], ['package.read.branch', 'rider.approve', 'hub.read', 'session.revoke.own']));
  assert.equal(manager.includes('accesscontrol'), true);
  const adminWithoutRoleRead = allowedSectionIds(context(['ADMIN'], ['package.read.organization', 'session.revoke.own']));
  assert.equal(adminWithoutRoleRead.includes('access-management'), false);
});

test('missing or unavailable capability data fails closed and ignores browser-forged values', () => {
  globalThis.localStorage = { getItem: () => JSON.stringify({ permissions: ['role.read'], roles: ['OWNER'] }) };
  assert.deepEqual(allowedNavigationItems({ capabilityStatus: 'unavailable', capabilities: null }), []);
  assert.deepEqual(allowedNavigationItems({ capabilityStatus: 'ready', capabilities: { workspace: { type: 'ORGANIZATION' } } }), []);
  assert.equal(isSectionAllowed('access-management', context(['CUSTOMER'], ['tracking.read.public'], 'PERSONAL')), false);
  delete globalThis.localStorage;
});

test('SUPER_ADMIN receives no public navigation surface', () => {
  assert.deepEqual(allowedNavigationItems(context(['SUPER_ADMIN'], ['system.reset'])), []);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedSectionIds } from '../../js/navigation/navigation-policy.js';
import { mapLegacyRole } from '../../js/compatibility/legacy-role-map.js';

const partner = role => ({ capabilityStatus: 'ready', capabilities: { workspace: { type: 'ORGANIZATION', organizationId: 'partner-a' }, roles: [role], permissions: ['profile.read.own', 'package.create', 'package.read.organization', 'role.read', 'session.revoke.own'] } });

test('partner users receive only the restricted partner shell', () => {
  assert.deepEqual(allowedSectionIds(partner('PARTNER_USER')), ['partner-home', 'security-center']);
  assert.deepEqual(allowedSectionIds(partner('PARTNER_ADMIN')), ['partner-home', 'security-center']);
});

test('partner roles never map to legacy Office or Owner UI', () => {
  assert.equal(mapLegacyRole(['PARTNER_USER']), null);
  assert.equal(mapLegacyRole(['PARTNER_ADMIN']), null);
});

test('partner navigation is derived only from the active backend capability context', () => {
  const foreign = partner('PARTNER_ADMIN'); foreign.capabilities = null; foreign.capabilityStatus = 'unavailable';
  assert.deepEqual(allowedSectionIds(foreign), []);
});

test('partner administrator workforce navigation requires explicit scoped permissions', () => {
  const managed = partner('PARTNER_ADMIN');
  managed.capabilities.permissions.push('staff.read', 'staff.approve');
  assert.deepEqual(allowedSectionIds(managed), ['partner-home', 'employees', 'accesscontrol', 'security-center']);
});

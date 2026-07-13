import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTH_TEMPLATE, ROUTES, AuthViewController } from '../../js/auth/auth-view-controller.js';
import fs from 'node:fs';

test('public authentication is unified and has no public role chooser tabs', () => {
  assert.match(AUTH_TEMPLATE, /Welcome back/);
  assert.match(AUTH_TEMPLATE, /Mobile number or email address/);
  assert.doesNotMatch(AUTH_TEMPLATE, /auth-tab-btn|Customer.*Rider.*Office Staff.*Owner/s);
});

test('workforce, admin, and partner authentication have distinct routes and no self-registration', () => {
  assert.deepEqual(ROUTES, { customer: 'login', workforce: 'staff-login', admin: 'admin-login', partner: 'partner-login' });
  assert.match(AUTH_TEMPLATE, /Public self-registration is unavailable/);
  assert.doesNotMatch(AUTH_TEMPLATE, /SUPER_ADMIN|Master Password|Owner Gmail/);
});

test('customer identifier validation accepts email or mobile and rejects role-like input', () => {
  const controller = new AuthViewController({ getAuth: () => ({}) });
  assert.equal(controller.validCustomerIdentifier('customer@example.test'), true);
  assert.equal(controller.validCustomerIdentifier('077 123 4567'), true);
  assert.equal(controller.validCustomerIdentifier('OWNER'), false);
});

test('critical authentication actions use clear labels without role-selection semantics', () => {
  for (const label of ['Continue', 'Sign in', 'Send verification code', 'Verify code', 'Continue with Google']) assert.match(AUTH_TEMPLATE, new RegExp(label));
  assert.doesNotMatch(AUTH_TEMPLATE, /Access Customer Portal|Grant Clearance|Rider Secure Sign In/);
});

test('the compatibility bridge retains the auth controller and closes auth routes after authentication', () => {
  const bridge = fs.readFileSync(new URL('../../js/compatibility/legacy-auth-bridge.js', import.meta.url), 'utf8');
  assert.match(bridge, /authViewController\s*=\s*new AuthViewController/);
  assert.match(bridge, /authViewController\.init\(\)/);
  assert.match(bridge, /snapshot\.status === 'authenticated'\) authViewController\?\.close\(\)/);
});

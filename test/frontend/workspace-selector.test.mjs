import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceSelector } from '../../js/workspaces/workspace-selector.js';

const label = workspace => WorkspaceSelector.prototype.typeLabel.call({}, workspace);

test('workspace selector uses safe human-readable workspace types', () => {
  assert.equal(label({ type: 'PERSONAL', roles: ['CUSTOMER'] }), 'Personal account');
  assert.equal(label({ type: 'ORGANIZATION', branchId: 'branch-id', roles: ['OFFICE_STAFF'] }), 'Branch workspace');
  assert.equal(label({ type: 'ORGANIZATION', roles: ['PARTNER_USER'] }), 'Partner organization');
  assert.equal(label({ type: 'ORGANIZATION', roles: ['ADMIN'] }), 'CeylonSwift operations');
});

test('workspace selector source sends only the selected workspace identifier', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../../js/workspaces/workspace-selector.js', import.meta.url), 'utf8'));
  assert.match(source, /onSelect\(workspace\.id\)/);
  assert.doesNotMatch(source, /onSelect\([^)]*(roles|permissions|organizationId)/);
});

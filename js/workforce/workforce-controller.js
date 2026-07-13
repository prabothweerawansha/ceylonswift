const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const label = value => String(value ?? '').toLowerCase().replaceAll('_', ' ').replace(/^./, character => character.toUpperCase());
const initials = value => String(value || 'CS').split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');

export class WorkforceController {
  constructor(api) {
    this.api = api;
    this.snapshot = null;
    this.workspaceKey = null;
    this.abortController = null;
    this.data = { employees: [], riders: [], invitations: [], approvals: [], branches: [] };
    this.next = { employees: null, riders: null, invitations: null, approvals: null };
    this.filters = { team: 'ALL', search: '', status: '' };
    this.busy = false;
  }

  permissions() { return new Set(this.snapshot?.capabilities?.permissions || []); }
  can(permission) { return this.permissions().has(permission); }
  isReady() { return this.snapshot?.status === 'authenticated' && this.snapshot?.capabilities?.workspace?.type === 'ORGANIZATION' && this.snapshot?.capabilityStatus === 'ready'; }

  async sync(snapshot) {
    this.snapshot = snapshot;
    const workspace = snapshot.capabilities?.workspace;
    const nextKey = this.isReady() ? `${workspace.organizationId}:${workspace.branchId || '*'}` : null;
    if (!nextKey) { this.clear(); this.render(); return; }
    if (nextKey !== this.workspaceKey) { this.clear(); this.workspaceKey = nextKey; await this.reload(); }
    else this.render();
  }

  clear() {
    this.abortController?.abort();
    this.workspaceKey = null;
    this.data = { employees: [], riders: [], invitations: [], approvals: [], branches: [] };
    this.next = { employees: null, riders: null, invitations: null, approvals: null };
    globalThis.applyBackendWorkforceCompatibility?.({ employees: [], riders: [] });
  }

  async reload() {
    this.abortController?.abort();
    this.abortController = new AbortController();
    this.busy = true; this.render();
    const signal = this.abortController.signal;
    const permissions = this.permissions();
    const organizationId = this.snapshot.capabilities.workspace.organizationId;
    const tasks = [];
    if (permissions.has('staff.read')) tasks.push(this.load('employees', () => this.api.employees({ limit: 25, search: this.filters.search, status: this.filters.status }, signal)));
    if (permissions.has('rider.read')) tasks.push(this.load('riders', () => this.api.riders({ limit: 25, search: this.filters.search }, signal)));
    if (permissions.has('staff.read')) tasks.push(this.load('invitations', () => this.api.invitations({ limit: 25 }, signal)));
    if (permissions.has('staff.approve') || permissions.has('rider.approve')) tasks.push(this.load('approvals', () => this.api.approvals({ limit: 25, status: 'PENDING' }, signal)));
    if (permissions.has('branch.read') && organizationId) tasks.push(this.api.branches(organizationId, signal).then(result => { this.data.branches = result.branches || result.items || result || []; }));
    try { await Promise.all(tasks); this.error = null; }
    catch (error) { if (error?.name !== 'AbortError') this.error = error; }
    finally { if (!signal.aborted) { this.busy = false; this.publishCompatibility(); this.render(); } }
  }

  async load(key, operation, append = false) {
    const result = await operation();
    this.data[key] = append ? [...this.data[key], ...(result.items || [])] : (result.items || []);
    this.next[key] = result.nextCursor || null;
  }

  publishCompatibility() { globalThis.applyBackendWorkforceCompatibility?.({ employees: this.data.employees, riders: this.data.riders }); }
  render() { this.renderTeam(this.filters.team); this.renderApprovals(); this.renderAcceptance(); }

  renderTeam(filter = 'ALL') {
    this.filters.team = filter;
    const section = document.getElementById('employees');
    if (!section || !this.snapshot || this.snapshot.authenticationMode !== 'api') return;
    if (!this.isReady() || !this.can('staff.read')) { section.innerHTML = this.unavailable('Team directory is not available in this workspace.'); return; }
    const riderUsers = new Set(this.data.riders.map(rider => rider.user?.id));
    const employees = this.data.employees.filter(employee => filter === 'ALL' || (filter === 'Field' ? riderUsers.has(employee.user?.id) : !riderUsers.has(employee.user?.id)));
    section.innerHTML = `
      <div class="top-header workforce-heading"><div><p class="section-kicker">Workforce</p><h2>Team directory</h2><p>Backend-verified employees and riders for the active workspace.</p></div>${this.can('staff.invite') ? '<button class="btn btn-primary" type="button" data-workforce-action="open-invite">Invite team member</button>' : ''}</div>
      <div class="workforce-toolbar" role="search"><label><span>Search</span><input id="workforce-search" type="search" value="${escapeHtml(this.filters.search)}" placeholder="Name, employee number, or job title"></label><label><span>Status</span><select id="workforce-status"><option value="">All statuses</option>${['PENDING','ACTIVE','ON_LEAVE','SUSPENDED','TERMINATED'].map(status => `<option value="${status}" ${this.filters.status === status ? 'selected' : ''}>${label(status)}</option>`).join('')}</select></label><button class="btn btn-secondary" type="button" data-workforce-action="apply-filter">Apply</button></div>
      <div class="employee-categories" role="group" aria-label="Directory type"><button class="btn btn-secondary ${filter === 'ALL' ? 'active' : ''}" data-team-filter="ALL">All</button><button class="btn btn-secondary ${filter === 'Office' ? 'active' : ''}" data-team-filter="Office">Office staff</button><button class="btn btn-secondary ${filter === 'Field' ? 'active' : ''}" data-team-filter="Field">Riders</button></div>
      ${this.statusBlock()}
      <div class="employees-grid workforce-grid">${employees.map(employee => this.employeeCard(employee, riderUsers.has(employee.user?.id))).join('') || this.empty('No matching team members.')}</div>
      ${this.next.employees ? '<button class="btn btn-secondary workforce-load-more" type="button" data-workforce-action="more-employees">Load more</button>' : ''}
      <div id="workforce-invite-panel" class="workforce-invite-panel" hidden></div>`;
    this.bindTeam(section);
  }

  employeeCard(employee, isRider) {
    const name = employee.user?.profile?.displayName || 'CeylonSwift teammate';
    const rider = this.data.riders.find(item => item.user?.id === employee.user?.id);
    const permissions = this.permissions();
    const branchOptions = this.data.branches.map(branch => `<option value="${escapeHtml(branch.id)}" ${employee.primaryBranch?.id === branch.id ? 'selected' : ''}>${escapeHtml(branch.name)}</option>`).join('');
    return `<article class="employee-card workforce-card"><div class="emp-avatar ${isRider ? 'field' : ''}">${escapeHtml(initials(name))}</div><div class="emp-details"><div class="workforce-card-title"><div><h3>${escapeHtml(name)}</h3><p>${escapeHtml(employee.employeeNumber)} · ${escapeHtml(employee.jobTitle)}</p></div><span class="badge">${escapeHtml(label(isRider ? rider?.riderStatus : employee.employeeStatus))}</span></div><dl><div><dt>Branch</dt><dd>${escapeHtml(employee.primaryBranch?.name || 'Unassigned')}</dd></div><div><dt>Account</dt><dd>${escapeHtml(label(employee.user?.accountStatus))}</dd></div><div><dt>Roles</dt><dd>${escapeHtml(employee.user?.roles?.map(role => role.name).join(', ') || 'None')}</dd></div><div><dt>Contact</dt><dd>${escapeHtml(employee.user?.normalizedEmail || employee.user?.normalizedPhone || 'Not provided')}</dd></div></dl><div class="workforce-actions">
      ${permissions.has('staff.suspend') ? `<button class="btn btn-secondary" type="button" data-account-id="${employee.user?.id}" data-account-status="${employee.user?.accountStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'}">${employee.user?.accountStatus === 'ACTIVE' ? 'Suspend account' : 'Reactivate account'}</button><button class="btn btn-secondary" type="button" data-employee-id="${employee.id}" data-employee-status="${employee.employeeStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'}">${employee.employeeStatus === 'ACTIVE' ? 'Suspend employment' : 'Reactivate employment'}</button>` : ''}
      ${isRider && permissions.has('rider.suspend') ? `<button class="btn btn-secondary" type="button" data-rider-id="${rider?.id}" data-rider-status="${rider?.riderStatus === 'AVAILABLE' ? 'SUSPENDED' : 'AVAILABLE'}">${rider?.riderStatus === 'AVAILABLE' ? 'Suspend rider' : 'Reactivate rider'}</button>` : ''}
      ${permissions.has('branch.manage') && branchOptions ? `<label class="workforce-branch"><span>Assign branch</span><select data-employee-branch="${employee.id}">${branchOptions}</select></label>` : ''}</div></div></article>`;
  }

  bindTeam(section) {
    section.querySelectorAll('[data-team-filter]').forEach(button => button.addEventListener('click', () => this.renderTeam(button.dataset.teamFilter)));
    section.querySelector('[data-workforce-action="open-invite"]')?.addEventListener('click', () => this.openInvite());
    section.querySelector('[data-workforce-action="apply-filter"]')?.addEventListener('click', () => { this.filters.search = section.querySelector('#workforce-search')?.value.trim() || ''; this.filters.status = section.querySelector('#workforce-status')?.value || ''; void this.reload(); });
    section.querySelectorAll('[data-account-id]').forEach(button => button.addEventListener('click', () => this.mutate(() => this.api.userStatus(button.dataset.accountId, button.dataset.accountStatus, 'Workforce management action'))));
    section.querySelectorAll('[data-employee-id]').forEach(button => button.addEventListener('click', () => this.mutate(() => this.api.employeeStatus(button.dataset.employeeId, button.dataset.employeeStatus, 'Workforce management action'))));
    section.querySelectorAll('[data-rider-id]').forEach(button => button.addEventListener('click', () => this.mutate(() => this.api.riderStatus(button.dataset.riderId, button.dataset.riderStatus, 'Workforce management action'))));
    section.querySelectorAll('[data-employee-branch]').forEach(select => select.addEventListener('change', () => this.mutate(() => this.api.employeeBranch(select.dataset.employeeBranch, select.value))));
    section.querySelector('[data-workforce-action="more-employees"]')?.addEventListener('click', () => this.more('employees'));
  }

  openInvite() {
    if (!this.can('staff.invite')) return;
    const panel = document.getElementById('workforce-invite-panel'); if (!panel) return;
    const partner = (this.snapshot.capabilities.roles || []).includes('PARTNER_ADMIN');
    const roles = partner ? ['PARTNER_USER', 'PARTNER_ADMIN'] : ['RIDER', 'OFFICE_STAFF', 'BRANCH_MANAGER'];
    const branchId = this.snapshot.capabilities.workspace.branchId;
    panel.hidden = false;
    panel.innerHTML = `<form id="workforce-invite-form"><div class="panel-header"><div><p class="section-kicker">Secure invitation</p><h3>Invite a team member</h3></div><button class="btn btn-secondary" type="button" data-close-invite>Close</button></div><div class="form-grid"><label class="form-group"><span>Email or phone</span><input name="destination" required autocomplete="email"></label><label class="form-group"><span>Job title</span><input name="jobTitle" required minlength="2" maxlength="160"></label><label class="form-group"><span>Role</span><select name="roleKey">${roles.map(role => `<option value="${role}">${label(role)}</option>`).join('')}</select></label><label class="form-group"><span>Branch</span><select name="branchId" required>${this.data.branches.map(branch => `<option value="${branch.id}" ${branch.id === branchId ? 'selected' : ''}>${escapeHtml(branch.name)}</option>`).join('')}</select></label></div><button class="btn btn-primary" type="submit">Create invitation</button><p class="workforce-form-message" role="status"></p></form>`;
    panel.querySelector('[data-close-invite]').addEventListener('click', () => { panel.hidden = true; });
    panel.querySelector('form').addEventListener('submit', event => this.submitInvite(event));
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async submitInvite(event) {
    event.preventDefault(); const form = event.currentTarget; const message = form.querySelector('.workforce-form-message'); const values = new FormData(form); const destination = String(values.get('destination') || '').trim();
    try { const result = await this.api.createInvitation({ ...(destination.includes('@') ? { email: destination } : { phone: destination }), branchId: values.get('branchId'), jobTitle: values.get('jobTitle'), roleKeys: [values.get('roleKey')] }); message.textContent = result.developmentAcceptanceToken ? `Invitation created. Development acceptance link: ${location.origin}${location.pathname}?invitation=${encodeURIComponent(result.developmentAcceptanceToken)}` : 'Invitation created and queued for delivery.'; form.reset(); await this.reload(); }
    catch (error) { message.textContent = error?.message || 'Unable to create invitation.'; }
  }

  renderApprovals() {
    const section = document.getElementById('accesscontrol');
    if (!section || !this.snapshot || this.snapshot.authenticationMode !== 'api') return;
    if (!this.isReady() || (!this.can('staff.approve') && !this.can('rider.approve'))) { section.innerHTML = this.unavailable('Approval management is not available in this workspace.'); return; }
    section.innerHTML = `<div class="top-header workforce-heading"><div><p class="section-kicker">Governance</p><h2>Invitations & approvals</h2><p>Final decisions are validated, transacted, and audited by the backend.</p></div></div>${this.statusBlock()}<div class="verification-board"><article class="glass-panel"><div class="panel-header"><h3>Pending approvals</h3><span class="badge">${this.data.approvals.length} pending</span></div><div class="workforce-list">${this.data.approvals.map(item => this.approvalRow(item)).join('') || this.empty('No approvals require your permission.')}</div>${this.next.approvals ? '<button class="btn btn-secondary" data-more="approvals">Load more</button>' : ''}</article><article class="glass-panel"><div class="panel-header"><h3>Invitations</h3><span class="badge">${this.data.invitations.length} shown</span></div><div class="workforce-list">${this.data.invitations.map(item => this.invitationRow(item)).join('') || this.empty('No invitations found.')}</div>${this.next.invitations ? '<button class="btn btn-secondary" data-more="invitations">Load more</button>' : ''}</article></div>`;
    section.querySelectorAll('[data-approval]').forEach(button => button.addEventListener('click', () => this.decideApproval(button.dataset.approval, button.dataset.decision === 'approve')));
    section.querySelectorAll('[data-revoke-invitation]').forEach(button => button.addEventListener('click', () => this.mutate(() => this.api.revokeInvitation(button.dataset.revokeInvitation))));
    section.querySelectorAll('[data-more]').forEach(button => button.addEventListener('click', () => this.more(button.dataset.more)));
  }

  approvalRow(item) { const allowed = this.can(item.requiredPermission); return `<div class="workforce-list-row"><div><strong>${escapeHtml(label(item.type))}</strong><span>${escapeHtml(item.branch?.name || 'Organization-wide')} · ${escapeHtml(new Date(item.createdAt).toLocaleDateString())}</span></div>${allowed ? `<div class="workforce-actions"><button class="btn btn-primary" data-approval="${item.id}" data-decision="approve">Approve</button><button class="btn btn-secondary" data-approval="${item.id}" data-decision="reject">Reject</button></div>` : ''}</div>`; }
  invitationRow(item) { return `<div class="workforce-list-row"><div><strong>${escapeHtml(item.normalizedDestination)}</strong><span>${escapeHtml(item.intendedRoleKeys.map(label).join(', '))} · ${escapeHtml(label(item.status))}</span></div>${this.can('staff.invite') && item.status === 'PENDING' ? `<button class="btn btn-secondary" data-revoke-invitation="${item.id}">Revoke</button>` : ''}</div>`; }
  async decideApproval(id, approve) { const reason = approve ? undefined : globalThis.prompt?.('Reason for rejection:')?.trim(); if (!approve && !reason) return; await this.mutate(() => this.api.decideApproval(id, approve, reason)); }
  async toggleRider(legacyId) { const employee = this.data.employees.find(item => item.employeeNumber === legacyId || item.id === legacyId); const rider = this.data.riders.find(item => item.user?.id === employee?.user?.id); if (!rider || !this.can('rider.suspend')) return; await this.mutate(() => this.api.riderStatus(rider.id, rider.riderStatus === 'AVAILABLE' ? 'SUSPENDED' : 'AVAILABLE', 'Workforce directory action')); }

  async more(key) { const cursor = this.next[key]; if (!cursor) return; const operation = key === 'employees' ? () => this.api.employees({ limit: 25, cursor, search: this.filters.search, status: this.filters.status }) : key === 'invitations' ? () => this.api.invitations({ limit: 25, cursor }) : () => this.api.approvals({ limit: 25, cursor, status: 'PENDING' }); await this.load(key, operation, true); this.publishCompatibility(); this.render(); }
  async mutate(operation) { if (this.busy) return; this.busy = true; this.render(); try { await operation(); this.error = null; await this.reload(); } catch (error) { this.error = error; this.busy = false; this.render(); } }

  renderAcceptance() {
    const token = new URLSearchParams(location.search).get('invitation');
    let modal = document.getElementById('workforce-invitation-accept');
    if (!token) { modal?.remove(); return; }
    if (!modal) { modal = document.createElement('div'); modal.id = 'workforce-invitation-accept'; modal.className = 'workforce-accept-overlay'; document.body.append(modal); }
    if (modal.dataset.bound) return;
    modal.innerHTML = `<form class="glass-panel workforce-accept-card"><p class="section-kicker">Workforce invitation</p><h2>Set up your account</h2><p>Your organization and roles come from the signed invitation and cannot be changed here.</p><label class="form-group"><span>Full name</span><input name="displayName" required minlength="2" maxlength="160" autocomplete="name"></label><label class="form-group"><span>Secure password</span><input name="password" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></label><button class="btn btn-primary" type="submit">Accept invitation</button><p role="status"></p></form>`;
    modal.dataset.bound = 'true'; modal.querySelector('form').addEventListener('submit', async event => { event.preventDefault(); const form = event.currentTarget; const message = form.querySelector('[role=status]'); const data = new FormData(form); try { await this.api.acceptInvitation({ token, displayName: data.get('displayName'), password: data.get('password') }); message.textContent = 'Invitation accepted. Approval is pending; you may sign in after activation.'; history.replaceState(null, '', location.pathname + location.hash); } catch (error) { message.textContent = error?.message || 'Unable to accept invitation.'; } });
  }

  statusBlock() { if (this.busy) return '<div class="workforce-state" role="status">Loading verified workforce data…</div>'; if (this.error) return `<div class="workforce-state workforce-error" role="alert">${escapeHtml(this.error.message || 'Unable to load workforce data.')} <button class="btn btn-secondary" data-workforce-retry>Retry</button></div>`; return ''; }
  empty(message) { return `<div class="workforce-empty"><strong>Nothing to show</strong><span>${escapeHtml(message)}</span></div>`; }
  unavailable(message) { return `<div class="identity-state-card"><p class="section-kicker">Restricted</p><h2>Workforce access unavailable</h2><p>${escapeHtml(message)}</p></div>`; }
}

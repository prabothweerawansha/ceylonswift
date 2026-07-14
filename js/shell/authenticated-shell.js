const ROLE_LABELS = Object.freeze({ CUSTOMER: 'Customer', VIP_CUSTOMER: 'VIP customer', RIDER: 'Rider', AGENT: 'Agent', OFFICE_STAFF: 'Office staff', BRANCH_MANAGER: 'Branch manager', ADMIN: 'Administrator', OWNER: 'Owner', PARTNER_USER: 'Partner user', PARTNER_ADMIN: 'Partner administrator' });

export class AuthenticatedShell {
  constructor({ getAuth, onWorkspaceSwitch, onSecurity }) { this.getAuth = getAuth; this.onWorkspaceSwitch = onWorkspaceSwitch; this.onSecurity = onSecurity; this.bound = false; }
  init() { if (this.bound) return; this.bound = true; document.getElementById('session-workspace-switch')?.addEventListener('click', () => this.onWorkspaceSwitch()); document.getElementById('session-security-link')?.addEventListener('click', () => this.onSecurity()); document.getElementById('session-logout')?.addEventListener('click', () => globalThis.handleLogout()); document.getElementById('session-logout-all')?.addEventListener('click', () => globalThis.handleLogout(true)); }
  render(snapshot) {
    this.init();
    const bar = document.getElementById('session-control-bar'); if (!bar) return;
    if (snapshot.status !== 'authenticated') { bar.style.display = 'none'; return; }
    const displayName = snapshot.user?.profile?.displayName || 'CeylonSwift user';
    const roles = snapshot.capabilities?.roles || snapshot.activeWorkspace?.roles || [];
    const activeWorkspaceId = snapshot.activeWorkspace?.membershipId || snapshot.activeWorkspace?.id;
    const workspace = snapshot.workspaces.find(item => item.id === activeWorkspaceId) || (snapshot.activeWorkspace?.type === 'PERSONAL' ? snapshot.workspaces.find(item => item.type === 'PERSONAL') : null) || snapshot.activeWorkspace;
    const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'CS';
    const setText = (id, text) => { const element = document.getElementById(id); if (element) element.textContent = text; };
    setText('session-avatar', initials); setText('session-display-name', displayName); setText('session-workspace-name', workspace?.displayName || (snapshot.activeWorkspace?.type === 'PERSONAL' ? 'Personal Account' : 'Workspace required')); setText('session-role-label', roles.map(role => ROLE_LABELS[role]).filter(Boolean).join(' · ') || 'Restricted access');
    const switchButton = document.getElementById('session-workspace-switch'); if (switchButton) switchButton.hidden = snapshot.workspaces.length < 2;
    bar.style.display = 'flex';
  }
}

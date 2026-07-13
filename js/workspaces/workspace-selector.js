const ROLE_LABELS = Object.freeze({ CUSTOMER: 'Customer', VIP_CUSTOMER: 'VIP customer', RIDER: 'Rider', AGENT: 'Agent', OFFICE_STAFF: 'Office staff', BRANCH_MANAGER: 'Branch manager', ADMIN: 'Administrator', OWNER: 'Owner', PARTNER_USER: 'Partner user', PARTNER_ADMIN: 'Partner administrator' });

export class WorkspaceSelector {
  constructor(modal = document.getElementById('workspaceSelectorModal')) { this.modal = modal; this.previousFocus = null; this.required = false; this.onKeyDown = event => this.handleKeyDown(event); if (this.modal) { this.modal.hidden = true; this.modal.setAttribute('aria-hidden', 'true'); } this.modal?.querySelector('[data-workspace-close]')?.addEventListener('click', () => this.close()); }

  open(workspaces, { activeWorkspace = null, onSelect, required = !activeWorkspace } = {}) {
    if (!this.modal) return;
    this.required = required;
    this.previousFocus = document.activeElement;
    const list = this.modal.querySelector('#workspace-selector-list');
    const status = this.modal.querySelector('#workspace-selector-status');
    const close = this.modal.querySelector('[data-workspace-close]');
    if (close) { close.hidden = required; close.disabled = required; }
    if (status) { status.textContent = workspaces.length ? 'Choose the workspace you want to use.' : 'No active workspace is available.'; status.dataset.kind = workspaces.length ? 'info' : 'warning'; }
    list?.replaceChildren(...workspaces.map(workspace => this.workspaceButton(workspace, activeWorkspace, onSelect)));
    this.modal.hidden = false; this.modal.setAttribute('aria-hidden', 'false'); this.modal.classList.add('active');
    this.modal.addEventListener('keydown', this.onKeyDown);
    const first = list?.querySelector('button:not(:disabled)');
    first?.focus();
  }

  close() { if (!this.modal || this.required) return; this.modal.classList.remove('active'); this.modal.hidden = true; this.modal.setAttribute('aria-hidden', 'true'); this.modal.removeEventListener('keydown', this.onKeyDown); this.previousFocus?.focus?.(); }

  workspaceButton(workspace, activeWorkspace, onSelect) {
    const selected = workspace.id === activeWorkspace?.membershipId || (workspace.type === 'PERSONAL' && activeWorkspace?.type === 'PERSONAL');
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'workspace-option'; button.dataset.selected = String(selected); button.setAttribute('aria-pressed', String(selected));
    const title = document.createElement('strong'); title.textContent = workspace.displayName;
    const type = document.createElement('span'); type.className = 'workspace-option-type'; type.textContent = this.typeLabel(workspace);
    const roles = document.createElement('span'); roles.className = 'workspace-option-roles'; roles.textContent = (workspace.roles || []).map(role => ROLE_LABELS[role]).filter(Boolean).join(' · ') || 'Restricted workspace';
    button.append(title, type, roles);
    button.addEventListener('click', async () => {
      if (button.disabled) return;
      this.setBusy(true, 'Switching workspace…');
      try { await onSelect(workspace.id); this.required = false; this.close(); }
      catch (_) { this.setBusy(false, 'This workspace is unavailable. Choose another workspace.'); }
    });
    return button;
  }

  typeLabel(workspace) { if ((workspace.roles || []).some(role => role.startsWith('PARTNER_'))) return 'Partner organization'; if (workspace.type === 'PERSONAL') return 'Personal account'; if (workspace.branchId) return 'Branch workspace'; return 'CeylonSwift operations'; }
  setBusy(busy, message) { this.modal?.querySelectorAll('.workspace-option').forEach(button => { button.disabled = busy; button.setAttribute('aria-busy', String(busy)); }); const status = this.modal?.querySelector('#workspace-selector-status'); if (status) status.textContent = message; }
  handleKeyDown(event) { if (event.key === 'Escape' && !this.required) { event.preventDefault(); this.close(); } if (event.key !== 'Tab') return; const controls = [...this.modal.querySelectorAll('button:not([disabled]):not([hidden])')]; if (!controls.length) return; const first = controls[0]; const last = controls[controls.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
}

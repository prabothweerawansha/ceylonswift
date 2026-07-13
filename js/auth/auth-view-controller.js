const ROUTES = Object.freeze({ customer: 'login', workforce: 'staff-login', admin: 'admin-login', partner: 'partner-login' });
const ROUTE_SURFACES = Object.freeze(Object.fromEntries(Object.entries(ROUTES).map(([surface, route]) => [route, surface])));
const SURFACE_COPY = Object.freeze({
  customer: ['Welcome back', 'Sign in or create your account'],
  workforce: ['Team member sign in', 'Secure access for invited CeylonSwift team members'],
  admin: ['Secure administration sign in', 'Protected access for authorized administrators'],
  partner: ['Partner workspace sign in', 'Access your organization’s restricted CeylonSwift workspace'],
});

const AUTH_TEMPLATE = `
  <div class="auth-brand-lockup" aria-hidden="true"><span class="auth-brand-mark">CS</span><span>CeylonSwift Identity</span></div>
  <div class="modal-header auth-modal-header">
    <div><p class="auth-eyebrow">Secure account access</p><h2 id="auth-surface-title">Welcome back</h2><p id="auth-surface-subtitle">Sign in or create your account</p></div>
    <button class="close-modal" type="button" data-auth-close aria-label="Close sign in"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
  </div>
  <div class="auth-demo-notice" id="auth-demo-notice" hidden>Development demo authentication mode is active. This mode is never available in production.</div>
  <p id="auth-status-message" class="auth-status-message" role="status" aria-live="polite" hidden></p>
  <section class="auth-surface active" data-auth-surface="customer" aria-labelledby="auth-surface-title">
    <div data-customer-step="identifier">
      <form id="customer-identifier-form" novalidate>
        <div class="form-group"><label for="customer-identifier">Mobile number or email address</label><input id="customer-identifier" name="identifier" autocomplete="username" inputmode="email" required placeholder="name@example.com or 077 123 4567"><small>New customer accounts are created after successful verification.</small></div>
        <button class="btn btn-primary auth-submit-btn" type="submit">Continue</button>
      </form>
      <div class="auth-divider"><span>or</span></div>
      <button class="google-auth-btn" type="button" data-auth-google><span class="google-g" aria-hidden="true">G</span>Continue with Google</button>
      <div class="auth-entry-links"><button type="button" data-auth-surface-target="workforce">CeylonSwift team member? Sign in</button><button type="button" data-auth-surface-target="partner">Partner organization sign in</button></div>
      <div class="auth-legal-links"><a href="#home-help">Help</a><a href="#privacy">Privacy</a><a href="#terms">Terms</a></div>
    </div>
    <div data-customer-step="credentials" hidden>
      <button class="auth-back-link" type="button" data-customer-back>Back</button>
      <p class="auth-context-line">Continue securely with a password or verification code.</p>
      <form id="customer-password-form">
        <div class="form-group"><label for="customer-password">Password</label><input type="password" id="customer-password" autocomplete="current-password" minlength="8" required></div>
        <button class="btn btn-primary auth-submit-btn" type="submit">Sign in</button>
      </form>
      <button class="btn btn-secondary auth-secondary-action" type="button" data-auth-request-otp>Send verification code</button>
    </div>
  </section>
  <section class="auth-surface" data-auth-surface="workforce" aria-labelledby="auth-surface-title" hidden>
    <p class="auth-context-line">Workforce accounts are created or invited by CeylonSwift. Public self-registration is unavailable.</p>
    <form class="secure-login-form" data-login-surface="workforce">
      <div class="form-group"><label for="workforce-identifier">Company email, employee ID, or registered mobile number</label><input id="workforce-identifier" name="identifier" autocomplete="username" required></div>
      <div class="form-group"><label for="workforce-password">Password</label><input type="password" id="workforce-password" name="password" autocomplete="current-password" minlength="8" required></div>
      <button class="btn btn-primary auth-submit-btn" type="submit">Sign in</button>
    </form>
    <div class="auth-entry-links"><button type="button" data-auth-surface-target="customer">Back to customer sign in</button><button type="button" data-auth-surface-target="admin">Secure administrator access</button></div>
  </section>
  <section class="auth-surface auth-surface-admin" data-auth-surface="admin" aria-labelledby="auth-surface-title" hidden>
    <div class="auth-security-note"><strong>Protected access</strong><span>Identity and authorization are verified by the CeylonSwift security service. Additional verification may be required.</span></div>
    <form class="secure-login-form" data-login-surface="admin">
      <div class="form-group"><label for="admin-identifier">Company email, employee ID, or registered mobile number</label><input id="admin-identifier" name="identifier" autocomplete="username" required></div>
      <div class="form-group"><label for="admin-password">Password</label><input type="password" id="admin-password" name="password" autocomplete="current-password" minlength="8" required></div>
      <button class="btn btn-primary auth-submit-btn" type="submit">Continue securely</button>
    </form>
    <div class="auth-entry-links"><button type="button" data-auth-surface-target="workforce">Back to team member sign in</button></div>
  </section>
  <section class="auth-surface" data-auth-surface="partner" aria-labelledby="auth-surface-title" hidden>
    <p class="auth-context-line">Use the identity issued for your partner organization. Access remains limited to your authorized workspace.</p>
    <form class="secure-login-form" data-login-surface="partner">
      <div class="form-group"><label for="partner-identifier">Partner email or registered mobile number</label><input id="partner-identifier" name="identifier" autocomplete="username" required></div>
      <div class="form-group"><label for="partner-password">Password</label><input type="password" id="partner-password" name="password" autocomplete="current-password" minlength="8" required></div>
      <button class="btn btn-primary auth-submit-btn" type="submit">Sign in</button>
    </form>
    <div class="auth-entry-links"><button type="button" data-auth-surface-target="customer">Back to customer sign in</button></div>
  </section>
  <section class="auth-surface auth-otp-surface" data-auth-surface="otp" aria-labelledby="auth-surface-title" hidden>
    <button class="auth-back-link" type="button" data-otp-back>Back</button>
    <p class="auth-context-line">Enter the verification code sent through your registered channel.</p>
    <form id="auth-otp-form"><div class="form-group"><label for="auth-otp-code">Verification code</label><input id="auth-otp-code" name="code" autocomplete="one-time-code" inputmode="numeric" pattern="[0-9]{6,8}" minlength="6" maxlength="8" required></div><button class="btn btn-primary auth-submit-btn" type="submit">Verify code</button></form>
  </section>`;

export class AuthViewController {
  constructor({ getAuth }) { this.getAuth = getAuth; this.modal = null; this.surface = 'customer'; this.customerIdentifier = ''; this.previousFocus = null; this.boundKeydown = event => this.handleKeydown(event); this.boundHash = () => this.openFromHash(); }
  init() {
    this.modal = document.getElementById('authPortalModal'); if (!this.modal) return;
    this.modal.setAttribute('role', 'dialog'); this.modal.setAttribute('aria-modal', 'true'); this.modal.setAttribute('aria-labelledby', 'auth-surface-title'); this.modal.setAttribute('aria-hidden', 'true'); this.modal.hidden = true;
    const box = this.modal.querySelector('.modal-box'); box.classList.add('auth-modal-box'); box.removeAttribute('style'); box.innerHTML = AUTH_TEMPLATE;
    this.modal.querySelector('[data-auth-close]').addEventListener('click', () => this.close());
    this.modal.querySelectorAll('[data-auth-surface-target]').forEach(button => button.addEventListener('click', () => this.open(button.dataset.authSurfaceTarget)));
    this.modal.querySelector('#customer-identifier-form').addEventListener('submit', event => this.continueCustomer(event));
    this.modal.querySelector('#customer-password-form').addEventListener('submit', event => this.submitCustomer(event));
    this.modal.querySelectorAll('.secure-login-form').forEach(form => form.addEventListener('submit', event => this.submitCredentials(event)));
    this.modal.querySelector('[data-customer-back]').addEventListener('click', () => this.showCustomerStep('identifier'));
    this.modal.querySelector('[data-auth-request-otp]').addEventListener('click', () => this.requestOtp());
    this.modal.querySelector('[data-auth-google]').addEventListener('click', () => this.startGoogle());
    this.modal.querySelector('#auth-otp-form').addEventListener('submit', event => this.verifyOtp(event));
    this.modal.querySelector('[data-otp-back]').addEventListener('click', () => this.open('customer', { updateHash: false, reset: false }));
    document.getElementById('auth-demo-notice').hidden = this.getAuth().mode !== 'legacy-demo';
    window.addEventListener('hashchange', this.boundHash); this.openFromHash();
    globalThis.openAuthSurface = surface => this.open(surface); globalThis.ceylonSwiftAuthView = this;
  }
  open(surface = 'customer', { updateHash = true, reset = true } = {}) { if (!ROUTES[surface] || !this.modal) return; this.surface = surface; this.previousFocus ||= document.activeElement; this.modal.querySelectorAll('[data-auth-surface]').forEach(view => { const active = view.dataset.authSurface === surface; view.hidden = !active; view.classList.toggle('active', active); }); const [title, subtitle] = SURFACE_COPY[surface]; this.modal.querySelector('#auth-surface-title').textContent = title; this.modal.querySelector('#auth-surface-subtitle').textContent = subtitle; if (surface === 'customer' && reset) this.showCustomerStep('identifier'); this.modal.hidden = false; this.modal.setAttribute('aria-hidden', 'false'); this.modal.classList.add('active'); this.modal.addEventListener('keydown', this.boundKeydown); this.clearStatus(); if (updateHash && location.hash !== `#${ROUTES[surface]}`) history.replaceState(null, '', `#${ROUTES[surface]}`); queueMicrotask(() => this.modal.querySelector('[data-auth-surface]:not([hidden]) input')?.focus()); }
  close() { if (!this.modal) return; this.modal.classList.remove('active'); this.modal.hidden = true; this.modal.setAttribute('aria-hidden', 'true'); this.modal.removeEventListener('keydown', this.boundKeydown); this.modal.querySelectorAll('input[type="password"], #auth-otp-code').forEach(input => { input.value = ''; }); this.customerIdentifier = ''; if (ROUTE_SURFACES[location.hash.slice(1)]) history.replaceState(null, '', `${location.pathname}${location.search}`); this.previousFocus?.focus?.(); this.previousFocus = null; }
  openFromHash() { const surface = ROUTE_SURFACES[location.hash.slice(1)]; if (surface) this.open(surface, { updateHash: false }); }
  continueCustomer(event) { event.preventDefault(); const input = this.modal.querySelector('#customer-identifier'); const value = input.value.trim(); if (!this.validCustomerIdentifier(value)) return this.setStatus('Enter a valid mobile number or email address.', 'error'); this.customerIdentifier = value; this.showCustomerStep('credentials'); }
  showCustomerStep(step) { this.modal.querySelectorAll('[data-customer-step]').forEach(view => { view.hidden = view.dataset.customerStep !== step; }); queueMicrotask(() => this.modal.querySelector(`[data-customer-step="${step}"] input`)?.focus()); }
  async submitCustomer(event) { event.preventDefault(); await this.login(this.customerIdentifier, this.modal.querySelector('#customer-password').value); }
  async submitCredentials(event) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const identifier = String(data.get('identifier') || '').trim(); const password = String(data.get('password') || ''); if (!identifier) return this.setStatus('Enter your account identifier.', 'error'); await this.login(identifier, password); }
  async login(identifier, password) { this.setBusy(true); try { await this.getAuth().login({ identifier, password }); } catch (_) {} finally { this.setBusy(false); } }
  async requestOtp() { if (!this.customerIdentifier) return this.setStatus('Enter your mobile number or email address first.', 'error'); this.setBusy(true); try { await this.getAuth().requestOtp({ identifier: this.customerIdentifier }); this.openOtp(); } catch (_) {} finally { this.setBusy(false); } }
  openOtp() { this.modal.querySelectorAll('[data-auth-surface]').forEach(view => { const active = view.dataset.authSurface === 'otp'; view.hidden = !active; view.classList.toggle('active', active); }); this.modal.querySelector('#auth-surface-title').textContent = 'Verify your account'; this.modal.querySelector('#auth-surface-subtitle').textContent = 'Enter the code from your registered channel'; this.modal.querySelector('#auth-otp-code').focus(); }
  async verifyOtp(event) { event.preventDefault(); const code = this.modal.querySelector('#auth-otp-code').value.trim(); this.setBusy(true); try { await this.getAuth().verifyOtp(code); this.open('customer', { updateHash: false, reset: false }); this.showCustomerStep('credentials'); } catch (_) {} finally { this.setBusy(false); } }
  async startGoogle() { this.setBusy(true); try { await this.getAuth().startGoogleLogin(); } catch (_) {} finally { this.setBusy(false); } }
  validCustomerIdentifier(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || /^\+?[0-9][0-9\s-]{8,14}$/.test(value); }
  setBusy(busy) { this.modal.querySelectorAll('button, input').forEach(control => { if (!control.matches('[data-auth-close]')) control.disabled = busy; }); this.modal.setAttribute('aria-busy', String(busy)); }
  setStatus(message, kind = 'error') { const status = this.modal.querySelector('#auth-status-message'); status.textContent = message; status.dataset.kind = kind; status.hidden = false; }
  clearStatus() { const status = this.modal.querySelector('#auth-status-message'); status.textContent = ''; status.hidden = true; }
  handleKeydown(event) { if (event.key === 'Escape') { event.preventDefault(); this.close(); return; } if (event.key !== 'Tab') return; const controls = [...this.modal.querySelectorAll('button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), a[href]')].filter(element => element.offsetParent !== null); if (!controls.length) return; const first = controls[0]; const last = controls[controls.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
}

export { AUTH_TEMPLATE, ROUTES };

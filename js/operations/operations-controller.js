const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const displayStatus = value => String(value || '').toLowerCase().replaceAll('_', ' ').replace(/^./, character => character.toUpperCase());
const serviceValue = value => value === 'instant' ? 'SAME_DAY' : String(value || 'EXPRESS').toUpperCase();
const paymentValue = value => String(value || '').toUpperCase() === 'COD' ? 'COD' : 'PREPAID';
const phoneValue = value => { const phone = String(value || '').replace(/[\s()-]/g, ''); return phone.startsWith('0') ? `+94${phone.slice(1)}` : phone; };

export class OperationsController {
  constructor(api) {
    this.api = api;
    this.snapshot = null;
    this.workspaceKey = null;
    this.abortController = null;
    this.data = { packages: [], requests: [], hubs: [], assignments: [] };
    this.next = { packages: null, requests: null };
    this.error = null;
    this.busy = false;
    this.pendingMutations = new Set();
  }

  permissions() { return new Set(this.snapshot?.capabilities?.permissions || []); }
  can(permission) { return this.permissions().has(permission); }

  async initializePublic() {
    try { this.data.hubs = await this.api.hubs({}, undefined); this.publish(); this.populateHubOptions(); }
    catch (error) { this.error = error; }
  }

  async sync(snapshot) {
    this.snapshot = snapshot;
    if (snapshot.status !== 'authenticated' || snapshot.capabilityStatus !== 'ready') {
      this.clearAuthenticated();
      return;
    }
    const workspace = snapshot.capabilities?.workspace;
    const nextKey = `${workspace?.type || 'NONE'}:${workspace?.organizationId || 'personal'}:${workspace?.branchId || '*'}`;
    if (nextKey !== this.workspaceKey) { this.workspaceKey = nextKey; await this.reload(); }
  }

  clearAuthenticated() {
    this.abortController?.abort();
    this.workspaceKey = null;
    this.data.packages = [];
    this.data.requests = [];
    this.data.assignments = [];
    this.next = { packages: null, requests: null };
    this.publish();
  }

  async reload() {
    this.abortController?.abort();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    this.busy = true; this.renderStatus();
    const tasks = [];
    if (this.can('package.read.own') || this.can('package.read.branch') || this.can('package.read.organization')) {
      tasks.push(this.api.packages({ limit: 50 }, signal).then(result => { this.data.packages = result.items || []; this.next.packages = result.nextCursor || null; }));
    }
    const roles = this.snapshot.capabilities?.roles || [];
    if (roles.some(role => role === 'CUSTOMER' || role === 'VIP_CUSTOMER') || this.can('package.update')) {
      tasks.push(this.api.requests({ limit: 50 }, signal).then(result => { this.data.requests = result.items || []; this.next.requests = result.nextCursor || null; }));
    }
    if (roles.includes('RIDER')) tasks.push(this.api.myAssignments(signal).then(result => { this.data.assignments = result || []; }));
    tasks.push(this.api.hubs({}, signal).then(result => { this.data.hubs = result || []; }));
    try { await Promise.all(tasks); this.error = null; }
    catch (error) { if (error?.name !== 'AbortError') this.error = error; }
    finally { if (!signal.aborted) { this.busy = false; this.publish(); this.populateHubOptions(); this.renderStatus(); } }
  }

  publish() {
    globalThis.applyBackendOperationsCompatibility?.({
      packages: this.data.packages.map(pkg => this.legacyPackage(pkg)),
      customerRequests: this.data.requests.map(request => this.legacyRequest(request)),
      hubs: this.data.hubs.map(hub => this.legacyHub(hub)),
      activities: [],
    });
    this.renderRequestHistory();
  }

  legacyPackage(pkg) {
    const active = pkg.assignments?.[0];
    return {
      id: pkg.trackingCode,
      backendId: pkg.id,
      version: pkg.version,
      recipient: pkg.recipientName,
      phone: pkg.recipientPhone || 'Protected',
      address: [pkg.destinationAddress?.line1, pkg.destinationAddress?.locality].filter(Boolean).join(', '),
      weight: Number(pkg.weightKg),
      hub: pkg.destinationHub?.district || pkg.destinationHub?.code || 'Unassigned',
      hubId: pkg.destinationHub?.id,
      payment: pkg.paymentMode,
      codVal: Number(pkg.codAmount || 0),
      fee: Number(pkg.quotedAmount),
      status: displayStatus(pkg.status),
      canonicalStatus: pkg.status,
      rider: active?.rider?.user?.profile?.displayName || 'None',
      date: String(pkg.createdAt || '').slice(0, 10),
    };
  }

  legacyRequest(request) {
    const details = request.packageDetails || {};
    return {
      id: request.requestCode,
      backendId: request.id,
      recipient: details.recipientName,
      phone: details.recipientPhone || 'Protected',
      address: [request.deliveryAddress?.line1, request.deliveryAddress?.locality].filter(Boolean).join(', '),
      weight: Number(details.weightKg),
      hub: this.hubById(details.destinationHubId)?.district || 'Destination',
      payment: details.paymentMode,
      codVal: Number(details.codAmount || 0),
      fee: Number(request.quotedAmount || 0),
      status: request.status,
      date: String(request.createdAt || '').slice(0, 10),
    };
  }

  legacyHub(hub) { return { id: hub.district || hub.code, backendId: hub.id, code: hub.code, name: hub.name, district: hub.district || hub.name, capacity: hub.capacity || 1, riders: hub.activeRiders || 0, activePkgs: hub.activePackages || 0, speed: hub.status === 'ACTIVE' ? '100%' : 'Limited' }; }
  hubById(id) { return this.data.hubs.find(hub => hub.id === id); }
  selectedHub(selectId) { const value = document.getElementById(selectId)?.value; return this.data.hubs.find(hub => hub.id === value || hub.district === value || hub.code === value); }

  populateHubOptions() {
    if (!this.data.hubs.length) return;
    const ids = ['cust-origin-hub', 'cust-hub', 'home-calc-origin', 'home-calc-dest', 'calc-origin', 'calc-dest', 'pkg-hub', 'filterHub'];
    ids.forEach((id, index) => {
      const select = document.getElementById(id); if (!select) return;
      const previous = select.value;
      const includeAll = id === 'filterHub';
      select.innerHTML = `${includeAll ? '<option value="ALL">All Hubs</option>' : ''}${this.data.hubs.map(hub => `<option value="${escapeHtml(includeAll ? (hub.district || hub.code) : hub.id)}">${escapeHtml(hub.name)}</option>`).join('')}`;
      if ([...select.options].some(option => option.value === previous)) select.value = previous;
      else if (!includeAll && index % 2 === 1 && select.options[1]) select.selectedIndex = 1;
    });
  }

  pricingPayload(prefix = 'cust') {
    const weightId = prefix === 'home' ? 'home-calc-weight' : prefix === 'portal' ? 'calc-weight' : 'cust-weight';
    const originId = prefix === 'home' ? 'home-calc-origin' : prefix === 'portal' ? 'calc-origin' : 'cust-origin-hub';
    const destinationId = prefix === 'home' ? 'home-calc-dest' : prefix === 'portal' ? 'calc-dest' : 'cust-hub';
    const speedId = prefix === 'home' ? 'home-calc-speed' : prefix === 'portal' ? 'calc-speed' : null;
    const payment = prefix === 'cust' ? paymentValue(document.getElementById('cust-payment')?.value) : 'PREPAID';
    return {
      weightKg: Number(document.getElementById(weightId)?.value || 1),
      originHubId: this.selectedHub(originId)?.id,
      destinationHubId: this.selectedHub(destinationId)?.id,
      serviceLevel: serviceValue(speedId ? document.getElementById(speedId)?.value : 'EXPRESS'),
      paymentMode: payment,
      ...(payment === 'COD' ? { codAmount: Number(document.getElementById('cust-cod-val')?.value || 0) } : {}),
    };
  }

  async calculate(prefix = 'cust') {
    const payload = this.pricingPayload(prefix);
    if (!payload.originHubId || !payload.destinationHubId) return;
    try {
      const result = await this.api.calculate(payload);
      const ids = prefix === 'home' ? ['home-calc-result-total','home-calc-base','home-calc-weight-fee','home-calc-markup'] : prefix === 'portal' ? ['calc-result-total','calc-base','calc-weight-fee','calc-markup'] : ['cust-result-price','cust-base-val','cust-weight-val'];
      const values = [`${result.currency} ${result.amount}`, `${result.currency} ${result.breakdown.baseFee}`, `${result.currency} ${result.breakdown.weightSurcharge}`, `${result.currency} ${result.breakdown.zoneSurcharge}`];
      ids.forEach((id, index) => { const element = document.getElementById(id); if (element) element.textContent = values[index]; });
    } catch (error) { this.announce(error?.message || 'Unable to calculate the delivery estimate.', 'error'); }
  }

  async submitCustomerRequest(event) {
    event?.preventDefault();
    if (this.pendingMutations.has('customer-booking')) return;
    if (this.snapshot?.status !== 'authenticated') { globalThis.openAuthPortal?.('customer'); return; }
    const pickup = document.getElementById('cust-pickup-address')?.value.trim();
    const delivery = document.getElementById('cust-address')?.value.trim();
    const payload = {
      ...this.pricingPayload('cust'),
      recipientName: document.getElementById('cust-recipient')?.value.trim(),
      recipientPhone: phoneValue(document.getElementById('cust-phone')?.value),
      pickupAddress: { type: 'PICKUP', label: 'Pickup', line1: pickup, locality: this.selectedHub('cust-origin-hub')?.district || 'Colombo', countryCode: 'LK' },
      deliveryAddress: { type: 'DELIVERY', label: 'Delivery', line1: delivery, locality: this.selectedHub('cust-hub')?.district || 'Colombo', countryCode: 'LK' },
    };
    this.pendingMutations.add('customer-booking');
    const submitButton = event?.submitter; if (submitButton) submitButton.disabled = true;
    try {
      const created = await this.api.createRequest(payload);
      await this.api.submitRequest(created.id);
      document.getElementById('customerRequestForm')?.reset();
      await this.reload();
      this.announce(`Booking ${created.requestCode} was submitted securely.`, 'success');
    } catch (error) { this.announce(`${error?.message || 'Unable to submit the booking.'}${error?.requestId ? ` Support request: ${error.requestId}` : ''}`, 'error'); }
    finally { this.pendingMutations.delete('customer-booking'); if (submitButton) submitButton.disabled = false; }
  }

  async track(code, target = 'public') {
    const normalized = String(code || document.getElementById('public-track-input')?.value || '').trim();
    if (!normalized) return;
    const ownRequest = this.data.requests.find(request => request.requestCode.toUpperCase() === normalized.toUpperCase());
    if (ownRequest) return this.renderRequestTracking(ownRequest, target);
    try { this.renderPublicTracking(await this.api.publicTracking(normalized), target); }
    catch { this.showTrackingError(target); }
  }

  async createPackage(event) {
    event?.preventDefault();
    if (this.pendingMutations.has('package-create')) return;
    const destination = this.selectedHub('pkg-hub'); const origin = this.data.hubs[0];
    if (!origin || !destination) return this.announce('Select an available delivery route.', 'error');
    const paymentMode = paymentValue(document.getElementById('pkg-payment')?.value);
    const payload = {
      recipientName: document.getElementById('pkg-recipient')?.value.trim(),
      recipientPhone: phoneValue(document.getElementById('pkg-phone')?.value),
      weightKg: Number(document.getElementById('pkg-weight')?.value || 1),
      serviceLevel: 'EXPRESS', paymentMode,
      ...(paymentMode === 'COD' ? { codAmount: Number(document.getElementById('pkg-cod-val')?.value || 0) } : {}),
      originHubId: origin.id, destinationHubId: destination.id,
      pickupAddress: { type: 'PICKUP', label: 'Origin hub counter', line1: origin.name, locality: origin.district || origin.name, countryCode: 'LK' },
      deliveryAddress: { type: 'DELIVERY', label: 'Delivery', line1: document.getElementById('pkg-address')?.value.trim(), locality: destination.district || destination.name, countryCode: 'LK' },
    };
    this.pendingMutations.add('package-create'); const submitButton = event?.submitter; if (submitButton) submitButton.disabled = true;
    try { await this.api.createPackage(payload); document.getElementById('pkgForm')?.reset(); globalThis.closeModal?.('pkgModal'); await this.reload(); this.announce('Package created securely.', 'success'); }
    catch (error) { this.announce(`${error?.message || 'Unable to create the package.'}${error?.requestId ? ` Support request: ${error.requestId}` : ''}`, 'error'); }
    finally { this.pendingMutations.delete('package-create'); if (submitButton) submitButton.disabled = false; }
  }

  renderPublicTracking(result, target = 'public') {
    const prefix = target === 'home' ? 'home' : 'public';
    const resultBox = document.getElementById(`${prefix}-track-result`); const errorBox = document.getElementById(`${prefix}-track-error`);
    if (!resultBox) return; if (errorBox) errorBox.style.display = 'none'; resultBox.style.display = 'block';
    const fieldPrefix = target === 'home' ? 'home' : 'pub';
    document.getElementById(`${fieldPrefix}-pkg-id`).textContent = result.trackingCode;
    document.getElementById(`${fieldPrefix}-pkg-dest`).textContent = result.destination?.name || 'CeylonSwift destination hub';
    document.getElementById(`${fieldPrefix}-pkg-rider`).textContent = 'Protected';
    document.getElementById(`${fieldPrefix}-pkg-status`).textContent = displayStatus(result.status);
    const timeline = document.getElementById(`${prefix}-track-timeline`);
    if (timeline) timeline.innerHTML = (result.timeline || []).map(event => `<div class="timeline-step completed"><div class="timeline-badge">✓</div><div class="timeline-content"><h5>${escapeHtml(displayStatus(event.type))} <span>${escapeHtml(new Date(event.eventAt).toLocaleString())}</span></h5><p>${escapeHtml(event.publicMessage || 'Shipment progress updated.')}</p></div></div>`).join('');
  }

  renderRequestTracking(request, target) { this.renderPublicTracking({ trackingCode: request.requestCode, status: request.status, destination: { name: 'Delivery request' }, timeline: [{ type: request.status, eventAt: request.updatedAt, publicMessage: 'Your authenticated delivery request is awaiting package conversion.' }] }, target); }
  showTrackingError(target = 'public') { const prefix = target === 'home' ? 'home' : 'public'; const result = document.getElementById(`${prefix}-track-result`); const error = document.getElementById(`${prefix}-track-error`); if (result) result.style.display = 'none'; if (error) error.style.display = 'flex'; }

  async convertRequest(id) { await this.mutate(`convert:${id}`, () => this.api.convertRequest(id)); }
  async cancelRequest(id) { await this.mutate(`cancel-request:${id}`, () => this.api.cancelRequest(id)); }
  async assignPackage(id, riderId, version, reassign = false) { await this.mutate(`${reassign ? 'reassign' : 'assign'}:${id}`, () => reassign ? this.api.reassign(id, riderId, version) : this.api.assign(id, riderId, version)); }
  async transitionPackage(id, status, version) { await this.mutate(`transition:${id}:${status}`, () => this.api.transition(id, status, version)); }
  async dispatchPackage(legacyId) {
    const pkg = this.data.packages.find(item => item.trackingCode === legacyId || item.id === legacyId);
    const rider = globalThis.getAvailableBackendRider?.();
    if (!pkg || !rider) return this.announce('No active approved rider is available.', 'error');
    try {
      let current = pkg;
      if (current.status === 'PENDING_CONFIRMATION') current = await this.api.transition(current.id, 'CONFIRMED', current.version);
      if (current.status === 'CONFIRMED') current = await this.api.transition(current.id, 'AWAITING_PICKUP', current.version);
      await this.api.assign(current.id, rider.backendRiderId, current.version);
      await this.reload(); this.announce('Rider assigned securely.', 'success');
    } catch (error) { this.announce(error?.message || 'Unable to dispatch this package.', 'error'); }
  }
  async mutate(key, operation) { if (this.pendingMutations.has(key)) return; this.pendingMutations.add(key); try { await operation(); await this.reload(); this.announce('Delivery operation completed.', 'success'); } catch (error) { this.announce(`${error?.message || 'Delivery operation failed.'}${error?.requestId ? ` Support request: ${error.requestId}` : ''}`, 'error'); } finally { this.pendingMutations.delete(key); } }

  renderRequestHistory() {
    const container = document.getElementById('customer-delivery-history'); if (!container) return;
    const packages = this.data.packages.map(pkg => `<article class="operation-history-card"><strong>${escapeHtml(pkg.trackingCode)}</strong><span>${escapeHtml(displayStatus(pkg.status))}</span><small>${escapeHtml(pkg.destinationHub?.name || 'Destination pending')}</small></article>`).join('');
    const requests = this.data.requests.map(request => `<article class="operation-history-card"><strong>${escapeHtml(request.requestCode)}</strong><span>${escapeHtml(displayStatus(request.status))}</span><small>${escapeHtml(request.currency)} ${escapeHtml(request.quotedAmount || '0.00')}</small></article>`).join('');
    container.innerHTML = packages + requests || '<p class="operation-empty">No delivery history yet.</p>';
  }

  renderStatus() { const status = document.getElementById('operations-live-status'); if (!status) return; status.textContent = this.busy ? 'Loading delivery data…' : this.error ? 'Delivery data is temporarily unavailable.' : ''; }
  announce(message, kind = 'info') { const status = document.getElementById('operations-live-status'); if (status) { status.textContent = message; status.dataset.kind = kind; } }
}

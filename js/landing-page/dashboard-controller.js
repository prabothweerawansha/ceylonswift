const auth = () => globalThis.ceylonSwiftAuth;
const value = (id) => document.getElementById(id)?.value?.trim() || '';
const status = (id, message, kind = 'info') => { const node = document.getElementById(id); if (node) { node.textContent = message; node.dataset.kind = kind; } };
const el = (name, className, content) => { const node = document.createElement(name); if (className) node.className = className; if (content !== undefined) node.textContent = content; return node; };

async function request(path, options) {
  if (!auth()?.request) throw new Error('Please log in and select an authorized workspace.');
  return auth().request(path, options);
}

async function loadMyReviews() {
  const host = document.getElementById('customer-review-list'); if (!host || auth()?.getState?.().status !== 'authenticated') return;
  try {
    const reviews = await request('/reviews/mine'); host.replaceChildren();
    if (!reviews.length) { host.append(el('p', 'operation-empty', 'You have not submitted a review yet.')); return; }
    reviews.forEach((review) => { const card = el('article', 'identity-placeholder-card'); card.append(el('span', '', `${review.rating}/5 · ${review.status}`), el('h3', '', review.title || 'Delivery review'), el('p', '', review.body)); host.append(card); });
  } catch (error) { host.replaceChildren(el('p', 'operation-empty', error.message || 'Reviews could not be loaded.')); }
}

document.getElementById('customer-review-form')?.addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; if (!form.reportValidity()) return;
  const button = form.querySelector('button[type="submit"]'); button.disabled = true; button.setAttribute('aria-busy', 'true'); status('review-submit-status', 'Submitting securely…');
  try {
    await request('/reviews', { method: 'POST', body: { packageId: value('review-package-id'), rating: Number(value('review-rating')), title: value('review-title') || undefined, body: value('review-body'), tags: [], publicConsent: document.getElementById('review-public-consent').checked } });
    form.reset(); status('review-submit-status', 'Review submitted for moderation. It is not public yet.', 'success'); await loadMyReviews();
  } catch (error) { status('review-submit-status', error.message || 'The review could not be submitted.', 'error'); }
  finally { button.disabled = false; button.setAttribute('aria-busy', 'false'); }
});

async function loadModeration() {
  const host = document.getElementById('review-moderation-list'); if (!host || auth()?.getState?.().status !== 'authenticated') return;
  try {
    const reviews = await request('/reviews/moderation'); host.replaceChildren();
    if (!reviews.length) { host.append(el('p', 'operation-empty', 'No reviews are awaiting moderation.')); return; }
    reviews.forEach((review) => {
      const card = el('article', 'identity-placeholder-card'); card.append(el('span', '', `${review.rating}/5 · ${review.status}`), el('h3', '', review.title || 'Customer review'), el('p', '', review.body), el('p', '', `Delivery ${review.package.trackingCode} · ${review.package.status}`));
      const actions = el('div', 'review-moderation-actions');
      [['APPROVED','Approve'],['REJECTED','Reject'],['HIDDEN','Hide']].forEach(([nextStatus, label]) => { const button = el('button', nextStatus === 'APPROVED' ? 'btn btn-primary' : 'btn btn-secondary', label); button.type = 'button'; button.addEventListener('click', async () => { const reason = globalThis.prompt(`Reason for ${label.toLowerCase()}:`); if (!reason?.trim()) return; button.disabled = true; try { await request(`/reviews/${review.id}/moderate`, { method: 'POST', body: { status: nextStatus, reason: reason.trim() } }); await loadModeration(); } catch (error) { globalThis.ceylonSwiftErrors?.notify(error); button.disabled = false; } }); actions.append(button); });
      card.append(actions); host.append(card);
    });
  } catch (error) { host.replaceChildren(el('p', 'operation-empty', error.message || 'The moderation queue could not be loaded.')); }
}

const defaultCards = [
  { stableKey: 'tracking-preview', type: 'TRACKING_PREVIEW', eyebrow: 'Privacy-safe preview', title: 'Live Tracking', status: 'PREVIEW', iconKey: 'route', rows: ['Submit a valid reference below', 'Sensitive details stay protected'], fallback: 'Tracking is available below.', priority: 30, visible: true },
  { stableKey: 'secure-delivery', type: 'STATIC_FEATURE', eyebrow: 'Built-in protection', title: 'Secure Delivery', iconKey: 'shield', rows: ['Verified account access', 'Privacy-aware public tracking', 'Audited operational actions'], priority: 20, visible: true },
  { stableKey: 'on-time', type: 'PERFORMANCE_METRIC', eyebrow: 'Last 90 days', title: 'On-time Performance', iconKey: 'performance', dataSource: 'ON_TIME_90_DAYS', fallback: 'New service data coming soon', priority: 10, visible: true },
];

document.getElementById('website-content-form')?.addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; if (!form.reportValidity()) return;
  const button = form.querySelector('button[type="submit"]'); button.disabled = true; button.setAttribute('aria-busy', 'true'); status('website-content-status', 'Creating draft…');
  const payload = { hero: { badge: value('content-hero-badge'), title: value('content-hero-title'), description: value('content-hero-description'), primaryCta: 'Track a Parcel', primaryAction: 'TRACK_SHIPMENT', secondaryCta: 'Join CeylonSwift for Business', secondaryAction: 'JOIN_BUSINESS', mediaAlt: 'Stylized courier route across Sri Lanka', mediaDecorative: false }, tracker: { title: value('content-tracker-title'), description: 'Enter your CeylonSwift reference code to check the latest public shipment update.' }, reviewsTitle: value('content-reviews-title'), performanceTitle: 'Service performance', cards: defaultCards, seoTitle: "CeylonSwift | Sri Lanka's Smart Delivery Service", seoDescription: 'Track approved parcels and learn about the CeylonSwift Business and Tuition Open Beta in Sri Lanka.' };
  try {
    const revision = await request('/website-content/revisions', { method: 'POST', body: { payload, changeSummary: value('content-change-summary') || undefined } });
    document.getElementById('content-workflow-id').value = revision.id; const submit = document.getElementById('content-submit-review'); submit.disabled = false; submit.dataset.revisionId = revision.id; status('website-content-status', `Draft revision ${revision.version} created. Submit it when ready.`, 'success');
  } catch (error) { status('website-content-status', error.message || 'The draft could not be created.', 'error'); }
  finally { button.disabled = false; button.setAttribute('aria-busy', 'false'); }
});

document.getElementById('content-submit-review')?.addEventListener('click', async (event) => {
  const id = event.currentTarget.dataset.revisionId || value('content-workflow-id'); if (!id) return;
  event.currentTarget.disabled = true; try { await request(`/website-content/revisions/${id}/submit`, { method: 'POST', body: {} }); status('website-content-status', 'Draft submitted for approval.', 'success'); } catch (error) { status('website-content-status', error.message || 'The draft could not be submitted.', 'error'); event.currentTarget.disabled = false; }
});

document.querySelectorAll('[data-content-action]').forEach((button) => button.addEventListener('click', async () => {
  const id = value('content-workflow-id'); if (!id) { status('website-content-status', 'Enter a revision ID first.', 'error'); return; }
  const action = button.dataset.contentAction; const reason = value('content-workflow-reason'); const localSchedule = value('content-scheduled-for');
  const body = action === 'approve' ? { reason: reason || undefined, scheduledFor: localSchedule ? new Date(`${localSchedule}:00+05:30`).toISOString() : undefined } : action === 'reject' ? { reason } : {};
  button.disabled = true; button.setAttribute('aria-busy', 'true');
  try { const result = await request(`/website-content/revisions/${id}/${action}`, { method: 'POST', body }); if (action === 'rollback') document.getElementById('content-workflow-id').value = result.id; status('website-content-status', `${action[0].toUpperCase()}${action.slice(1)} completed.`, 'success'); }
  catch (error) { status('website-content-status', error.message || `The ${action} action failed.`, 'error'); }
  finally { button.disabled = false; button.setAttribute('aria-busy', 'false'); }
}));

function fillContentDefaults() {
  const fields = { 'content-hero-badge': 'home-hero-badge', 'content-hero-title': 'home-hero-title', 'content-hero-description': 'home-hero-description', 'content-tracker-title': 'home-tracker-heading', 'content-reviews-title': 'home-reviews-title' };
  Object.entries(fields).forEach(([inputId, sourceId]) => { const input = document.getElementById(inputId); const source = document.getElementById(sourceId); if (input && source && !input.value) input.value = source.textContent.trim(); });
}

const featureCatalog = [
  ['public.track_parcel', 'Track a Parcel'],
  ['public.send_parcel', 'Send a Parcel'],
  ['public.join_business', 'Join CeylonSwift for Business'],
  ['public.rate_calculator', 'Public Rate Calculator'],
  ['public.hubs', 'Public Hubs'],
  ['public.customer_signup', 'Public Customer Signup'],
];
const featureStates = ['ENABLED', 'COMING_SOON', 'DISABLED', 'MAINTENANCE'];

async function loadFeaturePolicies() {
  const host = document.getElementById('feature-policy-list');
  if (!host || auth()?.getState?.().status !== 'authenticated') return;
  try {
    const policies = await request('/website-content/feature-policies');
    const globalPolicies = new Map(policies.filter((policy) => policy.scopeType === 'GLOBAL' && policy.scopeId === 'GLOBAL').map((policy) => [policy.featureKey, policy]));
    host.replaceChildren();
    featureCatalog.forEach(([featureKey, label]) => {
      const policy = globalPolicies.get(featureKey);
      const fallback = globalThis.CEYLONSWIFT_SAFE_FEATURE_DEFAULTS?.[featureKey] ?? { state: 'DISABLED', version: 0 };
      const row = el('div', 'feature-policy-row');
      row.dataset.featureKey = featureKey;
      row.dataset.version = String(policy?.version ?? 0);
      const copy = el('div', 'feature-policy-copy');
      copy.append(el('strong', '', label), el('small', '', featureKey));
      const select = el('select', 'select-style');
      select.setAttribute('aria-label', `${label} state`);
      featureStates.forEach((stateName) => {
        const option = document.createElement('option');
        option.value = stateName;
        option.textContent = stateName.replaceAll('_', ' ');
        option.selected = stateName === (policy?.state ?? fallback.state);
        select.append(option);
      });
      const reason = document.createElement('input');
      reason.placeholder = 'Reason for this change';
      reason.maxLength = 500;
      reason.setAttribute('aria-label', `${label} change reason`);
      const save = el('button', 'btn btn-secondary', 'Save');
      save.type = 'button';
      save.addEventListener('click', async () => {
        const explanation = reason.value.trim();
        if (explanation.length < 5) {
          status('feature-policy-status', 'Enter a clear reason of at least five characters.', 'error');
          reason.focus();
          return;
        }
        save.disabled = true;
        try {
          const updated = await request(`/website-content/feature-policies/${featureKey}`, {
            method: 'PUT',
            body: {
              scopeType: 'GLOBAL',
              scopeId: 'GLOBAL',
              state: select.value,
              effectiveFrom: new Date().toISOString(),
              expectedVersion: Number(row.dataset.version),
              reason: explanation,
            },
          });
          row.dataset.version = String(updated.version);
          reason.value = '';
          status('feature-policy-status', `${label} is now ${updated.state.replaceAll('_', ' ').toLowerCase()}.`, 'success');
        } catch (error) {
          status('feature-policy-status', error.message || 'The feature policy could not be saved.', 'error');
          if (error.code === 'FEATURE_POLICY_VERSION_CONFLICT') await loadFeaturePolicies();
        } finally {
          save.disabled = false;
        }
      });
      row.append(copy, select, reason, save);
      host.append(row);
    });
  } catch (error) {
    host.replaceChildren(el('p', 'operation-empty', error.message || 'Feature policies could not be loaded.'));
  }
}

const observer = new MutationObserver(() => {
  if (document.getElementById('customer-reviews')?.classList.contains('active')) void loadMyReviews();
  if (document.getElementById('review-moderation')?.classList.contains('active')) void loadModeration();
  if (document.getElementById('website-content')?.classList.contains('active')) {
    fillContentDefaults();
    void loadFeaturePolicies();
  }
});
document.querySelectorAll('.tab-section').forEach((section) => observer.observe(section, { attributes: true, attributeFilter: ['class'] }));

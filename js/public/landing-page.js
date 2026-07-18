import { ApiClient } from '../api/api-client.js';
import { loadRuntimeConfig } from '../config/runtime-config.js';

const ALLOWED_FEATURE_STATES = new Set(['ENABLED', 'COMING_SOON', 'DISABLED', 'MAINTENANCE']);
const safeFeatureDefaults = globalThis.CEYLONSWIFT_SAFE_FEATURE_DEFAULTS ?? Object.freeze({
  'public.track_parcel': Object.freeze({ state: 'ENABLED', version: 0 }),
  'public.send_parcel': Object.freeze({ state: 'COMING_SOON', version: 0 }),
  'public.join_business': Object.freeze({ state: 'ENABLED', version: 0 }),
  'public.rate_calculator': Object.freeze({ state: 'COMING_SOON', version: 0 }),
  'public.hubs': Object.freeze({ state: 'COMING_SOON', version: 0 }),
  'public.customer_signup': Object.freeze({ state: 'DISABLED', version: 0 }),
});

const fallbackHeroCards = [
  {
    key: 'tracking-preview',
    slot: 'tracking',
    eyebrow: 'Tracking',
    title: 'Tracking Preview',
    badge: 'Preview',
    iconKey: 'route',
    rows: ['Enter a valid reference below', 'Sensitive details stay protected'],
    state: 'preview',
  },
  {
    key: 'shipment-journey',
    slot: 'journey',
    eyebrow: 'Package status',
    title: 'Shipment Journey',
    iconKey: 'journey',
    rows: ['Booked', 'In transit', 'Delivered'],
    state: 'process-preview',
  },
  {
    key: 'performance-insights',
    slot: 'performance',
    eyebrow: 'Service data',
    title: 'Performance Insights',
    iconKey: 'performance',
    rows: ['Verified metrics coming soon', 'No fabricated statistics'],
    state: 'unavailable',
  },
  {
    key: 'secure-delivery',
    slot: 'security',
    eyebrow: 'Built-in protection',
    title: 'Secure Delivery',
    iconKey: 'shield',
    rows: ['Verified account access', 'Privacy-aware public tracking', 'Audited operational actions'],
    state: 'static',
  },
];

const heroSummarySources = {
  VERIFIED_REVIEW_SUMMARY: {
    iconKey: 'review',
    label: 'Verified customer reviews',
    supportingState: 'Reviews will appear after verification',
  },
  DELIVERY_PERFORMANCE_SUMMARY: {
    iconKey: 'performance',
    label: 'Delivery performance',
    supportingState: 'Verified service data coming soon',
  },
};

const heroCardI18n = Object.freeze({
  'tracking-preview': Object.freeze({
    eyebrow: 'heroCardTrackingEyebrow', title: 'heroCardTrackingTitle', badge: 'heroCardPreview',
    rows: ['heroCardTrackingRow1', 'heroCardTrackingRow2'],
  }),
  'shipment-journey': Object.freeze({
    eyebrow: 'heroCardJourneyEyebrow', title: 'heroCardJourneyTitle',
    rows: ['heroCardJourneyRow1', 'heroCardJourneyRow2', 'heroCardJourneyRow3'],
  }),
  'performance-insights': Object.freeze({
    eyebrow: 'heroCardPerformanceEyebrow', title: 'heroCardPerformanceTitle',
    rows: ['heroCardPerformanceRow1', 'heroCardPerformanceRow2'],
  }),
  'secure-delivery': Object.freeze({
    eyebrow: 'heroCardSecurityEyebrow', title: 'heroCardSecurityTitle',
    rows: ['heroCardSecurityRow1', 'heroCardSecurityRow2', 'heroCardSecurityRow3'],
  }),
});

const safeIconKey = (key) => (
  new Set(['route', 'journey', 'performance', 'shield', 'review']).has(key) ? key : 'shield'
);
const featureLabel = (state) => ({
  ENABLED: 'Available',
  COMING_SOON: 'Coming Soon',
  DISABLED: 'Unavailable',
  MAINTENANCE: 'Temporarily Unavailable',
})[state] ?? 'Unavailable';

export function normalizePublicFeatures(features = {}) {
  const normalized = Object.fromEntries(
    Object.entries(safeFeatureDefaults).map(([key, value]) => [key, { state: value.state, version: 0 }]),
  );
  for (const key of Object.keys(normalized)) {
    const candidate = features?.[key];
    if (!candidate || !ALLOWED_FEATURE_STATES.has(candidate.state)) continue;
    normalized[key] = {
      state: candidate.state,
      version: Number.isInteger(candidate.version) && candidate.version >= 0 ? candidate.version : 0,
    };
  }
  return normalized;
}

function featureEnabled(key) {
  return globalThis.CEYLONSWIFT_FEATURE_STATE?.[key]?.state === 'ENABLED';
}

function installFeatureBoundary() {
  document.addEventListener('click', (event) => {
    const target = event.target.closest?.('[data-feature-key]');
    if (!target || featureEnabled(target.dataset.featureKey)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  document.querySelectorAll('[data-feature-action="send-parcel"]').forEach((button) => {
    button.addEventListener('click', () => {
      if (featureEnabled('public.send_parcel')) globalThis.startSendParcel?.();
    });
  });
}

export function applyPublicFeatures(features) {
  const normalized = normalizePublicFeatures(features);
  globalThis.CEYLONSWIFT_FEATURE_STATE = normalized;

  document.querySelectorAll('[data-feature-key]').forEach((element) => {
    const feature = normalized[element.dataset.featureKey];
    if (!feature) return;
    const enabled = feature.state === 'ENABLED';
    element.dataset.featureState = feature.state;
    element.classList.toggle('feature-is-unavailable', !enabled);
    if (element instanceof HTMLButtonElement) {
      element.disabled = !enabled;
      element.setAttribute('aria-disabled', String(!enabled));
    } else if (element instanceof HTMLAnchorElement) {
      if (enabled) {
        element.removeAttribute('aria-disabled');
        element.removeAttribute('tabindex');
      } else {
        element.setAttribute('aria-disabled', 'true');
        element.setAttribute('tabindex', '-1');
      }
    }
    element.querySelectorAll?.('.feature-action-label').forEach((label) => {
      label.textContent = enabled ? '' : featureLabel(feature.state);
      label.hidden = enabled;
    });
  });

  document.querySelectorAll('[data-feature-gate]').forEach((gate) => {
    const feature = normalized[gate.dataset.featureGate];
    if (!feature) return;
    const enabled = feature.state === 'ENABLED';
    gate.dataset.featureState = feature.state;
    const content = gate.querySelector('.feature-gated-content');
    const banner = gate.querySelector('.feature-state-banner');
    if (content) {
      content.toggleAttribute('inert', !enabled);
      content.setAttribute('aria-hidden', String(!enabled));
    }
    if (banner) {
      banner.hidden = enabled;
      const state = banner.querySelector('strong');
      if (state) state.textContent = featureLabel(feature.state);
    }
  });

  if (featureEnabled('public.rate_calculator')) globalThis.calculateHomeRate?.();
  if (featureEnabled('public.hubs')) globalThis.renderHomeHubs?.();
  return normalized;
}

function normalizeCards(cards) {
  if (!Array.isArray(cards) || !cards.length) return fallbackHeroCards;
  const slots = ['tracking', 'security', 'performance', 'journey'];
  return cards.filter((card) => card?.visible !== false).slice(0, 4).map((card, index) => ({
    key: String(card.stableKey || `card-${index}`),
    slot: slots[index] ?? 'security',
    eyebrow: String(card.eyebrow || ''),
    title: String(card.title || ''),
    badge: String(card.status || ''),
    iconKey: String(card.iconKey || 'shield'),
    rows: Array.isArray(card.rows) ? card.rows.slice(0, 4).map(String) : [String(card.fallback || '')],
    state: card.type === 'PERFORMANCE_METRIC' ? 'unavailable' : card.type === 'TRACKING_PREVIEW' ? 'preview' : 'static',
  }));
}

function renderHeroCards(cards = fallbackHeroCards) {
  const host = document.getElementById('hero-floating-cards');
  const template = document.getElementById('hero-card-template');
  if (!host || !(template instanceof HTMLTemplateElement)) return;

  host.replaceChildren();
  for (const card of cards) {
    const node = template.content.firstElementChild.cloneNode(true);
    const i18n = heroCardI18n[card.key];
    node.dataset.cardKey = card.key;
    node.dataset.cardState = card.state;
    node.classList.add(`hero-card--${card.slot}`);
    node.querySelector('.hero-card-icon').classList.add(`hero-card-icon--${safeIconKey(card.iconKey)}`);
    const eyebrow = node.querySelector('.hero-card-eyebrow');
    const title = node.querySelector('.hero-card-title');
    eyebrow.textContent = card.eyebrow;
    title.textContent = card.title;
    if (i18n?.eyebrow) eyebrow.dataset.i18n = i18n.eyebrow;
    if (i18n?.title) title.dataset.i18n = i18n.title;
    const status = node.querySelector('.hero-card-status');
    status.textContent = card.badge || '';
    if (i18n?.badge) status.dataset.i18n = i18n.badge;
    if (card.badge) status.classList.add(`hero-card-status--${card.state}`);
    const rows = node.querySelector('.hero-card-rows');
    card.rows.filter(Boolean).forEach((value, index) => {
      const row = document.createElement('span');
      row.textContent = value;
      if (i18n?.rows?.[index]) row.dataset.i18n = i18n.rows[index];
      rows.append(row);
    });
    host.append(node);
  }
  host.setAttribute('aria-busy', 'false');
  globalThis.refreshCeylonSwiftLanguage?.();
}

function renderHeroTrustSummaries() {
  const host = document.getElementById('hero-trust-strip');
  if (!host) return;
  host.replaceChildren();
  Object.entries(heroSummarySources).forEach(([sourceKey, summary]) => {
    const item = document.createElement('div');
    item.className = 'hero-trust-summary';
    item.dataset.sourceKey = sourceKey;
    const icon = document.createElement('span');
    icon.className = `hero-trust-icon hero-trust-icon--${safeIconKey(summary.iconKey)}`;
    icon.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('span');
    const label = document.createElement('strong');
    label.textContent = summary.label;
    const supportingState = document.createElement('small');
    supportingState.textContent = summary.supportingState;
    copy.append(label, supportingState);
    item.append(icon, copy);
    host.append(item);
  });
}

function applySafeContent(page) {
  const content = page?.content;
  if (!content) return;
  const text = (id, value) => {
    const element = document.getElementById(id);
    if (element && typeof value === 'string') element.textContent = value;
  };
  const heroBadge = typeof content.hero?.badge === 'string' && !/mark\s*0\.2|open beta/i.test(content.hero.badge)
    ? content.hero.badge
    : "SRI LANKA'S PREMIUM SPEED COURIER";
  text('home-hero-badge', heroBadge);
  text('home-hero-description', content.hero?.description);
  text('home-tracker-heading', content.tracker?.title);
  text('home-tracker-description', content.tracker?.description);
  text('home-reviews-title', content.reviewsTitle);
  renderHeroCards(normalizeCards(content.cards));
}

function renderReviews(reviews) {
  const panel = document.getElementById('home-reviews');
  const stage = document.getElementById('home-review-stage');
  if (!panel || !stage || !Array.isArray(reviews) || !reviews.length) return;
  const review = reviews[0];
  stage.replaceChildren();
  const quote = document.createElement('p');
  quote.className = 'review-quote';
  quote.textContent = String(review.body || '');
  const meta = document.createElement('div');
  meta.className = 'review-meta';
  const rating = document.createElement('span');
  rating.className = 'review-stars';
  rating.textContent = '★'.repeat(Math.max(1, Math.min(5, Number(review.rating) || 0)));
  const author = document.createElement('span');
  author.textContent = String(review.customerName || 'Verified customer');
  meta.append(rating, author);
  stage.append(quote, meta);
  panel.hidden = false;
}

function enableHeroMotion() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('home-motion-ready');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('#home-hero [data-reveal], #home-hero .hero-float-card')
      .forEach((node) => node.classList.add('is-revealed'));
  }));
}

async function loadPublicLandingPage() {
  try {
    const config = loadRuntimeConfig();
    const client = new ApiClient({ baseUrl: config.apiBaseUrl, timeoutMs: config.requestTimeoutMs });
    return (await client.request('/public/landing-page')).data;
  } catch {
    return null;
  }
}

installFeatureBoundary();
applyPublicFeatures(safeFeatureDefaults);
renderHeroCards();
renderHeroTrustSummaries();
enableHeroMotion();

const page = await loadPublicLandingPage();
if (page) {
  applyPublicFeatures(page.features);
  applySafeContent(page);
  renderReviews(page.reviews);
}

if (document.documentElement.lang !== 'en') {
  globalThis.refreshCeylonSwiftLanguage?.();
}

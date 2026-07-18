import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('public header stays focused and leaves parcel sending in the landing hero', async () => {
  const html = await read('index.html');
  const header = html.match(/<nav class="public-navbar">[\s\S]*?<\/nav>/)?.[0] || '';
  assert.match(header, />Log In</);
  assert.doesNotMatch(header, />Send a Parcel</);
  assert.doesNotMatch(header, /Get Started|Sign Up/);
  assert.doesNotMatch(header, /onclick="startSendParcel\(\)"/);
});

test('tracking and Business entry remain active while Send a Parcel uses the controlled action', async () => {
  const html = await read('index.html');
  assert.equal((html.match(/data-feature-action="send-parcel"/g) || []).length, 1);
  assert.ok((html.match(/href="#home-tracking"/g) || []).length >= 2);
  assert.ok((html.match(/href="#home-business"/g) || []).length >= 2);
  assert.match(html, /Connected Business/);
  assert.match(html, /Business Lite/);
  assert.match(html, /id="home-tracker-heading" tabindex="-1"/);
});

test('Business follows Services in the public reading order', async () => {
  const html = await read('index.html');
  assert.ok(html.indexOf('id="home-services"') < html.indexOf('id="home-business"'));
  assert.ok(html.indexOf('id="home-business"') < html.indexOf('id="home-hubs"'));
});

test('landing content uses the safe public API, safe text nodes, and restrictive fallbacks', async () => {
  const source = await read('js/public/landing-page.js');
  assert.match(source, /const fallbackHeroCards = \[/);
  assert.match(source, /textContent/);
  assert.doesNotMatch(source, /innerHTML/);
  assert.match(source, /\/public\/landing-page/);
  assert.match(source, /normalizePublicFeatures/);
  assert.match(source, /CEYLONSWIFT_SAFE_FEATURE_DEFAULTS/);
  assert.match(source, /Verified metrics coming soon/);
  assert.match(source, /No fabricated statistics/);
});

test('calculator and hubs are inaccessible coming-soon gates without public demo data', async () => {
  const [html, source] = await Promise.all([read('index.html'), read('app.js')]);
  assert.match(html, /data-feature-gate="public\.rate_calculator" data-feature-state="COMING_SOON"/);
  assert.match(html, /data-feature-gate="public\.hubs" data-feature-state="COMING_SOON"/);
  assert.ok((html.match(/class="feature-gated-content" inert aria-hidden="true"/g) || []).length >= 2);
  assert.doesNotMatch(html, /id="home-calc-result-total">LKR/);
  assert.match(source, /publicFeatureEnabled\('public\.rate_calculator'\)/);
  assert.match(source, /publicFeatureEnabled\('public\.hubs'\)/);
});

test('release metadata distinguishes the four-part product version from package SemVer', async () => {
  const [release, rootPackage, backendPackage] = await Promise.all([
    read('js/config/release-config.js'),
    read('package.json').then(JSON.parse),
    read('backend/package.json').then(JSON.parse),
  ]);
  assert.match(release, /productVersion: '0\.2\.0\.1'/);
  assert.match(release, /channel: 'OPEN_BETA'/);
  assert.equal(rootPackage.version, '0.2.0-beta.1');
  assert.equal(backendPackage.version, '0.2.0-beta.1');
});

test('hero motion is fail-visible and respects reduced motion', async () => {
  const [html, css] = await Promise.all([read('index.html'), read('css/pages/home.css')]);
  assert.match(html, /class="hero-orbits" aria-hidden="true"/);
  assert.match(css, /#public-home \[data-reveal\] \{ opacity: 1; transform: none; \}/);
  assert.match(css, /\.home-motion-ready #public-home \[data-reveal\]/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('Preview badge uses the scoped accessible status variant', async () => {
  const [source, css] = await Promise.all([read('js/public/landing-page.js'), read('css/pages/home.css')]);
  assert.match(source, /hero-card-status--\$\{card\.state\}/);
  assert.match(css, /#public-home \.hero-card-status--preview/);
  assert.match(css, /body\.light-theme #public-home \.hero-card-status--preview/);
});

test('trust strip uses truthful review and delivery performance summary shells', async () => {
  const [html, source] = await Promise.all([read('index.html'), read('js/public/landing-page.js')]);
  const strip = html.match(/<div class="hero-trust-strip"[\s\S]*?<\/div>/)?.[0] || '';
  assert.doesNotMatch(strip, /Secure account access|Privacy-aware tracking/);
  assert.match(source, /VERIFIED_REVIEW_SUMMARY/);
  assert.match(source, /Verified customer reviews/);
  assert.match(source, /Reviews will appear after verification/);
  assert.match(source, /DELIVERY_PERFORMANCE_SUMMARY/);
  assert.match(source, /Verified service data coming soon/);
});

test('hero liquid-glass and card position rules stay inside public home', async () => {
  const css = await read('css/pages/home.css');
  assert.match(css, /#public-home \.hero-float-card/);
  assert.match(css, /#public-home \.hero-card--tracking/);
  assert.match(css, /#public-home \.liquid-glass-card/);
  assert.doesNotMatch(css, /\n\.liquid-glass-card\s*\{/);
});

test('landing uses one continuous canvas and centered professional hero icon treatments', async () => {
  const [html, css, source] = await Promise.all([
    read('index.html'),
    read('css/pages/home.css'),
    read('js/public/landing-page.js'),
  ]);
  assert.match(css, /#public-home \{[\s\S]*?radial-gradient[\s\S]*?var\(--home-canvas\)/);
  assert.match(css, /#public-home \.hero-section \{[^}]*background: transparent/);
  assert.match(css, /#public-home \.hero-float-card,[\s\S]*?text-align: center/);
  assert.match(css, /#public-home \.hero-card-heading[^{}]*\{[^}]*justify-content: center/);
  assert.match(html, /cs-icon--search/);
  assert.match(html, /cs-icon--briefcase/);
  assert.doesNotMatch(html, /[⌕ϟ▣]/);
  assert.match(source, /hero-card-icon--\$\{safeIconKey\(card\.iconKey\)\}/);
  assert.doesNotMatch(source, /const iconFor/);
});

test('landing translations cover every declared public text key in all supported languages', async () => {
  const [html, source] = await Promise.all([read('index.html'), read('app.js')]);
  const literal = source.match(/const TRANSLATIONS = (\{[\s\S]*?\n\});/)?.[1];
  assert.ok(literal, 'translation table should remain statically inspectable');
  const translations = Function(`"use strict"; return (${literal});`)();
  const keys = new Set([
    ...[...html.matchAll(/data-i18n="([^"]+)"/g)].map(match => match[1]),
    ...[...html.matchAll(/data-i18n-placeholder="([^"]+)"/g)].map(match => match[1]),
  ]);
  for (const language of ['en', 'si', 'ta']) {
    for (const key of keys) assert.ok(translations[language]?.[key], `${language} is missing ${key}`);
  }
});

test('hero composition removes the rasterized image glow seam and centers desktop copy', async () => {
  const css = await read('css/pages/home.css');
  assert.match(css, /#public-home \.hero-map-frame::before \{ content: none; \}/);
  assert.match(css, /#public-home \.hero-map-frame picture\s*\{[^}]*position: absolute;[^}]*inset: 0;/s);
  assert.match(css, /#public-home \.hero-map-frame img[^{}]*\{[^}]*background: transparent/);
  assert.match(css, /#public-home \.hero-map-frame img\s*\{[^}]*max-height: 100%;[^}]*drop-shadow\(0 12px 20px/s);
  assert.match(css, /#public-home \.hero-copy[^{}]*\{[^}]*text-align: center/);
  assert.match(css, /#public-home \.hero-buttons[^{}]*\{[^}]*justify-content: center/);
  assert.match(css, /#public-home \.hero-buttons[^{}]*\{[^}]*flex-wrap: wrap/);
  assert.match(css, /html\[lang="ta"\] body\.public-view \.public-navbar \.nav-links a/);
});

test('light and dark theme reveals both originate from the selected theme control', async () => {
  const source = await read('app.js');
  const toggle = source.match(/function toggleTheme\(event\) \{[\s\S]*?\n\}/)?.[0] || '';
  assert.match(toggle, /event\?\.currentTarget/);
  assert.match(toggle, /circle\(0px at \$\{originX\}px \$\{originY\}px\)/);
  assert.match(toggle, /pseudoElement: '::view-transition-new\(root\)'/);
  assert.doesNotMatch(toggle, /::view-transition-old\(root\)/);
});

test('hero image uses an open cinematic composition and balanced desktop card positions', async () => {
  const css = await read('css/pages/home.css');
  assert.match(css, /#public-home \.hero-map-frame[\s\S]*?overflow: visible/);
  assert.match(css, /#public-home \.hero-map-frame[\s\S]*?background: transparent/);
  assert.match(css, /#public-home \.hero-map-frame img[^{}]*\{[^}]*transform: none/);
  assert.match(css, /hero-card--tracking[^{}]*\{[^}]*top: 28px; left: 12px/);
  assert.match(css, /hero-card--security[^{}]*\{[^}]*left: 42px; bottom: 30px/);
  assert.match(css, /var\(--home-card-surface\)/);
});

test('mobile hero cards leave desktop absolute positioning', async () => {
  const css = await read('css/pages/home.css');
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?#public-home \.hero-float-card[^{}]*\{[^}]*position: static/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test('dashboard repairs provide theme-aware wordmark and available navigation contrast', async () => {
  const css = await read('css/pages/dashboard.css');
  assert.match(css, /body\.light-theme:not\(\.public-view\) aside\.sidebar \.brand-text h1/);
  assert.match(css, /body:not\(\.public-view\) aside\.sidebar \.nav-item:not\(\.active\)[^{]*\{[^}]*opacity: 1/);
  assert.match(css, /nav-item\[aria-disabled="true"\][^{]*\{[^}]*opacity: \.68/);
});

test('dashboard trends remain neutral when comparison data is unavailable', async () => {
  const html = await read('index.html');
  assert.equal((html.match(/No comparison data yet/g) || []).length, 4);
  assert.doesNotMatch(html, /\+12\.4% this week|94% utilization|Fastest payout|Top-tier speed/);
});

test('regional chart has theme-aware surfaces and an honest empty state', async () => {
  const source = await read('app.js');
  assert.match(source, /No regional transit data yet/);
  assert.match(source, /document\.body\.classList\.contains\('light-theme'\)/);
  assert.doesNotMatch(source, /ctx\.fillStyle = '#060913'/);
});

test('Open Beta hero makes no unsupported operational claims', async () => {
  const [html, source] = await Promise.all([read('index.html'), read('js/public/landing-page.js')]);
  const hero = html.match(/<div class="hero-section"[\s\S]*?<template id="hero-card-template">/)?.[0] || '';
  assert.doesNotMatch(hero + source, /98\.7%|20,000\+|2\.4 km|18 min|Live GPS|Real-time tracking|smarter routing/i);
  assert.match(hero, /businesses and tuition classes across Sri Lanka/);
});

test('the visible Mark 0.2 Open Beta label appears only in About', async () => {
  const html = await read('index.html');
  assert.equal((html.match(/Mark 0\.2 · Open Beta/g) || []).length, 1);
  assert.match(html, /id="home-about"[\s\S]*?Mark 0\.2 · Open Beta/);
});

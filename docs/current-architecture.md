# CeylonSwift prototype baseline

## Phase 0 snapshot

This document records the prototype before the full-stack migration begins. It is descriptive only; Phase 0 does not replace any runtime behavior.

Repository state captured before Phase 0 changes:

- Branch: `main`
- Upstream: `origin/main`
- Branch position: 1 commit ahead, 0 behind
- Baseline commit: `ee695b6db2cb9ff21163bd32c71dc4f271f1ff40`
- Untracked files: none
- Modified files already present before Phase 0:
  - `app.js` — 69 insertions, 37 deletions
  - `build-css.js` — 8 insertions, 30 deletions
  - `css/base/variables.css` — 0 insertions, 3 deletions
  - `css/bundle.css` — 1390 insertions, 1281 deletions
  - `css/bundle.min.css` — 1 insertion, 1 deletion
  - `css/utilities/themes.css` — 17 insertions, 22 deletions
  - `css/utilities/utilities.css` — 117 insertions
  - `index.html` — 7 insertions, 3 deletions
- Total pre-Phase-0 diff: 1609 insertions and 1377 deletions across 8 files.
- Git reports LF-to-CRLF conversion warnings for several working-copy files. Phase 0 does not normalize line endings.

## Current runtime architecture

CeylonSwift is a static single-page prototype:

- `index.html` contains public pages, operational portals, forms, dialogs, and authentication markup.
- `app.js` contains application state, rendering, authentication simulation, role routing, pricing, package operations, approvals, tracking, and browser persistence.
- `localStorage` is the only persistent data store.
- There is no backend, database, API client, server-side authentication, or server-side authorization.
- Authentication state is held in memory and is not a secure persistent session.
- Google authentication, OTP delivery, and the phone inbox are simulations.

## Current data ownership

The global `state` object owns packages, employees, hubs, activities, customer requests, active role, current user, pending registrations, temporary OTP state, and simulator state.

Persisted prototype keys are intentionally preserved during the incremental migration:

- `ceylonswift_packages`
- `ceylonswift_employees`
- `ceylonswift_hubs`
- `ceylonswift_activities`
- `ceylonswift_custrequests`
- `ceylonswift_pending_signups`
- `ceylonswift_theme`
- `ceylonswift_language`
- `ceylonswift_performance`

These records are untrusted demo data and must never be imported automatically into production.

## Current role behavior

- Guest: public home, tracking, services, hubs, support, and account entry.
- Owner: dashboard, packages, hubs, employees, approvals, simulator, direct hiring, and reset controls.
- Office: dashboard, packages, hubs, rider verification, and simulator.
- Rider: assigned-delivery-oriented package view and simulator.
- Customer: tracking, booking, and hubs/rates.

Role checks are client-side and are not security boundaries.

## CSS sources and generated artifacts

Source files:

- `css/main.css` — ordered import manifest and source of truth for bundle order.
- `css/base/*.css`
- `css/layout/*.css`
- `css/components/*.css`
- `css/pages/*.css`
- `css/utilities/*.css`

Build tooling:

- `build-css.js` reads the imports from `css/main.css` and writes `css/bundle.css`.
- `postcss.config.js` configures cssnano.
- `npm run build:css` produces the minified bundle.

Generated, currently tracked files:

- `css/bundle.css`
- `css/bundle.min.css`

These generated files will remain present and tracked until deployment behavior is approved. Phase 0 only repairs their ignore rules; it does not delete or untrack them.

## Known baseline risks

- Owner credentials are embedded in frontend source.
- OTPs are generated with `Math.random()` and exposed in the simulated device UI.
- Simulated Google login trusts frontend input.
- Browser data and roles can be modified through developer tools.
- UI visibility is used as authorization in several workflows.
- Identifier generation can collide.
- User role, employee type, job title, and rider vehicle are not consistently separated.
- No validation boundary, audit integrity, rate limiting, session revocation, or automated test suite exists.

# CeylonSwift Mark 0.2 Phase 0 Reconciliation

Date: 2026-07-17  
Target public release: `0.2.0.0` Open Beta  
Repository branch reviewed: `main`  
Reviewed HEAD: `482ee4a`

## 1. Phase 0 Outcome

The repository is healthy enough to begin the Mark 0.2 implementation. The
existing frontend and backend foundations should be preserved. The first code
change must reconcile the current Phase 9A landing-page work with the approved
Business/Tuition Open Beta state; it must not rebuild the application or replace
the existing routing, authentication, authorization, operations, or design
foundations.

No project source code was intentionally changed during this reconciliation.
The generated CSS build timestamp produced by baseline verification was restored
to its pre-check value.

## 2. Verified Baseline

| Check | Result |
| --- | --- |
| Frontend tests | 79 passed, 0 failed |
| Frontend build | Passed |
| Backend tests | 75 passed, 0 failed |
| Backend build | Passed |
| Working-tree whitespace checks | Passed; existing LF/CRLF warnings remain |

Passing tests prove the current implementation is internally consistent. They
do not prove that every current public action matches the newly approved Open
Beta product state. Several tests currently enforce the older active
`Send a Parcel` behavior and must be deliberately updated with the product.

## 3. Existing Work That Must Be Preserved

### Public frontend

- Responsive public landing page and established visual system.
- English, Sinhala, and Tamil language controls.
- Light/dark themes and performance modes.
- Public parcel tracking entry.
- Existing account/login routing.
- Phase 9A hero, truthful metrics/reviews, accessibility, responsive behavior,
  and centralized toast/error presentation.
- Website-content and review-moderation dashboard foundations.

### Backend

- NestJS modular API under `/api/v1`.
- Prisma/PostgreSQL data model.
- Backend-authoritative authentication, sessions, workspace selection,
  capabilities, and branch/organization scoping.
- Customer requests, packages, pricing, assignment, tracking, audit,
  approvals, idempotency, jobs, and operational-resilience foundations.
- Current Phase 9A landing content, campaign, media, review, moderation, and
  public-metric implementation.
- Additive Phase 9A database migration.

## 4. Current Dirty Change-Set Boundary

The Phase 9A work is not one clean committed unit:

- Public frontend, styles, assets, tests, and Phase 9A documentation are staged.
- Prisma schema, seed changes, and `AppModule` wiring are unstaged.
- The Phase 9A migration and landing-page backend module are untracked.
- Phase 9A screenshots and the Mark 0.2 planning documents are untracked.

This work must be treated as one pre-existing feature set. Do not reset, stash,
discard, or partially overwrite it. Before any future commit, the owner must
review the complete combined staged, unstaged, and untracked diff.

## 5. Confirmed Open Beta Mismatches

### 5.1 `Send a Parcel` is currently active

The public header and hero both call `startSendParcel()`. The tests explicitly
require two active calls. For `0.2.0.0`, the action must remain visible but be
non-operational and clearly marked `Coming Soon`. It must not open customer
booking or account creation.

### 5.2 Business entry is missing from the public path

`Join CeylonSwift for Business` must be an active secondary entry. It will lead
to the Business/Tuition onboarding flow, not convert an existing normal
customer account into a Business account.

### 5.3 Public calculator presents live-looking prices

The homepage currently exposes editable origin, destination, weight, speed, and
calculated LKR values. During the first Open Beta this section must remain
future-visible but disabled/blurred with `Coming Soon`. Static values must not
look like an available public quote.

### 5.4 Public hubs present live-looking operations

The homepage currently says `Our Active Sorting Hubs Network` and describes
current availability and operational load. The initial Open Beta must not expose
fake or internal load data. The public hub section must be disabled/blurred with
`Coming Soon`.

### 5.5 Version identity is inconsistent

- Root package: `1.0.0`
- Backend package/default service version: `0.1.0`
- Public loading copy: `CeylonSwift Premium v1.0`
- README: `Mark I` and “first stable version”

The approved public identity is `0.2.0.0 Open Beta`. Because npm package
versions use SemVer, package metadata should use `0.2.0-beta.0`, while a
canonical application release object should expose the exact product label
`0.2.0.0`, channel `OPEN_BETA`, and mark `MARK_0_2`.

### 5.6 Public landing backend is not yet the public UI authority

The backend exposes `GET /api/v1/public/landing-page`, but the public frontend
still renders hard-coded Phase 9A cards/content. The first diff must connect the
public renderer to the approved backend payload with a safe built-in fallback.
Executable HTML or arbitrary scripts must never come from stored content.

### 5.7 Feature state is not yet a business control

There are environment switches and ordinary disabled controls, but no generic,
audited, scoped feature-state foundation that lets authorized administrators
set a feature to enabled, coming soon, disabled, or maintenance. Open Beta
availability must not depend only on hard-coded markup.

## 6. Approved First Implementation Diff

The first implementation diff should be one bounded **Open Beta Public-State
Foundation**. It should not implement parcel sending, payments, route
optimization, rider GPS, offline sync, or the full Business portal.

### A. Canonical release metadata

1. Add one frontend-safe release configuration containing:
   - product version: `0.2.0.0`
   - package SemVer: `0.2.0-beta.0`
   - channel: `OPEN_BETA`
   - launch audience: `BUSINESS_TUITION`
2. Align root/backend package versions, backend default service version,
   loading/public labels, and README wording.
3. Do not label this release Mark I or stable.

### B. Backend-authoritative feature-state foundation

Add a controlled feature catalog in code and an additive `FeaturePolicy`
override model in Prisma.

Required states:

- `ENABLED`
- `COMING_SOON`
- `DISABLED`
- `MAINTENANCE`

Required scope types:

- `GLOBAL`
- `ORGANIZATION`
- `BRANCH`
- `USER`

Minimum stored fields:

- feature key
- scope type and stable scope identifier
- state
- safe JSON configuration
- effective start/end
- optimistic version
- reason
- actor and timestamps

The catalog must reject unknown keys. More-specific policy may override a
broader policy only when the requesting context is authorized. Every mutation
must use permissions, validation, optimistic concurrency, and an audit event.
Deletion is not required; disable/replace policies and preserve history.

Initial public feature keys:

- `public.track_parcel` = `ENABLED`
- `public.send_parcel` = `COMING_SOON`
- `public.join_business` = `ENABLED`
- `public.rate_calculator` = `COMING_SOON`
- `public.hubs` = `COMING_SOON`
- `public.customer_signup` = `DISABLED`

Add resolved public feature states to the safe public landing-page response.
Do not expose internal policy reasons, actor IDs, tenant IDs, or unpublished
configuration.

### C. Public UI reconciliation

1. Keep `Track a Parcel` active.
2. Keep `Send a Parcel` visible, disabled, accessible, and marked
   `Coming Soon`.
3. Add active `Join CeylonSwift for Business`.
4. Turn public calculator and hubs into accessible coming-soon cards:
   - blur only decorative/internal content, not the readable status;
   - remove interactive focus from disabled controls;
   - do not render live-looking prices or operational loads;
   - preserve responsive, light/dark, and language compatibility.
5. Fetch the safe public landing payload and resolved feature states.
6. Use fail-safe built-in Open Beta states when the API is unavailable.
7. Never allow a frontend value, query parameter, or local storage value to
   enable a server-disabled feature.

### D. Business entry boundary

The active Business CTA may open a truthful Business/Tuition interest or login
entry shell in this first diff. It must not pretend the full Business onboarding
workflow already exists. The shell must distinguish:

- Connected Business: has a website/system integration.
- Business Lite: no website/system integration.

Full onboarding fields, agreement pricing, QR inventory, pickup scheduling, and
teacher/institute operations belong to the next implementation phase.

### E. Tests

Replace tests that require active public parcel sending with tests that prove:

- `Send a Parcel` is visible but cannot invoke booking in Open Beta.
- `Track a Parcel` remains active.
- Business entry is active.
- Calculator and hubs are non-interactive and marked coming soon.
- Safe fallback states are identical or more restrictive than backend states.
- API content cannot inject executable markup.
- Unauthorized users cannot mutate feature policies.
- Feature resolution respects scope, effective time, and precedence.
- Feature mutations are audited and reject stale versions.
- Existing auth, navigation, operations, accessibility, theme, responsive, and
  truthful-content tests continue to pass.

## 7. Planned File Scope

Existing files expected to change:

- `package.json`
- root package lock, if present and managed
- `backend/package.json`
- backend package lock
- `README.md`
- `index.html`
- `app.js`
- `css/pages/home.css`
- generated CSS bundles through the existing build
- `js/public/landing-page.js`
- `js/landing-page/dashboard-controller.js` only if feature controls are exposed
  in the existing Website Content area
- `test/frontend/landing-phase9a.test.mjs`
- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `backend/src/config/configuration.ts`
- `backend/src/config/environment.schema.ts`
- `backend/src/health/health.service.ts`
- landing-page DTO/service/tests

Expected additions:

- canonical frontend release configuration
- feature-policy backend module or a tightly scoped landing/platform-state
  submodule
- feature-policy DTOs, resolver, authorization tests, and controller tests
- additive Prisma migration after
  `20260715090000_add_phase_9a_landing_content`
- Phase 0/first-diff implementation note

Do not modify unrelated workforce, authentication, package transition,
assignment, tracking, pricing, or operational-resilience behavior.

## 8. Migration and Rollback Order

1. Preserve and validate the existing Phase 9A additive migration.
2. Add the feature-policy enum/table migration after Phase 9A.
3. Seed only catalog-approved global Open Beta states.
4. Deploy the additive schema before code that requires it.
5. Keep frontend safe defaults at least as restrictive as the database defaults.
6. Roll back behavior by resolving all new public features to safe fallback
   states; do not destroy feature-policy or audit data.
7. Schema contraction is out of scope for the Open Beta rollback window.

## 9. Main Risks and Controls

| Risk | Required control |
| --- | --- |
| Current dirty Phase 9A work is partially omitted | Review combined staged, unstaged, and untracked diff |
| A passing old test protects wrong product behavior | Update requirement tests first, then implementation |
| UI enables a disabled backend feature | Backend-authoritative resolution and restrictive fallback |
| Fake price/hub data appears public | Remove live-looking values and operational claims |
| Admin control becomes arbitrary code/content execution | Catalog keys, typed DTOs, structured JSON only |
| Scope override leaks across businesses/branches | Server-derived context and explicit precedence tests |
| Four-part product version conflicts with npm | Separate product label from package SemVer |
| Phase 9A and new migrations deploy out of order | Additive ordered migrations and disposable-DB proof |

## 10. Acceptance Gate Before Phase 1

Phase 0 implementation is complete only when:

1. All current frontend and backend tests still pass after deliberate test
   updates.
2. Fresh frontend/backend builds pass.
3. A disposable PostgreSQL database can apply every migration and seed.
4. Public Open Beta behavior matches the six initial feature states.
5. Mobile/desktop, English/Sinhala/Tamil, light/dark, keyboard, reduced-motion,
   and offline/error fallback checks pass.
6. No normal customer can begin parcel sending or public customer signup.
7. Approved Business/Tuition users have a truthful active entry point.
8. Feature changes require authorized backend access and produce audit records.
9. The public page exposes no internal hub load, sensitive policy data, secrets,
   or fabricated pricing/performance claims.
10. `git diff --check`, secret scan, migration review, and final dirty-tree
    inventory are clean and documented.

## 11. Continue Instruction

When implementation is approved, begin with the **Open Beta Public-State
Foundation** described in Section 6. Preserve every pre-existing Phase 9A
change, update requirement tests before changing behavior, implement the
smallest complete backend-authoritative feature-state slice, run the full
verification gate, and stop for review before starting Business/Tuition
onboarding.

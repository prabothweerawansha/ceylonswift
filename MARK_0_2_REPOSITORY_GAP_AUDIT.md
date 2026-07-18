# CeylonSwift Mark 0.2 Repository Gap Audit

Audit date: 2026-07-17

Branch: `main`

Inspected HEAD: `482ee4a`

## 1. Audit boundary

This is a read-only architecture gap assessment. No project source code was changed by the audit.

The current worktree already contains staged Phase 9A/frontend changes, unstaged Prisma/backend changes, and untracked landing-page/migration/artifact work. Those changes are user work and must be preserved.

## 2. Executive finding

The repository is not a fake UI-only project. It already has a substantial identity, authorization, workforce, operations, resilience, and landing-content foundation.

It is also not yet the complete delivery operating system defined in `PROJECT_HANDOFF.md`. Most advanced Business/Tuition, QR custody, routing/GPS, branch inventory, finance, returns, support, and offline modules remain to be implemented.

The correct strategy is incremental extension through vertical slices, not a frontend rebuild and not a backend rewrite.

## 3. Capability matrix

| Area | Current repository | Mark 0.2 target | Gap / first action |
|---|---|---|---|
| Public landing | Responsive light/dark Phase 9A landing, tracker, services, hubs, support, reviews | Open Beta behavior, Business entry, Coming Soon states, full CMS | Preserve Phase 9A; reconcile CTA/version/content behavior |
| Versioning | Root `1.0.0`, backend `0.1.0`, README Mark I | Canonical four-part `0.2.x.x Open Beta` | Define one release source before changing metadata |
| Authentication | Password, OTP, OAuth, passkey, MFA, sessions, devices | Same foundation for all new portals/apps | Extend; do not replace |
| Authorization | Organizations, branches, memberships, roles, permissions, step-up | Department roles, Business roles, capability tags, delegations, CEO override | Add scoped roles/approval constraints and tests |
| Business onboarding | Organization foundation only | Application, verification, plan, agreement, locations, team | New domain module and additive schema |
| Receiver data | Customer/address foundations | OTP receiver identity, consent, org links, exact locations | Add tenant-safe receiver directory |
| External Business sync | Not implemented | Connected Business customer/order sync and fallback code | Provider-neutral integration module |
| Tuition workflow | Not implemented | Groups, templates, batches, packing, material inventory | First Open Beta vertical |
| Delivery draft/code | CustomerRequest exists | Multi-source Delivery Draft + single-use receiving code | Generalize without breaking CustomerRequest |
| QR inventory | No full physical-label lifecycle | Batch, allocation, custody, scans, incidents, return use | New explicit state machine |
| Package model | Package, assignments, tracking | Consignment/items, immutable snapshots, journey links | Add around existing Package; migrate incrementally |
| Branch/hub | Branch and Hub foundations | Master profile, zones, storage, live capacity, hierarchy | Extend models and staff UI |
| Routing | Assignments and simple operations | Route plans, stops, revisions, optimizer stages | Begin deterministic/manual-safe |
| Live GPS | Not implemented | Current location, adaptive samples, exact tracking, archive | New telemetry boundary and storage strategy |
| Rider app | No production mobile app | Android-first secure/offline rider app | Choose framework after API/state contract |
| Bulk/linehaul | Not implemented | Loads, seals, manifests, branch trips | New module after QR/custody foundation |
| Fleet | Rider profile has basic vehicle fields | Vehicles, docs, inspection, telemetry, rentals, maintenance | Separate Fleet entities/module |
| Delivery proof | Tracking/status foundation | OTP/signature/proof/attempt/geofence/confirmation | New transactional completion flow |
| Returns/exchanges | Basic cancellation/return concepts only | Contract return journey and QR authorization | New linked journey state machine |
| Pricing | PricingRule and quote foundation | Composable contract/region/service rule engine and snapshots | Extend with effective-dated components/simulation |
| Payments/wallet | PaymentMode fields only | Provider payments, immutable wallet, withdrawal, receipts | New ledger and provider abstraction |
| COD | COD amount fields only | Cash positions, handover, deposit, settlement | New ledger/reconciliation module; disabled for tuition V0.2 |
| Billing | Not implemented | Business monthly agreement invoices | Required for tuition Open Beta |
| Payroll | Workforce foundation only | Shift, allowance, adjustment, finalized payroll | Later phased module |
| Customer Care | No unified production case system | Cases, contacts, escalation, compensation, notifications | New support module |
| Notifications | Toast UI and operational jobs | Event outbox, SMS/WhatsApp/email/push delivery | Add durable provider-neutral outbox |
| Incident/legal | Audit and generic approvals | Unique incident cases, evidence, legal hold, disclosure | New case domain |
| Offline | Operational resilience jobs, no edge sync | Rider/branch scoped event sync and reconciliation | Build after core state machines |
| CMS | Dirty Phase 9A revisions/campaigns/media/reviews | Sections/cards/themes/translations/feature targeting | Extend current controlled CMS |
| Feature flags | No complete product feature lifecycle | Scoped lifecycle and safe kill switches | Phase 1 platform primitive |
| Infrastructure | One-server-compatible backend | V0.2 single server + HQ/off-site recovery; future standby | Keep stateless/provider abstractions; test restore |

## 4. Current schema reuse

Reuse and extend:

- `User`, profiles, devices, sessions, auth challenges;
- `Organization`, `Branch`, memberships, roles, permissions, assignments;
- `Package`, `PackageAssignment`, `TrackingEvent`, `CustomerRequest`, `Hub`, `PricingRule`;
- `Activity`, `AuditLog`, `ApprovalRequest`;
- idempotency, jobs, dead letters;
- Phase 9A landing/review/media entities after reconciliation.

Do not delete or replace these models merely to match new naming. Add explicit relationships, snapshots, and journey/domain tables around them.

## 5. Current frontend reuse

Reuse:

- the current public visual foundation and responsive CSS;
- theme/language/performance settings;
- auth and workspace shell;
- API client, normalized errors, toasts;
- navigation registry/policy;
- operations/workforce controllers where their contracts remain valid;
- landing revision/review controllers after review.

Avoid adding a second SPA/router/design system during Phase 0. A later frontend migration must be staged behind stable APIs and route compatibility.

## 6. Highest-risk implementation areas

1. Mixing the dirty Phase 9A work with broad architecture edits.
2. Treating Business users as internal staff roles.
3. Overwriting current Package history instead of adding journeys/snapshots.
4. QR reuse without a separate authorized return journey.
5. Trusting client price, role, tenant, status, or external user ID.
6. Building GPS/archive volume directly into ordinary transactional queries.
7. Mutable wallet/COD balances or duplicate provider callbacks.
8. Unsafe offline row replication and conflict overwrite.
9. Public exposure of branch load, receiver data, or raw live locations.
10. Declaring Open Beta features complete while they are placeholders.

## 7. First approved engineering boundary

Before feature coding:

1. Review and verify Phase 9A.
2. Preserve the dirty tree and document ownership of every changed path.
3. Align the Open Beta public behavior with feature flags.
4. Freeze state catalogues and permission additions.
5. Define the first additive migration for feature/release, agreement, approval, snapshots, and outbox primitives.
6. Demonstrate rollback and disposable-database migration proof.

The detailed sequence and acceptance criteria are in `MARK_0_2_IMPLEMENTATION_BLUEPRINT.md`.

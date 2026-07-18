# CeylonSwift Mark 0.2 Implementation Blueprint

Last updated: 2026-07-17 (Asia/Colombo)

## 1. Purpose

This document is the implementation contract for evolving the existing CeylonSwift repository from the current prototype/Phase 8/dirty Phase 9A state into the `0.2.x.x` Open Beta line.

It must be read together with `PROJECT_HANDOFF.md`.

The first operational market is approved Sri Lankan tuition teachers/institutes using Business accounts. Normal Customer parcel sending remains disabled/Coming Soon during the initial Open Beta. Public tracking, receiver details, Business onboarding, Business packing, QR operations, branch operations, rider operations, and delivery are real end-to-end workflows.

## 2. Non-negotiable rules

1. Preserve the current dirty worktree. Do not reset, stash, overwrite, stage, commit, or push without explicit permission.
2. Reconcile and finish/review Phase 9A before building on top of it.
3. Do not replace the existing auth, workspace, authorization, API client, error, audit, resilience, or landing foundations with a second competing stack.
4. Backend/database is authoritative for identity, permission, price, status, custody, finance, and audit.
5. Do not build a frontend-only simulation and call it complete.
6. Do not build all backend modules first with no usable operational slice.
7. Build vertical slices: state/data -> service rule -> API/permission -> UI/app -> notifications/audit -> tests -> rollback evidence.
8. Unimplemented features must be hidden, disabled, or honestly marked Coming Soon through feature flags.
9. Historical audit, custody, QR, payment, payroll, legal, and completed journey records are append-only or adjustment-based; never silently overwritten.
10. Every sensitive mutation needs actor, scope, reason when required, request/idempotency identity, and audit.
11. All new schema work is additive and migration-safe.
12. Exact legal rules, provider contracts, and monetary values remain configurable gates until formally approved.

## 3. Current repository baseline

### 3.1 Existing frontend

- One static SPA centered on `index.html` and `app.js`.
- Modular JS for API, auth, workspaces, navigation, errors, notifications, workforce, operations, landing, and compatibility.
- Modular CSS build with responsive light/dark Phase 9A landing design.
- Public hero, tracker, services/rate preview, hubs, support, about, verified reviews, language, theme, and performance modes.
- Role/workspace-aware authenticated shell.
- Current Phase 9A landing changes are dirty user work and must be preserved.

### 3.2 Existing backend

- NestJS, Prisma, PostgreSQL.
- Auth, authorization, workforce, operations, operational resilience, and dirty/untracked landing-page module.
- OTP, OAuth, passkeys, MFA, sessions, refresh rotation, device/session records.
- Organizations, branches, memberships, roles, permissions, scoped role assignments, step-up authorization.
- Packages, assignments, tracking, customer requests, hubs, pricing.
- Audit logs, approvals, idempotency, background jobs, dead letters, readiness, metrics, standardized errors.
- Landing revisions, campaigns, media, verified reviews, moderation, and public metrics in the current dirty change set.

### 3.3 Known metadata mismatch

- Root package currently reports `1.0.0`.
- Backend package reports `0.1.0`.
- README calls the existing build Mark I/stable.
- Product decision: all current/new pre-mass releases are `0.x.x.x Open Beta`; mass release is `Mark I / 1.0.0.0`.

Version metadata must be aligned only after preserving Phase 9A and defining one canonical release source.

## 4. Target runtime boundaries

### 4.1 Public web

- Marketing/home experience using the existing visual foundation.
- Track Parcel active.
- Send a Parcel visible but disabled/Coming Soon for Normal Customers.
- Join CeylonSwift for Business active.
- Receiver OTP/account page active.
- Rate calculator and public hubs may render blurred Coming Soon previews until backed by approved live data.

### 4.2 Business Portal

- Business application, verification status, contracts, locations, team, external integration, recipient groups, material templates, distribution batches, packing queue, QR stock, pickups, tracking, returns, invoices, support, reports, and audit.
- Connected Business and Business Lite are modes of one Business Organization model.

### 4.3 Staff/branch portal

- Hub Employee scan/sort interface.
- Office Staff intake, packing, QR, manifest, customer care, COD count, and allowed correction interface.
- Hub Manager branch command centre, approvals, reconciliation, delegation, incidents, capacity, inventory, riders, vehicles, manifests, and branch reports.
- Department-scoped Operations, Finance, HR, Customer Care, Security/Legal, System, and Technical views.
- CEO global categorized dashboard and search.

### 4.4 Rider app

- Android-first.
- Registered-device identity; biometric optional.
- Shift/check-in, route, tasks, pickup/delivery, QR/manifest, proof, COD, emergency, vehicle confirmation, battery/GPS status, and offline queue.
- Exact live tracking while operationally active.

### 4.5 API and workers

- Keep versioned `/api/v1` contracts while extending additively.
- Business rules in NestJS services and explicit state-transition services.
- Asynchronous outbox/workers for notifications, provider sync, payouts, reports, GPS archival, and offline reconciliation.

### 4.6 Data stores

- PostgreSQL remains canonical.
- V0.2 launch may use one production server because of budget.
- HQ retains an encrypted full recovery copy; branches/riders retain scoped offline data.
- Future primary/standby and controlled HQ emergency promotion must be possible without schema redesign.
- Media/proof/GPS archive must use storage abstractions so PostgreSQL byte storage is not the permanent high-volume design.

## 5. Domain module map

Create or extend modules along these boundaries:

1. `identity` / existing `auth`
2. `authorization` / existing scoped RBAC and step-up
3. `organizations`
4. `business-onboarding`
5. `agreements`
6. `receiver-directory`
7. `external-integrations`
8. `delivery-drafts`
9. `consignments`
10. `qr-inventory`
11. `packing`
12. `branches`
13. `capacity-inventory`
14. `routing`
15. `linehaul`
16. `fleet`
17. `rider-operations`
18. `delivery-proof`
19. `returns-claims`
20. `pricing`
21. `payments-wallet`
22. `cod-settlement`
23. `billing`
24. `payroll`
25. `support`
26. `notifications`
27. `incidents-legal`
28. `feature-release`
29. `landing-cms`
30. `offline-sync`
31. `location-telemetry`
32. existing `operational-resilience`

Modules may be introduced in stages, but their ownership boundaries must be documented before tables/endpoints proliferate.

## 6. Core data architecture

### 6.1 Identity and organization

Retain existing `User`, profiles, `Organization`, `Branch`, memberships, roles, permissions, devices, and sessions.

Add:

- `BusinessApplication`
- `BusinessVerification`
- `BusinessPlan`
- `BusinessSubscription`
- `Agreement`
- `AgreementVersion`
- `AgreementAcceptance`
- `BusinessLocation`
- `BusinessLocationVerification`
- `BusinessTeamAssignment`
- `CapabilityGrant`
- `TemporaryEngagement`

### 6.2 Receiver and external order

- `ReceiverIdentity`
- `ReceiverOrganizationLink`
- `ReceiverLocation`
- `ReceiverConsent`
- `ExternalSystem`
- `ExternalCustomerLink`
- `ExternalOrder`
- `ExternalSyncAttempt`
- `DeliveryDraft`
- `ReceivingCode`
- `ShipmentPartySnapshot`

Rules:

- External identity key is `(organizationId, externalCustomerId)`.
- Mobile/OTP may link a canonical receiver but never exposes another organization's data.
- Draft data may change; confirmed shipment snapshots do not.
- Receiving code is single-use, expiring, random, and contains no PII.

### 6.3 Tuition and packing

- `RecipientGroup`
- `RecipientGroupMember`
- `MaterialTemplate`
- `MaterialTemplateVersion`
- `MaterialInventoryItem`
- `MaterialStockMovement`
- `DistributionBatch`
- `DistributionBatchRecipient`
- `PackingTask`
- `PackingChecklistItem`

### 6.4 Consignment and parcel

Evolve the current `Package` safely rather than deleting it.

Add:

- `Consignment`
- `ParcelItem`
- `ParcelServiceSnapshot`
- `ParcelPriceSnapshot`
- `ParcelInstruction`
- `ParcelJourney`
- `ParcelJourneyLink`
- `DeliveryAuthorizationPolicy`

A physical item has one active printed QR. A consignment may contain multiple parcel items. Original, return, and replacement journeys are linked but immutable and distinct.

### 6.5 QR and custody

- `QrBatch`
- `QrLabel`
- `QrAllocation`
- `QrCustodyTransfer`
- `QrScanEvent`
- `QrIncident`
- `QrReturnAuthorization`

State catalogue:

`GENERATED -> APPROVED -> EXPORTED -> PRINTED -> RECEIVED -> ALLOCATED -> AVAILABLE -> ACTIVATED -> IN_TRANSIT -> DELIVERED -> CLOSED`

Exceptions:

`VOID`, `LOST`, `STOLEN`, `DAMAGED`, `DESTROYED`, plus return-authorized journey states without reopening original history.

### 6.6 Branch, storage, and inventory

- `BranchProfile`
- `ServiceZone`
- `BranchCapability`
- `CapacitySnapshot`
- `StorageZone`
- `StorageLocation`
- `StoredParcel`
- `InventoryCatalogItem`
- `InventoryBatch`
- `InventoryMovement`
- `InventoryReconciliation`

### 6.7 Routing, loads, and fleet

- `RoutePlan`
- `RouteStop`
- `RouteAssignment`
- `RouteRevision`
- `LinehaulTrip`
- `BulkLoad`
- `LoadSeal`
- `LoadManifest`
- `ManifestItem`
- `Vehicle`
- `VehicleDocument`
- `VehicleAssignment`
- `VehicleInspection`
- `VehicleTelemetryEvent`
- `VehicleMaintenance`
- `VehicleRental`
- `TripCost`

### 6.8 Delivery, returns, and claims

- `DeliveryAttempt`
- `DeliveryProof`
- `DeliverySignature`
- `ReceiverOtpVerification`
- `ReceiverConfirmation`
- `RiderRating`
- `ReturnRequest`
- `ReturnAuthorization`
- `ReturnJourney`
- `ExchangeCase`
- `Claim`
- `ClaimEvidence`
- `Investigation`

### 6.9 Finance

- `PriceRuleSet`
- `PriceRuleComponent`
- `Quote`
- `Payment`
- `PaymentAttempt`
- `Wallet`
- `WalletLedgerEntry`
- `Withdrawal`
- `Invoice`
- `InvoiceLine`
- `RefundCredit`
- `CodLedgerEntry`
- `RiderCashPosition`
- `CashHandover`
- `BankDeposit`
- `Settlement`
- `Reconciliation`
- `PayrollPeriod`
- `PayrollLine`
- `PayrollAdjustment`

Money is integer minor units with currency. Balances derive from ledgers. Paid/finalized periods are immutable.

### 6.10 Support, notification, incident, release

- `SupportCase`
- `SupportCaseEvent`
- `ContactAttempt`
- `CallRecord`
- `NotificationEvent`
- `NotificationOutbox`
- `NotificationDelivery`
- `NotificationTemplate`
- `NotificationPreference`
- `EscalationRule`
- `IncidentCase`
- `IncidentEvidence`
- `LegalHold`
- `DataDisclosure`
- `FeatureDefinition`
- `FeatureTarget`
- `Release`
- `ReleaseGate`
- `ContentSection`
- `ContentCard`
- `ThemeCampaign`
- `Translation`

### 6.11 Offline and GPS

- `OfflineNode`
- `OfflineDeviceGrant`
- `SignedConfiguration`
- `OfflineEvent`
- `SyncCursor`
- `SyncConflict`
- `SyncReconciliation`
- `CurrentLocation`
- `LocationSample`
- `RouteTelemetrySummary`
- `LocationArchiveReference`
- `SensitiveDataAccessLog`

Do not implement unrestricted multi-master row replication. Sync append-oriented domain events with deterministic IDs, versions, integrity metadata, and conflict quarantine.

## 7. Critical state machines

Before implementation, encode transition catalogues and tests for:

- Business application and activation
- Agreement draft/review/accept/active/expired/superseded
- Delivery Draft and receiving-code consumption
- Package/parcel lifecycle
- QR lifecycle and return authorization
- Assignment acceptance/reassignment
- Route plan and revision
- Bulk load/seal/manifest
- Branch inbound/outbound receipt
- Delivery attempt/proof/completion/failure
- Return/exchange/claim
- Payment/wallet/withdrawal
- COD collection/deposit/settlement
- Support case
- Incident/legal hold
- Feature/release
- Offline sync/reconciliation

No controller or UI may invent transitions outside the shared backend catalogue.

## 8. Permission and approval architecture

### 8.1 Keep separate concepts

- Authentication identity
- Organization membership
- Role
- Permission
- Scope: system, organization, branch, location, resource
- Job title
- Capability tag
- Temporary delegation
- Approval requirement
- Step-up authentication

### 8.2 Add role families

- Hub Employee
- Office Staff
- Hub Manager
- Branch/Main Branch management
- Customer Care Staff/Admin
- Operations Staff/Admin
- Finance Staff/Admin
- HR Staff/Admin
- Security/Legal Staff/Admin
- System Admin
- Technical Super Admin
- CEO/Owner
- Business Owner/Admin/Operator/Finance/Support/Viewer
- Rider plus capability tags

### 8.3 Approval engine

Extend generic approval requests to support:

- required approver roles/departments;
- no-self-approval;
- CEO Owner Override with two independent verification steps;
- expiry, escalation, delegation, acting authority;
- preconditions and resulting mutation in one transaction;
- reason/evidence and immutable audit;
- branch/HQ/company scope;
- emergency freeze and later review.

Access does not equal approval. CEO can access every function, while sensitive mutations still record the applicable normal or override path.

## 9. Public and product UX contract

### 9.1 Existing landing foundation

Keep:

- current responsive premium hero and Sri Lanka visual;
- light/dark themes;
- English/Sinhala/Tamil settings;
- performance modes;
- tracker;
- controlled CMS/review foundations.

Change:

- align release badge/version to Open Beta;
- disable `Send a Parcel` with clear Coming Soon treatment;
- add active `For Business` navigation and Business onboarding section;
- keep `Track a Parcel` active;
- blur/disable rate calculator and hubs preview until live, approved data exists;
- remove fake prices, fake hub loads, and unverified claims;
- expand CMS section/card/theme/campaign controls;
- preserve truthful verified reviews and metrics only.

### 9.2 Business/Tuition UX

Primary Open Beta journey:

1. Business proposal/application
2. Branch/HQ verification
3. Contract/plan/agreements
4. Business Owner activation and MFA
5. Locations and employee assignments
6. Receiver links/external integration
7. Recipient groups/material templates
8. Distribution batch
9. Approval
10. Packing queue and QR binding
11. Pickup assignment
12. Live route/custody
13. Delivery proof
14. Invoice/report/support

### 9.3 Role-specific dashboards

Use organized tabs, not one giant page. Every role sees only its scope. CEO sees categorized company-wide workspaces without account switching.

## 10. Phased implementation roadmap

Each phase ends with code, migrations, tests, documentation, security evidence, and a runnable vertical demonstration.

### Phase 0 — Preserve, reconcile, and freeze

Goals:

- inventory staged/unstaged/untracked Phase 9A changes;
- review Phase 9A as one coherent change set;
- identify overlap with the new target;
- establish canonical four-part release metadata;
- document state machines and permission additions;
- decide schema naming and migration order;
- add no broad product feature yet.

Deliverables:

- preserved-change map;
- clean review of Phase 9A behavior/tests;
- canonical version source and Open Beta release policy;
- feature-state catalogue;
- architecture decision records;
- approved initial migrations plan;
- baseline test/security report.

Acceptance:

- no user work lost;
- current tests pass;
- landing behavior and dirty changes are understood;
- no duplicate auth/router/design system introduced;
- migration plan has rollback notes.

### Phase 1 — Platform primitives

Build:

- feature/release registry and scoped flags;
- agreement/version/acceptance framework;
- capability grants and temporary delegation;
- generalized approval enhancements;
- event/outbox/notification primitives;
- immutable price and party snapshots;
- storage/provider interfaces;
- expanded audit/sensitive-access logs.

Acceptance:

- one feature can be targeted by role/organization/branch and safely disabled;
- one agreement can be versioned and accepted;
- one high-risk action follows dual approval and CEO override;
- outbox delivery is idempotent/retryable;
- all are tested.

### Phase 2 — Business/Tuition onboarding and receiver data

Build:

- Business application/review/activation;
- Connected Business and Business Lite modes;
- Business locations and physical verification;
- Business team/role onboarding;
- receiver identity/location/consent;
- external customer/order links;
- secure receiver details link;
- Delivery Draft and receiving code;
- Tuition recipient groups and material templates.

Acceptance:

- approved tuition Business can activate securely;
- receiver can complete exact location by OTP without a full account;
- external orders deduplicate;
- tenant isolation tests prove no cross-Business visibility;
- incomplete data enters Needs Attention.

### Phase 3 — Distribution batch, QR, packing, and pickup

Build:

- distribution batches and eligibility preview;
- material inventory optional module;
- QR batch/allocation/Business custody;
- packing checklist and sequential scan flow;
- recurring pickup templates and ad-hoc changes;
- rider assignment request;
- Business/rider handover and manifest.

Acceptance:

- teacher selects a group and prepares a real batch;
- missing recipients are excluded safely;
- each physical parcel binds exactly one valid QR;
- duplicate/reused/lost QR paths are blocked;
- rider accepts an exact manifest and custody transfers atomically.

### Phase 4 — Branch operations, routing, GPS, and delivery

Build:

- branch profile/zones/capacity/storage;
- Hub Employee/Office/Manager interfaces;
- route planning foundation and manual-safe optimizer;
- rider Android app foundation;
- live GPS/current location/history;
- rider-to-hub and hub-to-rider custody;
- delivery authorization, OTP/signature/proof;
- failed delivery/reschedule.

Start optimizer conservatively:

1. nearest eligible rider/branch and manual approval;
2. multi-stop route ordering;
3. dynamic pickup insertion;
4. multi-rider clustering;
5. linehaul scheduling;
6. predictive optimization.

Acceptance:

- one parcel completes pickup -> branch/direct route -> delivery with full custody/GPS/proof;
- customer/Business sees authorized live status;
- route changes are reasoned and audited;
- no unsupported optimizer claim is made.

### Phase 5 — Bulk transport, fleet, returns, and claims

Build:

- load/container/seal/manifest;
- inter-branch trips;
- trusted bulk capability;
- vehicle/fleet/docs/inspection/telematics abstraction;
- breakdown/rescue;
- contract returns, QR return journey, replacement links;
- high-value protection, claims, investigations.

Acceptance:

- sealed load traverses multiple checkpoints without parcel-level custody gaps;
- emergency opening is approved/audited;
- breakdown transfer creates a new seal/manifest;
- original delivery remains immutable during return;
- claim evidence is case-linked.

### Phase 6 — Pricing, billing, payments, COD, support

Build:

- composable effective-dated pricing engine;
- exact immediate payment;
- wallet ledger and bank withdrawal;
- invoices and Business monthly agreement billing;
- payment provider abstraction;
- COD ledger/settlement feature behind flags;
- support cases/contact logs/notifications;
- complaint compensation and service credits.

Acceptance:

- no money is stored as mutable floating-point balance;
- duplicate provider callbacks cannot double-credit;
- payments reconcile;
- Finance permissions and dual approvals work;
- tuition Open Beta can invoice without enabling COD.

### Phase 7 — Offline continuity and workforce/fleet depth

Build:

- rider offline queue;
- branch offline node/grants/config;
- event sync/conflict/reconciliation;
- recovery workflow;
- temporary workforce and shift payment;
- payroll and performance workflows;
- GPS archive and long-term access control.

Acceptance:

- scoped operations continue during central outage;
- restore does not duplicate QR/custody/payment events;
- conflicts quarantine;
- Manager/HQ reconciliation returns branch to normal;
- sensitive online-only actions remain blocked offline.

### Phase 8 — Open Beta hardening

Build/perform:

- provider integrations;
- full CMS/seasonal/theme authoring;
- accessibility and three-language QA;
- data-saving/mobile performance;
- security and privacy review;
- backup/restore drill;
- operational runbooks;
- observability/SLO dashboards;
- controlled tuition pilot;
- feedback and rollback.

Acceptance:

- all enabled features are end-to-end real;
- Coming Soon modules are clearly disabled;
- restore and incident drills pass;
- no critical security findings;
- pilot support/operations are staffed;
- release is tagged `0.x.x.x Open Beta`, never Mark I.

## 11. Migration strategy

1. Expand: add nullable/new tables, enums, indexes, provider interfaces.
2. Migrate: backfill only from validated existing records; preserve IDs and snapshots.
3. Dual-read/dual-write only where explicitly bounded and tested.
4. Cut over one workflow through a feature flag.
5. Verify counts, constraints, tenant scope, and state transitions.
6. Contract/remove legacy behavior only in a later release after rollback window.

Never:

- rewrite the existing migration history;
- delete current Package/Tracking data to fit a new model;
- perform uncontrolled localStorage import;
- deploy an irreversible contraction in the same release as cutover.

## 12. API rules

- DTOs accept user-entered fields only.
- Identity, organization, branch, price, status, permissions, and actor come from trusted backend context.
- Every external create/update uses idempotency and external reference uniqueness.
- Mutations use optimistic version checks.
- Public tracking returns a safe projection.
- Sensitive detail endpoints require scope, purpose where applicable, and step-up.
- Provider webhooks verify signatures, deduplicate, and record raw-safe metadata.
- Pagination, filtering, bounded exports, and rate limits are mandatory.
- OpenAPI/API documentation must distinguish implemented, beta, and disabled endpoints.

## 13. Test and verification contract

For every phase:

- unit tests for state transitions and calculations;
- permission/scope/step-up tests;
- tenant-isolation tests;
- transaction/idempotency/concurrency tests;
- migration test on a disposable database;
- seed repeatability;
- API integration/e2e tests;
- frontend workflow tests;
- offline replay/conflict tests when applicable;
- accessibility checks;
- responsive light/dark/language visual QA;
- security/secret/log-redaction checks;
- backup/rollback evidence;
- `git diff --check`.

High-risk mandatory scenarios:

- duplicate external order;
- duplicate QR scan/reuse;
- two active parcel assignments;
- stale version update;
- double payment/webhook;
- cross-tenant access;
- self-approval;
- CEO override audit;
- offline duplicate/conflict;
- lost/stolen QR;
- seal mismatch;
- payout mismatch;
- GPS/device tampering;
- branch/account emergency freeze.

## 14. Non-functional requirements

- Mobile-first and data-saving.
- English default with Sinhala/Tamil support and fallback.
- Dark/light compatible.
- Exact live tracking during active journeys.
- Adaptive GPS and offline queue.
- WCAG-oriented keyboard, focus, contrast, reduced-motion, labels, and error behavior.
- Structured redacted logs and trace/request IDs.
- Encrypted transport and storage.
- Secrets outside source control.
- Replaceable external providers.
- Bounded queues, retries, dead letters, and operational dashboards.
- One-server Open Beta with encrypted HQ/off-site backups and tested restore.
- Future horizontal scale without relying on per-process memory for correctness.

## 15. Configuration and legal gates

Do not hard-code:

- prices, thresholds, fees, discounts, compensation, payroll rates;
- service names/SLAs/areas/hours;
- branch capacities and hierarchy;
- notification channels/templates;
- retention/access periods;
- high-value/prohibited/restricted rules;
- temporary employment/legal terms;
- provider credentials or provider-specific domain logic.

Before enabling a gated feature, require:

- approved configuration version;
- legal/policy version when applicable;
- authorized acceptance;
- provider readiness;
- operational staffing;
- monitoring and rollback.

## 16. First implementation task

The first coding task is **not** “build the whole platform.”

It is:

1. preserve and review the Phase 9A dirty change set;
2. run the existing test/build baseline;
3. reconcile current landing/CMS models with the Open Beta public behavior;
4. establish canonical `0.2.0.0` release metadata and feature-state foundations;
5. produce the first additive migration plan for Phase 1;
6. present the exact diff scope before broad edits.

## 17. Copy-paste Codex implementation prompt

```text
You are implementing CeylonSwift Mark 0.2 Open Beta in the existing repository.

Before editing anything:
1. Read PROJECT_HANDOFF.md and MARK_0_2_IMPLEMENTATION_BLUEPRINT.md completely.
2. Inspect the current branch, log, staged diff, unstaged diff, untracked paths, package scripts, architecture docs, Prisma schema, migrations, permissions, and tests.
3. Treat every existing staged, unstaged, and untracked change as user work. Do not reset, stash, overwrite, stage, commit, or push without explicit permission.
4. Pay special attention to the dirty Phase 9A landing-page frontend/backend/migration work. Reconcile it; do not replace it with a generic site or duplicate framework.

Product truth:
- The initial operational release is a 0.x.x.x Open Beta for approved Sri Lankan tuition Businesses, their staff, riders, and receivers.
- Normal Customer Send a Parcel remains visible but disabled/Coming Soon.
- Track a Parcel remains active.
- Join CeylonSwift for Business is the active public onboarding path.
- Existing public visual design is retained with targeted changes.
- Unimplemented modules must be feature-disabled or honestly Coming Soon.
- The platform must remain compatible with the full future requirements in PROJECT_HANDOFF.md.

Architecture rules:
- Keep NestJS/Prisma/PostgreSQL and the existing auth, authorization, workspace, audit, resilience, API client, error, navigation, and landing foundations.
- Backend/database is authoritative.
- Use additive migrations and explicit state machines.
- Build vertical slices with data, backend, permission, UI, audit/notification, tests, observability, and rollback together.
- Never claim a placeholder is implemented.
- Never use mutable floating-point money, raw PII in QR codes, unrestricted multi-master database replication, or client-trusted prices/status/roles.

Start with Blueprint Phase 0 only:
A. Produce a preserved-change map for the current dirty tree.
B. Verify the current baseline tests/build without modifying code.
C. Review Phase 9A for internal consistency and conflicts with the new Open Beta behavior.
D. Propose the exact canonical version/release metadata changes for 0.2.0.0.
E. Propose the feature-state/feature-target data model and API/UI integration.
F. Freeze the first state-machine and permission additions.
G. Propose the first additive Prisma migration sequence and rollback plan.
H. Report exact files that would change, risks, tests, and acceptance criteria.

Do not begin broad feature implementation until the Phase 0 reconciliation and diff scope are presented and approved.
```

## 18. Definition of success

Mark 0.2 succeeds when an approved tuition Business can be onboarded, register receivers, prepare a real distribution batch, bind controlled QR labels, request pickup, transfer custody to a real rider, track the parcel live through branch/direct routing, complete verified delivery, receive operational/financial records, and obtain support—while every enabled workflow is secure, scoped, auditable, test-backed, recoverable, and honestly represented in the UI.

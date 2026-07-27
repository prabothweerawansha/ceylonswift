# CeylonSwift Project Handoff

Last updated: 2026-07-27 (Asia/Colombo)

## 1. Purpose of this document

This is the durable handoff for the current CeylonSwift product-definition and architecture conversation. It records:

- what is implemented in the repository today;
- what was verified during this conversation;
- the exact dirty Git state that must be preserved;
- the product and business decisions agreed with the user;
- proposed architecture and database additions that are not implemented yet;
- legal, privacy, security, and operational constraints;
- unresolved questions;
- the exact continuation procedure for a new Codex chat.

This document is a requirements and continuity artifact. It is not proof that the proposed future systems have been implemented.

## 2. Non-negotiable handoff rules

1. Preserve the current dirty working tree. The staged, unstaged, and untracked changes belong to the user.
2. Do not reset, checkout, delete, overwrite, stash, or broadly reformat existing work.
3. Do not rewrite the current authentication, authorization, canonical login/logout routing, or Phase 8 resilience foundation without a verified reason and explicit scope.
4. Do not claim that payments, COD settlement, QR inventory, offline branch sync, route optimization, rider mobile tracking, or support systems are already implemented. They are requirements from this conversation.
5. Do not implement product code merely because it is described here. Continue requirements gathering until the user explicitly requests implementation or asks for the final Codex implementation prompt.
6. All production data authority must remain server/backend controlled. Browser state, localStorage, route names, and role labels are never authorization inputs.
7. Build future features as end-to-end vertical slices: business rule -> database -> backend/API -> frontend/mobile UI -> tests -> operational acceptance.
8. Treat legal and regulatory statements as requiring current Sri Lankan professional/legal verification before production. Terms acceptance does not override applicable law.

## 3. Product direction and build strategy

CeylonSwift is not intended to be only a marketing website or a decorative delivery dashboard. The intended product is a Sri Lankan delivery operating system with four major surfaces:

1. Public website and customer application;
2. Operations/branch console;
3. Rider mobile application;
4. Owner/admin business console.

The current engineering foundation is real and substantial, but the full delivery business cannot yet run at mass-market scale. The intended implementation order is not frontend-first or a backend rewrite. The correct approach is:

```text
Business workflow and policy
-> Data model and state machine
-> Backend/API authority
-> User-facing workflow
-> Automated tests
-> Pilot acceptance
```

The first future operating slice should eventually cover:

```text
Customer booking
-> Pickup scheduling
-> Rider/branch handover
-> Physical QR activation
-> Route and custody scans
-> Delivery proof
-> COD collection/reconciliation
-> Notifications
-> Close/return
```

Do not spend the next major phase only polishing the public homepage. The branch, rider, delivery-proof, COD, and offline-continuity workflows are more important to the business.

## 4. Current repository and runtime architecture

Repository root:

```text
C:\Users\prabo\Dev\Labs\Web_Prototypes\Fast-Deliveries-Across-Sri-Lanka
```

### 4.1 Frontend

The current frontend is a large static SPA rather than a modern multi-app frontend:

- `index.html`: approximately 1,929 lines at inspection time;
- `app.js`: approximately 3,218 lines at inspection time;
- modular JavaScript exists under `js/` for authentication, API access, navigation, operations, workforce, landing-page behavior, errors, notifications, and compatibility;
- CSS sources live under `css/`, with tracked generated `bundle.css` and `bundle.min.css`;
- API mode and explicitly isolated legacy/demo compatibility paths coexist;
- browser access tokens are intended to stay in memory; refresh uses secure server-side session behavior;
- production API mode must never silently fall back to localStorage business data.

The frontend is increasingly modular, but `index.html` and `app.js` are still monolithic. A future migration should be incremental, not a destructive one-shot rewrite.

### 4.2 Backend

The backend is NestJS/TypeScript with Prisma and PostgreSQL. `backend/src/app.module.ts` currently imports:

- configuration;
- database;
- health;
- authentication;
- authorization/workspaces/RBAC;
- operational resilience;
- workforce;
- delivery operations;
- landing page/content/reviews.

Cross-cutting backend behavior includes:

- request IDs;
- W3C trace context;
- structured/redacted logging;
- request timeouts;
- a common response envelope;
- safe exception filtering;
- DTO validation;
- backend permission, organization, branch, workspace, and resource-ownership enforcement;
- short-lived RS256 access tokens;
- rotating refresh sessions;
- durable idempotency foundations;
- background-job/dead-letter foundations;
- readiness and protected metrics.

### 4.3 Current operational backend capabilities

Implemented foundations include:

- customer requests;
- packages;
- package status transitions;
- assignments/reassignments/unassignments;
- rider-scoped assignment reads;
- hubs;
- backend-authoritative pricing;
- public-safe tracking;
- workforce directory/invitations/approvals;
- organizations, branches, workspaces, roles, and permissions;
- public landing-page content, campaigns, media, customer reviews, and a controlled on-time metric in the current dirty Phase 9A work.

### 4.4 Current production gaps

The following are not complete production systems yet:

- payment gateway and ledger-grade payments;
- cash COD settlement and rider cash reconciliation;
- rider payouts/payroll execution;
- live GPS tracking and customer maps;
- route optimization and dispatch planning;
- physical QR batch inventory/custody;
- delivery proof/signature/receiver OTP records;
- full notification provider integration;
- support/complaint case management;
- branch-local offline systems and synchronization;
- rider native mobile application;
- production deployment, managed backups, WAF, secrets management, alerting, and restore drills.

The existing `docs/current-architecture.md` is a Phase 0 baseline and is stale as a description of the current runtime because a backend and database now exist. Use it only as historical migration context. Current truth is better reflected by the code plus Phase 7/8/9A documents.

## 5. Current database structure

The current Prisma schema contains the following enums:

- `AccountStatus`
- `MembershipStatus`
- `InvitationStatus`
- `ApprovalStatus`
- `DeviceType`
- `SessionStatus`
- `MfaType`
- `OAuthProvider`
- `EmployeeStatus`
- `OrganizationType`
- `OrganizationStatus`
- `BranchStatus`
- `RoleScope`
- `PartnerStatus`
- `RiderStatus`
- `PackageStatus`
- `PackageAssignmentStatus`
- `TrackingEventType`
- `TrackingVisibility`
- `CustomerRequestStatus`
- `HubStatus`
- `PricingRuleStatus`
- `PaymentMode`
- `AddressType`
- `IdempotencyState`
- `BackgroundJobStatus`
- `SiteRevisionStatus`
- `SiteCardType`
- `MediaApprovalStatus`
- `ReviewStatus`
- `ReviewModerationAction`

The current Prisma schema contains these models:

- identity/profile: `User`, `UserProfile`, `CustomerProfile`, `EmployeeProfile`, `RiderProfile`, `PartnerProfile`;
- tenancy/authorization: `Organization`, `Branch`, `OrganizationMembership`, `Role`, `Permission`, `UserRole`, `RolePermission`;
- authentication/security: `Session`, `RefreshToken`, `UserDevice`, `LoginAttempt`, `OtpChallenge`, `OAuthChallenge`, `WebAuthnChallenge`, `OAuthAccount`, `PasskeyCredential`, `MfaMethod`, `RecoveryCode`;
- workforce: `Invitation`, `ApprovalRequest`;
- delivery: `Address`, `Hub`, `Package`, `PackageAssignment`, `TrackingEvent`, `CustomerRequest`, `PricingRule`, `Activity`;
- audit/resilience: `AuditLog`, `IdempotencyRecord`, `BackgroundJobRun`, `DeadLetterJob`;
- public content/reviews: `SiteContentRevision`, `SiteCampaign`, `MediaAsset`, `CustomerReview`, `ReviewModerationEvent`, `PublicMetricSnapshot`.

Important current schema facts:

- `Address` already has latitude and longitude columns, but the current booking address DTO does not accept coordinates;
- `Package` has a unique tracking code, recipient, weight, service level, payment mode, COD amount, quoted/charged amounts, lifecycle status, optimistic version, branch/hub/address references, assignments, and tracking events;
- `RiderProfile` currently has vehicle type, vehicle identifier, licence reference, and weight capacity, but not the full shift, zone, device, route, or payroll structures described below;
- `TrackingEvent` is append-oriented but is not a complete QR scan/custody event store;
- `CustomerReview` is a package-owner review, not a receiver confirmation or dedicated rider-rating system.

## 6. Current roles and conceptual role decisions

The backend currently defines 11 default role keys:

1. `CUSTOMER`
2. `VIP_CUSTOMER`
3. `RIDER`
4. `AGENT`
5. `OFFICE_STAFF`
6. `BRANCH_MANAGER`
7. `ADMIN`
8. `OWNER`
9. `SUPER_ADMIN`
10. `PARTNER_USER`
11. `PARTNER_ADMIN`

Current backend policy correctly checks permissions and scope rather than trusting role names.

Product-level clarification from this conversation:

- `CUSTOMER` means an ordinary individual customer;
- the current `VIP_CUSTOMER` concept is intended for small and large business customers, so `BUSINESS_CUSTOMER` or organization-account terminology is more accurate than “VIP customer”; migration/renaming must be deliberate and backward compatible;
- Sender and Receiver are not separate global roles. They are relationships to a consignment/package;
- a receiver may not have a CeylonSwift account;
- a receiver can access safe details through a secure link plus phone OTP;
- sender-supplied receiver data must not silently become or overwrite the receiver's official user profile;
- saved receivers belong to the sender's private address book unless the receiver separately verifies/claims an account relationship.

## 7. Individual customer onboarding decisions

Customers can join through the public website or a dedicated customer app, using one shared account/backend.

### 7.1 Recommended staged onboarding

Step 1: mobile verification

- primary mobile number is mandatory;
- send OTP, then reveal OTP-entry UI;
- use resend cooldown, attempt limits, expiry, and safe returning-customer behavior;
- a returning number should receive “welcome back, verify and continue,” not an account-exists dead end.

Step 2: identity/security

- legal/display name;
- optional email;
- if email is provided, verification can be requested but optional email verification must not block mobile-first account use;
- password and confirmation/show-password UX;
- secure password storage remains backend-only.

Step 3: default pickup location

- location label such as Home/Work/Other;
- exact map pin is required to complete delivery onboarding;
- location permission itself must not be the only path: allow current location, choose on map, and manual pin adjustment;
- textual address remains necessary alongside coordinates;
- collect landmark, building/unit/floor, gate/access, and pickup instructions;
- allow multiple saved locations;
- serviceability must be validated against configurable areas.

Step 4: consent

- Terms of Service acceptance;
- Privacy Notice acknowledgement;
- separate optional marketing consent;
- store agreement version, actor, timestamp, and evidence rather than a bare boolean.

### 7.2 Google sign-in

- support Google Identity Services/One Tap and a normal Continue with Google button fallback;
- backend must validate the Google credential and bind the provider identity safely;
- Google gives identity/email but does not complete delivery onboarding;
- after Google identity, still require mobile + OTP, default pickup location, required profile details, and agreements;
- a Google-created account does not require an immediate local password, but may set one later.

### 7.3 Data separation

- account/profile data is canonical for the user;
- each parcel must store immutable sender/recipient/address snapshots so later profile edits do not rewrite historical deliveries;
- booking autofill can use profile/default-location data, but per-order overrides must not silently update the profile.

## 8. Individual customer booking decisions

### 8.1 Pickup method

Both methods exist:

1. Doorstep pickup by a rider;
2. Customer drop-off at a CeylonSwift hub/branch.

Doorstep pickup may add a configurable pickup fee. Hub drop-off normally avoids that pickup fee. Availability and price must update immediately based on the selected method.

### 8.2 Booking information

Autofill but permit per-order editing of:

- sender name;
- sender mobile;
- pickup address and map pin.

Collect:

- receiver name;
- receiver mobile;
- delivery textual address and exact map pin;
- delivery landmark/instructions;
- parcel category and description;
- weight and dimensions;
- quantity/piece count;
- declared value;
- fragile/liquid/special handling flags;
- service level;
- packaging choice;
- delivery-fee payer;
- payment channel;
- COD goods amount, if applicable;
- pickup date/time window;
- prohibited/restricted-items declaration.

### 8.3 Saved receivers

Customers can save reusable receiver entries with a custom nickname, name, phone, map pin, address, landmark, and instructions. These are sender-owned address-book entries, not receiver identity records.

### 8.4 Service levels

Working product names discussed:

- Standard;
- Premium/Express/Fast;
- Lightning Fast/Priority/Same-Day.

Names and exact SLAs remain unresolved and must be configurable by route, area, capacity, cutoff time, and operating conditions. Do not display unsupported promises.

### 8.5 Price composition

The estimated quote may include:

```text
Route/base delivery fee
+ Weight/dimensional component
+ Service-level component
+ Doorstep pickup fee
+ COD service fee
+ Packaging fee
+ Optional protection/special handling
+ Remote/urgent/other configured surcharge
= Estimated total
```

The system must separate:

- who pays the delivery fee;
- how the delivery fee is paid;
- the COD goods amount collected from the receiver.

Customer-entered weight/size creates an estimate. Rider/branch verification may create a final price, with customer confirmation before an increased charge is committed.

### 8.6 Packaging

Options include customer-packed, standard CeylonSwift packaging, and premium protective packaging. Packaging types/sizes and charges are configurable. Future options may include waterproof cover, tamper evidence, bubble protection, boxes, and fragile labeling.

### 8.7 Categories and capacity

CeylonSwift intends to accept all lawful and operationally supportable parcel categories, but launch availability is restricted by capability. Categories, vehicle compatibility, weight, dimensions, service levels, zones, packaging requirements, COD eligibility, temporary locks, and surcharges must be admin-configurable and versioned.

There is no single hard-coded maximum weight/size. Eligibility depends on vehicle type, route, service level, category, weight/volume, hub capacity, and current operational capacity.

### 8.8 Prohibited and restricted items

Use two categories:

- Prohibited: never accepted;
- Restricted: accepted only with applicable permit/prescription/special packaging/manual approval.

The policy must be source-backed, versioned, updateable, accepted during booking, and enforced by category/rules rather than being only a Terms page. Rider/branch staff must be able to refuse, hold, or escalate suspicious parcels. Domestic and future international rules must be separate. Obtain final Sri Lankan legal/compliance review before launch.

## 9. Pickup scheduling decisions

- Future dates are selectable;
- initial supported areas are intended to support 24-hour operations, but availability is configurable;
- use time windows rather than promising an exact minute;
- urgent pickup may add a configurable fee;
- automated SMS/notifications are sent; the rider may call when needed;
- admin configuration controls area hours, available dates, slot duration/capacity, cutoffs, urgent availability/fees, holidays, and notification timing.

The precise interpretation of “same-day pickup is not a default guarantee” should be preserved. Availability is based on the supported area, slot, rider capacity, and service policy.

## 10. Two-code parcel activation design

There are exactly two user/operational codes, not three:

1. Temporary app-generated confirmation code;
2. Permanent pre-printed physical QR code.

Internal database UUIDs exist but are not a third user-facing code.

### 10.1 Temporary confirmation code

Generated after a customer fills booking data. It allows an authorized hub employee or assigned rider to retrieve the booking, confirm handover, and authorize binding to a physical QR. It is one-time, bounded, attempt-limited, booking-bound, and expires/locks after successful binding.

### 10.2 Physical QR label

The printed QR is a unique physical parcel identity. Example short route:

```text
https://ceylonswift.lk/q/8F7K2M9Q
```

The user proposed a random 10-character uppercase alphanumeric code. Security recommendation:

- keep a human-readable short label code;
- use a longer signed/opaque value inside the QR URL if possible;
- never treat possession of the QR as authentication;
- require login/OTP for sensitive data;
- rate-limit public lookups;
- detect copied/duplicate labels through custody and scan behavior.

One physical parcel item receives one QR. A multi-piece consignment therefore needs a parent consignment with multiple parcel items/labels.

## 11. QR batch, inventory, and custody decisions

QR labels are generated semi-automatically in bulk by an authorized admin/manager workflow and externally printed by a low-cost manufacturer. Initial planning example: up to approximately 100,000 labels for a three-month period, changing with growth.

The manufacturer export must contain no customer data. It needs batch ID, quantity, unique labels/tokens, print-ready format, manifest/checksum, requester, approver, manufacturer, sent/received dates, and reconciliation.

Recommended batch/label lifecycle:

```text
GENERATED
-> APPROVED
-> EXPORTED
-> PRINTED
-> RECEIVED
-> ALLOCATED
-> AVAILABLE
-> ACTIVATED
-> IN_TRANSIT
-> DELIVERED
-> CLOSED
```

Exception states include `VOID`, `LOST`, `STOLEN`, `DAMAGED`, and `DESTROYED`.

Normal customer activation:

```text
Customer creates booking and gets confirmation code
-> Rider or hub officer physically receives parcel
-> Authorized actor retrieves booking with temporary code
-> Weight/condition/price are verified
-> Actor scans an AVAILABLE printed QR assigned to their branch/rider custody
-> Booking and physical QR bind atomically
-> Confirmation code is consumed
-> Pickup/custody event is created
-> Customer receives confirmation
```

Walk-in hub flow permits an authorized employee to create the booking, verify/package the parcel, scan an available QR, bind it, and issue a receipt.

Every QR/custody scan should record an immutable event with label, parcel, type, previous/new state, actor, role, device, branch/hub, server time, location when required, result/rejection, request ID, and previous/new custodian.

Missing/stolen QR workflow:

- record incident, range/list, reason, actor/custodian, last scan, branch, and time;
- manager verification;
- permanently block labels;
- alert on future scan with safe device/location/context;
- preserve evidence;
- escalate legally only after appropriate investigation.

Unauthorized-pattern detection should cover duplicate binding, scan after close, lost/stolen scan, wrong custodian, impossible location sequence, label activated before receipt, invalid state sequence, and repeated code probing.

## 12. Branch/network and routing decisions

CeylonSwift is a startup with few riders. The system is intended to maximize utilization now and retain that efficiency as the network grows.

### 12.1 Startup network

```text
Customer/pickup rider
-> nearest available branch
-> another rider or available bulk transport
-> destination-nearest branch
-> optimized final-delivery route
-> receiver
```

There is not yet a complete main/sub-branch or dedicated linehaul fleet. Currently parcels go to the nearest branch. Dedicated inter-branch vehicles and a richer branch hierarchy are future capabilities.

### 12.2 Future network

```text
Pickup rider
-> sub-branch
-> main sorting branch
-> dedicated van/truck/linehaul
-> destination main branch
-> destination sub-branch
-> delivery rider
-> receiver
```

### 12.3 Dynamic route optimizer

Pickup and delivery are not separate rider roles at launch. The same rider can do both on one optimized route.

Optimizer inputs include:

- exact pickup/delivery coordinates;
- service level/SLA/time windows;
- rider shift/availability/start location;
- preferred/assigned service area;
- vehicle type, weight, volume, and parcel compatibility;
- existing load and QR inventory;
- traffic/travel time/distance/fuel;
- branch opening/cutoff times;
- COD/cash limit;
- breaks, route duration, and safety rules.

Routes should cluster work geographically, divide parcels among eligible riders, and order each rider's stops. A physical parcel must never be simultaneously assigned to two riders.

New nearby pickups can be inserted into an active route only if capacity, time window, QR inventory, and existing SLAs remain valid. Otherwise offer a realistic later time range or combine with a future route.

Completed stops and the immediate next stop should be stable. Re-optimize only the remaining route. The rider may request/reason a route-order change. Emergency/road closure can permit immediate temporary reroute; changes that affect SLA/COD/high-priority work require manager approval. All changes are audited.

Implementation should grow in stages:

1. nearest eligible rider plus dispatcher approval;
2. daily multi-stop optimized routes;
3. live pickup insertion/re-optimization;
4. multi-rider capacity balancing;
5. branch-to-branch linehaul scheduling;
6. predictive demand/capacity planning.

## 13. Offline continuity architecture

Offline operation is a core requirement, not a later convenience. The business must continue through rider dead zones, branch internet failures, central outages, and broader network failures.

Do not copy the entire production database to every branch/rider. Use encrypted, scoped local data and event synchronization:

```text
Central authoritative platform
<-> HQ local operational node (company-wide operational scope)
<-> Main/sub-branch local node (branch-relevant scope)
<-> Rider local encrypted store (assigned routes/parcels only)
```

Branch-local scope may include relevant parcels, riders, route plans, QR inventory, processing queues, and local rules. Rider-local scope includes current routes, assigned parcels, recipient delivery data, COD amounts, allocated QR labels, and an offline action queue.

Offline-allowed operations should include:

- QR scans;
- pickup confirmation;
- branch receive/dispatch;
- custody handover;
- delivery/failed-attempt recording;
- locally captured proof;
- COD-collected record;
- GPS queue;
- branch booking;
- activation of a label already allocated to that branch/rider;
- local receipt/reference generation.

High-risk central actions should remain online-only or pending approval:

- role/owner/admin changes;
- QR batch generation;
- global pricing publication;
- final COD settlement/payout approval;
- financial reversal/refund;
- system-wide configuration;
- lost/stolen label unlock.

Every offline write needs a globally unique event ID, actor, device, branch/rider, local/server time metadata, entity/version, previous/new state, integrity metadata, and sync status. Append-only scans merge; package state transitions must validate order; duplicate QR activation must quarantine rather than overwrite; money must use an immutable ledger; assignment conflicts require version checks/manual reconciliation.

UI must show Offline Mode, last synchronization, queued actions, and conflicts. Customer tracking must show last-known location when live sync is unavailable, not a false live marker.

This is a major future architecture change. The current Phase 8 behavior intentionally fails mutations when the central database is unavailable and has no localStorage fallback.

## 14. Delivery proof and receiver handover decisions

The rider manually initiates completion, but backend rules decide whether completion is valid.

Required validation may include:

- correct assigned rider/device;
- correct parcel and QR;
- correct package state;
- rider inside configured delivery geofence;
- configured proof requirements satisfied;
- COD recorded when applicable.

Sender selects independently:

Who may receive:

- receiver only;
- receiver or authorized household/person.

Required proof:

- normal confirmation;
- signature;
- OTP;
- signature + OTP;
- future high-value/identity-check policy.

These options can affect price. Rider UI must show the exact checklist and prevent completion while required evidence is missing.

Delivery completion should atomically:

- mark package delivered;
- save time/location/proof;
- close active assignment/custody;
- close the QR lifecycle permanently;
- update COD state;
- notify sender and receiver;
- request optional receiver confirmation/feedback/rating.

Receiver feedback/rider rating is optional, verified-delivery only, and subject to moderation/anti-abuse. The receiver can also report “not received,” which creates a dispute.

### 14.1 Live parcel location

The user requires exact live parcel location as a high-standard product feature. Exact location is available to:

- authenticated sender;
- receiver after phone OTP verification.

Public/unknown tracking sees milestones only. When the parcel is with a rider, parcel location effectively reveals rider location, so access is active-delivery only, audited, short-lived, and stopped immediately after delivery/unassignment. At a hub, show hub location rather than a rider. Tracking-link use on a new device can require OTP again.

## 15. Failed delivery, rescheduling, returns, and cancellation

### 15.1 Delivery failures

Failure reasons are controlled and include receiver unavailable/refusal, incorrect location, unreachable receiver, proof failure, COD/payment refusal, unsafe/inaccessible location, requested reschedule, parcel damage, rider/vehicle emergency, and operational/weather restriction.

Parcel lost/stolen is not an ordinary failed delivery. It creates a separate security investigation, freezes the parcel/QR/custody history, alerts responsible management, and preserves evidence.

### 15.2 Contact attempts

Planned contact sequence:

1. Branch performs a daily/bulk delivery confirmation call;
2. Rider calls when approaching;
3. Rider calls on arrival.

If calls two and three are unanswered, the rider may leave after the configured service-level wait period. Calls need time, actor, answered/unanswered, duration/reference, and preferably masked-number handling.

### 15.3 Waiting time

Wait time is service-level/configuration dependent, approximately 0 up to 10-15 minutes in the user's concept. Product recommendation is to preserve a non-zero minimum. Suggested configurable starting points:

- Standard: 5-10 minutes;
- Premium: 10-15 minutes;
- Lightning: 3-5 minutes.

### 15.4 Attempts and returns

First failed attempt records evidence, returns/holds at the sub-branch, notifies parties, and schedules another attempt. A next-day second attempt is expected. Premium/high-value parcels involve call-center contact with the sender before return. Standard parcels can enter configured hold/return policy after attempts are exhausted. Return fees and conditions must be shown in advance. Lower priority means capacity-efficient scheduling, not deliberate delay.

### 15.5 Receiver rescheduling

Receiver may reschedule through the secure link/app. Fees depend on stage: before route planning, after assignment, near/arrived, or after a failed attempt. No customer fee should be charged when the change is caused by CeylonSwift failure. Show and confirm the fee before applying it; use versioned rates.

### 15.6 OTP fallback

The sender-facing OTP option must display a prominent warning: select only when the receiver will be available with phone access. If the receiver is present but OTP is unavailable, the rider contacts customer care; customer care securely verifies the sender; the sender may authorize an exception and accept responsibility; a one-time audited override is issued. High-value policy may prohibit overrides. Otherwise enter return protocol. A verbal “yes” alone is insufficient authorization.

### 15.7 Cancellation

- before pickup/activation: cancel directly, remove assignment, expire the temporary code, process applicable refund;
- after physical pickup/QR binding: this becomes `RETURN_REQUESTED`, not instant cancellation;
- intercept at the next safe branch/scan point and create a return route;
- QR remains bound to the parcel and closes only when the lifecycle finishes;
- never reuse the QR.

## 16. COD and cash decisions

The sender fixes the COD goods amount. Delivery fee and COD amount are separate.

The rider may collect:

- approved COD amount;
- optional tip.

The rider must never collect the delivery fee or unauthorized charges in cash. Allegations are investigated; disciplinary/legal action follows evidence and due process.

Do not make cash COD withdrawable to the sender merely because a rider pressed Delivered. Use a ledger lifecycle:

```text
COD expected
-> collected by rider
-> pending rider deposit
-> deposited at branch
-> cash count verified
-> sender settlement initiated
-> CeylonSwift charges deducted
-> sender paid
```

Sender may see a real-time pending balance after delivery, but cash becomes available only after reconciliation. Digital payment can settle faster under its provider rules.

Current operating policy proposed by the user:

- maximum rider cash: LKR 100,000;
- maximum holding time: four hours;
- morning COD must be reconciled before receiving the next route/batch;
- two route batches: morning and after lunch;
- whichever limit is reached first triggers mandatory deposit;
- rider and authorized branch cashier/manager perform dual count/confirmation;
- mismatch creates an incident and can block further COD assignments pending review.

## 17. Complaints and support decisions

Support entry channels:

- web;
- customer/rider apps;
- hotline;
- email;
- social media;
- hotline number printed on every physical QR label.

All channels must converge into a single case-management system with case ID, parcel/QR, complainant, category, priority, assigned team/branch, evidence, status, SLA, resolution, and escalation history. Never discuss sensitive parcel data publicly on social media; verify identity and move to a private support channel. Future target is 24/7 support as capacity grows.

## 18. Notification architecture decisions

Use an event-driven notification engine, not scattered direct provider calls. Each rule includes recipients, priority, channels, template/language, timing, retry, escalation threshold, quiet-hour behavior, deduplication, delivery status, and configuration version.

Primary channels:

- Push: primary operational channel;
- SMS: OTP and critical time-sensitive delivery events;
- Email: important confirmations, receipts, settlements, returns, and support;
- In-app: complete history.

Important customer events include booking created/confirmed/rejected, pickup requested, rider assigned/accepted/approaching/arrived, picked up, branch arrival/departure, out for delivery, rider nearby, delivery completed, proof verified, failed attempt, unavailable/incorrect address, reschedule, hold, cancel, return, COD collected/settled, complaint, and rating request.

Additional required messages include “rider arriving in X hours,” “rider nearby,” COD amount to prepare, pickup/delivery delay, and receiver confirmation.

Office/branch alerts include new booking, pending pickup, unassigned rider, branch receipt, missing scan, invalid contact/location, failed delivery, damage, overdue COD, branch dwell delay, complaint, emergency, and branch/system offline.

Owner/CEO real-time alerts should focus on critical exceptions rather than every parcel event: major outage, security breach, rider emergency, theft/serious damage, high-value loss, long branch outage, COD mismatch/fraud, serious unresolved complaint, repeated failures, high backlog, SLA failures, and revenue/payment discrepancy. Daily summaries should cover operations, revenue, COD outstanding, failures, branch/rider performance, complaints, and system health.

Suggested priorities:

- Critical: push + SMS + dashboard;
- High: push + dashboard;
- Normal: push/in-app;
- Informational: dashboard/daily summary.

Provider sends must use an outbox/worker, retries, delivery receipts, dead letters, templates in English/Sinhala/Tamil, and operational-vs-marketing preference separation.

## 19. Data access, retention, and CEO visibility

All operational events should be retained according to policy, but “save everything forever” is not acceptable for sensitive data.

- package/QR/custody/audit history: long-term controlled retention;
- financial ledger: statutory/accounting retention;
- signatures/photos: defined limited retention;
- continuous GPS: only the necessary operational/legal period;
- OTP plaintext: never stored;
- customer/rider PII: role- and purpose-scoped;
- deleted accounts: appropriate retention/anonymization rather than destructive loss of audit history.

The CEO/Owner may have company-wide operational oversight and authorized drill-down, but not unrestricted default exposure to every sensitive field. Sensitive customer/rider detail access should require purpose, permission, recent step-up/MFA, and audit. Passwords, raw OTP values, token material, and payment credentials remain inaccessible to everyone including CEO. CEO/Owner, Admin, and Super Admin are distinct roles.

## 20. Individual customer history

Sender history should include current/previous parcels, tracking, receipts, COD/settlement, returns/cancellations, support cases, delivery proof, ratings, and Send Again. OTP-verified receivers may see safe inbound-delivery history. All views exclude unrelated sensitive data.

## 21. Rider role decisions

### 21.1 Rider types

- employee riders and independent/partner riders both exist;
- pickup and delivery are performed by the same rider, not separate roles;
- employee and partner operational duties are currently intended to be the same; payment/legal treatment differs;
- future `Branch-transfer Rider` exists as a planned role/capability, not a launch capability.

Because fixed shifts, mandatory work, and management control may affect legal classification, the “partner” label alone must never be used to bypass employee obligations. Obtain Sri Lankan employment-law review.

### 21.2 No public rider signup

Use authorized Rider Onboarding:

```text
Authorized account creates application
-> basic application
-> identity/vehicle verification
-> interview/background review
-> employment/service agreement
-> Branch Manager approval
-> second higher authorized approval
-> rider account activation
```

An authorized actor may issue a secure one-time onboarding link for the applicant to fill data, but the applicant cannot create/activate a public rider account. Separate permissions should cover create, verify documents, branch approval, HQ approval, activation, suspension, and offboarding. Requester must not self-approve both levels.

### 21.3 Rider identity/application data

Required/planned data includes:

- NIC legal name and number;
- date of birth and age validation;
- preferred name and optional gender;
- primary/secondary mobile and recommended email;
- permanent/current address, district/city/postal code;
- preferred branch and working area;
- full/part-time availability, days, and hours;
- emergency contact name/relationship/phone;
- NIC front/back, rider photo, recommended live selfie;
- recommended address proof, police clearance/status, and references.

Vehicle-class-specific age/licence rules must be configurable and legally reviewed. Do not hard-code 18 for every future vehicle class.

### 21.4 Vehicle data

Launch vehicle: rider-owned bike. Future admin-configured vehicle types can include bicycle, three-wheel, car, van, and truck only after capability/document/rate rules exist.

Collect as applicable:

- vehicle type, registration, make/model/year/color;
- engine/chassis for internal verification;
- owner name/NIC and relationship;
- registration certificate, revenue licence, insurance, emissions/fitness as applicable;
- front/rear/side and delivery-box photos;
- owner consent, owner NIC copy, commercial-use permission, and consent expiry when rider is not owner;
- driving licence number/images, class, issue/expiry, status, restrictions, and verification date.

Expiry monitoring:

- 60 days reminder;
- 30 days warning;
- 7 days critical;
- expired document blocks relevant assignments while allowing renewal/account access.

### 21.5 Payroll/bank/onboarding agreements

Bank data includes account holder, bank, branch, account number, proof, and verification. Name should match verified legal identity. Bank changes require rider request, OTP, proof, office verification, admin approval, audit, and a 24-hour hold.

Employee data may include employment type, employee number, branch, dates/probation, salary, allowances, incentives, hours/rest days, supervisor, assets, and EPF/ETF status. Employee and partner payroll engines must be separate and legally reviewed.

Agreements are versioned evidence, not bare checkboxes. Planned agreements cover employment/service terms, job description, privacy/location tracking, background verification, vehicle use, road safety, parcel/COD handling, confidentiality, acceptable use, equipment, loss/damage reporting, disciplinary/complaint procedure, emergency contact, and rider app terms.

### 21.6 Shift and availability

Current intended employee schedule:

```text
Morning route: 08:00-12:00
Meal break: 12:00-13:00
Afternoon route: 13:00-17:00
```

This assumes the user's `8pm` message meant `8am`; confirm if needed. Exact normal hours, meal interval, overtime, night, holiday, and regional rules must follow applicable Sri Lankan classification and be versioned/configurable.

Future operations support 24/7 shifts, night shifts, region/role differences, and temporary riders. Partner riders submit availability; system proposes confirmed shifts; branch manager confirms; admin can make audited changes. Partners can later enter a formal permanent-employee onboarding path.

Launch check-in is branch check-in + GPS check-in. Future selfie/vehicle checklist controls can be feature-configured, but safety/legal controls must not be casually disabled.

### 21.7 Route/task acceptance

Default response window discussed: one hour, admin-configurable. A rider cannot casually reject an assigned task; they submit a branch request and the branch contacts them. However immediate operational exceptions must exist for accident, medical emergency, breakdown, unsafe location/customer, capacity mismatch, prohibited parcel, licence/vehicle restriction, or impossible route. Planned-route and live-insert timeouts should be configurable separately.

### 21.8 Route batches and custody

Two daily route batches are planned: morning and after lunch. Hub Manager creates a route-batch manifest and bulk-assigns parcels. Rider does not necessarily scan every parcel at loading but must see the list/count, physically double-check, report discrepancies, and accept the batch. Before acceptance, manifest discrepancy belongs to hub handling; after acceptance, rider custody begins, subject to investigation rather than automatic blame.

Pickup routes receive expected QR labels plus configurable spare labels. Labels transfer to rider custody and unused labels reconcile at return.

### 21.9 Stops, calls, waits, failures

The system route is default. Rider can request/reason a route change. Emergency/road closure permits temporary reroute; manager approval is needed when SLA/COD/high-priority work is affected. Route deviation can be ignored with reason, but delay creates a report.

Contact calls occur at branch daily planning, rider approach, and rider arrival. Failed attempts store geofence, calls, wait, reason, optional safe evidence, device/rider/time, and next action.

Photos are not required for every delivery. They are for high-value, fragile, damage concern, special sender request, or configured security need. Avoid capturing people/private interiors without consent.

### 21.10 Breakdown and rescue

Rider calls hotline/uses emergency flow. Hub Manager and Admin receive high-priority alerts. Nearby eligible riders receive a rescue task; one accepts; custody is transferred; rescue allowance is added. If no rider is available, send an available hub vehicle. Configure medical, police/security, and recovery escalation teams.

### 21.11 Breaks and branch return

- legal meal/rest policy is separate from an additional route pause;
- additional route pause discussed: less than 30 minutes, recorded in app;
- COD, undelivered parcels, or unused QR labels require return/reconciliation;
- if none exist, Hub Manager/Admin may approve remote shift close;
- morning COD must reconcile before next batch;
- reconciliation failure creates an operational hold/investigation, not automatic legal action.

### 21.12 Rider payment structure

Source attachment used in this conversation:

```text
C:\Users\prabo\.codex\attachments\7743735f-34ff-4860-ad11-0dd60492394a\pasted-text.txt
```

Employee payment:

- weekly: approved fuel reimbursement, maintenance allowance, valid failed-attempt travel, approved special travel;
- monthly: salary, delivery/COD incentives, attendance/performance bonuses, overtime, night/holiday/rain/risk allowances, phone/data allowance, tips, approved deductions, applicable employee contributions.

Partner payment should not be labeled salary. Use configured service settlement: completed pickup/delivery fees, approved distance/fuel and maintenance components, COD handling, special conditions, valid failed attempt, tips, and adjustments.

Fuel formula:

```text
Approved distance / approved vehicle efficiency * effective fuel price
```

Track planned, actual GPS, approved, personal, and disputed distance. Only approved work distance is payable. Vehicle efficiency and fuel rates are admin-controlled, versioned, effective-dated, and immutable historically. Company-owned vehicles do not receive the same rider-owned fuel reimbursement.

Incentives must distinguish base and supplements to prevent double counting. Failed-attempt incentives require geofence/call/wait/reason verification and fraud monitoring. Customer ratings need minimum sample, investigation, and dispute controls.

Weekly process proposed: Monday-Sunday data; Monday calculation/disputes; Tuesday office review; Wednesday approval/payment file; Thursday bank payment. Monthly process: period close; days 1-3 review/disputes; day 4 approval; day 5 bank payment.

Paid payroll cannot be edited/deleted; use adjustment transactions. Every adjustment/deduction requires reason, evidence/policy, rider notice/dispute window, approver, timestamp, and audit. Do not automatically reduce contractual basic salary as a performance mechanism.

### 21.13 Performance, complaints, discipline

Metrics may include assignments, success/first-attempt/on-time rates, COD accuracy, ratings with minimum sample, attendance, late arrivals, verified complaints, damage/loss after investigation, safety, scans/custody, and active hours.

Recommended progression:

```text
Coaching
-> written warning
-> performance improvement plan
-> final warning/restricted assignments
-> formal disciplinary review
-> legally justified suspension/termination
```

Serious complaints can create immediate safety restrictions and formal investigation. Ordinary ratings/complaints do not automatically reduce salary. Terms acceptance does not eliminate due process.

Do not deduct full parcel value first and investigate later. Correct order: freeze parcel/QR, identify custody, collect evidence/statements, determine accident/process failure/negligence/fraud, then apply a legally/contractually authorized recovery, insurance, or company-loss decision. Equipment loss/damage follows the same investigate-before-deduction rule.

### 21.14 Rider equipment and device

Launch-issued equipment: delivery box only. Track asset ID, condition photos, issue/acceptance/return, and condition. Future assets may include uniform/safety equipment, company phone/SIM, power bank, and other equipment. Dedicated QR scanner is not planned; QR is scanned with the phone.

Launch device: rider's personal phone with a separate work SIM/number. Off-duty customer contact is forbidden. Future company SIM/device is planned. Prefer masked calling so personal numbers are not exposed.

### 21.15 Rider app/device security

- one active registered device per rider is mandatory;
- device identity uses a device-bound cryptographic/app identity, not a fingerprint;
- biometric/fingerprint is optional, not mandatory;
- app lock is configurable;
- fallback can use app PIN/password/OTP;
- device change: Hub Manager request -> Admin approval -> revoke old device -> register new device -> audit;
- first activation uses credentials/OTP/device binding; sensitive actions require step-up;
- protect sensitive screens with screenshot/recents/clipboard controls where supported, click-to-call, masking, watermarking, expiry, encrypted offline storage, and access audit;
- these controls cannot prevent someone photographing the screen with another device.

App-login security record:

- when the rider logs in, save a one-time security event with rider, device, date/time, login location, network/IP context, app version, method, and result;
- this does not authorize continuous off-duty tracking;
- continuous operational tracking starts at check-in/active shift/task and stops at shift close;
- app may use current location locally off duty without continuously uploading it.

### 21.16 Rider location quality

Use adaptive, battery-aware real-time location rather than a fixed aggressive interval. Suggested design:

- Lightning/approaching stop: 3-5 seconds;
- normal active movement: 5-10 seconds;
- slow/stationary: 15-30 seconds;
- hub/break: geofence/low-frequency;
- low battery: reduced safe frequency;
- offline: encrypted queue and later sync.

Customer live map target can be approximately 5-10 seconds latency when conditions allow. Active-route Android implementation likely requires a foreground location service with a visible notification. Background tracking continues while an active shift/route/emergency task exists, even with the screen closed.

If location permission is deliberately disabled, block new assignments and alert Hub Manager/Admin. Temporary poor GPS/network must be distinguished from permission denial. Internet may be offline while device GPS continues locally.

Battery/device fallback:

- early warning around 20%;
- critical warning and manager alert at 15%;
- below threshold, block a new route batch;
- active route triggers rescue/return decision rather than stranding parcels;
- lost/damaged phone revokes sessions, locks/removes app data at next connection, and requires branch reporting/reassignment.

Default rider-app language is English; rider can change to Sinhala or Tamil. Critical templates need all three translations.

### 21.17 Rider route/shift summary

Show pickups, deliveries, failures, approved distance, route/break time, COD collected/deposited, fuel estimate, incentives/rescue allowance, and pending issues/disputes.

### 21.18 Offboarding

Branch Manager requests; Admin reviews/acts. Immediate safety access suspension may precede employment disposition. Reconcile QR labels, COD, parcels, box/assets, devices, offline events, and final pay. Revoke sessions and remove customer data. Archive account/history; do not delete audit/payroll/incident records.

## 22. Proposed new backend modules and database entities

These are requirements, not current code.

### 22.1 Customer/address/booking

- customer registration/continuation;
- saved locations;
- saved receiver/address book;
- serviceability rules;
- agreement acceptance versions;
- parcel-item/consignment grouping;
- delivery authorization/proof policy.

Potential entities:

- `SavedLocation`
- `SavedRecipient`
- `AgreementVersion`
- `AgreementAcceptance`
- `Consignment`
- `ParcelItem`
- `DeliveryAuthorizationPolicy`

### 22.2 QR and custody

- `QrBatch`
- `QrLabel`
- `QrBatchApproval`
- `QrCustodyTransfer`
- `QrScanEvent`
- `QrSecurityIncident`

### 22.3 Routing/branches/vehicles

- `ServiceZone`
- `Vehicle`
- `VehicleCapacityProfile`
- `RiderAvailability`
- `ShiftPolicy`
- `RiderShift`
- `RoutePlan`
- `RouteStop`
- `RouteAssignment`
- `RouteRevision`
- `LinehaulTrip`
- `BatchManifest`

### 22.4 Delivery proof/attempts/incidents

- `DeliveryAttempt`
- `DeliveryProof`
- `SignatureProof`
- `ReceiverVerification`
- `ReceiverConfirmation`
- `RiderRating`
- `DeliveryIncident`
- `LossDamageInvestigation`

### 22.5 Payments/COD/payroll

- `PaymentLedgerAccount`
- `PaymentLedgerEntry`
- `CodCollection`
- `RiderCashPosition`
- `CashDeposit`
- `CodSettlementBatch`
- `SenderSettlement`
- `RiderBankAccount`
- `RiderTrip`
- `RiderDistanceSummary`
- `WeeklyFuelSettlement`
- `MonthlyPayroll`
- `PayrollComponent`
- `PaymentTransaction`
- `PaymentDispute`
- `RateConfiguration`
- `DeductionAuthorization`

### 22.6 Notifications/support/offline

- `OutboxEvent`
- `NotificationRule`
- `NotificationTemplate`
- `NotificationDelivery`
- `SupportCase`
- `SupportCaseEvent`
- `OfflineDevice`
- `OfflineEvent`
- `SyncCheckpoint`
- `SyncConflict`
- `BranchEdgeNode`

### 22.7 Rider workforce/security

- `RiderApplication`
- `RiderDocument`
- `RiderApproval`
- `RiderDevice`
- `IssuedAsset`
- `PerformanceScore`
- `PerformanceReview`
- `WarningNotice`
- `ImprovementPlan`
- `ComplaintInvestigation`
- `SafetyIncident`
- `RiderOffboarding`

All additions need explicit ownership/scope, indexes, retention, audit, transactions, idempotency, optimistic concurrency, safe DTOs, tests, and migration/rollback plans.

## 23. Completed work and current verification evidence

Executed during this conversation before this handoff document was added:

- frontend test suite: 79/79 passed;
- backend Jest suite: 75/75 passed across 25 suites;
- backend Nest build: passed.

Commands used:

```powershell
# repository root
npm test

# backend/
npm test
npm run build
```

These results verify the current tested code at that point; they do not verify proposed future requirements. Browser/live production validation was not rerun for this handoff. Phase 8 documentation separately records earlier E2E, lint, Prisma, audit, migration, seed, health, and manual verification evidence; do not misrepresent those older counts as a fresh run.

## 24. Current Git state

Captured before adding this handoff file:

- branch: `main`;
- HEAD: `482ee4a Complete logout transition routing fix`;
- working tree is intentionally dirty;
- line-ending warnings exist for some backend files (LF may become CRLF if touched).

### 24.1 Staged changes

- modified: `app.js`
- added: `assets/ceylonswift-hero-route.png`
- added: `assets/ceylonswift-hero-route.webp`
- modified: `build-css.js`
- modified: `css/base/variables.css`
- modified: `css/bundle.css`
- modified: `css/bundle.min.css`
- modified: `css/components/operations.css`
- modified: `css/pages/dashboard.css`
- modified: `css/pages/home.css`
- modified: `css/utilities/themes.css`
- added: `docs/phase-9a.md`
- modified: `index.html`
- modified: `js/compatibility/legacy-auth-bridge.js`
- modified: `js/errors/error-presenter.js`
- added: `js/landing-page/dashboard-controller.js`
- modified: `js/navigation/navigation-registry.js`
- added: `js/notifications/toast-manager.js`
- modified: `js/operations/operations-controller.js`
- added: `js/public/landing-page.js`
- added: `test/frontend/landing-phase9a.test.mjs`
- added: `test/frontend/toast-manager.test.mjs`

Cached diff summary at capture: 22 files, 2,162 insertions, 1,663 deletions, plus two binary assets.

### 24.2 Unstaged tracked changes

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `backend/src/app.module.ts`

Unstaged diff summary at capture: 3 files, 182 insertions, 5 deletions.

### 24.3 Untracked paths

- `artifacts/`
- `backend/prisma/migrations/20260715090000_add_phase_9a_landing_content/`
- `backend/src/modules/landing-page/`
- `PROJECT_HANDOFF.md` after this document was created.

Do not stage/commit/push any of these without explicit user instruction.

## 25. Files changed by this handoff task

Only this documentation file was created:

- `PROJECT_HANDOFF.md`

No project source, schema, migration, test, asset, configuration, or generated code was modified by the handoff task.

## 26. Requirements status

Requirements gathering is now sufficiently complete to enter architecture freeze and phased implementation planning. Office Staff, Hub Employee, Hub Manager, Customer Care, Business Customer, bulk transport, fleet, temporary workforce, department administration, payments, returns, offline continuity, public Open Beta, and release/version behavior were all defined after the original handoff was written.

The remaining inputs are configuration or procurement decisions rather than blockers to designing the platform:

- exact numeric prices, limits, fees, discounts, payroll rates, compensation amounts, and score weights;
- exact launch branches, service zones, staff counts, vehicles, and pilot parcel volume;
- final map/routing, OTP/SMS/WhatsApp, payment, bank-payout, object-storage, observability, and telematics providers;
- final legal text and current Sri Lankan legal review for employment, temporary work, privacy, prohibited goods, insurance, deductions, retention, signatures, taxes, and claims;
- final mobile framework and offline edge hardware;
- production infrastructure budget beyond the single-server Open Beta;
- final marketing copy and brand assets.

All of these must be represented as versioned configuration, provider interfaces, feature flags, or legal-review gates rather than hard-coded assumptions.

## 27. Post-handoff product decisions

### 27.1 Workforce and branch hierarchy

- Launch staffing at a small hub may be Hub Manager plus Rider. Office Staff, Hub Employees, Customer Care, Fleet Manager, HR, Finance, Security/Legal, and additional riders are added as operations grow.
- Hub Employee is Level 1 physical operations with a personal, limited account/badge and a minimal scan/sort interface.
- Office Staff is Level 2 and can perform booking intake, allowed pre-confirmation corrections, weighing, packaging, QR binding, receiving scans, sorting/storage support, manifest preparation, returns, branch support, and COD counting.
- Hub Manager leads a Main Branch or Sub-Branch and owns final inbound/outbound approval, branch custody, operational exceptions, reconciliation, staff oversight, temporary delegations, and branch-level complaint resolution.
- Customer Care is a distinct future role. At launch, Hub Manager or Office Staff may handle it. Main Branch/HQ may have dedicated Customer Care.
- A separate Head of Riders role/dashboard is not required. Trusted, experienced riders receive a reviewed `Trusted Bulk Transport` capability while retaining the normal Rider app.
- Higher roles may act on lower-level functions within their department scope. Department Admins remain department-scoped. CEO has company-wide access in one account without impersonating another user.

### 27.2 Hub intake, confirmation, sorting, and custody

- Online-prepared parcels use the temporary receiving code to retrieve the draft, validate it, bind an available printed QR, package if needed, and confirm.
- Walk-in parcels are entered by Hub Manager/Office Staff, validated, priced, packaged, bound to a QR, and confirmed.
- Weight, dimensions, category, packaging, policy, location, and price checks occur before final confirmation; there is no redundant second verification step after confirmation.
- Before confirmation, allowed fields may be corrected. After confirmation, sensitive changes require customer notification/OTP plus Manager approval and a full old/new audit record.
- After confirmation, the route engine selects the next branch, rider, or long-distance bulk group. Hub Employees scan parcels and receive exact sorting instructions.
- Hub Employees are responsible for correct sorting; riders are responsible for accepting the correct load; Hub Manager is responsible for final oversight and dispatch/receipt approval.
- Every physical handoff records actors, branch, device, location, time, parcel/load IDs, seal when applicable, and custody state.
- Manager approval is mandatory for parcels entering or leaving a branch, but approved manifests may be handled in bulk.
- Rider-to-Hub pickup batches are rapid-scanned by receiving staff; Manager bulk-confirms the received batch. Missing parcels become exceptions without blocking unaffected parcels.

### 27.3 Bulk loads and night operations

- Security seals/Load QR codes are used for bulk bags/containers, not ordinary individual parcels.
- Parcels for different next destinations are packed into separate sealed loads with a digital manifest.
- Intermediate branches do not open sealed loads unless an emergency inspection is authorized by Hub Manager plus HQ.
- Destination staff verify the seal, open under authority, scan contents, compare the manifest, quarantine exceptions, and obtain destination Manager receipt approval.
- Night bulk loads are handled by already-authorized HQ/Main Branch officers; no separate Night Operations role is required.
- Lightning Fast loads may arrive pre-sorted for immediate night dispatch.
- Unnecessary seal opening is prohibited even for HQ staff; opening is logged and reported in real time to Admin/CEO.
- Morning Hub Manager performs a night-to-day handover reconciliation, not a retroactive custody confirmation.

### 27.4 Direct delivery

- The route engine may recommend direct delivery after pickup when it is more efficient than a hub path.
- An existing rider route may receive the stop; otherwise a dedicated rider/vehicle is assigned.
- Hub Manager authorization is required and cannot be withheld without a valid reason. Rejection/timeout requires a reason and alerts HQ/Admin/CEO.
- If authorization cannot be obtained, the parcel follows the normal nearest-hub path.
- Premium, high-value, and COD parcels may use direct delivery only when their security and service rules pass.
- Receiver-unavailable direct deliveries go to the nearest responsible branch and enter the failed-delivery protocol.

### 27.5 Branch opening, closing, delegation, and controls

- The Manager dashboard shows all branch parcels, storage, incoming/outgoing loads, staff, riders, QR inventory, COD, failures, incidents, and capacity.
- Opening includes confirmation of night handover and physical/system reconciliation.
- Closing includes parcel, QR, manifest, stock, COD, and incident reconciliation. Reports flow to Main Branch, HQ, Admin, and CEO.
- Temporary Acting Manager authority can be granted to an Office Staff head after notice, CEO/Admin approval, agreement acceptance, time/branch scoping, and audit.
- Branch/account actions are `Force Logout`, `Temporary Suspension`, `Permanent Deactivation`, and `Archived`; records are never erased.
- Planned deactivation uses drain mode and completes/transfers all parcels, cash, equipment, QR stock, and cases first.
- Emergency freeze uses a CEO-authored critical popup for selected users/roles/branches, acknowledgement, SMS/call escalation, and a safety-only interface. Operations remain frozen until authorized release.

### 27.6 Customer Care and complaints

- Every hub has a dedicated support channel; at launch it may be handled by Hub Manager.
- Branch Customer Care handles local cases; unresolved cases escalate to Main Branch/HQ without losing timeline or ownership history.
- All web, app, phone, email, and social contacts feed one support-case system with deduplication.
- Case flow is `NEW -> ASSIGNED -> INVESTIGATING -> WAITING -> RESOLVED -> CLOSED`, with reopen/escalation.
- Customer receives automated meaningful status updates, due-time reminders, and resolution accept/reopen actions. Internal evidence and legal notes remain private.
- Access age is configurable by service/status; active, failed, return, or complaint cases remain accessible while operationally required.
- Branch compensation is permitted within configurable limits and is fully logged/reported. Larger or unusual compensation escalates.

### 27.7 CEO and department administration

- CEO has company-wide access, global search across every entity, categorized dashboards, lower-role UI preview, and Owner Override without account switching.
- CEO actions always log as CEO. CEO sensitive-data access still requires step-up authentication and is audited.
- Department Admins exist for Operations, Finance, HR, Customer Care, Security/Legal, System, and technical infrastructure. They inherit only within their field.
- Normal high-risk actions use no-self-approval and dual approval by CEO plus the relevant authority.
- CEO may use an exceptional double-verified Owner Override, but immutable audit, custody, completed ledger, legal evidence, and finalized payroll records cannot be erased or overwritten.
- Acting CEO is time-limited, cannot appoint another Acting CEO, and cannot use Owner Override.
- Emergency Security suspension is immediate; reactivation requires dual approval.
- Technical Super Admin manages infrastructure but has no default business/finance/customer-content access. Troubleshooting access is approved, time-limited, and audited.

### 27.8 Business Customer model

- There is one Business Account/Organization model with configurable plans/tiers, not separate Small and Large account systems.
- Business users have a dedicated portal but share the canonical identity, parcel, payment, QR, and tracking platform.
- Personal Customer accounts are not converted into Business accounts. A verified identity may be linked to a separate Business organization/account context without mixing data.
- Application requires official and operational details, documents when applicable, authorized representative evidence, exact location, expected volume, services, and agreements.
- Small/local applications may be physically verified by Branch Manager. Large volume, credit, high COD, regulated goods, or API integrations escalate to HQ.
- Business account activation requires approval plus contract, pricing, payment/COD, privacy, and security acceptance.
- Business employees register and are identity/organization verified. Low-risk roles may be managed by Business Admin; high-risk roles require CeylonSwift Admin approval.
- Business roles are a separate lower-privilege namespace: Owner, Business Admin, Booking Operator, Finance, Tracking/Support, Viewer, and future scoped roles.
- Multiple verified locations, warehouses, employees, schedules, and consolidated reports are supported.

### 27.9 Connected Business and Business Lite

- `Connected Business` integrates an existing website/system. The business adds required delivery fields, especially exact map location, and informs existing users to update data.
- Only parcel-delivery fields are synced. External identity matching uses `(organizationId, externalCustomerId)` plus verified contact linkage; external IDs are never globally trusted.
- New external orders enter the authorized employee queue automatically. Missing data goes to `Needs Attention`.
- Agreement defaults fill known service, package, pickup, and handling values; order-specific values are completed by authorized employees.
- A temporary receiving/order code remains a manual fallback. Complete data from any channel becomes a Delivery Draft that can be bound to a permanent QR.
- `Business Lite` has no required website and no CSV requirement. It supports manual entry and a secure sender-to-receiver details link.
- The sender completes sender-side and parcel fields, then sends an expiring link. Receiver verifies by OTP and supplies receiver details/exact location.
- This link capability is common and may later be used by Normal Customers.
- Receiver may use OTP-only essential access or an account with saved locations/history.

### 27.10 Business QR inventory and pickup

- QR bundles are allocated monthly to verified Business locations based on agreed volume.
- QR batch, serials, quantity, issuing authority, receiving Business Admin, location, time, and custody are recorded.
- Authorized Business employees may bind and apply labels.
- Missing/damaged/stolen labels are reported through Hub Manager, locked, investigated, and may affect Business risk rating only after fault is established.
- Business recurring pickup templates store normal parcel count, service, schedule, vehicle, packaging, and price.
- Businesses may alter any occurrence, request additional pickups, change service/vehicle/time, and accept recalculated fees. Permanent defaults require a new agreement version.
- Pickup triggering may be manual, scheduled when ready stock is nonzero, or threshold-based. Availability and batching depend on area, branch resources, rider capacity, and Admin/Manager controls.
- System assigns a suitable existing-route rider or dedicated rider/vehicle.
- Rider acceptance is binding except valid emergency/safety reasons; delays/reassignment are reported.
- Delivery SLA starts at physical pickup/custody acceptance. Pickup ETA is tracked separately.

### 27.11 Tuition Open Beta vertical

- The first public operational market is approved Sri Lankan tuition teachers/institutes sending tutes, books, paper packs, and class materials.
- These customers use the same Connected Business or Business Lite modes; no separate hard-coded tuition account type is required.
- Teacher/institute websites add a CeylonSwift link per student/user. It opens OTP/account-based receiver details and tracking.
- Notification checkpoints depend on the selected plan; OTP/security messages remain mandatory.
- Teachers create class/grade/subject/month groups, material templates, recurring distribution batches, and shared organization templates.
- Student/parent supplies receiver name, verified mobile, exact location, address, and instructions.
- Receiver account may show that receiver's parcels from multiple teachers, while organizations remain strictly isolated from one another.
- Batch preview identifies eligible recipients, missing locations, combine opportunities, service, schedule, and total fee.
- Business approval plus CeylonSwift Hub Manager/Admin approval precedes packing.
- Packing workflow is `Student -> Material checklist -> Scan QR -> Confirm -> Next`.
- Optional material inventory reserves/deducts tute stock and forecasts shortages.
- Tuition V1 has no product-payment/COD processing. Teacher/institute pays CeylonSwift according to a flexible monthly agreement. COD remains a disabled future feature.

### 27.12 Returns and exchanges

- Contract Return Service initially applies to joined Business parcels and only when enabled in the agreement.
- Receiver resolves product eligibility with the Business first. Business Owner/Admin submits an authorized request using original QR/Parcel ID.
- Hub Manager checks contract, business conditions, return window, original journey, reference, and operational eligibility.
- The original delivery remains immutable and closed. A new Return Journey is created and the physical QR may be temporarily authorized for that journey only.
- Only one active journey may use the QR. Every return activation is approved, time-limited, and audited.
- If the original QR is missing, rider brings a new QR; original and return identifiers are linked and the higher fee applies.
- Return price is above one-way delivery but below two unrelated full deliveries, subject to configurable variables.
- Replacement/exchange shipment is always a new parcel/new QR, linked to the original/return case.
- CeylonSwift decides only its delivery/custody responsibility. Confirmed CeylonSwift fault may produce service refund/credit/compensation. Product-money refunds remain between Business and receiver in the initial release.

### 27.13 Branch-transfer, fleet, and temporary workforce

- Branch-transfer is a Rider capability, not a separate account/dashboard. Trusted riders receive reviewed, expiring bulk access.
- Fixed and demand-driven inter-branch trips are created from traffic, parcel volume, SLA, branch capacity, and vehicles.
- Trip records include rider/driver, vehicle, source/destination, route, sealed loads, manifest, times, stops, GPS, fuel/costs, and approvals.
- Hub Manager double-checks licence, vehicle, rest, capacity, seal, and manifest.
- Breakdowns create rescue/reassignment, evidence, old-seal closure, new seal, and new custody manifest.
- Company vehicles are primary. Hired verified vehicles and full/part-time CeylonSwift drivers are supported; external transport companies are not.
- Company vans/trucks require GPS/telematics/OBD. Rider-owned vehicles use app GPS plus periodic physical inspection.
- Fleet data covers ownership, documents, licence/insurance/service expiry, condition, assignment, maintenance, incidents, and analytics.
- Temporary workers use streamlined minimum legal/safety onboarding and persistent accounts. Login checks current conditions; suspicious/invalid access locks for Manager review.
- Shift types include single, selected-day, recurring part-time, fixed-term, day, night, and demand shifts.
- Shift access is GPS/task scoped and removed at completion. Payment can be cash or bank with proof, OTP/signature, configured rates, and unusual-payment review.

### 27.14 Branch, offline, inventory, and capacity

- Branch types are HQ, Main Branch, Sub-Branch, and future Temporary/Micro Hub.
- Master Branch Profile drives website, apps, call centre, mapping integrations, routing, availability, contacts, services, and public hours.
- Capacity includes parcel count, weight/volume, rack/floor space, riders, vehicles, storage, incoming/outgoing loads, and backlog.
- System predicts shortages and recommends load balancing, stock transfer, or resource additions.
- HQ/Main Branch has local offline capability; Sub-Branch edge capability is enabled by risk/volume.
- Offline mode supports allocated QR operations, receive/dispatch, sorting/storage, custody, delivery/failure, COD collection, and local receipts.
- Global pricing, roles, QR batch creation, final bank settlement, and sensitive overrides remain online/high-risk.
- Offline credentials are encrypted, verified-device, time-limited credentials. Events sync with actor/device/time/location/integrity metadata.
- Restore uses integrity check, parcel/QR/custody/COD reconciliation, exception quarantine, Manager/HQ approval, then normal status.
- Inventory covers QR bundles, packaging, boxes, bulk bags, seals, labels, receipts, equipment, and live capacity. Security stock uses dual approval.

### 27.15 Pricing, payments, protection, and policy

- Pricing is a central effective-dated rule engine combining customer/plan, contract, branch/region, service, distance, weight/volume, vehicle, pickup, COD, packaging, demand, time, and handling.
- Priority is `Special Contract -> Business Plan -> Customer Type -> Region/Branch -> Service -> Company Default`.
- Confirmed prices are versioned snapshots. Admin override requires old/new value, reason, approval, notification, and an adjustment record.
- Payment is immediate at the exact system-calculated price; no normal authorization-hold flow.
- Cash is initially Hub-counter only. Rider delivery-fee cash collection is disabled but may become an Admin-controlled future feature. COD and tips are distinct.
- Payment failure leaves a draft and prevents physical acceptance.
- Overpayment/difference defaults to wallet credit with verified-bank withdrawal, MFA, configurable limits, and Finance approval for high value.
- Financial balances derive from immutable ledgers. Provider credentials/card data are not stored.
- High-value threshold and mandatory protection are configurable. Evidence, serials, special packaging, seal checks, restricted riders/vehicles, and stronger proof apply.
- Allowed, Restricted, and Prohibited policy is Legal/Admin-managed, versioned, and validated before acceptance.

### 27.16 Data, privacy, and security

- Business organizations are tenant-isolated. A receiver identity may link internally across organizations, but no Business can see another Business's data.
- User profile edits are logged. Sensitive contact changes use OTP and current authentication.
- Normal recovery is automated identity/OTP; Business Owner/Admin/Finance recovery requires HQ/Admin review.
- Exact live GPS is available to authorized parties during the active journey.
- Raw GPS is retained long-term in encrypted archive per the user's requirement, with strict access and legal-policy review.
- Security/Legal/Admin historical raw GPS access requires a case/reference and reason. CEO may access without entering a reason but still requires step-up and is logged.
- Closed accounts keep their data unchanged, disable login, and remain historically accessible only to authorized roles. This full-retention rule requires privacy/legal approval.
- Every security/legal incident receives a unique Case ID with linked evidence, parcel/QR/custody/GPS/users/devices/vehicles/payments, actions, approvals, and legal hold.

### 27.17 Public site, CMS, and release strategy

- The current Phase 9A visual foundation remains; only targeted changes are planned.
- Primary public CTAs remain `Send a Parcel` and `Track a Parcel`. `Send a Parcel` is visible but disabled/Coming Soon during the initial Business Open Beta.
- `Join CeylonSwift for Business` is a secondary navigation/section entry and the active onboarding path.
- Public rate calculator and public hubs preview remain future-compatible but blurred/disabled with honest Coming Soon treatment until live data is ready.
- Track Parcel remains active.
- Admin CMS expands from the current controlled landing revision system to section/card management, branding, campaigns, seasonal schedules, language variants, dark/light compatibility, previews, and rollback.
- Seasonal campaigns are pre-authored/scheduled; no automatic AI publishing is required.
- Site is mobile-first, data-saving, performance-optimized, accessible, and supports English/Sinhala/Tamil with fallback.
- Feature lifecycle is `HIDDEN`, `COMING_SOON`, `INTERNAL_TEST`, `INVITE_BETA`, `OPEN_BETA`, `STABLE`, `TEMPORARILY_DISABLED`, `RETIRED`.
- Feature flags may target users, organizations, branches, regions, and roles. Core kill switches must freeze/queue safely.
- Current/prototype line is `0.1.x.x`. New architecture/build work starts at `0.2.x.x`. Every `0.x.x.x` release is Open Beta. Mass-audience release is `Mark I / 1.0.0.0`.
- The initial Open Beta serves approved tuition Businesses, staff, riders, and receivers. Normal Customer sending remains disabled.

## 28. Required new data domains

The current schema must be extended additively. The implementation blueprint must define at least:

- Business application, verification, contract, plan, agreement version, location, team role, and external integration entities;
- external customer/order identity links, receiver identity/location, consent/source, immutable shipment snapshots, Delivery Draft, and receiving-code entities;
- consignment, parcel item, material template, recipient group, distribution batch, material inventory, and packing checklist entities;
- QR batch, allocation, custody, label lifecycle, scan, incident, return authorization, and journey-cycle entities;
- branch profile, service zone, capacity snapshot, storage rack/bin, inventory item/batch/movement/reconciliation entities;
- vehicle, vehicle document, inspection, telematics event, assignment, maintenance, rental, trip cost, and incident entities;
- route plan, stop, revision, linehaul trip, load/container, seal, manifest, and custody transfer entities;
- delivery attempt, authorization policy, proof, signature, receiver verification, confirmation, rating, claim, and investigation entities;
- pricing rule components, quote/price snapshot, contract rate, invoice, wallet ledger, payment, refund/credit, withdrawal, COD ledger, settlement, and reconciliation entities;
- shift, attendance, temporary engagement, capability tag, payroll/allowance/deduction/adjustment entities;
- support case, case event, call/contact log, notification outbox/delivery/preference/template/escalation entities;
- feature flag, release/version, content section/card, campaign/theme, translation, approval, incident, legal hold, disclosure, and data-export entities;
- offline device/node, signed configuration, event envelope, sync cursor, conflict, reconciliation, and recovery entities;
- GPS current location, route sample, archive partition/reference, access log, and retention/legal-hold entities.

## 29. Repository gap summary

The repository currently provides a meaningful foundation:

- static SPA shell with responsive Phase 9A landing work;
- authentication, OTP/passkey/MFA/session infrastructure;
- organization, branch, role, permission, workspace, and step-up authorization;
- workforce invitation/approval foundations;
- package/request/assignment/tracking/pricing foundations;
- audit, idempotency, jobs, dead letters, readiness, metrics, and error handling;
- landing revisions, campaigns, media approval, verified reviews, and public metrics.

It does not yet implement the full target:

- Business/Tuition Portal and onboarding;
- receiver-link and external-order integration;
- QR inventory/custody lifecycle;
- route optimizer, linehaul/load/seal, live maps/GPS, telematics;
- branch storage/capacity/inventory;
- delivery proof/attempt/return/claim workflows;
- financial ledgers, payouts, wallet, COD settlement, payroll;
- notifications/support/call-centre integrations;
- offline edge/rider sync;
- full CMS/seasonal/theme/feature-release management;
- Android Rider app or production provider integrations.

## 30. Current Git and Phase 9A warning

The repository remains on `main` at `482ee4a`. The staged Phase 9A/frontend work, unstaged Prisma/backend work, and untracked landing module/migration/artifacts remain user work. Do not reset, stash, overwrite, stage, commit, or mix them into a broad architecture change without first reviewing and preserving them.

The current landing implementation already includes responsive light/dark UI, language/performance settings, hero/tracker/services/hubs/help/about/reviews, controlled content revisions, campaigns, media approval, and review moderation. Extend it; do not replace it with a generic new site.

## 31. Implementation blueprint

The authoritative phased build plan and copy-paste implementation prompt are stored in:

- `MARK_0_2_IMPLEMENTATION_BLUEPRINT.md`

Read that file together with this handoff before changing source code.

## 32. Exact instructions for continuing in a new Codex chat

```text
Read PROJECT_HANDOFF.md and MARK_0_2_IMPLEMENTATION_BLUEPRINT.md completely before taking action. Inspect the current Git branch, status, staged diff, unstaged diff, and untracked paths. Preserve the dirty Phase 9A work and do not reset, stash, overwrite, stage, commit, or push without explicit permission. Treat the handoff as product truth and the blueprint as the phased implementation contract. First perform the blueprint's Phase 0 repository reconciliation and present the exact preserved-change strategy, migration sequence, risks, and verification plan. Do not begin broad feature coding until that reconciliation is approved. Never claim Coming Soon modules are implemented. Build vertical slices with database, backend, permissions, UI, tests, observability, rollback, and acceptance evidence together.
```

## 33. Final status

Requirements are now sufficiently complete for architecture freeze and phased implementation. The next safe action is not an unscoped full-system rewrite. It is Phase 0 of `MARK_0_2_IMPLEMENTATION_BLUEPRINT.md`: preserve/reconcile Phase 9A, align version/release metadata, freeze state machines and permission boundaries, and prepare additive migrations before implementing the first tuition Business vertical slice.
# Mark 0.2 Implementation Update — 2026-07-18

The approved Open Beta Public-State Foundation has now been implemented.

- Canonical release identity is product `0.2.0.0`, package
  `0.2.0-beta.0`, channel `OPEN_BETA`.
- Public Track a Parcel and Join CeylonSwift for Business are enabled.
- Public Send a Parcel and the public calculator/hubs views are controlled
  Coming Soon features.
- Public customer signup is disabled in the Open Beta product state.
- The public landing page consumes backend-published content and resolved
  public feature states with restrictive offline/API-failure defaults.
- A generic, audited, scoped `FeaturePolicy` backend foundation now supports
  enabled, coming-soon, disabled, and maintenance states.
- The Website Content dashboard exposes the six global public feature controls
  to users with the new read/manage permissions.
- Personal-customer request/package creation is rejected by the backend while
  public parcel sending is unavailable.
- The additive migration
  `20260717190000_add_feature_policy_foundation` follows the Phase 9A
  landing-content migration.

Verification after implementation:

- Frontend: 81/81 tests passed.
- Backend: 80/80 tests passed across 26 suites.
- Frontend and backend builds passed.
- Prisma schema generation and validation passed.
- Six migrations plus the development seed passed on a disposable PostgreSQL
  database; the `FeaturePolicy` table was verified.

The next bounded implementation phase is Business/Tuition onboarding. Do not
enable normal-customer parcel sending or public signup as part of that phase.
Preserve the current dirty Phase 9A and Mark 0.2 work; do not reset, stash, or
discard unrelated changes.

# Mark 0.2.0.1 Pause Checkpoint — 2026-07-18

This checkpoint freezes the complete current workspace so development can pause
while the owner focuses on A/L studies.

Canonical release identity:

- Product version: `0.2.0.1`
- Package SemVer: `0.2.0-beta.1`
- Channel: `OPEN_BETA`
- Mark: `MARK_0_2`
- Initial launch audience: approved Business/Tuition organizations

Work included in this checkpoint:

- Phase 9A public landing-page and controlled-content foundation;
- backend landing content, review moderation, public metrics, and feature-policy
  foundations with additive Prisma migrations;
- public feature lifecycle controls for Track Parcel, Send Parcel, Join
  Business, rate calculator, hubs, and customer signup;
- responsive dark/light landing composition using the approved CeylonSwift
  visual direction;
- Sri Lanka route hero artwork with responsive floating information cards;
- centered and balanced hero typography, actions, navigation, and card layout;
- complete English, Sinhala, and Tamil translation bindings for the public
  landing content, including dynamically rendered hero cards;
- theme-transition animation originating from the selected theme control in
  both directions;
- removal of the hero image/glow color seam by constraining the media to its
  frame and preventing the lower drop-shadow from clipping at the section
  boundary;
- professional icon treatments, truthful Coming Soon states, and public-safe
  offline/API-failure behavior;
- dashboard content controls, notifications/toast behavior, routing
  compatibility updates, tests, generated CSS bundles, design screenshots, and
  all supporting planning/audit documents present in the workspace.

Pause/resume rules:

1. Treat this Git checkpoint as the complete source of truth for Mark 0.2.0.1.
2. Do not reset, rewrite, or remove the preserved Phase 9A, backend, migration,
   product-plan, screenshot, or handoff files.
3. On resumption, read this document and
   `MARK_0_2_IMPLEMENTATION_BLUEPRINT.md` completely before editing code.
4. Run the frontend and backend verification suites before beginning the next
   vertical slice.
5. The next planned bounded phase remains Business/Tuition onboarding. Normal
   customer parcel sending and public customer signup stay disabled until their
   complete backend-authoritative workflows are ready.

## Mark 0.2.0.1 resume verification — 2026-07-27

The checkpoint was reopened briefly and verified before further feature work:

- checkpoint branch: `pre-exam-checkpoint-2026`;
- checkpoint commit: `7aba732` (`chore: create pre-exam project checkpoint`);
- checkpoint tag: `pre-exam-pause-2026`;
- frontend build passed;
- frontend tests: 88/88 passed;
- backend build passed;
- backend tests: 80/80 passed across 26 suites;
- Prisma schema validation passed;
- `git diff --check` passed before the checkpoint commit.

The safest next development slice remains the first backend-authoritative
Business/Tuition onboarding workflow. Keep the public normal-customer sending
flow disabled while that slice is built and tested.

# Phase 7 delivery operations

## Scope

Phase 7 makes PostgreSQL the API-mode source of truth for customer delivery
requests, packages, assignments, tracking events, hubs, and pricing. Payments,
payouts, settlement, live GPS, external maps, route optimization, customer
notifications, file uploads, and mobile applications remain outside this phase.

## API resources

- `/api/v1/customer-requests` supports customer-owned draft creation, update,
  submission, cancellation, listing, detail, and transactional conversion.
- `/api/v1/packages` supports scoped creation, listing, detail, safe editing,
  cancellation, status transitions, tracking history, and assignment history.
- `/api/v1/packages/:packageId/assign`, `reassign`, and `unassign` preserve
  assignment history and validate an active, approved, branch-scoped rider.
- `/api/v1/me/rider/assignments` exposes only the authenticated rider's active
  assignments.
- `/api/v1/tracking/:trackingCode` is public, rate limited, and returns only a
  masked recipient, safe hubs, status, timestamps, and public timeline events.
- `/api/v1/hubs` exposes a public-safe active hub directory. Mutations remain
  authenticated, organization/branch scoped, and require `hub.manage`.
- `/api/v1/pricing/calculate` provides the public authoritative estimate.
  Internal rule reads require `pricing.read` and an organization workspace.

## Lifecycle and concurrency

`PackageTransitionService` explicitly defines valid status transitions. Every
accepted transition uses optimistic package `version` matching, updates the
package, appends an immutable `TrackingEvent`, and creates a safe audit entry in
one transaction. Rider transitions are a smaller allowlist and require the
actor's active assignment. Delivery completion closes the assignment and makes
the rider available.

Package, request-conversion, assignment, and status workflows use serializable
or ordinary Prisma transactions as appropriate. Tracking and request codes use
cryptographically secure random bytes and existing unique constraints.

The schema has no general idempotency-key replay model. Phase 7 therefore uses
existing unique constraints, state preconditions, transactional claims, and
optimistic versions. It does not claim durable `Idempotency-Key` response replay
or mismatched-payload detection; adding that storage requires separate migration
approval.

## Pricing

The backend selects an active, effective rule for the server-validated route and
service level. It calculates base fee, excess-weight fee, inter-branch surcharge,
COD surcharge, and minimum fee. Client fee values are not accepted by create or
conversion DTOs. Package edits that can affect pricing recalculate the quote.

Development seed data contains synthetic branches, hubs, and active Standard,
Express, and Same Day rules. The seed is idempotent and contains no real
customer or address data.

## Frontend compatibility

API mode ignores these records as authoritative data without deleting them:

- `ceylonswift_packages`
- `ceylonswift_custrequests`
- `ceylonswift_hubs`
- `ceylonswift_activities`

`OperationsController` keeps operational data only in memory and publishes a
temporary adapter for the existing UI:

- package `trackingCode` maps to legacy `id`;
- canonical package status maps to a display label while retaining
  `canonicalStatus` and `version` for backend mutations;
- the destination hub district maps to legacy `hub`;
- the active assignment's safe display name maps to legacy `rider`;
- customer request `requestCode` maps to legacy `id`;
- safe hub counts map to legacy `activePkgs` and `riders`.

No adapter record is persisted or merged with localStorage. API errors do not
activate legacy fallback. Booking, public tracking, pricing, package creation,
request conversion/cancellation, assignment, and status actions delegate to the
central API client.

## Known boundaries

- Durable request replay through `Idempotency-Key` is not implemented without an
  approved schema addition.
- Active-route optimization, location capture, maps, scans, notifications,
  payment collection, COD settlement, and rider payouts are not implemented.
- The development environment has one approved rider fixture, so multi-rider
  reassignment UI acceptance is covered by transactional history policy rather
  than a second live rider identity.


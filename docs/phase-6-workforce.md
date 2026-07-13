# Phase 6 workforce management

## Scope

Phase 6 makes PostgreSQL the source of truth for users, employees, riders,
invitations, memberships, branch assignments, approval decisions, and account
states while the application is in API mode. Package, delivery assignment,
tracking, hub operations, pricing, payment, and customer booking workflows are
unchanged and remain outside this phase.

## Backend API

The `workforce` NestJS module exposes scoped REST resources under `/api/v1`:

- `/users` for safe user directory, details, roles, memberships, and account
  status changes.
- `/employees` for directory, details, profile/status updates, and branch
  reassignment.
- `/riders` for directory, details, profile/status updates, approval,
  rejection, suspension, and reactivation.
- `/invitations` for scoped listing, creation, revocation, and token-based
  acceptance.
- `/approvals` for scoped listing and transactional approval decisions.

All protected routes use the existing access-token, workspace, organization,
branch, permission, and step-up policies. List responses use bounded pagination,
search and supported filters. Response mapping returns purpose-specific safe
objects rather than raw Prisma records.

## Invitations and approvals

Invitation tokens are generated with a cryptographically secure random source;
only their hashes are stored. Plaintext invitation data can be returned only in
the explicit development environment and is excluded from production API
responses. Delivery is isolated behind `InvitationDeliveryService`, a
replaceable no-op boundary until an email or SMS provider is approved.

Invitation acceptance, rider/staff onboarding decisions, membership/profile
updates, role assignment integration, and audit creation use database
transactions. Final approval states reject duplicate decisions. Sensitive
privileged-role decisions require recent step-up authentication, and an actor
cannot approve their own sensitive request.

## Suspension and workspace invalidation

Account, employee, and rider suspension preserve historical records and revoke
active session/refresh-token access where immediate invalidation is required.
Branch reassignment clears incompatible active workspace sessions. Reactivation
requires the corresponding backend permission and does not bypass role or
membership policy.

## Frontend integration

`js/workforce/workforce-api.js` uses the central authenticated API client.
`js/workforce/workforce-controller.js` owns workspace-aware loading, filters,
pagination, empty/error/loading states, invitations, approvals, and permitted
mutations. Navigation and actions are rendered from backend-derived
capabilities; hiding an action is UX only and the backend still enforces every
decision.

In API mode, `ceylonswift_employees` and
`ceylonswift_pending_signups` are ignored and are never merged with backend
records. They remain untouched for explicit legacy-demo mode. Where an old
operational view needs an employee-shaped record, the compatibility bridge
creates an in-memory adapter from the currently loaded safe workforce response.
It does not persist the adapter or change backend data.

## Database and seed

The existing Prisma models and enums were sufficient. Phase 6 therefore adds no
schema change and no migration. The seed remains idempotent and extends the
approved partner-administrator permission mapping for scoped staff decisions.
Development provisioning ensures the rider fixture has a corresponding
`RiderProfile` without deleting or replacing existing identities.

## Known boundaries

- No paid or external invitation delivery provider is integrated.
- Rider license/document handling is limited to safe metadata already supported
  by the schema; no upload or external verification is claimed.
- Reassignment of active delivery work after rider suspension belongs to Phase
  7 because delivery assignments are intentionally outside Phase 6.
- Existing localStorage workforce records are not automatically imported. A
  future import must be an explicit admin-controlled, validated, dry-run-first,
  audited workflow.


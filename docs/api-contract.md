# REST API contract

Phase 0 design only. All production endpoints are versioned under `/api/v1`.

## Common conventions

- JSON request and response bodies use UTF-8.
- Successful single-resource response: `{ "success": true, "data": {}, "requestId": "..." }`.
- Successful collection response includes `data`, `pageInfo`, and `requestId`.
- Timestamps use ISO 8601 UTC.
- IDs are UUID strings unless a public tracking code is explicitly required.
- Unknown request fields are rejected.
- Browser refresh uses a secure HttpOnly cookie; access tokens use `Authorization: Bearer`.
- State-changing cookie-authenticated requests require a CSRF token.

Error shape:

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Unable to complete authentication.",
    "details": null
  },
  "requestId": "019..."
}
```

Expected statuses: `200`, `201`, `202`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, and `500`. Authentication discovery responses must not reveal whether an account exists.

## Authentication

### `POST /api/v1/auth/identify`

- Auth: public, aggressively rate limited.
- Body: `{ "identifier": "email-or-e164-phone", "context": "CUSTOMER|WORKFORCE|ADMIN" }`.
- Response `200`: generic allowed authentication methods and a short-lived opaque continuation ID.
- Validation: normalized identifier and approved context.
- Enumeration protection: structurally equivalent response and timing for known/unknown identities.

### `POST /api/v1/auth/otp/request`

- Auth: public continuation or authenticated step-up context.
- Body: `{ "continuationId": "...", "channel": "SMS|EMAIL", "purpose": "LOGIN|STEP_UP|VERIFY_CONTACT" }`.
- Response `202`: `{ "challengeId": "uuid", "expiresIn": 300, "resendAfter": 60 }`.
- Errors: generic invalid flow, `429` limits, `422` validation.

### `POST /api/v1/auth/otp/verify`

- Body: `{ "challengeId": "uuid", "code": "string" }`.
- Response `200`: authentication result with in-memory access token metadata and user/workspace summary; refresh cookie set for browser sessions.
- Errors do not distinguish unknown identity from invalid code.

### `POST /api/v1/auth/login`

- Body: `{ "identifier": "...", "password": "...", "context": "...", "device": { "name": "..." } }`.
- Response `200`: access token, expiry, user summary, MFA/step-up state, and workspaces; refresh cookie set.
- `401` uses a generic credential error; `429` applies rate limiting.

### `GET /api/v1/auth/google/start`

- Query: `context`, optional post-login return key from an allowlist.
- Response `302`: redirects to Google with state, nonce, and PKCE context where applicable.

### `GET /api/v1/auth/google/callback`

- Validates authorization response, state, nonce, issuer, audience, and PKCE.
- Response `302`: redirects to an allowlisted frontend completion route with no tokens in the URL.

### `POST /api/v1/auth/refresh`

- Auth: refresh cookie for browser; approved refresh credential for mobile.
- Body: empty for browser; mobile contract defined separately.
- Response `200`: new short-lived access token and rotated refresh credential/cookie.
- Reuse detection revokes the token family and returns `401`.

### `POST /api/v1/auth/logout`

- Auth: current session.
- Response `204`; revokes session/refresh family and clears cookie.

### `POST /api/v1/auth/logout-all`

- Auth: current user, permission `session.revoke.own`; recent authentication may be required.
- Response `204`; revokes all user sessions.

### `GET /api/v1/auth/session`

- Auth: refresh session.
- Response `200`: session/device summary without token material.

### `GET /api/v1/auth/me`

- Auth: access token.
- Response: user, profile, account status, authentication strength, selected workspace, effective roles, and safe permission keys.

### `GET /api/v1/auth/workspaces`

- Auth: access token.
- Response: accessible organizations and branches with membership state; no unauthorized tenant metadata.

### `POST /api/v1/auth/workspaces/select`

- Auth: access token.
- Body: `{ "organizationId": "uuid", "branchId": "uuid|null" }`.
- Response: refreshed workspace context and short-lived access token.
- The server verifies active membership; frontend role claims are ignored.

## MFA and passkeys

### MFA

- `POST /auth/mfa/setup`: authenticated; body `{ "type": "TOTP|SMS|EMAIL" }`; returns pending enrollment data.
- `POST /auth/mfa/verify`: authenticated pending enrollment/step-up; verifies code and activates strength.
- `POST /auth/mfa/recovery`: body includes recovery flow continuation and one recovery code; rate limited and audited.

### Passkeys

- `POST /auth/passkeys/register/options`: authenticated with recent step-up; returns WebAuthn creation options.
- `POST /auth/passkeys/register/verify`: verifies origin, RP ID, challenge, and attestation result.
- `POST /auth/passkeys/login/options`: public generic options flow without account enumeration.
- `POST /auth/passkeys/login/verify`: verifies assertion/counter and creates a session.

All passkey challenges are one-time, short-lived, bound to purpose and origin, and return `400/401/409/429` as appropriate.

## Resource API pattern

Collections use cursor pagination:

```json
{
  "success": true,
  "data": [],
  "pageInfo": { "nextCursor": null, "hasNextPage": false, "limit": 25 },
  "requestId": "019..."
}
```

Allowed query parameters are resource-specific `limit` (maximum 100), `cursor`, allowlisted filters, and allowlisted sort keys. Tenant scope is derived from the authenticated workspace, never accepted as an unchecked filter.

## Users and workforce modules

### Users `/api/v1/users`

- `GET /me`, `PATCH /me`: own profile using `profile.read.own`/`profile.update.own`.
- `GET /:id`: scoped administrative read.
- `PATCH /:id/status`: explicit suspend/disable permission, step-up, reason required.
- Bodies use allowlisted profile/status fields; responses exclude credential data.

### Employees `/api/v1/employees`

- List/read/create/update workforce profiles within organization/branch scope.
- `jobTitle` is data, not a role assignment.
- Creation normally follows invitation/approval rather than granting immediate access.

### Riders `/api/v1/riders`

- List/read/update rider operational profile.
- `POST /:id/suspend` requires `rider.suspend` and reason.
- Assignment data is exposed only through allowed branch/assignment scope.

### Customers `/api/v1/customers`

- Customers access only their own profile and related addresses/requests/packages.
- Workforce access requires explicit scoped permission.

### Invitations `/api/v1/invitations`

- `POST /`: `staff.invite`; body includes destination, organization, branch, job title, intended role IDs, expiry.
- `GET /`, `GET /:id`, `POST /:id/revoke`, `POST /accept`.
- Invitation tokens are opaque and stored hashed; responses never return token hashes.

### Approvals `/api/v1/approvals`

- `GET /`, `GET /:id`: scoped pending/history lists.
- `POST /:id/approve`, `POST /:id/reject`: explicit permission determined by approval type; reason and step-up when required.
- Self-approval and unauthorized elevation return `403/409`.

### Roles and permissions

- `/roles`: list/read/create/update organization roles; assign/revoke endpoints require `role.assign`/`role.revoke`.
- `/permissions`: read effective permission catalog; mutation requires `permission.manage`.
- Role assignment body includes user, role, organization, optional branch, validity, and reason.

### Organizations and branches

- `/organizations` and `/branches` provide scoped CRUD.
- Management requires `organization.manage` or `branch.manage`.
- Slugs/codes are normalized and uniqueness conflicts return `409`.

## Delivery operations

### Packages `/api/v1/packages`

- `POST /`: validates addresses, weight, service level, payment/COD rules; requires `package.create`; returns `201` with package and tracking code.
- `GET /`: cursor pagination with ownership/branch/organization scope derived from permissions.
- `GET /:id`: resource-level ownership/scope enforcement.
- `PATCH /:id`: `package.update`, allowlisted state-dependent fields, optimistic version check.
- `POST /:id/assignments`: `package.assign`; transactional active-assignment enforcement.
- `POST /:id/deliver`: `package.deliver`; assigned rider and allowed transition only.

### Assignments `/api/v1/assignments`

- Rider reads own active/history assignments.
- Managers read branch-scoped assignments.
- Accept/reject/complete transitions validate actor and package state.

### Tracking `/api/v1/tracking`

- `GET /public/:trackingCode`: public-safe timeline, rate limited, no sensitive recipient details.
- `GET /packages/:packageId/events`: authenticated scoped timeline.
- `POST /packages/:packageId/events`: `tracking.update`, allowlisted transition and location fields.

### Customer requests `/api/v1/customer-requests`

- Customers create/list/read own requests.
- Branch workforce lists pending requests with explicit package workflow permission.
- Approve creates a package transactionally; reject requires a reason.

### Hubs `/api/v1/hubs`

- Read uses `hub.read`; management uses `hub.manage`.
- Filters are organization/branch scoped.

### Pricing `/api/v1/pricing`

- `POST /quote`: validates shipment inputs and returns quote, currency, rule version, and expiry.
- Rule CRUD/activation requires `pricing.manage`; activation is audited and may require step-up.

### Activities `/api/v1/activities`

- Scoped operational feed with cursor pagination.
- Server generates authoritative activity records; clients cannot forge actors.

### Audit `/api/v1/audit-logs`

- Read-only API requiring `audit.read`.
- Redacted, scoped, cursor-paginated results; immutable from public API.

## Health

- `GET /api/v1/health/live`: process liveness, no auth, no dependency details.
- `GET /api/v1/health/ready`: deployment-controlled readiness; avoids leaking secrets or internal topology.

## Idempotency and concurrency

- Package creation, approval decisions, assignment changes, and sensitive invitation operations accept `Idempotency-Key`.
- Mutations use resource versions or conditional headers where lost updates are possible.
- Duplicate idempotency keys with different payloads return `409`.

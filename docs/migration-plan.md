# Incremental migration and compatibility plan

## Non-negotiable safeguards

- Preserve the current UI until an approved phase changes it.
- Preserve current localStorage keys until every replacement workflow is verified.
- Never trust or automatically import localStorage data.
- Keep generated CSS bundles and the current build pipeline until deployment is decided.
- Do not rewrite the application in one change.
- Do not proceed between major phases without approval.
- Every phase has tests, observability, compatibility, and rollback criteria.

## Compatibility mechanism

The frontend will gradually use workflow interfaces with two implementations:

- `LegacyDemoAdapter`: current in-memory/localStorage implementation.
- `ApiAdapter`: authenticated REST implementation.

Feature flags select adapters by environment, user cohort, organization, and workflow. Production API mode never falls back silently to untrusted local data. Legacy mode is visibly identified as demo mode once real authentication is introduced.

## Phase sequence

### Phase 0 — design and preservation

- Capture dirty working tree.
- Repair malformed repository configuration only.
- Document current and target architecture, authentication, security, database, permissions, API, migration, and rollback.
- No backend behavior or login changes.

Exit gate: documentation review and explicit Phase 1 approval.

### Phase 1 — backend and database foundations

- Scaffold NestJS/TypeScript backend.
- Add validated configuration and environment loading.
- Add Prisma/PostgreSQL foundation and initial migrations.
- Add request IDs, structured/redacted logging, validation, health endpoints, error envelope, and test harness.
- No frontend login replacement.

Exit gate: migration tests, health checks, configuration validation, and empty-database rollback rehearsal.

### Phase 2 — secure authentication and sessions

- Implement users, password hashing, OTP provider abstraction, sessions, rotating refresh tokens, revocation, reuse detection, login attempts, and Google OIDC.
- Add MFA/passkey-ready boundaries.
- Keep simulated frontend authentication available only as legacy demo mode.

Exit gate: authentication integration tests, enumeration tests, token rotation/reuse tests, cookie/CSRF/CORS tests, and security review.

### Phase 3 — tenancy, RBAC, and workspace selection

- Implement organizations, branches, memberships, roles, permissions, grants, and guards.
- Seed approved system roles and permission bundles.
- Enforce organization/branch scope in services and queries.

Exit gate: deny-by-default matrix tests for every role and cross-tenant isolation tests.

### Phase 4 — connect existing frontend authentication

- Add frontend API/auth/state modules without moving or redesigning UI unnecessarily.
- Use in-memory access tokens and refresh-cookie bootstrap.
- Add session restore, logout, workspace selection, errors, loading states, and feature flags.
- Preserve the current simulated flow as isolated demo mode.

Exit gate: current UI behavior preserved, real session persists safely across refresh, and adapter rollback works.

### Phase 5 — authentication UI separation

- Replace role-tab login with unified customer login.
- Create separate workforce and admin entry routes/surfaces.
- Integrate real Google authentication, OTP, MFA, and recovery UX.

Exit gate: accessibility, responsive, end-to-end, security, and compatibility approval.

### Phase 6 — users and approvals

- Migrate users, profiles, invitations, employees, riders, customers, approvals, role assignments, and workforce status.
- Do not import browser data automatically.
- Build validated admin-controlled import preview if approved.

Exit gate: approval/role audit integrity, no self-elevation, and legacy user workflow comparison.

### Phase 7 — delivery operations

- Migrate packages, assignments, customer requests, hubs, tracking, pricing, activities, and audit logs incrementally.
- Use dual-read comparison only with safe non-authoritative legacy data; avoid uncontrolled dual writes.

Exit gate: reconciliation, state-transition tests, pricing parity, public tracking privacy, and operational acceptance.

### Phase 8 — legacy retirement

- Remove simulated authentication and sensitive localStorage operations only after production flows pass.
- Retain non-sensitive UI preferences locally.
- Archive or remove legacy adapters with an approved release and rollback window.

Exit gate: production monitoring window, backup verification, incident runbook, and explicit retirement approval.

## Data migration policy

- Current browser data is demo/prototype data.
- Future import requires admin authorization, strict validation, preview, duplicate detection, tenant mapping, relationship checks, and an audit report.
- Production IDs use UUIDs. Valid approved legacy IDs may be stored as unique legacy references.
- Import batches are immutable records with status, checksum, actor, validation results, counts, and rollback linkage.

## Verification strategy

- Unit tests for business and policy logic.
- Prisma integration tests against PostgreSQL.
- API contract tests for responses and errors.
- Authentication/session security tests.
- Permission matrix and cross-tenant tests.
- Frontend adapter tests.
- End-to-end tests by role.
- Migration/reconciliation reports.
- Performance and accessibility checks before UI cutovers.

## Release strategy

- Local, staging, then production.
- Database migrations run with backups and compatibility windows.
- Additive schema changes precede code usage; destructive changes occur only after old code is retired.
- Feature flags enable small cohorts and rapid rollback.
- Metrics cover authentication success/failure, refresh reuse, permission denials, API errors, latency, and workflow parity.

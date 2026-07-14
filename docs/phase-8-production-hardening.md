# Phase 8 production hardening

## Scope and baseline

This document consolidates the production-readiness work already present in the Phase 1–8 platform and the final hardening review completed on 2026-07-15. The phase preserves authentication, authorization, workspace selection, frontend session restoration, canonical post-login routing, canonical logout routing, delivery operations, workforce workflows, and backend-authoritative pricing.

Out of scope: UI redesign, payments, GPS tracking, mobile applications, QR batch workflows, full branch management, analytics, fraud/AI features, and production deployment.

The detailed idempotency, jobs, tracing, metrics, retention, and graceful-degradation design remains in `docs/phase-8-operational-resilience.md`.

## Changes completed

- Production configuration validation fails closed for insecure cookies, localhost or wildcard CORS, test OTP, missing HTTPS public URL, missing RS256 keys, weak password/MFA secrets, legacy demo/provisioning tools, disabled jobs, and an in-memory production rate-limit store.
- `backend/.env.example` is the canonical sanitized runtime template. The stale root template now points to that source instead of publishing obsolete variable names.
- Successful and failed API envelopes include `requestId` and an ISO-8601 UTC `timestamp`.
- Validation errors retain readable allowlisted validation details.
- All 5xx responses use a generic message and force `details` to `null`, preventing exception-supplied infrastructure metadata from reaching clients.
- Structured request logging uses bounded route templates and includes request, trace, span, actor, workspace, status, duration, and outcome data. Sensitive headers, credentials, tokens, OTPs, phone numbers, and addresses are redacted; session IDs are hashed.
- W3C trace context, request timeouts, durable idempotency, protected metrics, readiness probes, database-locked jobs, bounded retries, dead letters, and retention controls remain enabled through the operational-resilience module.
- Canonical frontend routing continues to validate saved sections against backend-derived capabilities. Explicit logout replaces protected history state with public home before guest auth state is published.

## Response contract

Success:

```json
{
  "success": true,
  "data": {},
  "requestId": "request-id",
  "timestamp": "2026-07-15T00:00:00.000Z"
}
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "REQUEST_INVALID",
    "message": "The request contains invalid fields.",
    "details": []
  },
  "requestId": "request-id",
  "timestamp": "2026-07-15T00:00:00.000Z"
}
```

Clients may use the request ID as a support reference. Neither request IDs nor timestamps are authorization inputs.

## Security and reliability review

### Authentication and authorization

- Access tokens are short-lived RS256 tokens; refresh credentials are HttpOnly-cookie based for the web client and rotated server-side.
- Login, refresh, logout, logout-all, session restoration, workspace selection, expiry, and local logout cleanup are covered by frontend and backend tests or live verification.
- Roles, permissions, organization, branch, and workspace context are backend-derived. Browser state is navigation-only and cannot grant access.
- Permission, workspace, organization, branch, resource-ownership, and step-up guards fail closed.
- Suspended accounts and workforce status changes revoke active sessions and refresh tokens.
- Public tracking, authentication, workforce, and sensitive mutation paths have bounded rate limits and/or idempotency protection.

### API and logging

- Global validation uses transform, whitelist, `forbidNonWhitelisted`, and `forbidUnknownValues`.
- Helmet, explicit credentialed CORS allowlists, bounded JSON/form bodies, and secure-cookie production rules are enabled.
- API responses never include stack traces. All 5xx details are suppressed.
- Request logs do not record request bodies and centrally redact sensitive field names.
- Request IDs are accepted only when they match a bounded safe format; otherwise the server creates a UUID.

### Database

- Prisma schema validation passes.
- Operational lists use bounded cursor pagination.
- Tenant, status, lifecycle, ownership, audit request ID, idempotency, background-job, and retention queries have supporting indexes documented in `docs/database-performance-review.md`.
- Foreign-key deletion behavior is explicit. Security and operational history favors `Restrict` or `SetNull` over cascading deletion.
- Migrations are append-only and deployment uses `prisma migrate deploy`; no schema change was required by this final hardening review.

## Recommended module pattern

Future `payments`, `notifications`, `tracking`, `qr-batches`, `branches`, `partners`, `audit`, and `analytics` modules should use the same boundaries:

1. A thin controller handles transport, DTO validation, response codes, and guard/decorator declarations.
2. DTOs accept user-entered data only; identity, tenant scope, status, prices, permissions, and versions come from trusted backend context.
3. Guards resolve access tokens, workspace, permission, organization/branch scope, resource ownership, and step-up requirements before service execution.
4. A service owns business rules and uses a Prisma transaction for multi-record state changes.
5. Retry-safe mutations require durable idempotency and optimistic or conditional concurrency checks where applicable.
6. Sensitive actions create append-only audit records with request ID and redacted metadata.
7. External providers sit behind replaceable adapters and use bounded timeouts, retries only for transient failures, and dead-letter handling where asynchronous delivery is required.
8. Unit tests cover policy and transitions; E2E tests cover validation, authentication, authorization, envelope shape, and tenant isolation.

Payments must add ledger-grade invariants and reconciliation rather than reusing ordinary mutable status records. Notifications and analytics must consume outbox/event data rather than execute irreversible external work inside core database transactions. GPS and QR ingestion must use bounded payloads, device identity, replay protection, and retention policies.

## Commands used

From the repository root:

```powershell
npm run test:frontend
node --check <frontend JavaScript files>
git diff --check
```

From `backend/`:

```powershell
npm run prisma:validate
npm run build
npm run lint
npm test
npm run test:e2e
npm audit
```

Deployment/database verification:

```powershell
npm run prisma:migrate:deploy
npm run prisma:seed
```

## Automated results

Baseline before the final scoped changes:

- Frontend: 62/62 passing.
- Backend unit: 70/70 passing across 23 suites.
- Backend E2E: 31/31 passing across 3 suites.
- Prisma validation, backend build, backend lint: passing.
- `npm audit`: 0 vulnerabilities.

Final verification after the scoped changes:

- Frontend: 62/62 passing.
- Backend unit: 72/72 passing across 24 suites.
- Backend E2E: 31/31 passing across 3 suites.
- Prisma validation, backend build, backend lint: passing.
- `npm audit`: 0 vulnerabilities.
- Fresh disposable database: all 4 migrations applied successfully.
- Seed: first run and idempotent second run passing; disposable database removed.
- Fresh-build live liveness/readiness: HTTP 200, request ID header/body match, valid envelope timestamp.

## Manual verification checklist

- [x] Health and readiness endpoints return safe envelopes and request IDs.
- [x] Customer, rider, office, manager, admin, partner-user, and partner-admin login/logout routing was verified with available development fixtures.
- [x] Refresh restores the authorized workspace/section.
- [x] Explicit logout returns to `#home`; refresh remains public and browser Back does not restore an authenticated dashboard.
- [x] Invalid and unauthorized protected routes still return restricted/not-found behavior.
- [x] Browser console reported no errors during routing verification.
- [x] Fresh database migration and two-pass idempotent seed completed against a disposable database that was removed afterward.
- [ ] Owner and multi-workspace browser fixtures are not currently provisioned; policy tests cover their routing and authorization behavior.
- [ ] Production external OTP, Google OAuth, distributed rate limiting, tracing exporter, immutable audit archive, and backup infrastructure require deployment-environment verification.

## Known limitations and production-readiness gaps

- No external metrics/tracing exporter or alert manager is configured.
- The required production distributed rate-limit backend is a policy boundary; a provider adapter still needs deployment-specific implementation/configuration.
- Background jobs run in-process with PostgreSQL advisory locking. A dedicated worker is recommended at higher scale.
- Provider-backed SMS/email OTP, Google OAuth credentials, and WebAuthn production origins require staging validation.
- Backups, restore drills, immutable audit export, log retention, ingress network restrictions, TLS, WAF rules, secret rotation, and deployment rollback require infrastructure integration.
- Full database-backed authentication journey tests currently rely on the local development fixtures and manual/live verification in addition to focused automated service, controller, guard, and frontend tests.
- Fresh-database migration and idempotent seed verification must continue to use a disposable database and must never target a shared or production database.

## Risks and rollback

- Adding envelope timestamps is backward compatible for clients that ignore unknown response fields. Consumers using strict whole-object equality must update their schema.
- Suppressing 5xx details may remove information that an unsafe client previously displayed; operators should use request ID and structured server logs instead.
- The environment-template cleanup removes obsolete root-level variable examples. The backend template remains the single source of truth.
- Application rollback is a code rollback; no database migration was introduced by this review. Existing Phase 8 migration rollback guidance remains in `docs/rollback-plan.md`.

## Future recommendations

1. Add a staging CI job that creates a disposable PostgreSQL database, runs all migrations, seeds twice, and destroys only that verified disposable database.
2. Add DB-backed E2E journeys for login failure/success, refresh rotation/reuse, logout, logout-all, expiry, workspace switching, and cross-tenant rejection.
3. Integrate a distributed rate-limit provider, external telemetry exporter, alerting, immutable audit archive, and secrets manager.
4. Run documented backup/restore and incident-response exercises before production launch.
5. Keep future feature modules behind permission, idempotency, transaction, audit, and observability boundaries from their first migration.

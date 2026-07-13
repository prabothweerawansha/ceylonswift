# Phase 8 operational resilience

## Scope

Phase 8 adds durable idempotency, structured observability, protected metrics, W3C trace-context propagation, bounded request timeouts, database-locked maintenance jobs, retry/dead-letter foundations, retention controls, readiness probes, and deployment validation. It does not add payments, payouts, notifications, GPS, maps, route optimization, mobile applications, or production deployment.

## Durable idempotency

Selected authenticated mutations require `Idempotency-Key`: customer-request create/submit/convert, package create, assign/reassign, and status transitions including delivery completion. Only a SHA-256 key hash is stored. The uniqueness scope hashes user, workspace type, organization, and branch and combines it with route and method. The request fingerprint uses canonical body and route parameters.

The first request atomically claims `IN_PROGRESS`. An identical completed replay returns the stored safe response with `Idempotency-Replayed: true`. Payload mismatch returns `409 IDEMPOTENCY_PAYLOAD_MISMATCH`; a live concurrent request returns `409 IDEMPOTENCY_IN_PROGRESS`. Failed, stale, or expired claims may be safely reclaimed with the same fingerprint. Responses are centrally redacted before storage and before the first response, so tokens, credentials, phone fields, and address objects never enter the record. TTL and stale-claim windows are configurable.

## Observability and tracing

Request logs are JSON and include service/environment/version, request/trace/span IDs, safe actor/workspace context, route template, method, status, duration, outcome, and error status. Authorization, cookies, tokens, OTPs, credentials, contact fields, and addresses are centrally redacted. Session IDs are one-way shortened hashes.

Incoming W3C `traceparent` is validated and propagated; otherwise local trace/span IDs are generated. No external exporter or vendor is configured. Tracing and metrics failures must never fail a business operation.

`GET /api/v1/internal/metrics` is authentication, workspace, and `audit.read` protected. Labels are limited to route templates, method, status, outcome, and job name; raw user IDs and tracking codes are rejected as labels.

## Jobs, retries, and dead letters

The replaceable in-process scheduler is disabled by default in development and required by production validation. Each job obtains a PostgreSQL transaction advisory lock to prevent duplicate execution across instances. Runs store status, attempt, duration, count, and safe failure data. Transient Prisma connectivity/pool failures use bounded exponential backoff with jitter. Validation, authorization, business conflicts, and idempotency conflicts are not retried. Exhausted runs create inspectable dead-letter records.

Maintenance can be invoked explicitly with `npm run jobs:run-once`. Graceful shutdown stops scheduling new runs. Current jobs clean expired idempotency records, refresh tokens, sessions, OTP/OAuth/WebAuthn challenges, invitations, and login attempts in bounded batches. Audit and development-fixture jobs are review-only to avoid destructive assumptions.

## Retention defaults

| Data | Default | Action |
|---|---:|---|
| Login attempts | 90 days | Batch delete |
| Expired challenges | 7 days after expiry | Batch delete |
| Revoked/expired sessions and tokens | 90 days | Token-first batch delete |
| Expired/revoked invitations | 90 days | Batch delete |
| Idempotency records | TTL plus scheduled cleanup | Batch delete |
| Audit logs | 7 years | Review/archive candidates only |
| Package/tracking/approval history | Long-term | No Phase 8 delete |

Critical security audits are excluded from routine archival candidates. There is no ordinary audit delete endpoint. An external immutable archive and exports remain deferred.

## Graceful degradation

- Database unavailable: readiness fails and mutations fail; there is no localStorage fallback.
- OTP/Google provider unavailable: existing provider-safe errors remain; allowed password login remains independent.
- Jobs unavailable: core requests continue in development; production readiness/configuration requires jobs.
- Metrics/tracing unavailable: core operations continue.
- Requests exceeding the configurable timeout return `REQUEST_TIMEOUT`; clients reuse the same idempotency key for retry-safe mutations.

## Development fixtures

Explicit `provision:dev-users` creates synthetic, idempotent multi-rider fixtures only after development provisioning confirmation: existing rider, second active rider, suspended rider, other-branch rider, and three assignable packages. Password material comes only from runtime environment variables. The fixture never creates a super administrator and never runs automatically in production.

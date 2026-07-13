# Phase 8 database performance review

All operational list APIs use bounded cursor pagination. No list endpoint introduced by Phase 8 performs an unbounded business-table scan.

| Query | Supporting index/constraint | Review |
|---|---|---|
| Package list by tenant/status/date | `Package(organizationId,status,createdAt)` | Matches organization queues; branch indexes cover origin/destination queues. |
| Public tracking lookup | Unique `Package(trackingCode)` | Direct unique lookup. |
| Rider active assignments | `PackageAssignment(riderId,status,assignedAt)` | Matches rider queue and ordering. |
| Workspace permission resolution | User-role composite and membership indexes | Includes relations in bounded role resolution; no per-row permission query in list endpoints. |
| Workforce directory | Membership/user status indexes | Cursor bounded; selected relations avoid a frontend N+1. |
| Invitation lookup | `Invitation(destinationHash,status,expiresAt)` and tenant/status index | Supports acceptance and cleanup. |
| Audit lookup | Tenant/actor/resource/request indexes | Retention processing is date-bounded and batch-limited. |
| Idempotency claim | Unique `(scopeHash,endpoint,method,keyHash)` | Constant-time scoped claim/replay; adds one unique-index write per protected mutation. |
| Idempotency cleanup | `(state,expiresAt)` | Supports bounded expiry scans; moderate write cost on state transition. |
| Job run inspection/retry | `(jobName,startedAt)`, `(status,nextRetryAt)` | Supports recent history and retry inspection. |
| Dead letters | `(jobName,failedAt)`, `(resolvedAt,failedAt)` | Supports unresolved/recent operational inspection. |

New indexes are limited to the new operational tables. No duplicate index was added to package, assignment, tracking, workforce, invitation, workspace, or audit tables. Cleanup selects IDs in small ordered batches before deletion, minimizing locks. Production query plans should be sampled with `EXPLAIN (ANALYZE, BUFFERS)` against production-shaped anonymized data before changing indexes further.

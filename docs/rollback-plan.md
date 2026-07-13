# Migration rollback plan

## General policy

- Rollback is planned per workflow and phase, not as an emergency afterthought.
- Existing user changes are never reset, stashed, or discarded automatically.
- Database backups and tested restoration procedures are required before production migrations.
- Feature flags prefer disabling a new path over destructive data reversal.
- Schema migrations follow expand/migrate/contract so the previous application version remains compatible during the rollback window.

## Phase 0 rollback

- Documentation files can be removed independently if rejected.
- `.gitignore` can be restored from the captured baseline text.
- No runtime source or generated CSS behavior is changed in Phase 0.

## Phase 1 rollback

- Backend deployment can be stopped without affecting the legacy frontend.
- Initial database can be dropped only in local/staging; production rollback uses migration reversal or backup restoration according to data presence.
- Frontend remains on legacy mode.

## Phase 2 rollback

- Disable real-auth feature flags and return approved users to isolated legacy demo mode in non-production contexts.
- Revoke new sessions and refresh-token families.
- Keep identity/security records for audit; do not delete evidence during rollback.
- Roll back provider configuration without exposing fallback credentials.

## Phase 3 rollback

- Disable workspace/RBAC rollout flags while retaining seeded roles and audit data.
- Previous API paths must remain deny-by-default; rollback must never widen authorization.
- Revoke grants created by a failed migration batch through audited compensating actions.

## Phase 4–5 rollback

- Switch frontend auth adapter back through configuration/feature flag.
- Preserve the previous frontend bundle for the defined rollback window.
- Clear only server-issued session cookies when necessary; do not erase unrelated local preferences.
- Never silently fall back to simulated authentication in production.

## Phase 6–7 rollback

- Stop writes to the affected new workflow.
- Use idempotency and migration-batch metadata to identify affected records.
- Apply tested compensating transactions rather than deleting shared records.
- Re-enable legacy workflow only when it cannot create contradictory production truth.
- Reconcile packages, assignments, approvals, tracking events, and monetary values before reopening writes.

## Phase 8 rollback

- Retain the last compatible legacy code artifact during the approved window.
- Restoring legacy code does not authorize trusting old localStorage data in production.
- If schema contraction has begun, restore compatible database version/backups before application rollback.

## Database safeguards

- Automated backup before each production migration batch.
- Restore rehearsal in staging.
- Migration checksum and applied-version verification.
- Additive columns/tables first; backfill separately; constraints validated after data checks.
- No destructive column/table removal in the same release that stops writing it.
- Encryption/signing key changes have overlap windows and revocation plans.

## Incident decision points

Rollback is triggered by critical authentication failure, cross-tenant exposure, authorization bypass, refresh-token reuse handling failure, material data corruption, package state divergence, pricing errors, or sustained error/latency thresholds.

Security exposure takes priority over availability. The safe response may be to disable a workflow rather than restore an insecure legacy path.

## Rollback evidence

Every rollback records release, migration versions, feature flags, actor, reason, start/end times, affected tenants, revoked sessions, reconciliation result, and follow-up actions in the audit/incident system.

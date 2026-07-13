# Incident response runbook

For every incident: open a timestamped incident record, assign an incident lead, preserve logs/audit evidence, contain access, assess tenant scope, validate recovery, decide user/regulator notification with legal/security owners, and complete a blameless post-incident review.

| Incident | Immediate containment and recovery |
|---|---|
| Refresh-token reuse | Revoke the token family and session, review device/login/audit history, force reauthentication, assess credential compromise. |
| Credential compromise | Disable or reset the account, revoke all sessions, rotate affected credentials, review role changes and package actions. |
| Signing-key compromise | Stop issuance, rotate key pair and key identifier, revoke sessions/tokens, deploy trusted keys, validate all clients. |
| Database leak | Isolate database/network access, rotate credentials, preserve evidence, assess exposed tenants/fields/backups, restore only from validated sources. |
| Cross-tenant exposure | Disable affected endpoint, revoke implicated sessions, identify every accessed resource via audit/request IDs, repair scope checks and regression tests. |
| Unauthorized role escalation | Revoke assignments/sessions, preserve audit records, inspect grantor activity and step-up controls, restore least privilege. |
| OTP abuse | Rate-limit/block source safely, disable affected channel if needed, inspect challenge/login attempts, keep password login where safe. |
| Public tracking abuse | Tighten rate limits, block abusive sources at ingress, confirm responses remain masked, inspect lookup metrics. |
| Background job failure | Pause the failing schedule, inspect run/dead-letter records, protect core traffic, repair and replay only idempotent maintenance work. |
| Data corruption | Stop mutations, capture snapshot, determine last known good point, restore in isolation, reconcile package/audit history. |
| Failed deployment | Stop rollout, route to last healthy version, verify schema compatibility, readiness and tenant isolation before reopening. |
| Lost admin access | Use the controlled offline recovery/provisioning process with dual approval; never expose a public provisioning endpoint. |

Notification decisions consider confirmed data type, affected users/tenants, legal deadlines, continuing risk, and accuracy of remediation guidance. Recovery is complete only after health/readiness, authentication, authorization, tenant isolation, idempotency, jobs, metrics, and critical business flows pass.

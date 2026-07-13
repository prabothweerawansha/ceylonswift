# PostgreSQL backup and restore runbook

## Backup

1. Obtain an approved maintenance window and record application/database versions.
2. Take an encrypted provider snapshot or `pg_dump --format=custom --no-owner --no-acl` using credentials supplied by the secret manager.
3. Take and verify a backup immediately before every production migration.
4. Store backups in access-controlled, encrypted, retention-managed storage separate from the primary account.
5. Back up secret-manager configuration and signing-key metadata separately; never place secrets inside a database dump or repository.

## Restore rehearsal

1. Restore to an isolated PostgreSQL instance with no production egress.
2. Use `pg_restore --clean --if-exists --no-owner` only against that explicitly verified empty rehearsal target.
3. Apply required migrations, run Prisma validation, database integrity counts, tenant-isolation tests, authentication/session checks, package/tracking history checks, and readiness.
4. Record recovery time and recovery point. Rehearse quarterly and before material schema changes.

For production recovery, prefer a provider point-in-time recovery target immediately before the incident, validate it in isolation, then perform a controlled cutover. Rotate database credentials after restore and rotate signing/encryption keys when compromise is possible. Development databases may use local dumps; production backups require encryption, access logging, tested retention, and dual-control approval.

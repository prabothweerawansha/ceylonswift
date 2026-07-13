# Deployment readiness checklist

The application fails startup validation for critical unsafe production configuration. Before a deployment candidate:

- Set `NODE_ENV=production` and an HTTPS `PUBLIC_BASE_URL`.
- Set `COOKIE_SECURE=true`; use exact HTTPS CORS origins and never wildcard credentialed CORS.
- Provide separate valid RS256 private/public PEM keys, a 32+ character password pepper, and a 32+ character MFA encryption key through a secret manager.
- Disable test OTP, legacy demo mode, provisioning/reset tools, and development seed execution.
- Configure a non-memory distributed rate-limit store and enable background jobs.
- Validate metrics/tracing flags, request timeout, batch sizes, retry bounds, and retention windows.
- Use a least-privilege TLS PostgreSQL URL; do not use local/default credentials.
- Run Prisma validation, migration safety inspection, backup, migration deploy, readiness, smoke, tenant-isolation, and rollback checks.

The Docker image is a deployment artifact only; Phase 8 does not deploy it. `/health/live` is suitable for process liveness. `/health/ready` checks database and critical runtime policy without exposing hostnames or secrets. Protected internal metrics and job endpoints must additionally be network restricted at the ingress layer.

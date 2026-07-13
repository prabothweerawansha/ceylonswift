# CeylonSwift API foundation

Phase 1 provides an isolated NestJS, PostgreSQL, and Prisma foundation. It does not implement login, OTP, Google OAuth, access-token issuance, refresh rotation, or frontend integration.

## Requirements

- Node.js 22 or newer
- npm
- Docker Desktop with Docker Compose for the local PostgreSQL workflow

## Local setup

```powershell
Copy-Item .env.example .env
npm install
docker compose --env-file backend/.env.example up -d postgres
npm run prisma:generate
npm run prisma:migrate:dev -- --name init_platform_foundation
npm run prisma:seed
npm run start:dev
```

Run Docker Compose from the repository root. Run npm/Prisma commands from `backend/`.

API: `http://localhost:4000/api/v1`

Health: `GET http://localhost:4000/api/v1/health`

Useful database commands:

```powershell
docker compose ps
docker compose logs -f postgres
docker compose stop postgres
docker compose down
```

`docker compose down` does not remove the named volume. Do not add `--volumes` unless intentional data removal is separately approved.

## Migration safety

`npm run prisma:migrate:dev` first runs `scripts/assert-local-database.cjs`. It refuses production, non-local hosts, and database names that do not end in `_dev` or `_test`.

Never use `prisma migrate reset`, `DROP DATABASE`, or production deployment commands against an unverified target.

The initial migration is named `init_platform_foundation`.

## Environment and cookies

- API port, prefix, database URL, frontend origins, and provider configuration come from environment variables.
- Browser refresh cookies are planned as host-only API cookies, HttpOnly, `SameSite=Lax`, and Secure in production.
- `Domain=.ceylonswift.com` is not configured.
- Credentialed CORS accepts only exact configured origins; wildcard CORS is not used.
- RS256 signing key placeholders support environment values or future secret-mounted content. Phase 1 does not issue tokens.

## Deferred authentication boundaries

- Real OTP providers will implement a replaceable provider interface in Phase 2. `OTP_PROVIDER=disabled` is the Phase 1 default.
- Google OAuth variables are validated/configured but no OAuth controller exists.
- Browser and mobile sessions share the `Session` model. `UserDevice.deviceType` distinguishes WEB, ANDROID, IOS, DESKTOP, and OTHER.
- Refresh token rows store hashes only. Rotation and reuse detection are Phase 2 work.

## SUPER_ADMIN provisioning

No SUPER_ADMIN user is seeded. A later one-time controlled CLI must require explicit environment input, hash credentials with Argon2id, record an audit event, reject duplicates, and refuse automatic production startup execution.

## System reset

No production reset endpoint exists. The prototype reset button remains frontend-only during Phase 1. Future development/test reset tooling must reject production and unapproved database hosts/names. Production maintenance requires separate backup, authorization, confirmation, and audit procedures.

## Partner isolation

Partner schema records are organization-scoped. Phase 3 guards and queries must enforce organization and optional branch boundaries. PARTNER_ADMIN must never grant internal CeylonSwift or higher-privilege roles.

## Commands

```powershell
npm run build
npm run lint
npm test
npm run test:e2e
npm run prisma:format
npm run prisma:validate
npm run prisma:generate
```

## Frontend compatibility

The repository-root frontend remains unchanged and continues to use its prototype state and localStorage behavior. Phase 1 exposes no backend integration through the UI.

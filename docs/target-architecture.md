# Target full-stack architecture

## Principles

- Preserve the current frontend while replacing workflows incrementally.
- Treat the backend as the only authority for identities, permissions, and operational data.
- Support organizations and branches from the first schema version.
- Keep production endpoints under `/api/v1`.
- Separate authentication roles, organization memberships, branch grants, and employee job titles.
- Keep browser access tokens short-lived and keep refresh sessions in secure HttpOnly cookies.
- Keep legacy localStorage behavior isolated as demo mode until each replacement workflow passes verification.

## Planned repository layout

```text
/
├── frontend/
│   ├── index.html
│   ├── js/
│   │   ├── app.js
│   │   ├── api/
│   │   ├── auth/
│   │   ├── state/
│   │   ├── services/
│   │   └── modules/
│   └── css/
├── backend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/
│   │   ├── common/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── roles/
│   │   ├── permissions/
│   │   ├── organizations/
│   │   ├── branches/
│   │   ├── employees/
│   │   ├── customers/
│   │   ├── riders/
│   │   ├── partners/
│   │   ├── packages/
│   │   ├── tracking/
│   │   ├── hubs/
│   │   ├── pricing/
│   │   ├── approvals/
│   │   ├── activities/
│   │   ├── audit/
│   │   └── health/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── test/
├── docs/
├── package.json
└── README.md
```

This is a future structure. Phase 0 does not move the existing frontend.

## Runtime boundaries

### Frontend

- Public marketing and tracking experience.
- Customer, workforce, and administration clients, initially served from the existing SPA.
- In-memory access token only; refresh handled through the API and HttpOnly cookie.
- API client owns request IDs, authorization headers, CSRF tokens, refresh retry, and normalized errors.
- Legacy adapter owns current localStorage behavior and must be explicitly enabled.

### NestJS API

- REST controllers expose versioned contracts.
- DTO validation rejects unknown or malformed input.
- Services implement business rules.
- Guards enforce authentication, workspace selection, permissions, branch scope, and step-up requirements.
- Prisma repositories provide transactional persistence.
- Audit service records security and sensitive operational actions.

### PostgreSQL

- Canonical source for identity, authorization, tenancy, delivery operations, approvals, and audit records.
- UUID identifiers, foreign keys, unique constraints, indexed lookup paths, and explicit state machines.

### External providers

- Google OAuth 2.0/OpenID Connect.
- Replaceable OTP delivery provider.
- Future email/SMS, observability, object storage, and payment integrations.

## Deployment topology

- `ceylonswift.com`: main website.
- `app.ceylonswift.com`: customer application.
- `staff.ceylonswift.com`: workforce portal.
- `admin.ceylonswift.com`: administration portal.
- `api.ceylonswift.com`: API.
- Local development uses configurable localhost origins and ports.

Domains, ports, origins, cookie domains, credentials, and provider settings must come from validated environment configuration.

## Compatibility boundary

Each migrated frontend module will use an interface with two adapters:

1. Legacy adapter: current in-memory/localStorage behavior.
2. API adapter: authenticated `/api/v1` calls.

Feature flags will select the adapter per workflow. A workflow is removed from legacy mode only after API, authorization, migration, and rollback tests pass.

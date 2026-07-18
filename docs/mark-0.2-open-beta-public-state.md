# Mark 0.2 Open Beta Public-State Foundation

## Release identity

- Product version: `0.2.0.1`
- Package version: `0.2.0-beta.1`
- Channel: `OPEN_BETA`
- Initial audience: approved Sri Lankan Business and Tuition partners

## Public behavior

| Feature | Initial state |
| --- | --- |
| Track a Parcel | Enabled |
| Send a Parcel | Coming Soon |
| Join CeylonSwift for Business | Enabled |
| Public Rate Calculator | Coming Soon |
| Public Hubs | Coming Soon |
| Public Customer Signup | Disabled |

The frontend loads these states from
`GET /api/v1/public/landing-page`. If the API cannot be reached, the built-in
fallback is identical to the initial Open Beta state. Disabled and coming-soon
features cannot be activated through local storage or query parameters.
Personal-workspace parcel creation is also checked by the backend, so changing
browser state cannot bypass the Open Beta restriction.

## Feature-policy administration

Authorized administrators use:

- `GET /api/v1/website-content/feature-policies`
- `PUT /api/v1/website-content/feature-policies/:featureKey`

The backend accepts catalogued feature keys only. Policies support global,
organization, branch, and user scope; effective time windows; safe structured
configuration; optimistic versions; reasons; and audit records. Updates require
`feature_policy.manage`. Read access requires `feature_policy.read`.

The current dashboard exposes the six public global policies in Website
Content. Every save includes an expected version and a required reason.

## Database migration

`20260717190000_add_feature_policy_foundation` adds:

- `FeaturePolicyState`
- `FeaturePolicyScope`
- `FeaturePolicy`
- scope, effective-window, version, and actor integrity constraints

The migration is additive and follows the Phase 9A landing-content migration.
Rollback should change feature resolution to the restrictive built-in defaults;
it should not delete policy or audit history.

## Verification completed

- Frontend: 81 tests passed.
- Backend: 80 tests across 26 suites passed.
- Frontend and backend production builds passed.
- Prisma schema formatting, generation, and validation passed.
- All six migrations and the development seed passed on a disposable database.
- The resulting `FeaturePolicy` table was independently verified.

## Next bounded phase

Implement the approved Business/Tuition onboarding workflow. Preserve the
public-state controls and do not enable normal-customer parcel sending until its
complete account, booking, pricing, payment, QR, pickup, and support workflows
are approved and tested.

# Phase 5 identity and authenticated shell

## Scope

Phase 5 replaces the public role chooser with distinct customer, workforce, administrator, and partner sign-in surfaces. It also adds a capability-driven authenticated shell, safe workspace selection, and role-aware navigation. Existing delivery, tracking, package, hub, employee, and access-control workflows remain in the legacy frontend and were not migrated.

## Authentication surfaces

- Customer sign-in starts with a mobile number or email address, then offers the existing password, OTP, or Google flows.
- Workforce sign-in is for invited rider, office, and branch-management identities.
- Administrator sign-in is a separate protected surface, without exposing role choices or development credentials.
- Partner sign-in uses the same backend identity contract while presenting partner-safe language.

The current backend does not expose an identifier-discovery endpoint. Therefore, the customer identifier screen is presentation and input validation only; identity verification still occurs through the existing backend password, OTP, or Google endpoints. No client-side role claim is treated as authorization.

## Capability contract

`GET /api/v1/auth/capabilities` is authenticated and workspace-guarded. It returns the active workspace context plus sorted backend-derived role and permission identifiers. It does not return credentials, tokens, cookies, session identifiers, or unrestricted membership data.

The frontend stores capabilities in memory and uses them to render navigation from a static registry. Missing or failed capability data fails closed. DOM state and local storage never grant access.

## Navigation policy

Each navigation item declares its permitted workspace types and required roles or permissions. The policy evaluates that declaration against the active backend-derived workspace and capability response. Partner labels are intentionally generic and do not expose internal administration concepts.

Only the non-sensitive active section identifier is persisted under `ceylonswift_active_section`. Restoration happens after session bootstrap, role routing, workspace restoration, and capability loading. The saved identifier is checked against the freshly rendered allowed navigation set. Invalid, cross-role, protected guest, or obsolete values fall back to a safe permitted default. Logout clears protected navigation state.

## Workspace selector

The selector is shown only when more than one backend-provided workspace is available. Selecting a workspace calls the existing workspace endpoint, refreshes capabilities, rebuilds navigation, and invalidates any section that is not allowed in the new workspace. Workspace IDs are routing context, not authorization evidence.

## Authenticated shell

The shell shows the active workspace, safe role label, account menu, workspace switcher, and logout action. Authentication route hashes are removed and the auth dialog is closed as soon as an authenticated snapshot is received, preventing refresh flicker and stale login overlays.

## Security and storage

- Access tokens remain in memory.
- Refresh tokens remain in backend-managed HttpOnly cookies.
- No token, session identifier, password, role, permission, or capability list is written to local storage.
- Navigation restoration is usability state only and is always revalidated against backend-derived access.
- Legacy demo authentication remains explicitly isolated behind its existing development-only configuration.

## Database and operational boundary

No database schema or migration was added in Phase 5. The only backend addition is the read-only capability endpoint and its tests. Operational APIs and workflows were not migrated or redesigned.

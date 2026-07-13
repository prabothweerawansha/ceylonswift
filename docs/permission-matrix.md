# Backend-enforced permission matrix

## Rules

- Permissions, not role names, are checked by backend guards and scoped queries.
- A role assignment includes system, organization, or branch scope.
- Resource ownership and organization/branch scope are checked in addition to the permission.
- `OFFICE_STAFF` does not receive approval or administration permissions automatically.
- `AGENT` starts with a narrow default and receives additional branch permissions explicitly.
- Sensitive permissions require recent step-up authentication.
- Custom organization roles may bundle approved permissions but cannot grant beyond the grantor's authority.

## Default role keys

`CUSTOMER`, `VIP_CUSTOMER`, `RIDER`, `AGENT`, `OFFICE_STAFF`, `BRANCH_MANAGER`, `ADMIN`, `OWNER`, `SUPER_ADMIN`, `PARTNER_USER`, `PARTNER_ADMIN`.

## Default permission grants

| Permission | Default roles | Scope and constraints |
|---|---|---|
| `profile.read.own` | All authenticated roles | Own user/profile only |
| `profile.update.own` | All authenticated roles | Allowlisted own fields only |
| `package.create` | CUSTOMER, VIP_CUSTOMER, AGENT, OFFICE_STAFF, BRANCH_MANAGER, ADMIN, OWNER, SUPER_ADMIN, PARTNER_USER, PARTNER_ADMIN | Customer/partner own context; workforce branch scope |
| `package.read.own` | CUSTOMER, VIP_CUSTOMER, RIDER, PARTNER_USER | Customer/partner ownership; rider assignment only |
| `package.read.branch` | AGENT, OFFICE_STAFF, BRANCH_MANAGER, ADMIN, OWNER, SUPER_ADMIN, PARTNER_ADMIN | Explicit active branch grant required for AGENT/OFFICE_STAFF |
| `package.read.organization` | ADMIN, OWNER, SUPER_ADMIN, PARTNER_ADMIN | Active organization membership required |
| `package.update` | AGENT, OFFICE_STAFF, BRANCH_MANAGER, ADMIN, OWNER, SUPER_ADMIN, PARTNER_ADMIN | Explicit workflow grant and resource state checks |
| `package.assign` | BRANCH_MANAGER, ADMIN, OWNER, SUPER_ADMIN, PARTNER_ADMIN | Branch/organization scope; audited |
| `package.deliver` | RIDER | Assigned package only; allowed transitions only |
| `tracking.read.public` | Public and all roles | Public-safe fields only; rate limited |
| `tracking.update` | RIDER, AGENT, OFFICE_STAFF, BRANCH_MANAGER, ADMIN, OWNER, SUPER_ADMIN | Rider assignment or explicit branch grant |
| `rider.approve` | BRANCH_MANAGER, ADMIN, OWNER, SUPER_ADMIN | Independent permission; not included in OFFICE_STAFF |
| `rider.suspend` | BRANCH_MANAGER, ADMIN, OWNER, SUPER_ADMIN | Branch scope; reason and audit required |
| `staff.invite` | BRANCH_MANAGER, ADMIN, OWNER, SUPER_ADMIN, PARTNER_ADMIN | Cannot invite a role above grantor authority |
| `staff.approve` | ADMIN, OWNER, SUPER_ADMIN | Explicit approval; step-up required |
| `staff.suspend` | ADMIN, OWNER, SUPER_ADMIN | Step-up and audit required |
| `hub.read` | All authenticated roles | Public/tenant-safe projection by role |
| `hub.manage` | BRANCH_MANAGER, ADMIN, OWNER, SUPER_ADMIN | Branch/organization scope; audited |
| `pricing.read` | CUSTOMER, VIP_CUSTOMER, AGENT, OFFICE_STAFF, BRANCH_MANAGER, ADMIN, OWNER, SUPER_ADMIN, PARTNER_USER, PARTNER_ADMIN | Effective public or tenant rules only |
| `pricing.manage` | ADMIN, OWNER, SUPER_ADMIN, PARTNER_ADMIN | Organization scope; step-up for activation |
| `role.assign` | ADMIN, OWNER, SUPER_ADMIN, PARTNER_ADMIN | Cannot exceed grantor permissions; step-up |
| `role.revoke` | ADMIN, OWNER, SUPER_ADMIN, PARTNER_ADMIN | Cannot remove protected final-owner access; step-up |
| `permission.manage` | OWNER, SUPER_ADMIN | System permissions only SUPER_ADMIN; step-up |
| `organization.manage` | OWNER, SUPER_ADMIN, PARTNER_ADMIN | Own organization except SUPER_ADMIN; step-up |
| `branch.manage` | ADMIN, OWNER, SUPER_ADMIN, PARTNER_ADMIN | Organization scope; audited |
| `audit.read` | ADMIN, OWNER, SUPER_ADMIN, PARTNER_ADMIN | Redacted, scoped audit projection |
| `session.revoke.own` | All authenticated roles | Own sessions only |
| `session.revoke.any` | ADMIN, OWNER, SUPER_ADMIN | Scoped administrators; step-up |
| `system.reset` | SUPER_ADMIN | Production safeguards, dual confirmation, audit; may be disabled entirely |
| `owner.action.sensitive` | OWNER, SUPER_ADMIN | Recent step-up; scoped resource checks |

## Role summaries

- CUSTOMER: own profile, own packages/requests/addresses, public tracking, pricing, own sessions.
- VIP_CUSTOMER: CUSTOMER permissions plus service-tier behavior; no administrative permissions.
- RIDER: own profile, assigned deliveries, permitted tracking updates, hub reads, own sessions.
- AGENT: minimal branch workflow; additional package permissions require explicit grants.
- OFFICE_STAFF: branch operations only; no rider/staff approval by default.
- BRANCH_MANAGER: branch operations, rider approval/suspension, hub management, assignments, and invitations.
- ADMIN: organization operations and workforce administration, excluding system permission management/reset.
- OWNER: organization ownership and sensitive organization controls; never inferred from email.
- SUPER_ADMIN: platform-level administration; tightly limited and step-up protected.
- PARTNER_USER: partner-owned workflow and records only.
- PARTNER_ADMIN: partner organization administration within delegated boundaries.

## Approval safeguards

- Rider approval requires `rider.approve`, regardless of navigation visibility.
- Office account approval requires `staff.approve`.
- An approver cannot approve their own invitation or elevation.
- Role elevation and sensitive approvals record requester, approver, before/after state, session, request ID, and reason.
- High-risk changes may require two-person approval in a later policy revision.

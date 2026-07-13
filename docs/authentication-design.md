# Authentication and security design

## Session model

- Access tokens are short-lived and sent as bearer tokens.
- Browser access tokens remain in memory and are never persisted permanently in localStorage.
- Browser refresh tokens are opaque, rotating values stored in `Secure`, `HttpOnly`, and appropriate `SameSite` cookies.
- Only a hash of each refresh token is stored in PostgreSQL.
- Mobile clients receive tokens through a mobile-specific secure flow and store them in platform secure storage.
- Sessions are represented independently from refresh-token rotations so devices and login history can be managed.
- Logout revokes the current session; logout-all revokes every active session for the user.

## Password authentication

- Passwords are hashed with Argon2id using environment-calibrated memory, time, and parallelism settings.
- Password hashes are never logged or returned.
- Login responses do not reveal whether an account, email, or phone exists.
- Failed attempts are rate-limited by normalized identity, account, IP risk signal, and device context.

## OTP

- Authentication business logic depends on an `OtpProvider` interface, not a provider SDK.
- Development may use an explicitly enabled test provider.
- Production requires a configured SMS or email provider.
- OTP codes use a cryptographically secure generator.
- Only keyed hashes of OTP codes are stored.
- Challenges have purpose, destination hash, expiry, maximum attempts, resend cooldown, send count, consumed time, and invalidation reason.
- Production OTP values are never sent to the frontend or logs.

## Refresh rotation and reuse detection

- Every successful refresh consumes the presented token and issues a replacement.
- Reuse of an already consumed token revokes the token family and associated session.
- Concurrent refresh handling uses a transaction and token-family versioning.
- Revocation events are audited.

## Google OAuth

- Authorization Code flow with state and nonce validation.
- PKCE is used where the client architecture requires it.
- Redirect URIs are exact environment-configured allowlisted values.
- The backend exchanges the authorization code and validates issuer, audience, nonce, timestamps, and verified email claims.
- Google identity is linked through `OAuthAccount`; email match alone never grants Owner or administrator access.
- Development mock OAuth is isolated behind an explicit non-production flag and cannot run in production.

## MFA, passkeys, and recovery

- MFA methods are user-owned records with verification and revocation state.
- Passkeys follow WebAuthn challenge/origin/RP validation and store public credentials only.
- Recovery codes are generated once, shown once, and stored as hashes.
- Sensitive actions require recent step-up authentication, including role assignment, permission management, organization control, session revocation for others, system reset, and owner-sensitive actions.

## Browser protections

- HTTPS is mandatory in production.
- CORS uses exact allowed origins with credentials only where required.
- Cookie-authenticated state-changing operations require CSRF protection.
- Security headers include a restrictive Content Security Policy, HSTS, frame protection, MIME sniffing protection, and referrer policy.
- Request payloads use DTO validation, normalization, size limits, and allowlisted fields.
- Logs redact tokens, cookies, authorization headers, passwords, OTPs, recovery codes, OAuth codes, and sensitive PII.

## Authorization

- Roles are convenience bundles; permissions are the enforcement unit.
- Every protected request resolves user, session, selected organization, selected branch, memberships, roles, explicit grants, and resource ownership.
- The frontend never supplies authoritative roles.
- Branch and organization scope are enforced in database queries as well as guards.
- Denials use generic responses and create audit events when sensitive.

## Account and session states

User account states: `PENDING`, `ACTIVE`, `SUSPENDED`, `DISABLED`, `TERMINATED`.

Suspended, disabled, or terminated accounts cannot create new sessions. Existing sessions are revoked according to the state transition policy.

## Secret management

- `.env.example` contains names only, not secrets.
- Local secrets live in ignored environment files.
- Staging and production secrets use the deployment platform's secret manager.
- Signing keys, OAuth credentials, database credentials, CSRF secrets, and provider keys have rotation procedures.

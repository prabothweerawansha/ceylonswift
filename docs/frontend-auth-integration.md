# Frontend authentication integration

Phase 4 keeps the existing vanilla JavaScript UI and routes authentication through `js/compatibility/legacy-auth-bridge.js`.

## Runtime modes

- `api` is the development default and mandatory production mode.
- `legacy-demo` requires a non-production environment and `enableLegacyDemoAuth: true`.
- API or network failure never selects legacy mode automatically.
- Runtime configuration is public and contains no secrets.

## Security contract

- The access token exists only in the in-memory `AuthState` and `ApiClient`.
- The refresh token remains in the backend-issued HttpOnly cookie.
- No authentication token, password, OTP, session identifier, role, or workspace is persisted in localStorage or sessionStorage.
- Role tabs affect form presentation only. Login requests never include a role or permission.
- The backend-returned workspace and roles are the source of truth.

## Temporary UI role mapping

| Backend roles | Temporary legacy view |
| --- | --- |
| `CUSTOMER`, `VIP_CUSTOMER` | Customer |
| `RIDER` | Rider |
| `AGENT`, `OFFICE_STAFF`, `BRANCH_MANAGER` | Office |
| `ADMIN`, `OWNER`, `SUPER_ADMIN` | Owner |
| `PARTNER_USER`, `PARTNER_ADMIN` | Restricted public view |

This mapping controls navigation compatibility only and is never sent to the backend. Phase 5 should replace it with permission-aware UI routes and dedicated partner workspaces.

## Static development

Serve the frontend from `http://localhost:5500` and the API from `http://localhost:4000/api/v1`. Keep backend CORS restricted to the exact frontend origin with credentialed requests enabled.

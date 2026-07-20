# ADR-007: Authentication Strategy

**Status:** Accepted  
**Date:** 2026-07-10  
**Updated:** 2026-07-20  
**Context:** The dashboard needs to authenticate with FOLIO to access the ERM API. FOLIO uses Okapi for API gateway authentication.

## Decision

Authentication uses FOLIO's `/authn/login` endpoint:

1. User enters **username and password** on the login page (Okapi URL and tenant are configured via `getDefaultOkapiConfig()`)
2. POST to `{okapiUrl}/authn/login` with `{ username, password }`
3. Response contains **two** tokens:
   - `okapiToken` — Bearer JWT used for API requests via `X-Okapi-Token` header
   - `refreshToken` — JWT used to obtain a new `okapiToken` before it expires
4. Both tokens are stored in localStorage
5. Non-sensitive credentials (username, okapiUrl, tenant — **no password**) are persisted in localStorage for pre-filling the login form
6. The full credentials object (including password) is kept **in memory only** during the session for re-login fallback
7. The `okapiRequest()` helper auto-refreshes tokens when needed:
   - If no token is cached, it calls `refreshToken()` which uses the stored refresh token
   - If the refresh token is missing or expired, it falls back to `login()` with in-memory credentials (only works within the same session — password is not persisted)
   - If a request returns 401, it retries once after refreshing
8. `clearToken()` clears all tokens **and** persisted credentials, fully logging out

## Token Lifecycle

```
login() → okapiToken (valid ~16h) + refreshToken
  │
  ├─ okapiToken expires → okapiRequest() detects 401 → refreshToken() → retry
  │
  ├─ refreshToken expires → refreshToken() tries in-memory credentials → retry
  │  (only works if user logged in during current session and hasn't reloaded)
  │
  └─ in-memory credentials unavailable → clearToken() → dispatch folio-auth-expired
       → Dashboard redirects to /login
```

## Key Design Decisions

- **Password is never persisted** — it lives only in `cachedCredentials` (memory). After a page reload, the re-login fallback is unavailable and the user must re-authenticate manually.
- **`clearToken()` clears everything** — tokens, refresh token, and the non-sensitive credentials from localStorage. This ensures a clean logout state.
- **Okapi URL and tenant are defaults** — provided by `getDefaultOkapiConfig()` from `src/lib/okapi.ts`. The login form only exposes username and password fields.

## Consequences

- **Positive:** Uses FOLIO's native auth — no separate user management
- **Positive:** Automatic token refresh — sessions survive beyond the okapiToken lifetime
- **Positive:** Re-login fallback works within the same session (password in memory)
- **Positive:** Password is never written to disk/localStorage
- **Positive:** `clearToken()` provides a complete logout (no stale credentials)
- **Negative:** After page reload, refresh-token expiry requires manual re-login (no password in localStorage)
- **Negative:** Okapi URL and tenant are default-configured (not user-entered) — simpler UX but less portable

## Testing

API testing outside the browser requires a `fetch` + `localStorage` environment.
The `login()` function in `src/lib/okapi.ts` works directly — no helper script needed.

## Alternatives Considered

1. **Stripes auth** — Use FOLIO's session token; requires Stripes module
2. **OAuth2 / Keycloak** — More secure but requires Keycloak integration
3. **API key** — Simpler but less secure; stored in localStorage

## Related

- ADR-002 (Deployment Target)

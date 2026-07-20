# ADR-007: Authentication Strategy

**Status:** Accepted  
**Date:** 2026-07-10  
**Updated:** 2026-07-19  
**Context:** The dashboard needs to authenticate with FOLIO to access the ERM API. FOLIO uses Okapi for API gateway authentication.

## Decision

Authentication uses FOLIO's `/authn/login` endpoint:

1. User enters Okapi URL, tenant, username, and password on the login page
2. POST to `{okapiUrl}/authn/login` with `{ username, password }`
3. Response contains **two** tokens:
   - `okapiToken` — Bearer JWT used for API requests via `X-Okapi-Token` header
   - `refreshToken` — JWT used to obtain a new `okapiToken` before it expires
4. Both tokens are stored in localStorage; credentials are also persisted
5. The `okapiRequest()` helper auto-refreshes tokens when needed:
   - If no token is cached, it calls `refreshToken()` which uses the stored refresh token (or falls back to re-login with saved credentials)
   - If a request returns 401, it retries once after refreshing
6. `clearToken()` clears both tokens but preserves credentials for re-login

## Token Lifecycle

```
login() → okapiToken (valid ~16h) + refreshToken
  │
  ├─ okapiToken expires → okapiRequest() detects 401 → refreshToken() → retry
  │
  └─ refreshToken expires → refreshToken() falls back to login() with saved credentials
```

## Consequences

- **Positive:** Uses FOLIO's native auth — no separate user management
- **Positive:** Automatic token refresh — sessions survive beyond the okapiToken lifetime
- **Positive:** Credentials persisted in localStorage for seamless re-login
- **Positive:** Token refresh is transparent to API callers
- **Negative:** Requires storing both tokens in localStorage
- **Negative:** Okapi URL and tenant are user-entered (not hardcoded) — good for portability, bad for convenience

## Testing

When the agent needs to test the API outside the browser, use the auth helper script:

```bash
npx vite-node scripts/auth.ts
```

This authenticates using the credentials in `.env` and saves them. For API testing:

```bash
npx vite-node scripts/auth.ts && npx vite-node <your-test-file.ts>
```

Set environment variables to override defaults:
```bash
VITE_USERNAME=foo VITE_PASSWORD=bar npx vite-node scripts/auth.ts
```

## Alternatives Considered

1. **Stripes auth** — Use FOLIO's session token; requires Stripes module
2. **OAuth2 / Keycloak** — More secure but requires Keycloak integration
3. **API key** — Simpler but less secure; stored in localStorage

## Related

- ADR-002 (Deployment Target)
- `scripts/auth.ts` (auth helper for testing)

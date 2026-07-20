# Agent Quick Reference

## Authentication

The app authenticates entirely through the browser login page. Users enter their
FOLIO credentials and the token is stored in `localStorage`. No server-side auth
or CLI scripts are needed.

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/okapi.ts` | Auth, token management, `okapiRequest()` |
| `src/lib/folioApi.ts` | ERM API calls (`getAgreements`, `getAllAgreements`, `getCustprops`) |
| `src/lib/agreementHelpers.ts` | Client-side filtering logic |
| `src/hooks/` | Custom hooks (`useFiscalYear`, `usePropertyDiscovery`, `useAgreements`, `useDecisionSave`) |
| `src/pages/Dashboard.tsx` | Render layer — wires hooks together |
| `.env` | Non-sensitive defaults (Okapi URL, tenant) |

## Token Refresh

The `okapiRequest()` helper handles token refresh automatically:
- Missing token → calls `refreshToken()` → calls `/authn/refresh` → retries request
- Refresh fails → falls back to `login()` with saved credentials
- 401 on request → same refresh-and-retry flow

No manual token management needed in API calls.

## ERM API Notes

- Endpoint: `/erm/sas`
- Filter syntax: `filters=customProperties.rubricreview.value%20isSet`
- Pagination: `page` (1-based) + `perPage`
- Stats: `stats=true` returns `totalRecords` in response

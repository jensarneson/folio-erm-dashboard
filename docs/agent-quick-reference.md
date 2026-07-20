# Agent Quick Reference

## Auth Helper

Always use the auth helper script when testing the API outside the browser:

```bash
cd /home/jens/EKU/folio-erm-dashboard
npx vite-node scripts/auth.ts
```

This authenticates with FOLIO and saves credentials to `.env`.

**Required env var:** `VITE_PASSWORD`

**Optional env vars:** `VITE_OKAPI_URL`, `VITE_TENANT`, `VITE_USERNAME`

```bash
VITE_PASSWORD=YourPass123! npx vite-node scripts/auth.ts
```

## API Testing

After auth, write a quick test file and run it with vite-node:

```bash
cat > /tmp/test.ts << 'EOF'
import * as okapi from './src/lib/okapi'
import * as folioApi from './src/lib/folioApi'

okapi.login({
  okapiUrl: process.env.VITE_OKAPI_URL || 'https://api-eku.folio.ebsco.com',
  tenant: process.env.VITE_TENANT || 'fs00001224',
  username: process.env.VITE_USERNAME!,
  password: process.env.VITE_PASSWORD!,
}).then(async () => {
  const result = await folioApi.getAgreements({ page: 1, perPage: 50 })
  console.log('totalRecords:', result.totalRecords)
  console.log('page 1 count:', result.agreements.length)
}).catch(e => console.error('Error:', e.message))
EOF

npx vite-node /tmp/test.ts
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/okapi.ts` | Auth, token management, `okapiRequest()` |
| `src/lib/folioApi.ts` | ERM API calls (`getAgreements`, `getAllAgreements`, `getCustprops`) |
| `src/lib/agreementHelpers.ts` | Client-side filtering logic |
| `src/pages/Dashboard.tsx` | Main dashboard with `useQuery` hooks |
| `scripts/auth.ts` | Auth helper for testing |
| `.env` | Default credentials |

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
- Use `perPage=50` for fewer round-trips (confirmed working)

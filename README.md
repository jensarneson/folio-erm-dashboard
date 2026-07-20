# FOLIO ERM Dashboard

Rubric review queue dashboard for EKU Libraries' FOLIO ERM system.

## Features

- Login with FOLIO credentials
- Summary of agreement review status (total, due, pending, decided)
- Active review queue sorted by urgency (WATCH items first)
- Previous decision badges (color-coded)
- Inline decision form — set RENEW/WATCH/CANCEL with optional notes
- Organization links to FOLIO UI with roles and primary indicator
- Fiscal year selector (±3 years)
- Refresh button to reload data

## Tech Stack

- React 19 + TypeScript + Vite 6
- TanStack Query for data fetching
- React Router DOM v7
- Direct FOLIO API calls (no backend proxy)

## Setup

```bash
npm install
npm run dev
```

## Configuration

Login screen connects to the FOLIO Okapi gateway. No build-time config needed — the dashboard discovers supplementary property names at runtime.

## Deployment

```bash
npm run build
```

Output is in `dist/`. Deploy to any static hosting (GitHub Pages, Netlify, etc.).

## API Endpoints Used

- `POST /authn/login` — authenticate
- `GET /erm/custprops` — supplementary property definitions
- `GET /erm/sas` — agreements (paginated, sorted, filtered)
- `PUT /erm/sas/:id` — update agreement

### ERM Agreements API

The dashboard uses the FOLIO ERM SAS endpoint with these query parameters:

| Parameter | Value | Purpose |
|---|---|---|
| `filters` | `customProperties.<prop>.value isSet` | Only agreements with rubric review set |
| `sort` | `name;asc` | Sorted by name ascending |
| `stats` | `true` | Includes `totalRecords` in response |
| `page` | `1` (1-based) | Page number for pagination |
| `perPage` | `25` | Items per page |

Example request:
```
GET /erm/sas?filters=customProperties.rubricreview.value%20isSet&sort=name%3Basc&stats=true&page=1&perPage=25
```

The API returns `{ data: [...], totalRecords: N }` — the dashboard uses `totalRecords` to paginate through all results automatically.

### Data Flow

1. **Single fetch** — `getAllAgreements()` paginates through all matching agreements in one query key
2. **Summary computed client-side** — `computeAgreementSummary()` derives stats from the fetched agreements (no duplicate API call)
3. **Filtering** — server-side filter reduces payload; client-side filters further narrow to review queue / decided lists
4. **Caching** — TanStack Query caches results; the Refresh button invalidates all query keys

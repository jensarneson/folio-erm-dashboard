# ADR-008: EKU FOLIO Tenant API Findings

**Status:** Accepted  
**Date:** 2026-07-10  
**Context:** The EKU FOLIO tenant runs on EBSCO's platform (`api-eku.folio.ebsco.com`) with tenant `fs00001224`. We needed to discover the actual API response formats and property names.

## Decision

The EKU tenant differs from the standard FOLIO API spec in several ways:

### Authentication
- Login response uses `okapiToken` (not `token`)
- Also returns `refreshToken`
- Response status is `201 Created` (not `200 OK`)

### Custprops Response
- `GET /erm/custprops` returns a **plain array** (not `{ results: [...] }`)
- Property types use Java class names (e.g., `com.k_int.web.toolkit.custprops.types.CustomPropertyLocalDate`)
- Pick list values are nested in a `category` object with `values` array

### Agreements Response
- `GET /erm/sas` returns a **plain array** (not `{ results: [...] }`)
- No `totalRecords` metadata in response
- `customProperties` values are arrays of objects with `{ id, value, type, internal, note }`
- For refdata types, `value` is an object `{ id, value, label }` (not a string)
- Pagination is **10 per page** regardless of the `limit` query parameter (EBSCO Sunflower-SP-7)
- All pages are fetched in **parallel** via `Promise.all()` for performance

### Property Names
- "Next Rubric Review" → API name: `rubricreview`
- "Rubric Review Decision" → API name: `rubricscore`
- "Authentication Type" → API name: `authtype`
- "Faculty Request" → API name: `facultyRequest`
- "Subscribe to Open (S2O)" → API name: `s2O`

### HQL Filtering
- `customProperties['rubricreview']` works for IS NOT NULL / BETWEEN
- HQL returns first N agreements regardless of whether custprops have values
- JavaScript filtering is needed for precise matching

### Dataset (388 total agreements)
- 388 total agreements in the tenant
- 12 have rubricreview set
- 7 have rubricscore set
- 7 have both rubricreview AND rubricscore (all with date 2027-07-01 except Statista at 2028-07-01)
- 5 have rubricreview but NOT rubricscore → in the active review queue
- 381 have no custprops set
- **Fetch strategy**: 39 parallel requests (10/page × 39 pages) via `Promise.all()`

### Active Review Queue (5 agreements)
1. PsycARTICLES (EBSCO) — review: 2027-07-01
2. Statista — review: 2028-07-01
3. Lippincott Williams & Wilkins Nursing and Health Professions Premier Collection — review: 2027-07-01
4. Project MUSE - Standard Collection — review: 2027-07-01
5. Wall Street Journal Digital (5 year agreement: 2024-2029) — review: 2027-07-01

### Agreements with Decisions (7 agreements)
1. Emerald Public Policy and Environmental Management Collection — RENEW
2. IOPscience extra — RENEW
3. Global Newsstream — RENEW
4. BioOne Complete — WATCH
5. Richard K. Miller & Associates (RKMA) eBooks Master Agreement — RENEW
6. Education Source — RENEW
7. Business Expert Press Master Agreement — RENEW

## Consequences

- The `folioApi.ts` module uses plain array responses (not wrapped)
- Property names are hardcoded as `rubricreview` and `rubricscore`
- HQL filter is used but JavaScript filtering is the primary mechanism
- All 39 pages are fetched in parallel (not sequentially)
- `updateAgreement()` supports PUT updates to `/erm/sas/:id` for inline decision form

## Alternatives Considered

1. **Use HQL exclusively** — Doesn't work precisely because custprops values are complex objects
2. **Fetch all agreements every time** — Fine for 40 agreements, but 500 limit provides headroom

## Related

- ADR-005 (Supplementary Property Filtering)
- ADR-006 (Property Name Resolution)
- ADR-007 (Authentication)

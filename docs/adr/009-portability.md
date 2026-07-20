# ADR-009: Portability Strategy

**Status:** Accepted  
**Date:** 2026-07-10  
**Context:** The dashboard was built against the EKU FOLIO tenant (EBSCO Sunflower-SP-7). We want it to work against any FOLIO tenant without code changes.

## Decision

The dashboard is portable through **runtime discovery** of tenant-specific configuration:

1. **Okapi URL and tenant** — Entered by the user at login (already implemented)
2. **Supplementary property names** — Discovered at runtime by querying `/erm/custprops` and matching by both `name` and `label` fields
3. **Fiscal year** — Computed from the current date using the standard July 1 – June 30 convention
4. **Fiscal year selector** — Shows current FY + 2 future years, allowing users to look ahead

### Discovery Flow

1. User logs in with Okapi URL, tenant, username, password
2. Dashboard fetches `/erm/custprops` to get all supplementary property definitions
3. Dashboard searches for the review date and decision properties by trying multiple possible names:
   - Default names (`rubricreview`, `rubricscore`)
   - Display labels (`Next Rubric Review`, `Rubric Review Decision`)
4. If found, uses the discovered `name` field as the API key for filtering
5. If not found, falls back to defaults and shows a warning

### What's Configurable Per Tenant

| Setting | How Configured |
|---------|---------------|
| Okapi URL | User input at login |
| Tenant | User input at login |
| Review date property | Discovered from `/erm/custprops` |
| Review decision property | Discovered from `/erm/custprops` |
| Fiscal year | Computed (July 1 – June 30) |
| Fiscal year range | Selector (current + 2 future) |

### What's Hardcoded (Acceptable Defaults)

| Setting | Value | Rationale |
|---------|-------|-----------|
| Fiscal year convention | July 1 – June 30 | Standard for most US academic institutions |
| Default property names | `rubricreview`, `rubricscore` | Common naming convention; overridden by discovery |
| Pagination size | 10 per page | Conservative; works for all known FOLIO implementations |
| Max agreements to fetch | 500 | Covers most libraries; configurable later |

## Consequences

- **Positive:** Works against any FOLIO tenant with minimal configuration
- **Positive:** Property names are discovered, not hardcoded
- **Positive:** Login page is the only configuration needed
- **Negative:** If a tenant uses completely different property names (e.g., "Review Date" instead of "Next Rubric Review"), the discovery may not find them — the fallback defaults may not match
- **Negative:** Pagination size of 10 per page may be slow for very large tenants (1000+ agreements)
- **Future path:** Add a "Configure properties" settings page where users can manually specify property names

## Alternatives Considered

1. **Config file** — Ship with a `config.json` that users edit; less flexible for deployment
2. **Environment variables** — Build-time configuration; requires rebuild for each tenant
3. **Full settings page** — More flexible but adds UI complexity for an MVP

## Related

- ADR-002 (Deployment Target)
- ADR-006 (Property Name Resolution)
- ADR-008 (EKU Tenant API Findings)

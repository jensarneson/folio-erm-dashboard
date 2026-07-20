# ADR-006: Supplementary Property Name Resolution

**Status:** Accepted  
**Date:** 2026-07-10  
**Context:** Supplementary properties in FOLIO have both a `name` (machine-readable, used as the key in `customProperties`) and a `label` (display name). The EKU tenant uses specific naming conventions.

## Decision

The dashboard resolves supplementary properties by:

1. Fetching all custprops via `GET /erm/custprops`
2. Matching properties by **both** `name` and `label` fields
3. Using the matched property's `name` as the key in `customProperties` lookups
4. Hardcoding the resolved names as constants (`REVIEW_DATE_PROP_NAME`, `REVIEW_DECISION_PROP_NAME`) after discovery

## EKU Tenant Property Names

| Label (display) | Name (API key) | Type |
|---|---|---|
| Next Rubric Review | `rubricreview` | CustomPropertyLocalDate |
| Rubric Review Decision | `rubricscore` | CustomPropertyRefdata |
| Authentication Type | `authtype` | CustomPropertyMultiRefdata |
| Faculty Request | `facultyRequest` | CustomPropertyRefdata |
| Subscribe to Open (S2O) | `s2O` | CustomPropertyRefdata |

## Consequences

- **Positive:** Hardcoded names after discovery are fast and reliable
- **Positive:** Self-documenting — the custprops query populates the property list at runtime
- **Positive:** Works with the EKU tenant's naming convention (no hyphens, no underscores)
- **Negative:** If the property name changes in FOLIO settings, the dashboard needs updating
- **Negative:** The `s2O` property name is unusually short

## Alternatives Considered

1. **Dynamic resolution only** — Always look up by label; slower but more resilient to name changes
2. **Store resolved names in localStorage** — Faster but requires cache invalidation

## Related

- ADR-005 (Supplementary Property Filtering)
- ADR-008 (EKU Tenant API Findings)

# ADR-005: Supplementary Property Filtering Strategy

**Status:** Accepted  
**Date:** 2026-07-10  
**Context:** The core dashboard feature is filtering agreements by two supplementary properties: "Next Rubric Review" (date) and "Rubric Review Decision" (picklist). The FOLIO API uses HQL for the `filters` query parameter.

## Decision

Filtering uses a **JavaScript-only approach** on the client side:

1. Fetch all agreements via paginated API calls (10 per page, up to 500)
2. Filter `customProperties` in JavaScript for both summary stats and the active review queue
3. HQL filtering is available but returns all agreements regardless of custprops values — not precise enough for our use case

## Consequences

- **Positive:** Works reliably regardless of HQL dialect differences between FOLIO versions
- **Positive:** Precise matching on complex custprop value types (dates, refdata objects)
- **Positive:** Property name matching is flexible — tries both `name` and `label` fields
- **Negative:** Requires fetching all agreements (500 max) on each load — acceptable for 388 agreements
- **Negative:** No server-side filtering means more data transferred
- **Future path:** If the dataset grows significantly (>1000), add server-side filtering or caching

## API Filter Examples

```
# HQL filter (available but not used for precision)
filters=customProperties['rubricreview'] BETWEEN '2026-07-01' AND '2027-06-30'

# JavaScript filter (actual implementation)
# 1. Check customProperties['rubricreview'] exists and is not empty
# 2. Parse the date value and compare against fiscal year range
# 3. Check customProperties['rubricscore'] is empty or null
```

## Alternatives Considered

1. **Pure HQL** — Filter everything in the API query; simpler but HQL returns all agreements regardless of custprops values
2. **Hybrid** — Use HQL for broad filtering, JS for precise matching; adds complexity for marginal gain

## Related

- ADR-004 (Fiscal Year)
- ADR-006 (Property Name Resolution)
- ADR-008 (EKU Tenant API Findings)

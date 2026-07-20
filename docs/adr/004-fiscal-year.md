# ADR-004: Fiscal Year Definition

**Status:** Accepted  
**Date:** 2026-07-10  
**Context:** The "Next Rubric Review" supplementary property uses July 1 as its default date. The dashboard needs to define the fiscal year for filtering.

## Decision

The fiscal year runs from **July 1 to June 30** and is **named after the ending year**:

- FY27 = July 1, 2026 – June 30, 2027 (current, as of July 2026)
- FY28 = July 1, 2027 – June 30, 2028
- FY29 = July 1, 2028 – June 30, 2029

The dashboard includes a **fiscal year selector** showing the current FY and the next 2 future years.

## Consequences

- **Positive:** Aligns with EKU's fiscal year naming convention
- **Positive:** Selector lets users look ahead to upcoming review cycles
- **Positive:** `2027-07-01` review date falls in FY28 (July 1, 2027 – June 30, 2028)
- **Negative:** Must be configurable if the library's fiscal year changes
- **Future path:** Add a settings page to configure fiscal year start date

## Alternatives Considered

1. **Calendar year (Jan 1 – Dec 31)** — Simpler but misaligned with the property's default
2. **Configurable** — More flexible but adds UI complexity for an MVP

## Related

- ADR-005 (Supplementary Property Filtering)

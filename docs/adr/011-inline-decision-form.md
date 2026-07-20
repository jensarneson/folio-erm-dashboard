# ADR-011: Inline Decision Form

**Status:** Accepted  
**Date:** 2026-07-10  
**Context:** The active review queue table needs a way for librarians to record decisions (RENEW/WATCH/CANCEL) without navigating to a detail page.

## Decision

Each row in the active review queue has a "Set decision" button. Clicking it reveals an inline form with:
- A dropdown populated from the custprop's refdata values (RENEW, WATCH, CANCEL)
- An optional note text field
- A Save button that PUTs the update to `/erm/sas/:id`
- A Cancel button

The renewal priority is auto-mapped from the decision:
- RENEW → "Definitely renew"
- WATCH → "For review"
- CANCEL → "Definitely cancel"

## Consequences

- **Positive:** No navigation needed — decisions are recorded in-place
- **Positive:** Renewal priority is auto-set, reducing user effort
- **Positive:** Query invalidation refreshes both tables after save
- **Negative:** Only one row can be edited at a time
- **Negative:** No undo — decisions are committed immediately

## Alternatives Considered

1. **Separate detail page** — More information but requires navigation
2. **Modal dialog** — Cleaner but blocks the table
3. **Inline editing** — Edit in-place without a button (chosen approach)

## Related

- ADR-003 (Direct API vs. Backend Proxy)

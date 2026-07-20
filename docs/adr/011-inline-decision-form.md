# ADR-011: Inline Decision Form

**Status:** Accepted  
**Date:** 2026-07-10  
**Updated:** 2026-07-20  
**Context:** The active review queue table needs a way for librarians to record decisions (RENEW/WATCH/CANCEL) without navigating to a detail page.

## Decision

Each row in the active review queue has a "Set decision" button. Clicking it reveals an inline form with:
- A dropdown populated from the custprop's refdata values (RENEW, WATCH, CANCEL)
- An optional note text field
- A Save button that PUTs the update to `/erm/sas/:id`
- A Cancel button

The renewal priority is auto-mapped from the decision using `RENEWAL_PRIORITY_BY_DECISION`:
- RENEW → "definitely_renew"
- WATCH → "for_review"
- CANCEL → "definitely_cancel"

Only the `.value` string is sent to the API. The mapping uses refdata value strings (not hardcoded UUIDs) for portability across tenants.

### Save Behavior

The `useDecisionSave` hook handles the full save lifecycle:

1. **Preserves all existing custom properties** — the ERM PUT endpoint requires the full object and deletes any property not present in the payload
2. **Sets `lastrubricreview` to today** — records when the decision was made
3. **Appends FY decision note** — preserves decision history with format `§ FY{year} {DECISION}`
4. **Advances `rubricreview` by 3 years** for renew/watch; leaves as-is for cancel
5. **Updates `renewalPriority`** refdata field on the agreement
6. **Optimistic cache update** — immediately updates the TanStack Query cache with the new state
7. **Query invalidation** — refetches all agreements after the API call succeeds

### Error Handling

Save errors are displayed as a dismissible inline banner above the review queue table (not via `alert()`). The `saveError`/`clearSaveError` pair is threaded through `useDecisionSave` → `Dashboard` → `ReviewQueueTable`.

### Single-Row Editing

Only one row can be edited at a time. The `editingId` state tracks the active row, and `savingAgreementId` provides per-row saving feedback (row opacity). A derived `saving` boolean is true when any row is being saved.

## Consequences

- **Positive:** No navigation needed — decisions are recorded in-place
- **Positive:** Renewal priority is auto-set, reducing user effort
- **Positive:** Optimistic update gives instant feedback before the API responds
- **Positive:** Decision note history is preserved across FYs
- **Positive:** Inline error banner is non-blocking and dismissible
- **Negative:** Only one row can be edited at a time
- **Negative:** No undo — decisions are committed immediately

## Alternatives Considered

1. **Separate detail page** — More information but requires navigation
2. **Modal dialog** — Cleaner but blocks the table
3. **Inline editing** — Edit in-place without a button (chosen approach)

## Related

- ADR-003 (Direct API vs. Backend Proxy)

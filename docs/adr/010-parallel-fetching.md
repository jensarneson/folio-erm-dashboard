# ADR-010: Parallel Agreement Fetching

**Status:** Accepted  
**Date:** 2026-07-10  
**Context:** The EKU tenant has 388 agreements. The EBSCO Sunflower-SP-7 platform paginates at 10 per page, requiring 39 sequential requests. Sequential fetching takes 3-5 seconds.

## Decision

All page requests are fired in parallel via `Promise.all()`. The app first calculates how many pages are needed (`ceil(500 / 10) = 50`), then fires all requests simultaneously. Empty pages (past the last agreement) are filtered out after aggregation.

## Consequences

- **Positive:** Load time drops from ~3-5 seconds (sequential) to ~1-2 seconds (parallel, single round-trip)
- **Positive:** No caching or backend needed
- **Positive:** Simple implementation — just `Promise.all()` instead of a `for` loop with `await`
- **Negative:** 39 concurrent requests may hit browser connection limits (typically 6 per origin); the browser queues excess requests automatically
- **Negative:** If the API has a rate limit, parallel requests could be throttled

## Alternatives Considered

1. **Sequential fetching** — Simpler but 3-5 seconds for 39 pages
2. **Batched parallel** — Group requests into batches of 6 (browser limit); adds complexity for marginal gain
3. **Increase page size** — EBSCO Sunflower-SP-7 hard-codes 10 per page regardless of `limit` parameter

## Related

- ADR-003 (Direct API vs. Backend Proxy)
- ADR-005 (Supplementary Property Filtering)

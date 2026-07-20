# ADR-003: Direct API Calls vs. Backend Proxy

**Status:** Accepted  
**Date:** 2026-07-10  
**Context:** The dashboard needs to fetch data from FOLIO's ERM API (`/erm/sas`, `/erm/custprops`). It can either call the API directly from the browser or route through a backend proxy.

## Decision

The SPA calls the FOLIO API **directly from the browser**. A lightweight `okapiRequest` wrapper in `src/lib/okapi.ts` handles authentication headers and error responses.

## Consequences

- **Positive:** No backend to deploy or maintain
- **Positive:** Simplest possible architecture — one static site
- **Positive:** FOLIO ERM API is fast; supplementary property queries are lightweight
- **Negative:** CORS must be configured on the FOLIO side or proxied in production
- **Negative:** Token stored in memory (cleared on tab close); can add localStorage persistence later
- **Future path:** Add a Node.js proxy layer later if caching, rate limiting, or CORS becomes an issue

## Alternatives Considered

1. **Node.js/Express proxy** — Handles CORS, can cache responses, but adds a deployment target
2. **FOLIO mod-proxy** — Reuse FOLIO's proxy module but adds deployment complexity

## Related

- ADR-001 (Project Structure)
- ADR-002 (Deployment Target)

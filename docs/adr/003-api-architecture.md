# ADR-003: Direct API Calls vs. Backend Proxy

**Status:** Accepted  
**Date:** 2026-07-10  
**Updated:** 2026-07-20  
**Context:** The dashboard needs to fetch data from FOLIO's ERM API (`/erm/sas`, `/erm/custprops`). It can either call the API directly from the browser or route through a backend proxy.

## Decision

The SPA calls the FOLIO API **directly from the browser**. A lightweight `okapiRequest` wrapper in `src/lib/okapi.ts` handles authentication headers, token refresh, and error responses.

## Consequences

- **Positive:** No backend to deploy or maintain
- **Positive:** Simplest possible architecture — one static site
- **Positive:** FOLIO ERM API is fast; supplementary property queries are lightweight
- **Negative:** CORS must be configured on the FOLIO side or proxied in production
- **Tokens are persisted in localStorage** for both access and refresh tokens, surviving tab close and page reload
- **Future path:** Add a Node.js proxy layer later if caching, rate limiting, or CORS becomes an issue

## Alternatives Considered

1. **Node.js/Express proxy** — Handles CORS, can cache responses, but adds a deployment target
2. **FOLIO mod-proxy** — Reuse FOLIO's proxy module but adds deployment complexity

## Related

- ADR-001 (Project Structure)
- ADR-002 (Deployment Target)

# ADR-002: Standalone SPA vs. Stripes Module

**Status:** Accepted  
**Date:** 2026-07-10  
**Context:** The dashboard needs to display FOLIO ERM agreement data. It can either run as a standalone web app or as a FOLIO Stripes module embedded in the FOLIO UI.

## Decision

Build as a **standalone React SPA** that calls the FOLIO REST API directly from the browser. The app authenticates via FOLIO's `/authn/login` endpoint and uses `x-okapi-token` headers for all API calls.

## Consequences

- **Positive:** Can develop and test without a running FOLIO instance (mock the API)
- **Positive:** Deploy as static files on any web server or CDN
- **Positive:** No Stripes build toolchain dependency
- **Positive:** Can be opened in any browser tab alongside FOLIO
- **Negative:** Not in FOLIO's navigation — users must open it separately
- **Negative:** Must implement its own login page (Stripes handles auth)
- **Negative:** CORS must be handled (dev proxy or production proxy)
- **Future path:** Can be embedded in FOLIO later via iframe or by wrapping in a Stripes module

## Alternatives Considered

1. **Stripes module** — Better integration but slower iteration, requires FOLIO dev environment
2. **Both** — Build standalone first, wrap in Stripes later (chosen approach)

## Related

- ADR-001 (Project Structure)
- ADR-003 (Direct API vs. Backend Proxy)

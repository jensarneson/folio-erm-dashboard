# ADR-012: GitHub Pages Deployment

**Status:** Accepted  
**Date:** 2026-07-10  
**Context:** The dashboard needs a free, zero-maintenance hosting solution that supports HTTPS and can be embedded in LibGuides CRM via iframe.

## Decision

Deploy to GitHub Pages with:
- `base: '/folio-erm-dashboard/'` in Vite config (subpath deployment)
- `BrowserRouter basename="/folio-erm-dashboard"` in React Router
- GitHub Actions workflow (`.github/workflows/deploy.yml`) for auto-build on push
- Embedded in LibGuides via `<iframe>`

## Consequences

- **Positive:** Free, HTTPS, auto-deploy on push
- **Positive:** No server to maintain
- **Positive:** No data leaves the browser except to FOLIO API
- **Positive:** Works in LibGuides iframe (no X-Frame-Options issues)
- **Negative:** Subpath deployment requires explicit `base` and `basename` configuration
- **Negative:** Public URL — anyone can load the page, but data is protected by okapiToken

## Alternatives Considered

1. **Netlify** — Similar features but requires a separate account
2. **EBSCO web server** — No access
3. **GitHub Pages root path** — Simpler but conflicts with other repos

## Related

- ADR-002 (Standalone SPA vs. Stripes Module)
- ADR-003 (Direct API vs. Backend Proxy)

# ADR-001: Project Structure and Technology Stack

**Status:** Accepted  
**Date:** 2026-07-10  
**Context:** We need to build a dashboard for managing rubric reviews of FOLIO ERM agreements. The dashboard should filter agreements by supplementary properties and display the active review queue.

## Decision

The project uses:

- **React 19** with **TypeScript** for the frontend
- **Vite** as the build tool and dev server
- **TanStack Query** for server state management and caching
- **React Router** for client-side routing
- **Axios** (installed) for HTTP requests (via the `okapiRequest` wrapper)
- **date-fns** for date manipulation
- **CSS custom properties** for theming (no CSS framework)

The project is a standalone SPA, not a FOLIO Stripes module.

## Consequences

- **Positive:** Fast development, modern tooling, easy to deploy as static files, no FOLIO dependency for build
- **Positive:** TypeScript catches type errors at compile time
- **Positive:** TanStack Query handles caching, retries, and refetching automatically
- **Negative:** Must handle CORS manually (dev server proxies `/okapi`, production needs its own proxy or FOLIO CORS headers)
- **Negative:** Cannot use Stripes components without adding the Stripes dependency (~10MB)
- **Negative:** Must implement login flow separately from FOLIO's auth

## Alternatives Considered

1. **Stripes module** — Would integrate into FOLIO nav but requires Stripes build toolchain, FOLIO deployment, and is harder to develop/test independently.
2. **Next.js** — Would add SSR and API routes but adds complexity for a dashboard that only needs client-side auth.
3. **Svelte** — Smaller bundle but less ecosystem for data tables and charts.

## Related

- ADR-002 (Standalone vs. Stripes)
- ADR-003 (Direct API vs. Backend Proxy)

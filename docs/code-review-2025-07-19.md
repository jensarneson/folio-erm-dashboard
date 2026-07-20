# Code Review Report: FOLIO ERM Dashboard

**Date:** 2025-07-19  
**Reviewer:** AI Code Review Agent  
**Scope:** Full codebase — source files, config, ADRs, CI/CD, scripts

---

## 1. Project Overview

A standalone React SPA that provides a rubric review queue dashboard for EKU Libraries' FOLIO ERM (Electronic Resource Management) system. It connects directly to the FOLIO Okapi gateway to fetch, filter, and update ERM agreements via supplementary properties.

**Tech Stack:** React 19 + TypeScript + Vite 6 + TanStack Query + React Router v7 + Axios (declared, unused)

---

## 2. Strengths

### Architecture & Design
- **Well-documented architecture:** 12 ADRs provide excellent decision rationale and traceability
- **Clean separation of concerns:** `folioApi.ts` (data layer), `agreementHelpers.ts` (business logic), `utils.ts` (shared utilities), `okapi.ts` (auth)
- **Runtime property discovery:** Dynamically resolves supplementary property names from FOLIO API, making the app portable across tenants
- **Single-fetch pattern:** Agreements fetched once, summary computed client-side — no duplicate API calls

### Code Quality
- **TypeScript strict mode** with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- **Consistent patterns:** Custom property accessors follow a uniform 3-step pattern (get array → take first → extract value)
- **Good error handling:** `.catch()` fallbacks on JSON parsing, descriptive error messages
- **Test script** (`test-api.ts`) is thorough — tests auth, multiple endpoints, HQL syntaxes, and saves discovered config

### UX
- **Inline decision form** — no page navigation needed to record decisions
- **WATCH-first sorting** — prioritizes agreements that previously needed attention
- **Color-coded status badges** — clear visual hierarchy (danger/warning/success)
- **Fiscal year selector** (±3 years) — flexible historical view
- **Organization links** with role labels and primary badges — actionable navigation back to FOLIO

---

## 3. Issues & Recommendations

### 🔴 High Priority

| # | Issue | Location | Details |
|---|-------|----------|---------|
| 1 | **Unused `axios` dependency** | `package.json` | `axios` is declared in dependencies but never imported. Remove to reduce bundle size. |
| 2 | **Hardcoded credentials in test script** | `scripts/test-api.ts:33-36` | Username and password are hardcoded. Should be in `.env.example` or gitignored. |
| 3 | **`Dashboard.tsx` is ~530 lines** | `src/pages/Dashboard.tsx` | Monolithic component. Contains styles, helpers, query logic, and rendering all in one file. Should be split into sub-components. |
| 4 | **`Dashboard.tsx` inline styles (~1200 chars)** | `src/pages/Dashboard.tsx` | All styles are inline `React.CSSProperties` objects. Consider extracting to CSS modules or a styled-components approach for maintainability and theming support. |
| 5 | **`console.log` statements in production code** | `src/pages/Dashboard.tsx:115-121` | Debug logging in the Dashboard component will fire on every render. Should be guarded by a dev flag or removed. |

### 🟡 Medium Priority

| # | Issue | Location | Details |
|---|-------|----------|---------|
| 6 | **Sequential pagination** | `src/lib/folioApi.ts:138-147` | `getAllAgreements` fetches pages sequentially. ADR-010 mentions parallel fetching was considered. For 388+ agreements, this could be slow. Consider `Promise.all` with chunked requests. |
| 7 | **Token stored in module-level variable** | `src/lib/okapi.ts:24` | `cachedToken` is a plain module variable — lost on page refresh. `localStorage` persistence would survive refreshes (credentials are already saved there). |
| 8 | **`computeAgreementSummary` returns `pendingDecisions === totalDueThisFY`** | `src/lib/agreementHelpers.ts:119-120` | The summary always reports pending = total due. The `decisionsMade` count comes from a separate `hasDecisionThisFY` filter. This is potentially confusing — clarify whether "pending" means "not yet decided this FY" or "in the queue." |
| 9 | **No loading skeleton/progress** | `src/pages/Dashboard.tsx` | For large agreement sets, users see "Loading agreements..." with no progress indicator. Could show "Fetching page X of Y..." |
| 10 | **`updateAgreement` doesn't refresh the local agreement** | `src/pages/Dashboard.tsx:248` | After saving, only query invalidation is used. The updated agreement data comes back from the API but isn't used to update the cache. This works but is wasteful — consider `queryClient.setQueryData` for optimistic updates. |

### 🟢 Low Priority / Nice-to-Have

| # | Issue | Location | Details |
|---|-------|----------|---------|
| 11 | **No unit tests** | — | No test files exist despite `vitest` and `jsdom` being in devDependencies. |
| 12 | **No ESLint config file** | — | `package.json` references `eslint` but no `.eslintrc.*` or `eslint.config.*` exists. Likely uses default config or relies on Vite's built-in. |
| 13 | **No keyboard accessibility** | `Dashboard.tsx` | Table rows, buttons, and selects lack `tabIndex`, `aria` attributes, and keyboard handlers (Enter/Escape for inline forms). |
| 14 | **`folioOrgUrl` hardcodes `eku.folio.ebsco.com`** | `Dashboard.tsx` | Org links use a hardcoded domain. Should derive from `cachedOkapiUrl` or be configurable. |
| 15 | **No 401 handling on API calls** | `src/lib/folioApi.ts` | If the token expires, API calls fail silently (error shown in banner but no redirect to login). Should detect 401 and redirect. |
| 16 | **`getFiscalYearDates` uses string dates** | `src/lib/utils.ts` | Returns `"YYYY-MM-DD"` strings. Consider using `date-fns` (already a dependency) for date arithmetic. |
| 17 | **`date-fns` dependency unused** | `package.json` | `date-fns` is listed but never imported in the codebase. |
| 18 | **No CI lint/test step** | `.github/workflows/deploy.yml` | Only builds and deploys. No lint or test step in the pipeline. |

---

## 4. Risk Assessment

| Risk | Level | Details |
|------|-------|---------|
| **Token expiry** | Medium | No automatic re-authentication. Users will hit 401s with no recovery path. |
| **Large datasets** | Low-Medium | Sequential pagination could timeout for tenants with thousands of agreements. |
| **Property name mismatch** | Low | Runtime discovery handles this well, but silent failures (property not found → empty dashboard) could confuse users. |
| **Bundle size** | Low | Unused dependencies (`axios`, `date-fns`) add unnecessary size. |

---

## 5. Summary Scorecard

| Category | Rating | Notes |
|----------|--------|-------|
| Architecture | ⭐⭐⭐⭐⭐ | Clean separation, excellent ADRs, portable design |
| Code Quality | ⭐⭐⭐⭐ | Strict TS, consistent patterns, good error handling |
| Performance | ⭐⭐⭐ | Sequential pagination, no caching beyond TanStack defaults |
| UX | ⭐⭐⭐⭐ | Clear visual hierarchy, actionable links, inline editing |
| Testability | ⭐⭐ | No tests despite test tooling present |
| Maintainability | ⭐⭐⭐ | Monolithic Dashboard component, inline styles |
| Documentation | ⭐⭐⭐⭐⭐ | 12 ADRs, comprehensive README, inline comments |

**Overall: 4.0 / 5.0** — A well-architected, production-ready dashboard with good documentation. The main areas for improvement are code splitting (Dashboard component), removing unused dependencies, adding tests, and improving the pagination strategy.

---

## 6. Changes Enacted

The following changes were made following approval of this report:

1. **Removed unused dependencies** (`axios`, `date-fns`) from `package.json`
2. **Hardcoded credentials** moved to `.env.example` in `scripts/test-api.ts`
3. **Dashboard component split** into sub-components (`Dashboard`, `SummaryCards`, `ReviewQueueTable`, `DecidedTable`, `DecisionForm`, `OrganizationLink`)
4. **Debug `console.log` statements** removed from Dashboard
5. **Sequential pagination** replaced with parallel chunked fetching in `getAllAgreements`
6. **Token persistence** added via `localStorage` in `okapi.ts`
7. **Summary clarification** — `pendingDecisions` now counts agreements in the queue that haven't been decided this FY
8. **Loading progress** added for pagination
9. **Optimistic update** on agreement save using `queryClient.setQueryData`
10. **Organization URL** now derives from `cachedOkapiUrl` instead of hardcoded domain
11. **401 handling** added to `okapiRequest` — redirects to login on token expiry
12. **ESLint config** created with React and TypeScript rules
13. **CI pipeline** updated with lint and test steps

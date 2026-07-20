# Improvement Roadmap — FOLIO ERM Dashboard

**Created:** 2025-07-20
**Status:** In Progress

---

## Phase 1 — Security & Correctness (Critical)

- [x] **1.1** Remove plaintext password from `scripts/auth.ts` — require env vars only
- [x] **1.2** Remove password from `localStorage` — store only username/tenant/config
- [x] **1.3** Fix query key mismatch in optimistic update (`effectiveReviewDateName` vs `serverFilter`)
- [x] **1.4** Remove stale `['summary']` query invalidation (no such query exists)
- [x] **1.5** Derive FOLIO UI base URL from Okapi config instead of hardcoding `eku.folio.ebsco.com`

## Phase 2 — Cleanup (Medium)

- [x] **2.1** Remove all `console.log` statements from production code
- [x] **2.2** Deduplicate `getFiscalYearFromDate` / `getCurrentFiscalYear` logic
- [x] **2.3** Consolidate `getReviewDate` / `getLastReviewDate` into single helper
- [x] **2.4** Use `getDecisionLabel()` in `DecidedTable` instead of manual ternary mapping
- [x] **2.5** Fix `sortDecidedAgreements` to sort by last review date, not next review date
- [x] **2.6** Add `"type": "module"` to `package.json` to fix ESLint warning
- [x] **2.7** Remove unused `refreshButtonDisabled` style

## Phase 3 — Maintainability (Nice-to-have)

- [ ] **3.1** Extract Dashboard sub-components into `src/components/` directory
- [ ] **3.2** Move inline styles to CSS modules
- [ ] **3.3** Consolidate or remove one-off debug scripts in `scripts/`
- [ ] **3.4** Strengthen `Agreement` type — reduce reliance on `_metadata` casts

## Phase 4 — Hardening (Future)

- [ ] **4.1** Add CSP/security headers for GitHub Pages deployment
- [ ] **4.2** Add more test coverage (auth flow, API error handling)
- [ ] **4.3** Consider GET-then-PUT pattern for `updateAgreement` to avoid stale data

---

## Change Log

### 2025-07-20 — Phase 1: Security & Correctness

#### 1.1 — Removed hardcoded password from `scripts/auth.ts`
- Password now required via `VITE_PASSWORD` env var with no fallback default
- Script exits with usage message if env var is missing

#### 1.2 — Removed password from `localStorage`
- `OkapiCredentials` no longer includes password in stored config
- `login()` stores only `{ username, okapiUrl, tenant }` for auto-reauth
- `setOkapiConfig()` type updated to not require password for config storage
- `Login.tsx` no longer reads/writes password to localStorage (still fills form for UX)

#### 1.3 — Fixed query key mismatch in optimistic update
- `setQueryData` now uses `['all-agreements', serverFilter]` to match the actual query key
- Removed stale `['summary']` invalidations (summary is computed client-side)

#### 1.4 — Removed stale `['summary']` query invalidation
- Two `invalidateQueries({ queryKey: ['summary'] })` calls removed from Dashboard
- Summary is derived from `allAgreements` data, not a separate query

#### 1.5 — Derived FOLIO UI base URL from config
- Added `getFolioUiBaseUrl()` to `okapi.ts` — strips `api-` prefix from Okapi URL
- Both agreement link URLs in Dashboard now use `folioUiBase` prop

#### 2.1 — Removed all `console.log` statements
- 4 statements removed from `Dashboard.tsx`, `Login.tsx`, `folioApi.ts`

#### 2.2 — Deduplicated fiscal year logic
- `getCurrentFiscalYear()` now accepts optional `Date` parameter
- `getFiscalYearFromDate()` delegates to `getCurrentFiscalYear(date)`

#### 2.3 — Consolidated date property helpers
- Single `getDateProperty()` helper replaces identical `getReviewDate` / `getLastReviewDate`
- Old names kept as aliases (deprecated) for backward compat

#### 2.4 — Used `getDecisionLabel()` in DecidedTable
- Replaced manual ternary chain with existing `getDecisionLabel()` helper

#### 2.5 — Fixed sortDecidedAgreements to use last review date
- Was sorting by next review date (`effectiveReviewDateName`), now uses `effectiveLastReviewName`

#### 2.6 — Added `"type": "module"` to package.json
- Eliminates ESLint module type warning

#### 2.7 — Removed unused `refreshButtonDisabled` style

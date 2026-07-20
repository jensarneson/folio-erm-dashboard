import type { Agreement, CustomPropertyDefinition } from './folioApi'
import { getCurrentFiscalYear } from './utils'

// ─── Custom Property Accessors ────────────────────────────────────────────────
// All custom property access follows the same pattern:
//   1. Get the array from customProperties[propName]
//   2. Take the first element
//   3. Extract the value (string or { value: string } object)
// ─────────────────────────────────────────────────────────────────────────────

/** Extract a string value from a custom property, or null if not set */
export function getCustomPropertyString(
  agreement: Agreement,
  propName: string
): string | null {
  const props = agreement.customProperties
  if (!props) return null
  const values = props[propName]
  if (!values || values.length === 0) return null
  const raw = values[0]?.value
  if (typeof raw === 'string') return raw
  if (typeof raw === 'object' && raw !== null && 'value' in raw) {
    return (raw as { value: string }).value
  }
  return null
}

/** Extract a decision value (string) from a custom property */
export function getDecisionValue(
  agreement: Agreement,
  propName: string
): string {
  const props = agreement.customProperties
  if (!props) return ''
  const values = props[propName]
  if (!values || values.length === 0) return ''
  const raw = values[0]?.value
  if (typeof raw === 'string') return raw
  if (typeof raw === 'object' && raw !== null && 'value' in raw) {
    return (raw as { value: string }).value
  }
  return ''
}

// ─── Property Discovery ──────────────────────────────────────────────────────

/**
 * Discover a custom property by trying multiple name candidates.
 * Returns the first match by name or label.
 */
export function findPropertyByName(
  custprops: CustomPropertyDefinition[],
  candidates: string[]
): CustomPropertyDefinition | undefined {
  for (const name of candidates) {
    const found = custprops.find(
      (p) => p.name === name || p.label === name
    )
    if (found) return found
  }
  return undefined
}

// ─── Review Date Helpers ─────────────────────────────────────────────────────

/** Extract a date string from a custom property (e.g. rubricreview, lastrubricreview) */
export function getDateProperty(
  agreement: Agreement,
  propName: string
): string | null {
  return getCustomPropertyString(agreement, propName)
}

/** @deprecated use getDateProperty instead */
export const getReviewDate = getDateProperty

/** @deprecated use getDateProperty instead */
export const getLastReviewDate = getDateProperty

// ─── Fiscal Year Helpers ─────────────────────────────────────────────────────

/**
 * Compute the fiscal year a date falls into.
 * FY is named after the ending year: FY27 = July 2026 – June 2027
 */
export function getFiscalYearFromDate(date: Date): number {
  return getCurrentFiscalYear(date)
}

// ─── Decision Helpers ────────────────────────────────────────────────────────

export const DECISION_LABELS: Record<string, { label: string; color: string }> = {
  watch: { label: 'WATCH', color: 'var(--color-warning)' },
  renew: { label: 'RENEW', color: 'var(--color-success)' },
  cancel: { label: 'CANCEL', color: 'var(--color-danger)' },
}

export function getDecisionLabel(decision: string): { label: string; color: string } {
  return DECISION_LABELS[decision] ?? { label: '', color: '' }
}

// ─── Agreement Filtering ─────────────────────────────────────────────────────

export interface FilterConfig {
  reviewDateProp: string
  decisionProp: string
  lastReviewProp: string
  fyStart: string
  fyEnd: string
  selectedFY: number
}

/**
 * Check if an agreement is in the active review queue:
 * - Has review date set
 * - Review date falls within current FY
 * - Last review is null or at least 3 FYs ago
 * - Decision is not CANCEL
 */
export function isInReviewQueue(
  agreement: Agreement,
  cfg: FilterConfig
): boolean {
  const props = agreement.customProperties
  if (!props) return false

  // Must have review date set
  const reviewDateStr = getReviewDate(agreement, cfg.reviewDateProp)
  if (!reviewDateStr) return false
  const reviewDate = new Date(reviewDateStr)

  // Must be due this FY
  if (reviewDate < new Date(cfg.fyStart) || reviewDate > new Date(cfg.fyEnd)) return false

  // Check last review — must be null or at least 3 FYs ago
  const lastReviewStr = getLastReviewDate(agreement, cfg.lastReviewProp)
  if (lastReviewStr) {
    const lastReviewDate = new Date(lastReviewStr)
    const lastFY = getFiscalYearFromDate(lastReviewDate)
    if (cfg.selectedFY - lastFY < 3) return false
  }

  // Decision must not be CANCEL
  const decision = getDecisionValue(agreement, cfg.decisionProp)
  if (decision === 'cancel') return false

  return true
}

/**
 * Check if an agreement has a decision made this FY:
 * - Last review date falls within current FY
 */
export function hasDecisionThisFY(
  agreement: Agreement,
  cfg: FilterConfig
): boolean {
  const props = agreement.customProperties
  if (!props) return false

  const lastReviewStr = getLastReviewDate(agreement, cfg.lastReviewProp)
  if (!lastReviewStr) return false

  const lastReviewDate = new Date(lastReviewStr)
  return lastReviewDate >= new Date(cfg.fyStart) && lastReviewDate <= new Date(cfg.fyEnd)
}

/**
 * Filter agreements into review queue and decided lists.
 * Returns both lists in one pass.
 */
export function filterAgreements(
  agreements: Agreement[],
  cfg: FilterConfig
): { queue: Agreement[]; decided: Agreement[] } {
  const queue: Agreement[] = []
  const decided: Agreement[] = []

  for (const a of agreements) {
    if (isInReviewQueue(a, cfg)) {
      queue.push(a)
    } else if (hasDecisionThisFY(a, cfg)) {
      decided.push(a)
    }
  }

  return { queue, decided }
}

/**
 * Sort review queue: WATCH items first, then by review date (earliest first)
 */
export function sortReviewQueue(
  agreements: Agreement[],
  decisionProp: string,
  reviewDateProp: string
): Agreement[] {
  return [...agreements].sort((a, b) => {
    const prevA = getDecisionValue(a, decisionProp)
    const prevB = getDecisionValue(b, decisionProp)

    // WATCH before RENEW
    if (prevA === 'watch' && prevB !== 'watch') return -1
    if (prevB === 'watch' && prevA !== 'watch') return 1

    // Then by review date (earliest first)
    const dateA = getReviewDate(a, reviewDateProp)
    const dateB = getReviewDate(b, reviewDateProp)
    if (!dateA && !dateB) return 0
    if (!dateA) return 1
    if (!dateB) return -1
    return new Date(dateA).getTime() - new Date(dateB).getTime()
  })
}

/**
 * Sort decided agreements by review date (earliest first)
 */
export function sortDecidedAgreements(
  agreements: Agreement[],
  reviewDateProp: string
): Agreement[] {
  return [...agreements].sort((a, b) => {
    const dateA = getReviewDate(a, reviewDateProp)
    const dateB = getReviewDate(b, reviewDateProp)
    if (!dateA && !dateB) return 0
    if (!dateA) return 1
    if (!dateB) return -1
    return new Date(dateA).getTime() - new Date(dateB).getTime()
  })
}

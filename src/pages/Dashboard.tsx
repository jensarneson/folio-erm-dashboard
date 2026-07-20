import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCustprops,
  getAllAgreements,
  updateAgreement,
  buildUpdatePayload,
  type CustomPropertyValue,
} from '../lib/folioApi'
import { getCurrentFiscalYear, getFiscalYearDates } from '../lib/utils'
import { getToken, clearToken, getFolioUiBaseUrl } from '../lib/okapi'
import {
  findPropertyByName,
  filterAgreements,
  sortReviewQueue,
  sortDecidedAgreements,
  type FilterConfig,
} from '../lib/agreementHelpers'

import SummaryCards from '../components/SummaryCards'
import ReviewQueueTable from '../components/ReviewQueueTable'
import DecidedTable from '../components/DecidedTable'

import styles from './Dashboard.module.css'

const REVIEW_DATE_PROP_NAME = 'rubricreview'
const REVIEW_DECISION_PROP_NAME = 'rubricscore'
const LAST_REVIEW_PROP_NAME = 'lastrubricreview'

function getFiscalYearOptions(): number[] {
  const current = getCurrentFiscalYear()
  const options: number[] = []
  for (let i = -3; i <= 3; i++) {
    options.push(current + i)
  }
  return options
}

function getNextReviewDate(currentFY: number): string {
  return `${currentFY + 2}-07-01`
}

function getRenewalPriorityFromDecision(
  decisionValue: string
): { id: string; value: string; label: string } | undefined {
  switch (decisionValue) {
    case 'renew':
      return { id: '2c91808b8fa48399019034ba4f23000e', value: 'definitely_renew', label: 'Definitely renew' }
    case 'watch':
      return { id: '2c91808b8fa48399019034ba4f23000f', value: 'for_review', label: 'For review' }
    case 'cancel':
      return { id: '2c91808b8fa48399019034ba4f230010', value: 'definitely_cancel', label: 'Definitely cancel' }
    default:
      return undefined
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [decisionValue, setDecisionValue] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingAgreementId, setSavingAgreementId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedFY, setSelectedFY] = useState<number>(getCurrentFiscalYear())

  const { start: fyStart, end: fyEnd } = getFiscalYearDates(selectedFY)
  const folioUiBase = getFolioUiBaseUrl()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!getToken()) navigate('/login', { replace: true })
  }, [navigate])

  // Listen for auth expiration events
  useEffect(() => {
    const handleAuthExpired = () => navigate('/login', { replace: true })
    window.addEventListener('folio-auth-expired', handleAuthExpired)
    return () => window.removeEventListener('folio-auth-expired', handleAuthExpired)
  }, [navigate])

  // Fetch supplementary properties
  const { data: custprops, isLoading: loadingCustprops, error: custpropsError } = useQuery({
    queryKey: ['custprops'],
    queryFn: getCustprops,
  })

  // Discover property names dynamically
  const reviewDateProp = custprops
    ? findPropertyByName(custprops, [REVIEW_DATE_PROP_NAME, 'Next Rubric Review', 'rubricreview'])
    : undefined
  const reviewDecisionProp = custprops
    ? findPropertyByName(custprops, [REVIEW_DECISION_PROP_NAME, 'Rubric Review Decision', 'rubricscore'])
    : undefined
  const lastReviewProp = custprops
    ? findPropertyByName(custprops, [LAST_REVIEW_PROP_NAME, 'Last Rubric Review', 'lastrubricreview'])
    : undefined

  const effectiveReviewDateName = reviewDateProp?.name || REVIEW_DATE_PROP_NAME
  const effectiveReviewDecisionName = reviewDecisionProp?.name || REVIEW_DECISION_PROP_NAME
  const effectiveLastReviewName = lastReviewProp?.name || LAST_REVIEW_PROP_NAME
  const decisionOptions = reviewDecisionProp?.category?.values || []

  const serverFilter = effectiveReviewDateName
    ? `customProperties.${effectiveReviewDateName}.value isSet`
    : undefined

  // Fetch agreements
  const { data: allAgreements, isLoading: loadingAgreements } = useQuery({
    queryKey: ['all-agreements', serverFilter],
    queryFn: () => getAllAgreements({ filter: serverFilter!, sort: 'name;asc' }),
    enabled: !!serverFilter,
  })

  // Filter agreements
  const filterConfig: FilterConfig = {
    reviewDateProp: effectiveReviewDateName,
    decisionProp: effectiveReviewDecisionName,
    lastReviewProp: effectiveLastReviewName,
    fyStart,
    fyEnd,
    selectedFY,
  }

  const { queue: queueAgreements, decided: decidedAgreements } = allAgreements
    ? filterAgreements(allAgreements, filterConfig)
    : { queue: [], decided: [] }

  const summary = allAgreements && custprops
    ? {
        totalAgreements: allAgreements.length,
        decisionsMade: decidedAgreements.length,
      }
    : null

  const sortedQueue = sortReviewQueue(
    queueAgreements,
    effectiveReviewDecisionName,
    effectiveReviewDateName,
  )

  const sortedDecided = sortDecidedAgreements(
    decidedAgreements,
    effectiveLastReviewName,
  )

  // Save decision handler
  const handleSaveDecision = async (agreementId: string) => {
    if (!decisionValue || !editingId) return
    setSaving(true)
    setSavingAgreementId(agreementId)

    try {
      const agreement = allAgreements?.find((a) => a.id === editingId)
      if (!agreement) throw new Error('Agreement not found')

      const option = decisionOptions.find((o) => o.value === decisionValue)
      if (!option) throw new Error('Invalid decision value')

      const existingCp = agreement.customProperties || {}

      // Start with all existing properties marked _delete: false so they are
      // preserved. The ERM PUT endpoint deletes any custom property not present
      // in the payload, so we must include every existing property.
      const updatedCp: Record<string, CustomPropertyValue[]> = {}
      for (const [key, values] of Object.entries(existingCp)) {
        updatedCp[key] = values.map((v) => ({ ...v, _delete: false }))
      }

      // Set lastrubricreview to today
      const today = new Date().toISOString().split('T')[0]
      if (lastReviewProp) {
        updatedCp[effectiveLastReviewName] = [{
          id: existingCp[effectiveLastReviewName]?.[0]?.id,
          internal: true,
          value: today,
          type: lastReviewProp as unknown as CustomPropertyValue['type'],
          _delete: false,
        }]
      }

      // Build the note: preserve existing history, append new entry
      const decisionLabel = option.label.toUpperCase()
      const newEntry = `§ FY${selectedFY} ${decisionLabel}`
      const existingNote = existingCp[effectiveReviewDecisionName]?.[0]?.note ?? ''
      const fullNote = existingNote
        ? `${existingNote}\n${newEntry}${note ? ` — ${note}` : ''}`
        : `${newEntry}${note ? ` — ${note}` : ''}`

      updatedCp[effectiveReviewDecisionName] = [{
        id: existingCp[effectiveReviewDecisionName]?.[0]?.id,
        internal: true,
        value: { id: option.id, value: option.value, label: option.label },
        note: fullNote,
        type: reviewDecisionProp as unknown as CustomPropertyValue['type'],
        _delete: false,
      }]

      // Advance rubricreview by 3 years for renew/watch, leave as-is for cancel
      if (reviewDateProp) {
        const existingReview = existingCp[effectiveReviewDateName]?.[0]
        if (option.value === 'cancel') {
          // Cancelled — don't advance. If a review date exists, the loop above
          // already copied it with _delete: false, so nothing to do.
        } else {
          updatedCp[effectiveReviewDateName] = [{
            id: existingReview?.id,
            internal: true,
            value: getNextReviewDate(selectedFY),
            type: reviewDateProp as unknown as CustomPropertyValue['type'],
            _delete: false,
          }]
        }
      }

      const renewalPriority = getRenewalPriorityFromDecision(option.value)
      const updatedPayload = buildUpdatePayload(agreement, {
        customProperties: updatedCp,
        renewalPriority: renewalPriority ?? null,
      })

      await updateAgreement(agreementId, updatedPayload)

      // Optimistic cache update
      if (allAgreements) {
        const updatedAgreement = {
          ...agreement,
          customProperties: updatedCp,
          renewalPriority: getRenewalPriorityFromDecision(option.value),
        }
        const updatedAll = allAgreements.map((a) =>
          a.id === agreementId ? updatedAgreement : a,
        )
        queryClient.setQueryData(['all-agreements', serverFilter], updatedAll)
      }

      setEditingId(null)
      setDecisionValue('')
      setNote('')

      await queryClient.invalidateQueries({ queryKey: ['all-agreements'] })
    } catch (err) {
      console.error('Failed to save decision:', err)
      alert(`Failed to save: ${(err as Error).message}`)
    } finally {
      setSaving(false)
      setSavingAgreementId(null)
    }
  }

  const handleLogout = () => {
    clearToken()
    navigate('/login')
  }

  if (loadingCustprops) {
    return (
      <div className={styles.loading}>
        <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Loading configuration...</p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          Connecting to FOLIO API...
        </p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>FOLIO ERM Dashboard</h1>
          <p className={styles.headerSubtitle}>Rubric Review Queue</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.fySelector}>
            <label className={styles.fyLabel} htmlFor="fy-select">Fiscal Year:</label>
            <select
              id="fy-select"
              className={styles.fySelect}
              value={selectedFY}
              onChange={(e) => setSelectedFY(Number(e.target.value))}
            >
              {getFiscalYearOptions().map((fy) => (
                <option key={fy} value={fy}>FY{fy} ({fy - 1}–{fy})</option>
              ))}
            </select>
          </div>
          <button
            className={styles.refreshButton}
            onClick={async () => {
              setRefreshing(true)
              try {
                await queryClient.invalidateQueries({ queryKey: ['all-agreements'] })
                await queryClient.invalidateQueries({ queryKey: ['custprops'] })
              } finally {
                setRefreshing(false)
              }
            }}
            title="Refresh data from FOLIO"
            disabled={refreshing}
          >
            {refreshing ? '⟳ Refreshing...' : '↻ Refresh'}
          </button>
          <button className={styles.logoutButton} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {custpropsError && (
        <div className={styles.errorBanner}>
          <p className={styles.errorTitle}>Connection Error</p>
          <p className={styles.errorText}>
            Could not connect to the FOLIO API. Please verify your Okapi URL and tenant.
          </p>
          <p className={styles.errorHint}>
            Tip: If using the dev server, ensure the Okapi URL starts with <code>/okapi</code>
            or matches your FOLIO server&apos;s address.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      {summary && allAgreements && (
        <SummaryCards
          totalAgreements={summary.totalAgreements}
          pendingDecisions={queueAgreements.length}
          decisionsMade={decidedAgreements.length}
        />
      )}

      {/* Review Queue */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Review Queue
          <span className={`${styles.countBadge} ${styles.warning}`}>
            {sortedQueue.length} agreements
          </span>
        </h2>
        {loadingAgreements ? (
          <div className={styles.loading}>Loading agreements...</div>
        ) : sortedQueue.length === 0 ? (
          <div className={styles.emptyState}>
            <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              No agreements are due for review this fiscal year with pending decisions.
            </p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              All review decisions for this fiscal year have been recorded.
            </p>
          </div>
        ) : (
          <ReviewQueueTable
            sortedQueue={sortedQueue}
            editingId={editingId}
            setEditingId={setEditingId}
            decisionValue={decisionValue}
            setDecisionValue={setDecisionValue}
            note={note}
            setNote={setNote}
            saving={saving}
            handleSaveDecision={handleSaveDecision}
            effectiveReviewDateName={effectiveReviewDateName}
            effectiveReviewDecisionName={effectiveReviewDecisionName}
            decisionOptions={decisionOptions}
            savingAgreementId={savingAgreementId}
            folioUiBase={folioUiBase}
          />
        )}
      </section>

      {/* Decided Agreements */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Decisions Made This FY
          <span className={`${styles.countBadge} ${styles.success}`}>
            {sortedDecided.length} agreements
          </span>
        </h2>
        {loadingAgreements ? (
          <div className={styles.loading}>Loading agreements...</div>
        ) : sortedDecided.length === 0 ? (
          <div className={styles.emptyState}>
            <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              No agreements with decisions this fiscal year.
            </p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              Switch to a different fiscal year to see past decisions.
            </p>
          </div>
        ) : (
          <DecidedTable
            sortedDecided={sortedDecided}
            effectiveLastReviewName={effectiveLastReviewName}
            effectiveReviewDecisionName={effectiveReviewDecisionName}
            folioUiBase={folioUiBase}
          />
        )}
      </section>
    </div>
  )
}

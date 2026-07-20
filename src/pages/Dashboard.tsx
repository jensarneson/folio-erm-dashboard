import { useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, clearToken, getFolioUiBaseUrl } from '../lib/okapi'
import { useFiscalYear } from '../hooks/useFiscalYear'
import { usePropertyDiscovery } from '../hooks/usePropertyDiscovery'
import { useAgreements } from '../hooks/useAgreements'
import { useDecisionSave } from '../hooks/useDecisionSave'
import SummaryCards from '../components/SummaryCards'
import ReviewQueueTable from '../components/ReviewQueueTable'
import DecidedTable from '../components/DecidedTable'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const { selectedFY, setSelectedFY, fyStart, fyEnd, options: fyOptions } = useFiscalYear()
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

  const {
    loadingCustprops,
    custpropsError,
    reviewDateProp,
    reviewDecisionProp,
    lastReviewProp,
    effectiveReviewDateName,
    effectiveReviewDecisionName,
    effectiveLastReviewName,
    decisionOptions,
  } = usePropertyDiscovery()

  const {
    allAgreements,
    loadingAgreements,
    queueAgreements,
    sortedQueue,
    sortedDecided,
    summary,
    serverFilter,
  } = useAgreements({
    effectiveReviewDateName,
    effectiveReviewDecisionName,
    effectiveLastReviewName,
    fyStart,
    fyEnd,
    selectedFY,
  })

  const {
    editingId,
    setEditingId,
    decisionValue,
    setDecisionValue,
    note,
    setNote,
    saving,
    savingAgreementId,
    handleSaveDecision,
  } = useDecisionSave({
    allAgreements,
    decisionOptions,
    reviewDateProp,
    reviewDecisionProp,
    lastReviewProp,
    effectiveReviewDateName,
    effectiveReviewDecisionName,
    effectiveLastReviewName,
    selectedFY,
    serverFilter,
  })

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
              {fyOptions.map((fy) => (
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
          decisionsMade={summary.decisionsMade}
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

import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCustprops,
  getAllAgreements,
  updateAgreement,
  buildUpdatePayload,
  type AgreementOrg,
  type CustomPropertyValue,
} from '../lib/folioApi'

import {
  getCurrentFiscalYear,
  getFiscalYearDates,
} from '../lib/utils'
import { getOkapiConfig } from '../lib/okapi'
import {
  findPropertyByName,
  filterAgreements,
  sortReviewQueue,
  sortDecidedAgreements,
  getDecisionValue,
  getDecisionLabel,
  getReviewDate,
  getLastReviewDate,
  type FilterConfig,
} from '../lib/agreementHelpers'
import type { Agreement } from '../lib/folioApi'
import { useQueryClient } from '@tanstack/react-query'
import { getToken, clearToken, getFolioUiBaseUrl } from '../lib/okapi'

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

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryCards({ summary, queueAgreements, decidedAgreements }: {
  summary: { totalAgreements: number; decisionsMade: number }
  queueAgreements: number
  decidedAgreements: number
}) {
  return (
    <div style={styles.summaryGrid}>
      <div style={{ ...styles.summaryCard, borderLeft: '4px solid var(--color-accent)' }}>
        <div style={styles.summaryLabel}>Total Agreements</div>
        <div style={{ ...styles.summaryValue, color: 'var(--color-accent)' }}>
          {summary.totalAgreements}
        </div>
      </div>
      <div style={{ ...styles.summaryCard, borderLeft: '4px solid var(--color-warning)' }}>
        <div style={styles.summaryLabel}>Pending Decision</div>
        <div style={{ ...styles.summaryValue, color: 'var(--color-warning)' }}>
          {queueAgreements}
        </div>
      </div>
      <div style={{ ...styles.summaryCard, borderLeft: '4px solid var(--color-success)' }}>
        <div style={styles.summaryLabel}>Decision Made</div>
        <div style={{ ...styles.summaryValue, color: 'var(--color-success)' }}>
          {decidedAgreements}
        </div>
      </div>
    </div>
  )
}

function DecisionForm({
  decisionValue,
  setDecisionValue,
  note,
  setNote,
  saving,
  onSave,
  onCancel,
  decisionOptions,
}: {
  decisionValue: string
  setDecisionValue: (v: string) => void
  note: string
  setNote: (v: string) => void
  saving: boolean
  onSave: () => void
  onCancel: () => void
  decisionOptions: { id: string; value: string; label: string }[]
}) {
  return (
    <div style={styles.decisionForm}>
      <select
        style={styles.select}
        value={decisionValue}
        onChange={(e) => setDecisionValue(e.target.value)}
        aria-label="Select decision"
      >
        <option value="">Select decision...</option>
        {decisionOptions.map((opt) => (
          <option key={opt.id} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        style={styles.input}
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-label="Optional note"
      />
      <div style={styles.buttonRow}>
        <button
          onClick={onSave}
          disabled={saving || !decisionValue}
          style={styles.saveButton}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          style={styles.cancelButton}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function OrganizationLink({ org, roleLabels, isPrimary }: {
  org: AgreementOrg
  roleLabels?: string
  isPrimary?: boolean
}) {
  const { cachedOkapiUrl } = getOkapiConfig()
  const baseUrl = cachedOkapiUrl.replace(/\/$/, '')
  const orgId = org.org?.orgsUuid || org.org?.id
  const displayName = org.org?.name || org.name || org.id

  const content = (
    <span>
      {displayName}
      {roleLabels && (
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.6875rem', marginLeft: '0.25rem' }}>
          ({roleLabels})
        </span>
      )}
      {isPrimary && (
        <span
          style={{
            fontSize: '0.625rem',
            marginLeft: '0.375rem',
            padding: '0 0.25rem',
            background: 'var(--color-accent-light)',
            color: 'var(--color-accent)',
            borderRadius: '3px',
            fontWeight: 600,
          }}
        >
          primary
        </span>
      )}
    </span>
  )

  if (!orgId) {
    return <span style={{ fontSize: '0.8125rem' }}>{content}</span>
  }

  return (
    <a
      href={`${baseUrl}/erm/agreements`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ ...styles.agreementLink, fontSize: '0.8125rem', display: 'inline-block', marginBottom: '0.125rem' }}
    >
      {content}
    </a>
  )
}

function formatOrgs(orgs?: AgreementOrg[]): ReactNode {
  if (!orgs || orgs.length === 0) return '—'

  const sorted = [...orgs].sort((a, b) => {
    if (a.primaryOrg && !b.primaryOrg) return -1
    if (!a.primaryOrg && b.primaryOrg) return 1
    return 0
  })

  return (
    <span>
      {sorted.map((o) => {
        const name = o.org?.name || o.name || o.id
        const roleLabels = o.roles
          ?.map((r) => r.role?.label)
          .filter(Boolean)
          .join(', ')

        return (
          <OrganizationLink key={name} org={o} roleLabels={roleLabels} isPrimary={o.primaryOrg} />
        )
      })}
    </span>
  )
}

function ReviewQueueTable({
  sortedQueue,
  editingId,
  setEditingId,
  decisionValue,
  setDecisionValue,
  note,
  setNote,
  saving,
  handleSaveDecision,
  effectiveReviewDateName,
  effectiveReviewDecisionName,
  decisionOptions,
  savingAgreementId,
  folioUiBase,
}: {
  sortedQueue: Agreement[]
  editingId: string | null
  setEditingId: (id: string | null) => void
  decisionValue: string
  setDecisionValue: (v: string) => void
  note: string
  setNote: (v: string) => void
  saving: boolean
  handleSaveDecision: (id: string) => void
  effectiveReviewDateName: string
  effectiveReviewDecisionName: string
  decisionOptions: { id: string; value: string; label: string }[]
  savingAgreementId: string | null
  folioUiBase: string
}) {
  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Agreement Name</th>
            <th style={styles.th}>Review Date</th>
            <th style={styles.th}>Previous Decision</th>
            <th style={styles.th}>Decision</th>
            <th style={styles.th}>Description</th>
            <th style={styles.th}>Organizations</th>
          </tr>
        </thead>
        <tbody>
          {sortedQueue.map((agreement) => {
            const reviewDate = getReviewDate(agreement, effectiveReviewDateName)
            const isEditing = editingId === agreement.id
            const isSaving = savingAgreementId === agreement.id

            return (
              <tr key={agreement.id} style={{ ...styles.tr, ...(isSaving ? styles.savingRow : {}) }}>
                <td style={styles.td}>
                  <a
                    href={`${folioUiBase}/erm/agreements/${agreement.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.agreementLink}
                  >
                    {agreement.name}
                  </a>
                </td>
                <td style={styles.td}>
                  {reviewDate ? new Date(reviewDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                </td>
                <td style={styles.td}>
                  {(() => {
                    const prevDecision = getDecisionValue(agreement, effectiveReviewDecisionName)
                    if (!prevDecision) return '—'
                    const { label, color } = getDecisionLabel(prevDecision)
                    return (
                      <span style={{ ...styles.statusBadge, borderColor: color, color: color }}>
                        {label}
                      </span>
                    )
                  })()}
                </td>
                <td style={styles.td}>
                  {isEditing ? (
                    <DecisionForm
                      decisionValue={decisionValue}
                      setDecisionValue={setDecisionValue}
                      note={note}
                      setNote={setNote}
                      saving={saving}
                      onSave={() => handleSaveDecision(agreement.id)}
                      onCancel={() => {
                        setEditingId(null)
                        setDecisionValue('')
                        setNote('')
                      }}
                      decisionOptions={decisionOptions}
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(agreement.id)
                        setDecisionValue('')
                        setNote('')
                      }}
                      style={styles.editButton}
                    >
                      Set decision
                    </button>
                  )}
                </td>
                <td style={{ ...styles.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span title={agreement.description || undefined}>
                    {agreement.description || '—'}
                  </span>
                </td>
                <td style={styles.td}>
                  {formatOrgs(agreement.orgs)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DecidedTable({ sortedDecided, effectiveLastReviewName, effectiveReviewDecisionName, folioUiBase }: {
  sortedDecided: Agreement[]
  effectiveLastReviewName: string
  effectiveReviewDecisionName: string
  folioUiBase: string
}) {
  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Agreement Name</th>
            <th style={styles.th}>Reviewed</th>
            <th style={styles.th}>Decision</th>
            <th style={styles.th}>Description</th>
            <th style={styles.th}>Organizations</th>
          </tr>
        </thead>
        <tbody>
          {sortedDecided.map((agreement) => {
            const lastReviewDate = getLastReviewDate(agreement, effectiveLastReviewName)
            const decisionValue = getDecisionValue(agreement, effectiveReviewDecisionName)
            const decisionInfo = decisionValue ? getDecisionLabel(decisionValue) : { label: '—', color: 'var(--color-text-secondary)' }

            return (
              <tr key={agreement.id} style={styles.tr}>
                <td style={styles.td}>
                  <a
                    href={`${folioUiBase}/erm/agreements/${agreement.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.agreementLink}
                  >
                    {agreement.name}
                  </a>
                </td>
                <td style={styles.td}>
                  {lastReviewDate ? new Date(lastReviewDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                </td>
                <td style={styles.td}>
                  <span style={{ ...styles.statusBadge, borderColor: decisionInfo.color, color: decisionInfo.color }}>
                    {decisionInfo.label}
                  </span>
                </td>
                <td style={{ ...styles.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={agreement.description || undefined}>
                  {agreement.description || '—'}
                </td>
                <td style={styles.td}>
                  {formatOrgs(agreement.orgs)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [decisionValue, setDecisionValue] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingAgreementId, setSavingAgreementId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    const token = getToken()
    if (!token) {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  // Listen for auth expiration events
  useEffect(() => {
    const handleAuthExpired = () => {
      navigate('/login', { replace: true })
    }
    window.addEventListener('folio-auth-expired', handleAuthExpired)
    return () => window.removeEventListener('folio-auth-expired', handleAuthExpired)
  }, [navigate])

  const [selectedFY, setSelectedFY] = useState<number>(getCurrentFiscalYear())
  const { start: fyStart, end: fyEnd } = getFiscalYearDates(selectedFY)

  const folioUiBase = getFolioUiBaseUrl()

  // Fetch supplementary properties
  const { data: custprops, isLoading: loadingCustprops, error: custpropsError } = useQuery({
    queryKey: ['custprops'],
    queryFn: getCustprops,
  })

  // Discover the review date and decision properties dynamically
  const reviewDateProp = custprops
    ? findPropertyByName(custprops, [
        REVIEW_DATE_PROP_NAME,
        'Next Rubric Review',
        'rubricreview',
      ])
    : undefined
  const reviewDecisionProp = custprops
    ? findPropertyByName(custprops, [
        REVIEW_DECISION_PROP_NAME,
        'Rubric Review Decision',
        'rubricscore',
      ])
    : undefined
  const lastReviewProp = custprops
    ? findPropertyByName(custprops, [
        LAST_REVIEW_PROP_NAME,
        'Last Rubric Review',
        'lastrubricreview',
      ])
    : undefined

  // Use discovered property names, falling back to defaults
  const effectiveReviewDateName = reviewDateProp?.name || REVIEW_DATE_PROP_NAME
  const effectiveReviewDecisionName = reviewDecisionProp?.name || REVIEW_DECISION_PROP_NAME
  const effectiveLastReviewName = lastReviewProp?.name || LAST_REVIEW_PROP_NAME

  // Get decision options from the custprop category
  const decisionOptions = reviewDecisionProp?.category?.values || []

  // Build the server-side filter once we know the property name
  const serverFilter = effectiveReviewDateName
    ? `customProperties.${effectiveReviewDateName}.value isSet`
    : undefined

  // Fetch agreements with rubricreview set, sorted by name
  const { data: allAgreements, isLoading: loadingAgreements } = useQuery({
    queryKey: ['all-agreements', serverFilter],
    queryFn: () => {
      return getAllAgreements({
        filter: serverFilter!,
        sort: 'name;asc',
      })
    },
    enabled: !!serverFilter,
  })

  // Filter and compute summary in one pass using shared helpers
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

  // Summary: totalAgreements = all agreements with rubricreview set (not FY-filtered)
  // queue + decided are FY-specific
  const summary = allAgreements && custprops
    ? {
        totalAgreements: allAgreements.length,
        decisionsMade: decidedAgreements.length,
      }
    : null

  const sortedQueue = sortReviewQueue(
    queueAgreements,
    effectiveReviewDecisionName,
    effectiveReviewDateName
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

      // Build custom properties payload.
      // For properties that already exist, include their existing ID so FOLIO
      // updates in place instead of appending a new entry.
      // For new properties (lastrubricreview), omit id so FOLIO assigns one.
      const updatedCp: Record<string, CustomPropertyValue[]> = {}

      // Set lastrubricreview to today for all decisions (new entry)
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

      // Set decision (refdata type — value is the refdata option object)
      updatedCp[effectiveReviewDecisionName] = [{
        id: existingCp[effectiveReviewDecisionName]?.[0]?.id,
        internal: true,
        value: {
          id: option.id,
          value: option.value,
          label: option.label,
        },
        note: fullNote,
        type: reviewDecisionProp as unknown as CustomPropertyValue['type'],
        _delete: false,
      }]

      // Advance rubricreview by 3 years for renew/watch, leave as-is for cancel.
      // Include the existing entry's ID so FOLIO updates it in place.
      if (reviewDateProp) {
        const existingReview = existingCp[effectiveReviewDateName]?.[0]
        updatedCp[effectiveReviewDateName] = [{
          id: existingReview?.id,
          internal: true,
          value: getNextReviewDate(selectedFY),
          type: reviewDateProp as unknown as CustomPropertyValue['type'],
          _delete: false,
        }]
      }

      // Build the full PUT payload — the ERM API requires the complete agreement object
      const renewalPriority = getRenewalPriorityFromDecision(option.value)
      const updatedPayload = buildUpdatePayload(agreement, {
        customProperties: updatedCp,
        renewalPriority: renewalPriority ?? null,
      })

      await updateAgreement(agreementId, updatedPayload)

      // Optimistic update: update the local cache with the new data
      if (allAgreements) {
        const updatedAgreement = {
          ...agreement,
          customProperties: updatedCp,
          renewalPriority: getRenewalPriorityFromDecision(option.value),
        }
        const updatedAll = allAgreements.map((a) =>
          a.id === agreementId ? updatedAgreement : a
        )
        queryClient.setQueryData(['all-agreements', serverFilter], updatedAll)
      }

      // Reset form
      setEditingId(null)
      setDecisionValue('')
      setNote('')

      // Also invalidate queries to ensure server consistency
      await queryClient.invalidateQueries({ queryKey: ['all-agreements'] })
    } catch (err) {
      console.error('Failed to save decision:', err)
      alert(`Failed to save: ${(err as Error).message}`)
    } finally {
      setSaving(false)
      setSavingAgreementId(null)
    }
  }

  const sortedDecided = sortDecidedAgreements(
    decidedAgreements,
    effectiveLastReviewName
  )

  const handleLogout = () => {
    clearToken()
    navigate('/login')
  }

  if (loadingCustprops) {
    return (
      <div style={styles.loading}>
        <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Loading configuration...</p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          Connecting to FOLIO API...
        </p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>FOLIO ERM Dashboard</h1>
          <p style={styles.headerSubtitle}>
            Rubric Review Queue
          </p>
        </div>
        <div style={styles.headerActions}>
            <div style={styles.fySelector}>
              <label style={styles.fyLabel} htmlFor="fy-select">Fiscal Year:</label>
              <select
                id="fy-select"
                style={styles.fySelect}
                value={selectedFY}
                onChange={(e) => setSelectedFY(Number(e.target.value))}
              >
                {getFiscalYearOptions().map((fy) => (
                  <option key={fy} value={fy}>
                    FY{fy} ({fy - 1}–{fy})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={async () => {
                setRefreshing(true)
                try {
                  await queryClient.invalidateQueries({ queryKey: ['all-agreements'] })
                  await queryClient.invalidateQueries({ queryKey: ['custprops'] })
                } finally {
                  setRefreshing(false)
                }
              }}
              style={styles.refreshButton}
              title="Refresh data from FOLIO"
              disabled={refreshing}
            >
              {refreshing ? '⟳ Refreshing...' : '↻ Refresh'}
            </button>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Sign out
            </button>
          </div>
      </header>

      {/* Error Banner */}
      {custpropsError && (
        <div style={styles.errorBanner}>
          <p style={styles.errorTitle}>Connection Error</p>
          <p style={styles.errorText}>
            Could not connect to the FOLIO API. Please verify your Okapi URL and tenant.
          </p>
          <p style={styles.errorHint}>
            Tip: If using the dev server, ensure the Okapi URL starts with <code>/okapi</code>
            or matches your FOLIO server's address.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      {summary && allAgreements && (
        <SummaryCards
          summary={summary}
          queueAgreements={queueAgreements.length}
          decidedAgreements={decidedAgreements.length}
        />
      )}

      {/* Review Queue */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          Review Queue
          <span style={{ ...styles.countBadge, background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            {sortedQueue.length} agreements
          </span>
        </h2>

        {loadingAgreements ? (
          <div style={styles.loading}>Loading agreements...</div>
        ) : sortedQueue.length === 0 ? (
          <div style={styles.emptyState}>
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
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          Decisions Made This FY
          <span style={{ ...styles.countBadge, background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            {sortedDecided.length} agreements
          </span>
        </h2>

        {loadingAgreements ? (
          <div style={styles.loading}>Loading agreements...</div>
        ) : sortedDecided.length === 0 ? (
          <div style={styles.emptyState}>
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getNextReviewDate(currentFY: number): string {
  // Review dates are always July 1st. Adding 2 to the FY number advances
  // the review by 3 fiscal years (e.g. FY27 → FY30), since FY is named
  // after the ending year and July 1st is the FY boundary.
  return `${currentFY + 2}-07-01`
}

function getRenewalPriorityFromDecision(decisionValue: string): { id: string; value: string; label: string } | undefined {
  // These IDs come from the ERM API's renewal priority refdata.
  // In production, these should be discovered from custprops. Using placeholder IDs.
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid var(--color-border)',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  refreshButton: {
    padding: '0.5rem 1rem',
    background: 'var(--color-accent-light)',
    color: 'var(--color-accent)',
    border: '1px solid var(--color-accent)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  fySelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  fyLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
  },
  fySelect: {
    padding: '0.375rem 0.75rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    outline: 'none',
    cursor: 'pointer',
    background: 'var(--color-surface)',
  },
  headerTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--color-accent)',
  },
  headerSubtitle: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
    marginTop: '0.25rem',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
  },
  errorBanner: {
    background: 'var(--color-danger-light)',
    border: '1px solid var(--color-danger)',
    borderRadius: 'var(--radius)',
    padding: '1rem 1.25rem',
    marginBottom: '1.5rem',
  },
  errorTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--color-danger)',
    marginBottom: '0.25rem',
  },
  errorText: {
    fontSize: '0.875rem',
    color: 'var(--color-text)',
    marginBottom: '0.25rem',
  },
  errorHint: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-secondary)',
  },
  decisionForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  select: {
    padding: '0.375rem 0.5rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    fontSize: '0.8125rem',
    outline: 'none',
    background: 'var(--color-surface)',
  },
  input: {
    padding: '0.375rem 0.5rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    fontSize: '0.8125rem',
    outline: 'none',
  },
  buttonRow: {
    display: 'flex',
    gap: '0.375rem',
  },
  saveButton: {
    padding: '0.25rem 0.75rem',
    background: 'var(--color-accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '0.25rem 0.75rem',
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
  editButton: {
    padding: '0.25rem 0.75rem',
    background: 'var(--color-accent-light)',
    color: 'var(--color-accent)',
    border: '1px solid var(--color-accent)',
    borderRadius: 'var(--radius)',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  summaryCard: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius)',
    padding: '1rem 1.25rem',
    boxShadow: 'var(--shadow)',
  },
  summaryLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: 'var(--color-text-secondary)',
    letterSpacing: '0.05em',
  },
  summaryValue: {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  section: {
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  countBadge: {
    fontSize: '0.75rem',
    fontWeight: 500,
    background: 'var(--color-accent-light)',
    color: 'var(--color-accent)',
    padding: '0.125rem 0.5rem',
    borderRadius: '999px',
  },
  tableContainer: {
    overflowX: 'auto' as const,
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.875rem',
  },
  th: {
    textAlign: 'left' as const,
    padding: '0.75rem 1rem',
    borderBottom: '2px solid var(--color-border)',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap' as const,
  },
  tr: {
    borderBottom: '1px solid var(--color-border)',
  },
  savingRow: {
    opacity: 0.4,
    pointerEvents: 'none',
    background: 'var(--color-surface)',
  },
  td: {
    padding: '0.75rem 1rem',
    verticalAlign: 'top' as const,
  },
  agreementLink: {
    fontWeight: 600,
    color: 'var(--color-accent)',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.125rem 0.5rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    border: '1px solid',
  },
  loading: {
    padding: '2rem',
    textAlign: 'center' as const,
    color: 'var(--color-text-secondary)',
  },
  emptyState: {
    padding: '3rem 1rem',
    textAlign: 'center' as const,
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
  },
}

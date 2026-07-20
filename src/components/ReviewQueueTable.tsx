import DecisionForm from './DecisionForm'
import { formatOrgs } from './OrganizationCell'
import { getReviewDate, getDecisionValue, getDecisionLabel } from '../lib/agreementHelpers'
import type { Agreement } from '../lib/folioApi'
import styles from './ReviewQueueTable.module.css'

export default function ReviewQueueTable({
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
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Agreement Name</th>
            <th className={styles.th}>Review Date</th>
            <th className={styles.th}>Previous Decision</th>
            <th className={styles.th}>Decision</th>
            <th className={styles.th}>Description</th>
            <th className={styles.th}>Organizations</th>
          </tr>
        </thead>
        <tbody>
          {sortedQueue.map((agreement) => {
            const reviewDate = getReviewDate(agreement, effectiveReviewDateName)
            const isEditing = editingId === agreement.id
            const isSaving = savingAgreementId === agreement.id

            return (
              <tr key={agreement.id} className={`${styles.tr} ${isSaving ? styles.savingRow : ''}`}>
                <td className={styles.td}>
                  <a
                    href={`${folioUiBase}/erm/agreements/${agreement.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.agreementLink}
                  >
                    {agreement.name}
                  </a>
                </td>
                <td className={styles.td}>
                  {reviewDate ? new Date(reviewDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                </td>
                <td className={styles.td}>
                  {(() => {
                    const prevDecision = getDecisionValue(agreement, effectiveReviewDecisionName)
                    if (!prevDecision) return '—'
                    const { label, color } = getDecisionLabel(prevDecision)
                    return (
                      <span className={styles.badge} style={{ borderColor: color, color }}>
                        {label}
                      </span>
                    )
                  })()}
                </td>
                <td className={styles.td}>
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
                      className={styles.editButton}
                      onClick={() => {
                        setEditingId(agreement.id)
                        setDecisionValue('')
                        setNote('')
                      }}
                    >
                      Set decision
                    </button>
                  )}
                </td>
                <td className={styles.tdTruncate} title={agreement.description || undefined}>
                  {agreement.description || '—'}
                </td>
                <td className={styles.td}>
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

import { getLastReviewDate, getDecisionValue, getDecisionLabel } from '../lib/agreementHelpers'
import { formatOrgs } from './OrganizationCell'
import type { Agreement } from '../lib/folioApi'
import styles from './DecidedTable.module.css'

/**
 * Read-only table of agreements that already have a decision recorded for the selected FY.
 */
export default function DecidedTable({
  sortedDecided,
  effectiveLastReviewName,
  effectiveReviewDecisionName,
  folioUiBase,
}: {
  sortedDecided: Agreement[]
  effectiveLastReviewName: string
  effectiveReviewDecisionName: string
  folioUiBase: string
}) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Agreement Name</th>
            <th className={styles.th}>Reviewed</th>
            <th className={styles.th}>Decision</th>
            <th className={styles.th}>Description</th>
            <th className={styles.th}>Organizations</th>
          </tr>
        </thead>
        <tbody>
          {sortedDecided.map((agreement) => {
            const lastReviewDate = getLastReviewDate(agreement, effectiveLastReviewName)
            const decisionValue = getDecisionValue(agreement, effectiveReviewDecisionName)
            const decisionInfo = decisionValue
              ? getDecisionLabel(decisionValue)
              : { label: '—', color: 'var(--color-text-secondary)' }

            return (
              <tr key={agreement.id} className={styles.tr}>
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
                  {lastReviewDate ? new Date(lastReviewDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                </td>
                <td className={styles.td}>
                  <span className={styles.badge} style={{ borderColor: decisionInfo.color, color: decisionInfo.color }}>
                    {decisionInfo.label}
                  </span>
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

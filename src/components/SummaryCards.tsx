import styles from './SummaryCards.module.css'

/**
 * Display three summary stat cards: total agreements, pending decisions, and decisions made.
 */
export default function SummaryCards({
  totalAgreements,
  pendingDecisions,
  decisionsMade,
}: {
  totalAgreements: number
  pendingDecisions: number
  decisionsMade: number
}) {
  return (
    <div className={styles.grid}>
      <div className={`${styles.card} ${styles.accent}`}>
        <div className={styles.label}>Total Agreements</div>
        <div className={`${styles.value} ${styles.accent}`}>{totalAgreements}</div>
      </div>
      <div className={`${styles.card} ${styles.warning}`}>
        <div className={styles.label}>Pending Decision</div>
        <div className={`${styles.value} ${styles.warning}`}>{pendingDecisions}</div>
      </div>
      <div className={`${styles.card} ${styles.success}`}>
        <div className={styles.label}>Decision Made</div>
        <div className={`${styles.value} ${styles.success}`}>{decisionsMade}</div>
      </div>
    </div>
  )
}

import styles from './DecisionForm.module.css'

export default function DecisionForm({
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
    <div className={styles.form}>
      <select
        className={styles.select}
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
        className={styles.input}
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-label="Optional note"
      />
      <div className={styles.buttonRow}>
        <button
          className={styles.saveButton}
          onClick={onSave}
          disabled={saving || !decisionValue}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          className={styles.cancelButton}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

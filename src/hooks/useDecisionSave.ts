import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  updateAgreement,
  buildUpdatePayload,
  type Agreement,
  type CustomPropertyValue,
} from '../lib/folioApi'

const RENEWAL_PRIORITY_MAP: Record<string, { id: string; value: string; label: string }> = {
  renew: { id: '2c91808b8fa48399019034ba4f23000e', value: 'definitely_renew', label: 'Definitely renew' },
  watch: { id: '2c91808b8fa48399019034ba4f23000f', value: 'for_review', label: 'For review' },
  cancel: { id: '2c91808b8fa48399019034ba4f230010', value: 'definitely_cancel', label: 'Definitely cancel' },
}

interface UseDecisionSaveParams {
  allAgreements: Agreement[] | undefined
  decisionOptions: { id: string; value: string; label: string }[]
  reviewDateProp: { id: string; name: string; label: string } | undefined
  reviewDecisionProp: { id: string; name: string; label: string } | undefined
  lastReviewProp: { id: string; name: string; label: string } | undefined
  effectiveReviewDateName: string
  effectiveReviewDecisionName: string
  effectiveLastReviewName: string
  selectedFY: number
  serverFilter: string | undefined
}

/**
 * Manage inline decision editing state and the save mutation.
 */
export function useDecisionSave({
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
}: UseDecisionSaveParams) {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [decisionValue, setDecisionValue] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingAgreementId, setSavingAgreementId] = useState<string | null>(null)

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

      // Preserve all existing properties — the ERM PUT endpoint deletes any
      // custom property not present in the payload.
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
        if (option.value !== 'cancel') {
          updatedCp[effectiveReviewDateName] = [{
            id: existingReview?.id,
            internal: true,
            value: `${selectedFY + 2}-07-01`,
            type: reviewDateProp as unknown as CustomPropertyValue['type'],
            _delete: false,
          }]
        }
      }

      const renewalPriority = RENEWAL_PRIORITY_MAP[option.value]
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
          renewalPriority: RENEWAL_PRIORITY_MAP[option.value],
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

  return {
    editingId,
    setEditingId,
    decisionValue,
    setDecisionValue,
    note,
    setNote,
    saving,
    savingAgreementId,
    handleSaveDecision,
  }
}

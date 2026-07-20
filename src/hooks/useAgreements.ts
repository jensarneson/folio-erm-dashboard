import { useQuery } from '@tanstack/react-query'
import { getAllAgreements } from '../lib/folioApi'
import {
  filterAgreements,
  sortReviewQueue,
  sortDecidedAgreements,
  type FilterConfig,
} from '../lib/agreementHelpers'

interface UseAgreementsParams {
  effectiveReviewDateName: string
  effectiveReviewDecisionName: string
  effectiveLastReviewName: string
  fyStart: string
  fyEnd: string
  selectedFY: number
}

interface AgreementSummary {
  totalAgreements: number
  decisionsMade: number
}

/**
 * Fetch all agreements and derive the review queue, decided list, and summary.
 */
export function useAgreements({
  effectiveReviewDateName,
  effectiveReviewDecisionName,
  effectiveLastReviewName,
  fyStart,
  fyEnd,
  selectedFY,
}: UseAgreementsParams) {
  const serverFilter = effectiveReviewDateName
    ? `customProperties.${effectiveReviewDateName}.value isSet`
    : undefined

  const { data: allAgreements, isLoading: loadingAgreements } = useQuery({
    queryKey: ['all-agreements', serverFilter],
    queryFn: () => getAllAgreements({ filter: serverFilter!, sort: 'name;asc' }),
    enabled: !!serverFilter,
  })

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

  const summary = allAgreements
    ? {
        totalAgreements: allAgreements.length,
        decisionsMade: decidedAgreements.length,
      } satisfies AgreementSummary
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

  return {
    allAgreements,
    loadingAgreements,
    queueAgreements,
    decidedAgreements,
    sortedQueue,
    sortedDecided,
    summary,
    serverFilter,
  }
}

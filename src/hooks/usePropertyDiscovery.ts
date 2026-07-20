import { useQuery } from '@tanstack/react-query'
import { getCustprops } from '../lib/folioApi'
import { findPropertyByName } from '../lib/agreementHelpers'

const REVIEW_DATE_PROP_NAME = 'rubricreview'
const REVIEW_DECISION_PROP_NAME = 'rubricscore'
const LAST_REVIEW_PROP_NAME = 'lastrubricreview'

/**
 * Fetch supplementary property definitions and discover the effective
 * property names used by the dashboard (with fallback defaults).
 */
export function usePropertyDiscovery() {
  const { data: custprops, isLoading, error } = useQuery({
    queryKey: ['custprops'],
    queryFn: getCustprops,
  })

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

  return {
    custprops,
    loadingCustprops: isLoading,
    custpropsError: error,
    reviewDateProp,
    reviewDecisionProp,
    lastReviewProp,
    effectiveReviewDateName,
    effectiveReviewDecisionName,
    effectiveLastReviewName,
    decisionOptions,
  }
}

import { describe, it, expect } from 'vitest'
import { filterAgreements, sortReviewQueue, sortDecidedAgreements } from '../lib/agreementHelpers'
import type { Agreement, CustomPropertyValue } from '../lib/folioApi'

const makeAgreement = (overrides: Partial<Agreement> = {}): Agreement => ({
  id: 'test-id',
  name: 'Test Agreement',
  description: 'Test description',
  customProperties: {},
  renewalPriority: { id: 'rp1', value: 'for_review', label: 'For review' },
  orgs: [],
  _raw: {},
  ...overrides,
})

describe('filterAgreements', () => {
  it('separates queue and decided agreements', () => {
    const dueAgreement = makeAgreement({
      customProperties: {
        rubricreview: [{ id: 1, value: '2025-07-01', internal: true, type: {} as CustomPropertyValue['type'] }],
        rubricscore: [{ id: 1, value: { id: '1', value: 'renew', label: 'Renew' }, internal: true, type: {} as CustomPropertyValue['type'] }],
        lastrubricreview: [{ id: 1, value: '2025-07-01', internal: true, type: {} as CustomPropertyValue['type'] }],
      },
    })
    const undeterminedAgreement = makeAgreement({
      customProperties: {
        rubricreview: [{ id: 1, value: '2025-07-01', internal: true, type: {} as CustomPropertyValue['type'] }],
      },
    })

    const agreements = [dueAgreement, undeterminedAgreement]
    const result = filterAgreements(
      agreements,
      {
        reviewDateProp: 'rubricreview',
        decisionProp: 'rubricscore',
        lastReviewProp: 'lastrubricreview',
        fyStart: '2025-07-01',
        fyEnd: '2026-06-30',
        selectedFY: 2025,
      }
    )

    expect(result.queue).toHaveLength(1)
    expect(result.decided).toHaveLength(1)
  })
})

describe('sortReviewQueue', () => {
  it('sorts by review date ascending', () => {
    const later = makeAgreement({
      id: 'later',
      name: 'Later Agreement',
      customProperties: {
        rubricreview: [{ id: 1, value: '2025-12-01', internal: true, type: {} as CustomPropertyValue['type'] }],
      },
    })
    const earlier = makeAgreement({
      id: 'earlier',
      name: 'Earlier Agreement',
      customProperties: {
        rubricreview: [{ id: 1, value: '2025-07-01', internal: true, type: {} as CustomPropertyValue['type'] }],
      },
    })

    const sorted = sortReviewQueue([later, earlier], 'rubricscore', 'rubricreview')
    expect(sorted[0].id).toBe('earlier')
  })
})

describe('sortDecidedAgreements', () => {
  it('sorts by last review date ascending (oldest first)', () => {
    const older = makeAgreement({
      id: 'older',
      name: 'Older Agreement',
      customProperties: {
        lastrubricreview: [{ id: 1, value: '2024-01-01', internal: true, type: {} as CustomPropertyValue['type'] }],
        rubricscore: [{ id: 1, value: { id: '1', value: 'renew', label: 'Renew' }, internal: true, type: {} as CustomPropertyValue['type'] }],
      },
    })
    const newer = makeAgreement({
      id: 'newer',
      name: 'Newer Agreement',
      customProperties: {
        lastrubricreview: [{ id: 1, value: '2024-06-01', internal: true, type: {} as CustomPropertyValue['type'] }],
        rubricscore: [{ id: 1, value: { id: '1', value: 'renew', label: 'Renew' }, internal: true, type: {} as CustomPropertyValue['type'] }],
      },
    })

    const sorted = sortDecidedAgreements([newer, older], 'lastrubricreview')
    expect(sorted[0].id).toBe('older')
  })
})

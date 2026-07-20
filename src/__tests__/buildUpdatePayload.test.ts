import { describe, it, expect } from 'vitest'
import { buildUpdatePayload, type Agreement, type CustomPropertyValue } from '../lib/folioApi'

const makeAgreement = (overrides: Partial<Agreement> = {}): Agreement => ({
  id: 'test-uuid',
  name: 'Test Agreement',
  startDate: '2026-07-01',
  cancellationDeadline: null,
  periods: [{ id: 'p1', startDate: '2026-07-01', owner: { id: 'test-uuid' }, periodStatus: 'current' }],
  agreementStatus: { id: 's1', value: 'active', label: 'Active' },
  customProperties: {},
  _raw: {
    dateCreated: '2026-07-01T00:00:00Z',
    lastUpdated: '2026-07-01T00:00:00Z',
    version: 0,
    agreementContentTypes: [],
    orgs: [],
    externalLicenseDocs: [],
    outwardRelationships: [],
    inwardRelationships: [],
    contacts: [],
    tags: [],
    linkedLicenses: [],
    docs: [],
    usageDataProviders: [],
    supplementaryDocs: [],
    alternateNames: [],
    relatedAgreements: [],
    ...(overrides._raw || {}),
  },
  ...overrides,
})

describe('buildUpdatePayload', () => {
  it('sends agreementStatus as a string, not an object', () => {
    const agreement = makeAgreement({
      agreementStatus: { id: 's1', value: 'active', label: 'Active' },
    })
    const payload = buildUpdatePayload(agreement, { customProperties: {} })
    expect(payload.agreementStatus).toBe('active')
  })

  it('sends renewalPriority as a string, not an object', () => {
    const agreement = makeAgreement()
    const payload = buildUpdatePayload(agreement, {
      customProperties: {},
      renewalPriority: { id: 'rp1', value: 'definitely_renew', label: 'Definitely renew' },
    })
    expect(payload.renewalPriority).toBe('definitely_renew')
  })

  it('sends null renewalPriority when not provided', () => {
    const agreement = makeAgreement()
    const payload = buildUpdatePayload(agreement, { customProperties: {} })
    expect(payload.renewalPriority).toBeNull()
  })

  it('includes version and lastUpdated from _raw', () => {
    const agreement = makeAgreement({
      _raw: { version: 3, lastUpdated: '2026-07-15T12:00:00Z' },
    })
    const payload = buildUpdatePayload(agreement, { customProperties: {} })
    expect(payload.version).toBe(3)
    expect(payload.lastUpdated).toBe('2026-07-15T12:00:00Z')
  })

  it('uses the provided customProperties in the payload', () => {
    const existingCp: Record<string, CustomPropertyValue[]> = {
      rubricreview: [{ id: 1, value: '2026-07-01', internal: true, _delete: false }],
      resourceTier: [{ id: 2, value: 'tier1', internal: true, _delete: false }],
    }
    const agreement = makeAgreement({ customProperties: existingCp })

    const updatedCp: Record<string, CustomPropertyValue[]> = {
      rubricscore: [{ id: 3, value: 'renew', internal: true, _delete: false }],
    }
    const payload = buildUpdatePayload(agreement, { customProperties: updatedCp })

    // buildUpdatePayload passes through whatever customProperties it is given
    // (preservation of existing properties is the caller's responsibility)
    expect(Object.keys(payload.customProperties)).toContain('rubricscore')
    expect(payload.customProperties.rubricscore).toBeDefined()
  })

  it('uses default "active" when agreementStatus is missing', () => {
    const agreement = makeAgreement({ agreementStatus: undefined })
    const payload = buildUpdatePayload(agreement, { customProperties: {} })
    expect(payload.agreementStatus).toBe('active')
  })
})

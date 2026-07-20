import * as okapi from './okapi'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Agreement {
  id: string
  name: string
  description?: string
  status?: string
  startDate?: string
  endDate?: string
  renewalPriority?: { id: string; value: string; label: string }
  isPerpetual?: boolean | { value: string; label: string }
  customProperties?: Record<string, CustomPropertyValue[]>
  orgs?: AgreementOrg[]
  contacts?: InternalContact[]
  tags?: Tag[]
  /** Full agreementStatus object from API response */
  agreementStatus?: { id: string; value: string; label: string }
  /** Periods array from API response */
  periods?: Array<{
    id: string
    startDate: string
    owner: { id: string }
    periodStatus?: string
  }>
  /** Cancellation deadline from API response */
  cancellationDeadline?: string | null
  /** Raw API response metadata for fields not captured above */
  _metadata?: Record<string, unknown>
}

export interface ERMResponse<T> {
  data: T
  totalRecords?: number
  _metadata?: Record<string, unknown>
}

export interface CustomPropertyValue {
  id?: number
  value: string | number | RefdataValue
  internal: boolean
  note?: string
  publicNote?: string
  type?: CustomPropertyDefinition
  /** For PUT payloads: _delete flag to remove a property */
  _delete?: boolean
}

export interface CustomPropertyDefinition {
  id: string
  name: string
  label: string
  description?: string
  type: string
  primary: boolean
  weight?: number
  defaultInternal?: boolean
  category?: {
    id: string
    desc: string
    internal: boolean
    values: { id: string; value: string; label: string }[]
  }
}

export interface RefdataValue {
  id: string
  label: string
  value: string
}

export interface AgreementOrg {
  id: string
  name?: string
  role?: string
  primaryOrg?: boolean
  org?: { id?: string; orgsUuid?: string; name?: string }
  roles?: { role?: { value?: string; label?: string } }[]
}

export interface InternalContact {
  id: string
  user?: string
  role?: string
}

export interface Tag {
  id: string
  tag: string
}

// ─── API Endpoints ───────────────────────────────────────────────────────────

const CUSTPROPS_ENDPOINT = '/erm/custprops'
const AGREEMENTS_ENDPOINT = '/erm/sas'

// ─── Custprops (Supplementary Properties) ────────────────────────────────────

export async function getCustprops(): Promise<CustomPropertyDefinition[]> {
  return okapi.okapiRequest<CustomPropertyDefinition[]>(`${CUSTPROPS_ENDPOINT}?limit=1000&offset=0`)
}

// ─── Agreements ──────────────────────────────────────────────────────────────

export interface AgreementFilters {
  /** Server-side filter expression, e.g. "customProperties.rubricreview.value isSet" */
  filter?: string
  /** Page number (1-based) */
  page?: number
  /** Items per page */
  perPage?: number
  /** Sort expression, e.g. "name;asc" */
  sort?: string
}

export interface AgreementsResponse {
  agreements: Agreement[]
  totalRecords: number
}

/**
 * Fetch agreements from the ERM SAS endpoint using the correct query params:
 *   - filters=customProperties.rubricreview.value isSet  (only agreements with rubric review)
 *   - sort=name;asc                                     (sorted by name)
 *   - stats=true                                        (includes totalRecords in response)
 *   - page / perPage                                    (proper pagination)
 *
 * If no page/perPage is specified, fetches all pages automatically.
 */
async function getAgreements(
  filters: AgreementFilters = {}
): Promise<AgreementsResponse> {
  const PAGE_SIZE = 25
  const page = filters.page ?? 1
  const perPage = filters.perPage ?? PAGE_SIZE
  const sort = filters.sort ?? 'name;asc'
  const filter = filters.filter ?? 'customProperties.rubricreview.value isSet'

  // Build query string
  const params = new URLSearchParams({
    filters: filter,
    sort: sort,
    stats: 'true',
    page: String(page),
    perPage: String(perPage),
  })

  const json = await okapi.okapiRequest<{
    results?: Agreement[]
    data?: Agreement[]
    totalRecords?: number
    total?: number
  }>(`${AGREEMENTS_ENDPOINT}?${params}`)

  // The ERM API returns { results: [...], totalRecords: N }
  // (not { data: [...] } as the type hint suggested)
  const data = json.results ?? json.data ?? []
  console.log('[getAgreements] raw json keys:', Object.keys(json), 'totalRecords:', json.totalRecords, 'total:', json.total, 'data.length:', data.length)
  const totalRecords = json.totalRecords ?? json.total ?? data.length ?? 0

  return {
    agreements: Array.isArray(data) ? data : [],
    totalRecords,
  }
}

/**
 * Fetch ALL agreements matching the filter, handling pagination automatically.
 * Uses parallel chunked fetching for better performance.
 * Returns a flat array of all agreements.
 */
export async function getAllAgreements(
  filters: AgreementFilters = {}
): Promise<Agreement[]> {
  const firstPage = await getAgreements({ ...filters, page: 1, perPage: 25 })
  const all: Agreement[] = [...firstPage.agreements]

  if (firstPage.totalRecords <= 25) {
    return all
  }

  const totalPages = Math.ceil(firstPage.totalRecords / 25)
  const CHUNK_SIZE = 5 // Fetch 5 pages at a time to balance speed and rate limits

  // Fetch remaining pages in parallel chunks
  for (let start = 2; start <= totalPages; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE - 1, totalPages)
    const chunk = Array.from({ length: end - start + 1 }, (_, i) => start + i)
    const pages = await Promise.all(
      chunk.map((p) => getAgreements({ ...filters, page: p, perPage: 25 }))
    )
    for (const page of pages) {
      all.push(...page.agreements)
    }
  }

  return all
}

// ─── Update Agreement ────────────────────────────────────────────────────────

/**
 * Custom property value for PUT payloads.
 * The ERM API requires _delete flags on custom properties:
 *   - _delete: false  → keep/update this property
 *   - _delete: true   → remove this property
 */
export interface UpdateCustomPropertyValue {
  id?: number
  value: string | number | { id: string; value: string; label: string }
  internal: boolean
  note?: string
  type?: CustomPropertyDefinition
  _delete: boolean | undefined
}

/**
 * Full agreement payload for PUT (edit) requests.
 * The ERM SAS API requires the COMPLETE agreement object — not a partial update.
 * All fields present on the agreement must be included in the PUT body.
 */
export interface UpdateAgreementPayload {
  /** Agreement UUID (required) */
  id: string
  /** Agreement name */
  name: string
  /** Agreement status object { id, value, label } */
  agreementStatus: { id: string; value: string; label: string }
  /** Start date string (YYYY-MM-DD) */
  startDate: string
  /** Cancellation deadline or null */
  cancellationDeadline: string | null
  /** Periods array — must include existing period IDs */
  periods: Array<{
    id: string
    startDate: string
    owner: { id: string }
    periodStatus?: string
  }>
  /** Full custom properties with _delete flags */
  customProperties: Record<string, CustomPropertyValue[]>
  /** Renewal priority object { id, value, label } or null — must match API format */
  renewalPriority: { id: string; value: string; label: string } | null
  /** Agreement content types */
  agreementContentTypes?: unknown[]
  /** Organizations */
  orgs?: unknown[]
  /** External license docs */
  externalLicenseDocs?: unknown[]
  /** Outward relationships */
  outwardRelationships?: unknown[]
  /** Inward relationships */
  inwardRelationships?: unknown[]
  /** Contacts */
  contacts?: unknown[]
  /** Tags */
  tags?: unknown[]
  /** Linked licenses */
  linkedLicenses?: unknown[]
  /** Docs */
  docs?: unknown[]
  /** Usage data providers */
  usageDataProviders?: unknown[]
  /** Supplementary docs */
  supplementaryDocs?: unknown[]
  /** Alternate names */
  alternateNames?: unknown[]
  /** Related agreements */
  relatedAgreements?: unknown[]
}

/**
 * Build a full PUT payload from an existing agreement and partial updates.
 * The ERM SAS API requires the complete agreement object on PUT — not a partial update.
 * This helper merges the existing agreement data with the provided updates.
 */
export function buildUpdatePayload(
  existing: Agreement,
  updates: {
    customProperties?: Record<string, CustomPropertyValue[]>
    renewalPriority?: { id: string; value: string; label: string } | null
  }
): UpdateAgreementPayload {
  return {
    id: existing.id,
    name: existing.name,
    agreementStatus: existing.agreementStatus ?? { id: '', value: 'active', label: 'Active' },
    startDate: existing.startDate ?? '',
    cancellationDeadline: existing.cancellationDeadline ?? null,
    periods: existing.periods ?? [],
    customProperties: updates.customProperties ?? {},
    renewalPriority: updates.renewalPriority ?? null,
    agreementContentTypes: existing._metadata?.agreementContentTypes as unknown[] ?? [],
    orgs: existing._metadata?.orgs as unknown[] ?? [],
    externalLicenseDocs: existing._metadata?.externalLicenseDocs as unknown[] ?? [],
    outwardRelationships: existing._metadata?.outwardRelationships as unknown[] ?? [],
    inwardRelationships: existing._metadata?.inwardRelationships as unknown[] ?? [],
    contacts: existing._metadata?.contacts as unknown[] ?? [],
    tags: existing._metadata?.tags as unknown[] ?? [],
    linkedLicenses: existing._metadata?.linkedLicenses as unknown[] ?? [],
    docs: existing._metadata?.docs as unknown[] ?? [],
    usageDataProviders: existing._metadata?.usageDataProviders as unknown[] ?? [],
    supplementaryDocs: existing._metadata?.supplementaryDocs as unknown[] ?? [],
    alternateNames: existing._metadata?.alternateNames as unknown[] ?? [],
    relatedAgreements: existing._metadata?.relatedAgreements as unknown[] ?? [],
  }
}

export async function updateAgreement(
  agreementId: string,
  payload: UpdateAgreementPayload
): Promise<Agreement> {
  return okapi.okapiRequest<Agreement>(`${AGREEMENTS_ENDPOINT}/${agreementId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}



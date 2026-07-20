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
  agreementStatus?: { id: string; value: string; label: string }
  periods?: Array<{
    id: string
    startDate: string
    owner: { id: string }
    periodStatus?: string
  }>
  cancellationDeadline?: string | null
  /** Full raw API response — used for PUT (complete-object) payloads */
  _raw: Record<string, unknown>
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
    results?: Record<string, unknown>[]
    data?: Record<string, unknown>[]
    totalRecords?: number
    total?: number
  }>(`${AGREEMENTS_ENDPOINT}?${params}`)

  // The ERM API returns { results: [...], totalRecords: N }
  const raw = json.results ?? json.data ?? []
  const totalRecords = json.totalRecords ?? json.total ?? raw.length ?? 0

  // Attach _raw so buildUpdatePayload can spread the full response
  const agreements: Agreement[] = (Array.isArray(raw) ? raw : []).map((item) => ({
    ...(item as unknown as Agreement),
    _raw: item,
  }))

  return {
    agreements,
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
 * Full agreement payload for PUT (edit) requests.
 * The ERM SAS API requires the complete agreement object — not a partial update.
 *
 * Key difference from GET response:
 *   - agreementStatus is a string (e.g. "active"), not an object
 *   - renewalPriority is a string (e.g. "definitely_renew"), not an object
 */
export interface UpdateAgreementPayload {
  id: string
  dateCreated?: string
  agreementContentTypes?: unknown[]
  name: string
  orgs?: unknown[]
  externalLicenseDocs?: unknown[]
  outwardRelationships?: unknown[]
  customProperties: Record<string, CustomPropertyValue[]>
  contacts?: unknown[]
  tags?: unknown[]
  lastUpdated?: string
  inwardRelationships?: unknown[]
  startDate: string
  linkedLicenses?: unknown[]
  docs?: unknown[]
  periods: Array<{
    id: string
    startDate: string
    owner: { id: string }
    periodStatus?: string
  }>
  usageDataProviders?: unknown[]
  agreementStatus: string
  supplementaryDocs?: unknown[]
  cancellationDeadline: string | null
  alternateNames?: unknown[]
  version?: number
  relatedAgreements?: unknown[]
  renewalPriority: string | null
}

/**
 * Build a full PUT payload from an existing agreement and partial updates.
 *
 * The ERM SAS PUT endpoint expects a specific shape that differs from the GET
 * response in two key ways:
 *   - agreementStatus is a string (e.g. "active"), not an object
 *   - renewalPriority is a string (e.g. "definitely_renew"), not an object
 *
 * This mirrors the payload the FOLIO UI itself sends.
 */
export function buildUpdatePayload(
  existing: Agreement,
  updates: {
    customProperties?: Record<string, CustomPropertyValue[]>
    renewalPriority?: { id: string; value: string; label: string } | null
  }
): UpdateAgreementPayload {
  const raw = existing._raw
  return {
    id: existing.id,
    dateCreated: raw.dateCreated as string | undefined,
    agreementContentTypes: (raw.agreementContentTypes as unknown[]) ?? [],
    name: existing.name,
    orgs: (raw.orgs as unknown[]) ?? [],
    externalLicenseDocs: (raw.externalLicenseDocs as unknown[]) ?? [],
    outwardRelationships: (raw.outwardRelationships as unknown[]) ?? [],
    customProperties: updates.customProperties ?? {},
    contacts: (raw.contacts as unknown[]) ?? [],
    tags: (raw.tags as unknown[]) ?? [],
    lastUpdated: raw.lastUpdated as string | undefined,
    inwardRelationships: (raw.inwardRelationships as unknown[]) ?? [],
    startDate: existing.startDate ?? '',
    linkedLicenses: (raw.linkedLicenses as unknown[]) ?? [],
    docs: (raw.docs as unknown[]) ?? [],
    periods: existing.periods ?? [],
    usageDataProviders: (raw.usageDataProviders as unknown[]) ?? [],
    agreementStatus: existing.agreementStatus?.value ?? 'active',
    supplementaryDocs: (raw.supplementaryDocs as unknown[]) ?? [],
    cancellationDeadline: existing.cancellationDeadline ?? null,
    alternateNames: (raw.alternateNames as unknown[]) ?? [],
    version: raw.version as number | undefined,
    relatedAgreements: (raw.relatedAgreements as unknown[]) ?? [],
    renewalPriority: updates.renewalPriority?.value ?? null,
  } as UpdateAgreementPayload
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



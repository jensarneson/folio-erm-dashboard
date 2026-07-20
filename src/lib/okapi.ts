// FOLIO Okapi API client

// Default to EKU tenant for easy testing
const OKAPI_URL = import.meta.env.DEV ? '/okapi' : (import.meta.env.VITE_OKAPI_URL || 'https://api-eku.folio.ebsco.com')
const TENANT = import.meta.env.VITE_TENANT || 'fs00001224'

export interface OkapiCredentials {
  username: string
  password: string
  okapiUrl: string
  tenant: string
}

export interface OkapiConfig {
  okapiUrl: string
  tenant: string
  username?: string
}

export interface OkapiToken {
  okapiToken: string
  refreshToken?: string
}

const REFRESH_TOKEN_STORAGE_KEY = 'folio-refresh-token'
const CREDENTIALS_STORAGE_KEY = 'folio-credentials'

const TOKEN_STORAGE_KEY = 'folio-token'
const CONFIG_STORAGE_KEY = 'folio-config'

let cachedToken: string | null = null
let cachedRefreshToken: string | null = null
let cachedOkapiUrl: string = OKAPI_URL
let cachedTenant: string = TENANT
let cachedCredentials: OkapiCredentials | null = null

// Restore tokens and config from localStorage on module load
try {
  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (storedToken) cachedToken = storedToken
  const storedRefresh = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
  if (storedRefresh) cachedRefreshToken = storedRefresh
  const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY)
  if (storedConfig) {
    const config = JSON.parse(storedConfig)
    cachedOkapiUrl = import.meta.env.DEV ? '/okapi' : (config.okapiUrl || OKAPI_URL)
    cachedTenant = config.tenant || TENANT
  }
  const storedCreds = localStorage.getItem(CREDENTIALS_STORAGE_KEY)
  if (storedCreds) cachedCredentials = JSON.parse(storedCreds)
} catch {
  // Ignore storage errors
}

export function setOkapiConfig(config: OkapiConfig) {
  cachedOkapiUrl = import.meta.env.DEV ? '/okapi' : config.okapiUrl
  cachedTenant = config.tenant
  if (config.username) {
    cachedCredentials = { ...config, password: '' } as OkapiCredentials
  }
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({
      okapiUrl: config.okapiUrl,
      tenant: config.tenant,
    }))
  } catch {
    // Ignore storage errors
  }
}

export function getOkapiConfig() {
  return { cachedOkapiUrl, cachedTenant }
}

export async function login(credentials: OkapiCredentials): Promise<string> {
  const { username, password, okapiUrl, tenant } = credentials
  cachedOkapiUrl = import.meta.env.DEV ? '/okapi' : okapiUrl
  cachedTenant = tenant
  // Store credentials for auto-reauth — password kept in memory only
  cachedCredentials = credentials

  const response = await fetch(`${okapiUrl}/authn/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Okapi-Tenant': tenant,
    },
    body: JSON.stringify({
      username: username.trim(),
      password: password.trim(),
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Authentication failed' }))
    throw new Error(error.message || 'Authentication failed')
  }

  const data: OkapiToken = await response.json()
  cachedToken = data.okapiToken
  if (data.refreshToken) {
    cachedRefreshToken = data.refreshToken
    try {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.refreshToken)
    } catch {
      // Ignore storage errors
    }
  }
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, data.okapiToken)
  } catch {
    // Ignore storage errors
  }
  // Store non-sensitive config for auto-reauth — no password persisted
  try {
    localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify({
      username: credentials.username,
      okapiUrl: credentials.okapiUrl,
      tenant: credentials.tenant,
    }))
  } catch {
    // Ignore storage errors
  }
  return data.okapiToken
}

export function getToken(): string | null {
  return cachedToken
}

export function clearToken(): void {
  cachedToken = null
  cachedRefreshToken = null
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
  } catch {
    // Ignore storage errors
  }
}

/**
 * Refresh the okapiToken using the stored refreshToken.
 * Returns the new okapiToken, or null if refresh failed.
 */
async function refreshToken(): Promise<string | null> {
  const token = cachedRefreshToken
  if (!token) {
    // No refresh token — fall back to re-login if credentials exist
    if (cachedCredentials) {
      return login({
        username: cachedCredentials.username,
        password: cachedCredentials.password,
        okapiUrl: cachedOkapiUrl,
        tenant: cachedTenant,
      })
    }
    return null
  }

  const response = await fetch(`${cachedOkapiUrl}/authn/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Okapi-Tenant': cachedTenant,
    },
    body: JSON.stringify({ refreshToken: token }),
  })

  if (!response.ok) {
    // Refresh failed — clear tokens and fall back to re-login
    clearToken()
    if (cachedCredentials) {
      return login({
        username: cachedCredentials.username,
        password: cachedCredentials.password,
        okapiUrl: cachedOkapiUrl,
        tenant: cachedTenant,
      })
    }
    return null
  }

  const data: OkapiToken = await response.json()
  cachedToken = data.okapiToken
  if (data.refreshToken) {
    cachedRefreshToken = data.refreshToken
    try {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.refreshToken)
    } catch {
      // Ignore storage errors
    }
  }
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, data.okapiToken)
  } catch {
    // Ignore storage errors
  }
  return data.okapiToken
}

// Generic API request helper
async function okapiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let token = getToken()
  if (!token) {
    // Token missing — try to refresh or re-login
    const refreshed = await refreshToken()
    if (!refreshed) throw new Error('Not authenticated')
    token = refreshed
  }

  const url = `${cachedOkapiUrl}${path}`
  const headers: Record<string, string> = {
    'X-Okapi-Tenant': cachedTenant,
    'X-Okapi-Token': token,
    'Content-Type': 'application/json',
  }
  if (options.headers) {
    if (options.headers instanceof Headers) {
      for (const [key, value] of options.headers.entries()) {
        headers[key] = value
      }
    } else if (typeof options.headers === 'object' && !Array.isArray(options.headers)) {
      Object.assign(headers, options.headers)
    }
  }

  let response = await fetch(url, { ...options, headers })

  // Handle 401 — try once to refresh the token
  if (response.status === 401) {
    const newToken = await refreshToken()
    if (newToken) {
      headers['X-Okapi-Token'] = newToken
      response = await fetch(url, { ...options, headers })
    }
  }

  if (!response.ok) {
    clearToken()
    // Dispatch a custom event so the app can react (e.g., redirect to login)
    window.dispatchEvent(new CustomEvent('folio-auth-expired'))
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || response.statusText)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

export { okapiRequest }

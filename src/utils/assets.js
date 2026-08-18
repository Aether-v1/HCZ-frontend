const DEFAULT_API_BASE = ''
const DEFAULT_FILE_BASE = ''
const LEGACY_ASSET_PROXY_PREFIX = '/tp8api'
const BACKEND_ASSET_PREFIXES = [
  '/storage/',
  '/uploads/',
  '/upload/',
  '/picture/',
  '/images/',
  '/image/',
  '/avatar/'
]

function normalizeBase(value = '') {
  return String(value || '').trim().replace(/\/$/, '')
}

function normalizePathname(value = '') {
  return String(value || '').trim().replace(/\\/g, '/').replace(/^(\.\/)+/, '')
}

function withLeadingSlash(value = '') {
  const text = normalizePathname(value)
  if (!text) return ''
  return text.startsWith('/') ? text : `/${text}`
}

function splitPathAndSuffix(value = '') {
  const text = String(value || '').trim()
  if (!text) return { path: '', suffix: '' }
  const index = text.search(/[?#]/)
  if (index === -1) {
    return { path: text, suffix: '' }
  }
  return {
    path: text.slice(0, index),
    suffix: text.slice(index)
  }
}

function isAbsoluteUrl(value = '') {
  return /^(data:|blob:|https?:)?\/\//i.test(String(value || '').trim())
}

function isBackendAssetPath(value = '') {
  const normalized = withLeadingSlash(value)
  return BACKEND_ASSET_PREFIXES.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix))
}

function extractPathPrefix(value = '') {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^https?:\/\//i.test(text)) {
    try {
      return normalizeBase(new URL(text).pathname)
    } catch {
      return ''
    }
  }
  if (!text.startsWith('/')) return ''
  return normalizeBase(text)
}

function extractOrigin(value = '') {
  const text = String(value || '').trim()
  if (!/^https?:\/\//i.test(text)) return ''

  try {
    return String(new URL(text).origin || '').trim().toLowerCase()
  } catch {
    return ''
  }
}

function getLegacyAssetPrefixes() {
  const prefixes = [LEGACY_ASSET_PROXY_PREFIX]

  if (typeof window !== 'undefined') {
    prefixes.push(extractPathPrefix(window.__TP8_API_BASE__))
    prefixes.push(extractPathPrefix(window.__TP8_FILE_BASE__))
  }

  prefixes.push(extractPathPrefix(import.meta.env.VITE_API_BASE))
  prefixes.push(extractPathPrefix(import.meta.env.VITE_FILE_BASE))

  return [...new Set(prefixes.filter(Boolean))]
}

function getConfiguredAssetOrigins() {
  const origins = [extractOrigin(DEFAULT_FILE_BASE)]

  if (typeof window !== 'undefined') {
    origins.push(extractOrigin(window.__TP8_FILE_BASE__))
    origins.push(extractOrigin(window.__TP8_API_BASE__))
    origins.push(String(window.location?.origin || '').trim().toLowerCase())
  }

  origins.push(extractOrigin(import.meta.env.VITE_FILE_BASE))
  origins.push(extractOrigin(import.meta.env.VITE_API_BASE))

  return [...new Set(origins.filter(Boolean))]
}

function stripLegacyAssetPrefix(value = '') {
  let normalized = withLeadingSlash(value)
  for (const prefix of getLegacyAssetPrefixes()) {
    if (!prefix || prefix === '/') continue
    if (!normalized.startsWith(`${prefix}/`)) continue

    const stripped = withLeadingSlash(normalized.slice(prefix.length))
    if (isBackendAssetPath(stripped)) {
      normalized = stripped
      break
    }
  }
  return normalized
}

function toDisplayAssetPath(path = '', suffix = '') {
  const normalized = stripLegacyAssetPrefix(path)
  if (!normalized || !isBackendAssetPath(normalized)) return ''
  return `${normalized}${suffix}`
}

function resolveAbsoluteAssetDisplayPath(value = '') {
  const text = String(value || '').trim()
  if (!/^https?:\/\//i.test(text)) return ''

  try {
    const url = new URL(text)
    const origin = String(url.origin || '').trim().toLowerCase()
    if (!getConfiguredAssetOrigins().includes(origin)) return ''

    return toDisplayAssetPath(url.pathname, `${url.search}${url.hash}`)
  } catch {
    return ''
  }
}

export function resolveApiBase() {
  if (typeof window !== 'undefined') {
    const runtimeBase = window.__TP8_API_BASE__
    if (runtimeBase) return normalizeBase(runtimeBase)
  }

  const envBase = import.meta.env.VITE_API_BASE
  if (envBase) return normalizeBase(envBase)

  return DEFAULT_API_BASE
}

export function resolveFileBase() {
  if (typeof window !== 'undefined') {
    const runtimeBase = window.__TP8_FILE_BASE__
    if (runtimeBase) return normalizeBase(runtimeBase)
  }

  const envBase = import.meta.env.VITE_FILE_BASE
  if (envBase) return normalizeBase(envBase)

  return DEFAULT_FILE_BASE
}

export function resolveApiUrl(value) {
  if (!value) return ''
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^https?:\/\//i.test(text)) return text

  const normalized = withLeadingSlash(text)
  const base = resolveApiBase()

  if (!base) return normalized
  if (normalized === base || normalized.startsWith(`${base}/`)) return normalized
  return `${base}${normalized}`
}

export function resolveAssetUrl(value) {
  if (!value) return ''
  const text = String(value || '').trim()
  if (!text) return ''

  if (isAbsoluteUrl(text)) {
    const displayPath = resolveAbsoluteAssetDisplayPath(text)
    return displayPath || text
  }

  const { path, suffix } = splitPathAndSuffix(text)
  const displayPath = toDisplayAssetPath(path, suffix)
  if (displayPath) return displayPath

  const normalized = stripLegacyAssetPrefix(path)
  if (!normalized) return ''

  if (
    normalized.startsWith('/assets/') ||
    normalized.startsWith('/favicon') ||
    normalized.startsWith('/robots.txt')
  ) {
    return `${normalized}${suffix}`
  }

  return `${normalized}${suffix}`
}

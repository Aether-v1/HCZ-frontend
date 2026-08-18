const SITE_CONTEXT_CACHE_KEY = 'tp8-site-context-v1'

function getCurrentHost() {
  if (typeof window === 'undefined') return 'default'
  return String(window.location.host || 'default').trim().toLowerCase() || 'default'
}

function getCacheKey() {
  return `${SITE_CONTEXT_CACHE_KEY}:${getCurrentHost()}`
}

export function emptySiteContext() {
  return {
    is_substation: 0,
    substation_id: 0,
    substation_uid: 0,
    site_name: '',
    notice: '',
    logo: '',
    subdomain: '',
    full_domain: '',
    updatedAt: 0
  }
}

export function normalizeSiteContext(payload = {}) {
  return {
    ...emptySiteContext(),
    is_substation: Number(payload?.is_substation || 0) === 1 ? 1 : 0,
    substation_id: Number(payload?.substation_id || 0),
    substation_uid: Number(payload?.substation_uid || 0),
    site_name: String(payload?.site_name || '').trim(),
    notice: String(payload?.notice || '').trim(),
    logo: String(payload?.logo || '').trim(),
    subdomain: String(payload?.subdomain || '').trim().toLowerCase(),
    full_domain: String(payload?.full_domain || '').trim().toLowerCase(),
    updatedAt: Number(payload?.updatedAt || Date.now()) || Date.now()
  }
}

export function getCachedSiteContext() {
  const fallback = emptySiteContext()
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(getCacheKey())
    if (!raw) return fallback
    return normalizeSiteContext(JSON.parse(raw))
  } catch {
    return fallback
  }
}

export function setCachedSiteContext(payload = {}) {
  const normalized = normalizeSiteContext(payload)
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(getCacheKey(), JSON.stringify(normalized))
    } catch {
      // ignore cache errors
    }
  }
  return normalized
}

export function mergeBootstrapWithSiteContext(payload = {}) {
  const context = getCachedSiteContext()
  const merged = {
    ...payload,
    is_substation: Number(payload?.is_substation || 0),
    subdomain: String(payload?.subdomain || '').trim().toLowerCase(),
    full_domain: String(payload?.full_domain || '').trim().toLowerCase(),
    logo: String(payload?.logo || '').trim()
  }

  if (context.is_substation !== 1) {
    return merged
  }

  return {
    ...merged,
    is_substation: 1,
    substation_id: context.substation_id,
    substation_uid: context.substation_uid,
    siteName: context.site_name || merged.siteName || '汇充站',
    notice: context.notice || merged.notice || '',
    logo: context.logo || merged.logo || '',
    subdomain: context.subdomain || merged.subdomain || '',
    full_domain: context.full_domain || merged.full_domain || ''
  }
}
const SITE_CONTEXT_CACHE_KEY = 'tp8-site-context-v1'
const HOME_CACHE_KEY = 'tp8-home-bootstrap-v16'
const HOME_FIRST_SCREEN_CACHE_KEY = 'tp8-home-first-screen-v1'
const DEFAULT_SITE_NAME = '\u6c47\u5145\u7ad9'

function getCurrentHost() {
  if (typeof window === 'undefined') return 'default'
  return String(window.location.host || 'default').trim().toLowerCase() || 'default'
}

function readLocalCache(key) {
  if (typeof localStorage === 'undefined') return {}

  try {
    return JSON.parse(localStorage.getItem(key) || 'null') || {}
  } catch {
    return {}
  }
}

function getConfiguredDefaultSiteName() {
  if (typeof window === 'undefined') return DEFAULT_SITE_NAME
  return String(window.__TP8_DEFAULT_SITE_NAME__ || '').trim() || DEFAULT_SITE_NAME
}

function resolveTrustedSiteName(siteContext = {}, homeCache = {}, host = getCurrentHost()) {
  const contextName = String(siteContext.site_name || '').trim()
  if (contextName) return contextName

  const homeName = String(homeCache.siteName || '').trim()
  if (homeName) return homeName

  const fallbackName = String(homeCache.name || homeCache.site_name || '').trim()
  if (fallbackName) return fallbackName

  return ''
}

export function getCachedSiteBrand() {
  const host = getCurrentHost()
  const siteContext = readLocalCache(`${SITE_CONTEXT_CACHE_KEY}:${host}`)
  let homeCache = readLocalCache(`${HOME_FIRST_SCREEN_CACHE_KEY}:${host}`)
  if (!homeCache || !Object.keys(homeCache).length) {
    homeCache = readLocalCache(`${HOME_CACHE_KEY}:${host}`)
  }

  return {
    siteName: resolveTrustedSiteName(siteContext, homeCache, host),
    notice: String(siteContext.notice || homeCache.notice || '').trim(),
    logo: String(siteContext.logo || homeCache.logo || '').trim()
  }
}

export function getCachedSiteName() {
  return getCachedSiteBrand().siteName
}

export function getDefaultSiteName() {
  return getConfiguredDefaultSiteName()
}

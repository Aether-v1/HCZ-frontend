const TOKEN_KEY = 'tp8_vue_portal_user'
const LEGACY_REMEMBER_LOGIN_KEY = 'tp8_vue_portal_remember_login'
const SENSITIVE_LOCAL_KEYS = [
  'loggedIn',
  'session',
  'profile',
  'accountSummary',
  'financeSummary'
]

function clearSensitiveLocalState() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    SENSITIVE_LOCAL_KEYS.forEach((key) => localStorage.removeItem(key))
  } catch {
    // ignore
  }
}

function clearLegacyRememberLogin() {
  try {
    localStorage.removeItem(LEGACY_REMEMBER_LOGIN_KEY)
  } catch {
    // ignore
  }
}

export function setUserSession(value) {
  void value
  clearLegacyRememberLogin()
  clearSensitiveLocalState()
}

export function getUserSession() {
  clearLegacyRememberLogin()
  clearSensitiveLocalState()
  return {}
}

export function clearUserSession() {
  clearSensitiveLocalState()
  clearLegacyRememberLogin()
}

export function clearSessionStorage() {
  try {
    sessionStorage.clear()
  } catch {
    // ignore
  }
}


export function setSessionCache(key, value) {
  try {
    sessionStorage.setItem(String(key), JSON.stringify({ value, time: Date.now() }))
  } catch {
    // ignore
  }
}

export function getSessionCache(key, maxAge = 0) {
  try {
    const raw = JSON.parse(sessionStorage.getItem(String(key)) || 'null')
    if (!raw || raw.value === undefined) return null
    if (maxAge > 0 && raw.time && Date.now() - Number(raw.time) > maxAge) return null
    return raw.value
  } catch {
    return null
  }
}

export function removeSessionCache(key) {
  try {
    sessionStorage.removeItem(String(key))
  } catch {
    // ignore
  }
}

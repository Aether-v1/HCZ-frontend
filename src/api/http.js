import axios from 'axios'

const CSRF_STORAGE_KEY = 'tp8_csrf_token'
const CSRF_HEADER_NAME = 'X-CSRF-Token'
const CSRF_FETCH_PATH = '/api/auth/csrf'
const CSRF_EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/captcha'
]

let csrfFetchPromise = null

function inferLegacyBase() {
  if (typeof window === 'undefined') return ''
  const runtimeBase = String(window.__TP8_API_BASE__ || '').trim()
  if (runtimeBase) return runtimeBase

  const envBase = String(import.meta.env.VITE_API_BASE || '').trim()
  if (envBase) return envBase

  return ''
}

const http = axios.create({
  baseURL: inferLegacyBase(),
  timeout: 20000,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest'
  }
})

function getCsrfStorage() {
  if (typeof window === 'undefined') return null
  return window.sessionStorage
}

function normalizeRequestPath(url = '') {
  const raw = String(url || '').trim()
  if (!raw) return ''

  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw, window.location.origin).pathname
    } catch {
      return raw
    }
  }

  return raw.startsWith('/') ? raw : `/${raw}`
}

function shouldAttachCsrf(config) {
  const method = String(config?.method || 'get').toLowerCase()
  if (!['post', 'put', 'patch', 'delete'].includes(method)) {
    return false
  }

  const path = normalizeRequestPath(config?.url)
  if (!path.startsWith('/api/')) {
    return false
  }

  return !CSRF_EXEMPT_PATHS.some((item) => path === item || path.startsWith(`${item}/`))
}

export function getStoredCsrfToken() {
  try {
    return String(getCsrfStorage()?.getItem(CSRF_STORAGE_KEY) || '').trim()
  } catch {
    return ''
  }
}

export function setStoredCsrfToken(token) {
  const nextToken = String(token || '').trim()

  try {
    if (!nextToken) {
      getCsrfStorage()?.removeItem(CSRF_STORAGE_KEY)
      return
    }

    getCsrfStorage()?.setItem(CSRF_STORAGE_KEY, nextToken)
  } catch {
    // ignore
  }
}

export function clearStoredCsrfToken() {
  setStoredCsrfToken('')
}

export async function ensureCsrfToken(force = false) {
  if (!force) {
    const existingToken = getStoredCsrfToken()
    if (existingToken) {
      return existingToken
    }
  }

  if (csrfFetchPromise) {
    return csrfFetchPromise
  }

  csrfFetchPromise = http.get(CSRF_FETCH_PATH)
    .then((response) => {
      const token = String(response?.data?.csrf_token || '').trim()
      setStoredCsrfToken(token)
      return token
    })
    .finally(() => {
      csrfFetchPromise = null
    })

  return csrfFetchPromise
}

function toFormData(payload) {
  const form = new URLSearchParams()
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    form.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value))
  })
  return form
}

export function normalizeResponse(payload) {
  const rawCode = payload?.raw_code ?? payload?.rawCode ?? payload?.code ?? payload?.status_code ?? null
  const numericCode = Number(payload?.code)
  const resolvedCode = Number.isFinite(numericCode) ? numericCode : rawCode
  const status = String(payload?.status || '').toLowerCase()
  const successFlag = payload?.success
  const ok = typeof successFlag === 'boolean'
    ? successFlag
    : status === 'success' || status === 'ok' || resolvedCode === 200 || resolvedCode === 0

  return {
    ok,
    success: ok,
    code: resolvedCode,
    rawCode,
    status: status || (ok ? 'success' : 'error'),
    message: payload?.message || payload?.msg || '请求完成',
    data: payload?.data ?? null
  }
}

http.interceptors.request.use(async (config) => {
  if (shouldAttachCsrf(config)) {
    const csrfToken = getStoredCsrfToken() || await ensureCsrfToken()
    if (csrfToken) {
      config.headers = {
        ...config.headers,
        [CSRF_HEADER_NAME]: csrfToken
      }
    }
  }

  const method = String(config.method || 'get').toLowerCase()
  const contentType = String(config.headers?.['Content-Type'] || config.headers?.['content-type'] || '')
  const isPlainObject = Object.prototype.toString.call(config.data) === '[object Object]'
  const shouldSerialize = ['post', 'put', 'patch', 'delete'].includes(method) && isPlainObject &&
    !contentType.includes('application/json') && !contentType.includes('multipart/form-data')

  if (shouldSerialize) {
    config.headers = {
      ...config.headers,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
    config.data = toFormData(config.data)
  }

  return config
})

http.interceptors.response.use(
  (response) => {
    const normalized = normalizeResponse(response.data)
    if (!normalized.ok) {
      return Promise.reject(normalized)
    }
    return normalized
  },
  (error) => {
    const payload = error?.response?.data
    const message = String(payload?.message || payload?.msg || '')
    if (Number(error?.response?.status || payload?.code || 0) === 403 && message.includes('CSRF')) {
      clearStoredCsrfToken()
    }
    if (payload) {
      return Promise.reject(normalizeResponse(payload))
    }
    return Promise.reject({
      ok: false,
      success: false,
      code: error?.response?.status || 500,
      rawCode: error?.response?.status || 500,
      status: 'error',
      message: error?.message || '网络请求失败',
      data: null
    })
  }
)

export default http

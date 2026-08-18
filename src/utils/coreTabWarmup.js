const CORE_TAB_LOADERS = {
  home: () => import('../views/HomeView.vue'),
  orders: () => import('../views/OrdersView.vue'),
  profile: () => import('../views/ProfileView.vue')
}
const CORE_TAB_ORDER = ['home', 'orders', 'profile']

const warmedTabs = new Set()
let immediateWarmupScheduled = false

export function warmCoreTabViewChunk(tabName = '') {
  const normalizedTab = String(tabName || '').trim()
  const loader = CORE_TAB_LOADERS[normalizedTab]
  if (!loader || warmedTabs.has(normalizedTab)) {
    return Promise.resolve(null)
  }

  warmedTabs.add(normalizedTab)
  return loader().catch((error) => {
    warmedTabs.delete(normalizedTab)
    throw error
  })
}

export function scheduleWarmCoreTabViewChunks(options = {}) {
  const excludeValues = Array.isArray(options.exclude) ? options.exclude : [options.exclude]
  const exclude = new Set(excludeValues.map((value) => String(value || '').trim()).filter(Boolean))
  const immediate = options.immediate === true

  const runner = () => {
    CORE_TAB_ORDER.forEach((tabName) => {
      if (exclude.has(tabName)) return
      void warmCoreTabViewChunk(tabName).catch(() => null)
    })
  }

  if (immediate) {
    if (immediateWarmupScheduled) return
    immediateWarmupScheduled = true
    const flush = () => {
      immediateWarmupScheduled = false
      runner()
    }

    if (typeof queueMicrotask === 'function') {
      queueMicrotask(flush)
      return
    }

    window.setTimeout(flush, 0)
    return
  }

  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(runner, { timeout: 400 })
    return
  }

  window.setTimeout(runner, 60)
}

export function resolveCoreTabNameByPath(path = '') {
  const normalizedPath = String(path || '').trim()
  if (normalizedPath === '/orders') return 'orders'
  if (normalizedPath === '/profile') return 'profile'
  if (normalizedPath === '/' || normalizedPath === '/index.html') return 'home'
  return ''
}
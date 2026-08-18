import { createApp, nextTick } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { resolveAssetUrl } from './utils/assets'
import { scheduleWarmCoreTabViewChunks } from './utils/coreTabWarmup'
import { getCachedSiteBrand } from './utils/siteBrand'
import { installNativeDialogGuards } from './utils/ui'
import './styles/auth.css'

const FIRST_SCREEN_READY_EVENT = 'qd:first-screen-ready'
const AUTH_ROUTE_NAMES = new Set(['login', 'register'])
let siteStorePromise = null
let siteStoreSubscribed = false
const SITE_TITLE_PLACEHOLDER = '\u00A0'
const DEFAULT_FAVICON_PATH = '/favicon.ico'

function applyDocumentTitle(value = '') {
  const nextTitle = String(value || '').trim()
  document.title = nextTitle
}

function ensureHeadIconLink(rel = '') {
  if (!document.head) return null
  const normalizedRel = String(rel || '').trim()
  if (!normalizedRel) return null

  let link = document.head.querySelector(`link[rel="${normalizedRel}"]`)
  if (!link) {
    link = document.createElement('link')
    link.rel = normalizedRel
    document.head.appendChild(link)
  }

  return link
}

function applyDocumentFavicon(value = '') {
  const logoUrl = resolveAssetUrl(String(value || '').trim())
  const faviconHref = logoUrl || DEFAULT_FAVICON_PATH

  const iconLink = ensureHeadIconLink('icon')
  if (iconLink) {
    iconLink.href = faviconHref
    iconLink.type = 'image/x-icon'
  }

  const shortcutIconLink = ensureHeadIconLink('shortcut icon')
  if (shortcutIconLink) {
    shortcutIconLink.href = faviconHref
    shortcutIconLink.type = 'image/x-icon'
  }

  const appleTouchIconLink = ensureHeadIconLink('apple-touch-icon')
  if (appleTouchIconLink) {
    appleTouchIconLink.href = faviconHref
  }
}

function updateBootSplash(payload = {}) {
  const splash = document.getElementById('boot-splash')
  const titleEl = document.getElementById('boot-splash-title')
  const noticeEl = document.getElementById('boot-splash-notice')
  const logoImageEl = document.getElementById('boot-splash-logo-image')
  const logoBadgeEl = document.getElementById('boot-splash-logo-badge')
  const authTitleEl = document.getElementById('boot-auth-site-title')
  const authLogoImageEl = document.getElementById('boot-auth-logo-image')
  const authLogoBadgeEl = document.getElementById('boot-auth-logo-badge')

  if (!splash && !authTitleEl && !authLogoImageEl && !authLogoBadgeEl) return

  const siteName = String(payload?.site_name || '').trim()
  const notice = String(payload?.notice || '').trim()
  const logo = resolveAssetUrl(String(payload?.logo || '').trim())
  const badgeText = siteName.slice(0, 1) || SITE_TITLE_PLACEHOLDER

  if (titleEl) titleEl.textContent = siteName || SITE_TITLE_PLACEHOLDER
  if (noticeEl) noticeEl.textContent = notice || SITE_TITLE_PLACEHOLDER
  if (authTitleEl) authTitleEl.textContent = siteName || SITE_TITLE_PLACEHOLDER
  applyDocumentTitle(siteName)
  applyDocumentFavicon(logo)

  if (logoImageEl) {
    if (logo) {
      logoImageEl.setAttribute('src', logo)
      logoImageEl.style.display = 'block'
    } else {
      logoImageEl.removeAttribute('src')
      logoImageEl.style.display = 'none'
    }
  }

  if (logoBadgeEl) {
    logoBadgeEl.textContent = badgeText
    logoBadgeEl.style.display = logo ? 'none' : 'grid'
  }

  if (authLogoImageEl) {
    if (logo) {
      authLogoImageEl.setAttribute('src', logo)
      authLogoImageEl.style.display = 'block'
    } else {
      authLogoImageEl.removeAttribute('src')
      authLogoImageEl.style.display = 'none'
    }
  }

  if (authLogoBadgeEl) {
    authLogoBadgeEl.textContent = badgeText
    authLogoBadgeEl.style.display = logo ? 'none' : 'grid'
  }
}

function hideSplash() {
  const splash = document.getElementById('boot-splash')
  if (!splash) return
  splash.style.opacity = '0'
  window.setTimeout(() => splash.remove(), 220)
}

function runPostMountTask(task, fallbackDelay = 0) {
  const runner = () => Promise.resolve(task()).catch(() => null)

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => runner())
    return
  }

  window.setTimeout(runner, fallbackDelay)
}

function waitForFirstScreenReady(routeName = '') {
  if (routeName !== 'home') return Promise.resolve()
  if (window.__QD_FIRST_SCREEN_READY__) return Promise.resolve()

  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener(FIRST_SCREEN_READY_EVENT, finish)
      resolve()
    }

    const timeoutId = window.setTimeout(finish, 2200)
    window.addEventListener(FIRST_SCREEN_READY_EVENT, finish, { once: true })
  })
}

function isAuthRouteName(routeName = '') {
  return AUTH_ROUTE_NAMES.has(String(routeName || ''))
}

function getCachedSplashState() {
  const brand = getCachedSiteBrand()
  return {
    site_name: brand.siteName,
    notice: brand.notice,
    logo: brand.logo
  }
}

function ensureSiteStore(pinia) {
  if (siteStorePromise) return siteStorePromise

  siteStorePromise = import('./stores/site')
    .then(({ useSiteStore }) => {
      const siteStore = useSiteStore(pinia)
      siteStore.hydrateFromCache()
      updateBootSplash(siteStore.$state)

      if (!siteStoreSubscribed) {
        siteStore.$subscribe((_mutation, state) => {
          updateBootSplash(state)
        })
        siteStoreSubscribed = true
      }

      return siteStore
    })

  return siteStorePromise
}

function bootstrapApp() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)

  updateBootSplash(getCachedSplashState())

  app.use(router)
  app.mount('#app')

  runPostMountTask(() => installNativeDialogGuards(), 0)

  router.isReady()
    .then(() => {
      const routeName = String(router.currentRoute.value?.name || '')
      const authRoute = isAuthRouteName(routeName)
      const homeRoute = routeName === 'home'
      const currentTab = String(router.currentRoute.value?.meta?.tab || '')

      if (!authRoute) {
        scheduleWarmCoreTabViewChunks({ exclude: currentTab, immediate: true })
      }

      if (!authRoute) {
        runPostMountTask(() => ensureSiteStore(pinia).then((siteStore) => siteStore.bootstrapContext().catch(() => siteStore)), homeRoute ? 80 : 0)
      }

      if (!authRoute && !homeRoute) {
        runPostMountTask(() => import('./api/http').then(({ ensureCsrfToken }) => ensureCsrfToken()), 80)
      }

      return waitForFirstScreenReady(routeName)
    })
    .finally(() => {
      nextTick(() => {
        window.requestAnimationFrame(() => hideSplash())
      })
    })

  window.setTimeout(hideSplash, 2600)
}

bootstrapApp()

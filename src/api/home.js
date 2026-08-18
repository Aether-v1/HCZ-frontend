import { resolveApiUrl, resolveAssetUrl } from '../utils/assets'
import { mergeBootstrapWithSiteContext } from '../utils/siteContext'
import {
  buildFeaturedProducts,
  emptyHomeBootstrap,
  getCachedHomeBootstrap,
  HOME_CACHE_KEY,
  HOME_FIRST_SCREEN_CACHE_KEY,
  normalizeConfigPayload,
  normalizeProductList,
  saveCachedHomeBootstrap,
  toNumber
} from './home-helpers'

const CONFIG_API_PATH = '/api/site/config'
const SPA_TITLES = new Set(['TP8 Vue Portal', 'Vite App'])

function withNoCacheQuery(path, query = {}) {
  const text = String(path || '').trim()
  if (!text) return text
  const params = new URLSearchParams()
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  params.set('_', String(Date.now()))
  const joiner = text.includes('?') ? '&' : '?'
  return `${text}${joiner}${params.toString()}`
}

async function fetchJsonCandidate(path, query = {}) {
  const candidate = resolveApiUrl(withNoCacheQuery(path, query))
  const response = await fetch(candidate, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json, text/plain, */*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache'
    }
  })
  if (!response.ok) throw new Error(`home api request failed: ${response.status}`)
  const body = await response.text()
  if (!body.trim()) throw new Error('home api empty')
  try {
    const parsed = JSON.parse(body)
    return parsed?.data || parsed
  } catch {
    throw new Error('home api invalid json')
  }
}

async function fetchSiteConfigPayload(options = {}) {
  const { summaryOnly = false } = options
  const raw = await fetchJsonCandidate(CONFIG_API_PATH, summaryOnly ? { scene: 'home_first_screen', summary: 1, lite: 1 } : {})
  const config = normalizeConfigPayload(raw, { summaryOnly })
  if (config.contactServiceImage) config.contactServiceImage = resolveAssetUrl(config.contactServiceImage)
  if (SPA_TITLES.has(config.siteName)) config.siteName = ''
  const allProducts = normalizeProductList(raw, ['allProducts', 'product_list', 'products', 'goods_list', 'goods', 'all_products', 'productList', 'goodsList', 'list'], { summaryOnly })
  const featuredFromPayload = normalizeProductList(raw, ['featuredProducts', 'featured_products', 'recommendProducts', 'recommendedProducts', 'featured', 'recommend'], { summaryOnly })
  return {
    ...config,
    raw,
    allProducts,
    featuredFromPayload,
    source: `api:${CONFIG_API_PATH}`
  }
}

export async function fetchHomeBootstrap(options = {}) {
  const { summaryOnly = false } = options
  const cacheScope = summaryOnly ? HOME_FIRST_SCREEN_CACHE_KEY : HOME_CACHE_KEY
  const fallback = getCachedHomeBootstrap(cacheScope)
  const siteConfig = await fetchSiteConfigPayload({ summaryOnly })
  const allProducts = siteConfig.allProducts || []

  if (!allProducts.length) {
    throw new Error('site config product list unavailable')
  }

  const featuredProducts = buildFeaturedProducts(siteConfig, allProducts, { summaryOnly })

  const payload = {
    ...emptyHomeBootstrap(),
    ...fallback,
    ...siteConfig,
    siteName: siteConfig.siteName || fallback.siteName || '汇充站',
    notice: siteConfig.notice || fallback.notice || '',
    rate: siteConfig.rate || fallback.rate || '',
    paymentAddress: siteConfig.paymentAddress || fallback.paymentAddress || '',
    agentIntro: siteConfig.agentIntro || fallback.agentIntro || '',
    agentMoney: siteConfig.agentMoney || fallback.agentMoney || '',
    contactServiceUrl: siteConfig.contactServiceUrl || fallback.contactServiceUrl || '',
    contactServiceImage: siteConfig.contactServiceImage || fallback.contactServiceImage || '',
    chatwootEnabled: toNumber(siteConfig.chatwootEnabled ?? fallback.chatwootEnabled ?? 0),
    chatwootBaseUrl: siteConfig.chatwootBaseUrl || fallback.chatwootBaseUrl || '',
    chatwootToken: siteConfig.chatwootToken || fallback.chatwootToken || '',
    slides: siteConfig.slides?.length ? siteConfig.slides : (fallback.slides || []),
    allProducts,
    featuredProducts: featuredProducts.slice(0, 2),
    updatedAt: Date.now(),
    source: siteConfig.source || 'api:/api/site/config'
  }

  delete payload.raw
  delete payload.featuredFromPayload
  const mergedPayload = mergeBootstrapWithSiteContext(payload)
  saveCachedHomeBootstrap(mergedPayload, cacheScope)
  return mergedPayload
}

export async function fetchHomeFirstScreen() {
  return fetchHomeBootstrap({ summaryOnly: true })
}

export async function fetchSiteConfigSnapshot() {
  const fallback = getCachedHomeBootstrap()
  const siteConfig = await fetchSiteConfigPayload()
  const payload = mergeBootstrapWithSiteContext({
    ...emptyHomeBootstrap(),
    ...fallback,
    ...siteConfig,
    siteName: siteConfig.siteName || fallback.siteName || '汇充站',
    notice: siteConfig.notice || fallback.notice || '',
    rate: siteConfig.rate || fallback.rate || '',
    paymentAddress: siteConfig.paymentAddress || fallback.paymentAddress || '',
    agentIntro: siteConfig.agentIntro || fallback.agentIntro || '',
    agentMoney: siteConfig.agentMoney || fallback.agentMoney || '',
    contactServiceUrl: siteConfig.contactServiceUrl || fallback.contactServiceUrl || '',
    contactServiceImage: siteConfig.contactServiceImage || fallback.contactServiceImage || '',
    chatwootEnabled: toNumber(siteConfig.chatwootEnabled ?? fallback.chatwootEnabled ?? 0),
    chatwootBaseUrl: siteConfig.chatwootBaseUrl || fallback.chatwootBaseUrl || '',
    chatwootToken: siteConfig.chatwootToken || fallback.chatwootToken || '',
    slides: siteConfig.slides?.length ? siteConfig.slides : (fallback.slides || []),
    featuredProducts: Array.isArray(fallback.featuredProducts) ? fallback.featuredProducts : [],
    allProducts: Array.isArray(fallback.allProducts) ? fallback.allProducts : [],
    updatedAt: Date.now(),
    source: siteConfig.source || 'api:/api/site/config'
  })
  saveCachedHomeBootstrap(payload)
  return payload
}

import { resolveAssetUrl } from '../utils/assets'
import { mergeBootstrapWithSiteContext } from '../utils/siteContext'

export const HOME_CACHE_KEY = 'tp8-home-bootstrap-v16'
export const HOME_FIRST_SCREEN_CACHE_KEY = 'tp8-home-first-screen-v1'

const SPA_TITLES = new Set(['TP8 Vue Portal', 'Vite App'])
const PLACEHOLDER_TITLES = new Set(['充值业务', '商品标题', '推荐商品'])
const PLACEHOLDER_DESCS = new Set(['充值业务', '商品描述', '点击进入下单', '优惠中'])

function cleanText(value) {
  return String(value || '').trim()
}

function sanitizeDisplayText(value) {
  const normalized = String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')

  return cleanText(normalized)
}

function isMeaningfulTitle(value) {
  const text = cleanText(value)
  return Boolean(text) && !PLACEHOLDER_TITLES.has(text)
}

function isMeaningfulDesc(value, title = '') {
  const text = cleanText(value)
  const titleText = cleanText(title)
  return Boolean(text) && !PLACEHOLDER_DESCS.has(text) && text !== titleText
}

function preferTitle(primary, fallback = '') {
  if (isMeaningfulTitle(primary)) return cleanText(primary)
  if (isMeaningfulTitle(fallback)) return cleanText(fallback)
  return cleanText(primary) || cleanText(fallback)
}

function preferDesc(primary, fallback = '', title = '') {
  if (isMeaningfulDesc(primary, title)) return cleanText(primary)
  if (isMeaningfulDesc(fallback, title)) return cleanText(fallback)
  return cleanText(primary) || cleanText(fallback)
}

function summarizeNotice(value) {
  const text = cleanText(sanitizeDisplayText(value).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' '))
  return text.slice(0, 88)
}

export function toNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

export function formatDiscountText(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return ''
  return num.toFixed(4).replace(/\.?0+$/, '')
}

export function resolveProductDiscountRange(product = {}) {
  const tiers = Array.isArray(product?.price_tiers) ? product.price_tiers : []
  const values = tiers
    .map((tier) => Number(tier?.final_discount || tier?.substation_discount || tier?.platform_discount || 0))
    .filter((value) => Number.isFinite(value) && value > 0)

  if (values.length) {
    const firstText = formatDiscountText(values[0])
    const lastText = formatDiscountText(values[values.length - 1])
    if (firstText && lastText && firstText !== lastText) return `${firstText}折-${lastText}折`
    return firstText ? `${firstText}折` : (lastText ? `${lastText}折` : '')
  }

  const singleText = formatDiscountText(product?.display_discount || 0)
  return singleText ? `${singleText}折` : ''
}

export function resolveProductMinDiscountText(product = {}, prefix = '最低') {
  const tiers = Array.isArray(product?.price_tiers) ? product.price_tiers : []
  const values = tiers
    .map((tier) => Number(tier?.final_discount || tier?.substation_discount || tier?.platform_discount || 0))
    .filter((value) => Number.isFinite(value) && value > 0)

  if (values.length) {
    const minText = formatDiscountText(Math.min(...values))
    return minText ? `${prefix}${minText}折` : ''
  }

  const singleText = formatDiscountText(product?.display_discount || 0)
  return singleText ? `${prefix}${singleText}折` : ''
}

function toArray(value, fallback = []) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return fallback
    try {
      const parsed = JSON.parse(text)
      return Array.isArray(parsed) ? parsed : fallback
    } catch {
      return fallback
    }
  }
  return fallback
}

function visitDeep(value, callback) {
  if (!value || typeof value !== 'object') return undefined
  const stack = [value]
  while (stack.length) {
    const current = stack.shift()
    const result = callback(current)
    if (result !== undefined && result !== null && result !== '' && !(Array.isArray(result) && !result.length)) return result
    if (Array.isArray(current)) {
      for (const item of current) {
        if (item && typeof item === 'object') stack.push(item)
      }
    } else {
      for (const child of Object.values(current)) {
        if (child && typeof child === 'object') stack.push(child)
      }
    }
  }
  return undefined
}

function findStringByKeys(value, keys = []) {
  return visitDeep(value, (current) => {
    if (Array.isArray(current)) return undefined
    for (const key of keys) {
      const candidate = current?.[key]
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
      if (typeof candidate === 'number' && !Number.isNaN(candidate)) return String(candidate)
    }
    return undefined
  })
}

function findArrayByKeys(value, keys = []) {
  return visitDeep(value, (current) => {
    if (Array.isArray(current)) return undefined
    for (const key of keys) {
      const candidate = current?.[key]
      if (Array.isArray(candidate) && candidate.length) return candidate
    }
    return undefined
  })
}

function rowsToConfigMap(rows = []) {
  const map = {}
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== 'object') continue
    const key = String(row.k || row.key || row.field || row.field_name || row.name || '').trim()
    if (!key) continue
    const raw = row.v ?? row.value ?? row.content ?? row.text ?? ''
    map[key] = raw
  }
  return map
}

function extractConfigMap(raw = {}) {
  if (Array.isArray(raw)) return rowsToConfigMap(raw)
  const directRows = findArrayByKeys(raw, ['list', 'rows', 'items', 'config', 'configs', 'data'])
  const directMap = rowsToConfigMap(directRows || [])
  if (Object.keys(directMap).length) return directMap

  const source = raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data) ? raw.data : raw
  const keys = [
    'name', 'notice', 'payment_address', 'rate', 'agent_jieshao', 'agent_money',
    'a_recommend_id', 'a_recommend_image', 'b_recommend_id', 'b_recommend_image',
    'contact_service_url', 'contact_service_image',
    'chatwoot_enabled', 'chatwoot_base_url', 'chatwoot_token'
  ]
  const map = {}
  for (const key of keys) {
    const value = source?.[key]
    if (value !== undefined && value !== null && value !== '') map[key] = value
  }
  return map
}

function normalizeSlide(item = {}) {
  return {
    id: toNumber(item.id || item.banner_id || item.slide_id || item.swiper_id || 0),
    name: String(item.name || item.title || item.banner_name || '').trim(),
    image: item.image || item.pic || item.cover || item.banner_image || item.thumb ? resolveAssetUrl(item.image || item.pic || item.cover || item.banner_image || item.thumb) : ''
  }
}

function normalizePriceTier(item = {}) {
  return {
    tier_key: String(item.tier_key || '').trim(),
    min_amount: toNumber(item.min_amount || 0),
    max_amount: item.max_amount === null || item.max_amount === '' ? null : toNumber(item.max_amount || 0),
    par_value_snapshot: String(item.par_value_snapshot || '').trim(),
    platform_discount: toNumber(item.platform_discount || 0),
    platform_settlement_price: toNumber(item.platform_settlement_price || item.platform_price || 0),
    platform_price_usdt: toNumber(item.platform_price_usdt || 0),
    final_discount: toNumber(item.final_discount || item.substation_discount || item.platform_discount || 0),
    final_price: toNumber(item.final_price || item.substation_price || item.platform_price || 0),
    final_price_usdt: toNumber(item.final_price_usdt || 0),
    cover_hit: toNumber(item.cover_hit || 0)
  }
}

function normalizeOrderFieldItem(item, index = 0) {
  if (typeof item === 'string') {
    const label = item.trim()
    return label ? { key: label, label, type: 1, raw: item } : null
  }
  if (!item || typeof item !== 'object') return null
  const label = String(item.name || item.title || item.label || item.field_name || item.field || '').trim()
  if (!label) return null
  const type = toNumber(item.type ?? item.field_type ?? item.input_type ?? 1, 1)
  const options = toArray(item.options || item.values || item.items || item.list || []).map((option) => {
    if (typeof option === 'string' || typeof option === 'number') {
      const text = String(option).trim()
      return text ? { label: text, value: text } : null
    }
    if (option && typeof option === 'object') {
      const value = String(option.value ?? option.name ?? option.label ?? option.title ?? '').trim()
      if (!value) return null
      return { label: String(option.label ?? option.name ?? option.title ?? value).trim(), value }
    }
    return null
  }).filter(Boolean)
  return {
    key: String(item.key || item.field || item.name || item.title || item.label || `field_${index}`).trim(),
    label,
    type,
    placeholder: String(item.placeholder || '').trim(),
    required: Number(item.required ?? item.must ?? 1) !== 0,
    options,
    raw: item
  }
}

function normalizeOrderFields(value) {
  return toArray(value).map((item, index) => normalizeOrderFieldItem(item, index)).filter(Boolean)
}

function normalizeParValue(value) {
  return toArray(value).map((item) => {
    if (typeof item === 'number') return item
    if (typeof item === 'string') return toNumber(item, item)
    if (item && typeof item === 'object') return toNumber(item.value || item.name, item.value || item.name)
    return item
  }).filter((item) => item !== '' && item !== null && item !== undefined)
}

function normalizeProduct(item = {}, options = {}) {
  const { summaryOnly = false } = options
  const id = toNumber(item.id || item.product_id || item.pid || item.goods_id || item.recommend_id || 0)
  const name = String(item.name || item.product_name || item.title || item.goods_name || '').trim()
  const homeNameRaw = String(item.home_name || item.home_title || item.index_name || item.display_name || name).trim()
  const homeName = preferTitle(homeNameRaw, name)
  const describeRaw = String(item.describe || item.desc || item.description || item.sub_title || item.subtitle || item.intro || '').trim()
  const describe = preferDesc(describeRaw, '', homeName || name)
  const image = item.image || item.product_image || item.cover || item.thumb || item.pic || item.home_image
  const baseProduct = {
    id,
    name,
    home_name: homeName,
    describe,
    image: image ? resolveAssetUrl(image) : '',
    display_price_cny: toNumber(item.display_price_cny || item.displayPriceCny || item.display_price || 0),
    display_price_usdt: toNumber(item.display_price_usdt || item.displayPriceUsdt || 0),
    display_discount: toNumber(item.display_discount || item.discount || 0),
    batch_status: toNumber(item.batch_status ?? item.is_batch ?? 0),
    product_type: toNumber(item.product_type ?? item.category_type ?? 0),
    type: toNumber(item.type ?? 1, 1),
    status: toNumber(item.status ?? item.is_show ?? item.enabled ?? 1, 1),
    sort: toNumber(item.sort ?? item.list_order ?? item.order ?? item.weight ?? 0)
  }

  if (summaryOnly) {
    return {
      ...baseProduct,
      price_tiers: Array.isArray(item.price_tiers) ? item.price_tiers.map(normalizePriceTier) : []
    }
  }

  return {
    ...baseProduct,
    price_tiers: Array.isArray(item.price_tiers) ? item.price_tiers.map(normalizePriceTier) : [],
    platform_display_price_cny: toNumber(item.platform_display_price_cny || item.platformDisplayPriceCny || 0),
    platform_display_price_usdt: toNumber(item.platform_display_price_usdt || item.platformDisplayPriceUsdt || 0),
    mini_recharge_amount: toNumber(item.mini_recharge_amount || item.min_recharge_amount || item.min_amount || 0),
    par_value: normalizeParValue(item.par_value || item.amount_list || item.values || []),
    order_fields: normalizeOrderFields(item.order_fields || item.order_info || item.fields || []),
    tutorial_content: String(item.tutorial_content || item.tutorial || item.help_text || '').trim()
  }
}

function isEnabledProduct(item = {}) {
  return Number(item.status ?? 1) === 1
}

export function mergeProductWithReference(product = {}, allProducts = [], options = {}) {
  const match = allProducts.find((item) => Number(item.id) === Number(product.id))
  if (!match) return normalizeProduct(product, options)
  const normalized = normalizeProduct(product, options)
  const title = preferTitle(match.home_name || match.name, normalized.home_name || normalized.name)
  return {
    ...match,
    ...normalized,
    name: preferTitle(match.name, normalized.name),
    home_name: title,
    describe: preferDesc(match.describe, normalized.describe, title),
    image: normalized.image || match.image,
    display_price_cny: normalized.display_price_cny || match.display_price_cny,
    display_price_usdt: normalized.display_price_usdt || match.display_price_usdt,
    display_discount: normalized.display_discount || match.display_discount,
    ...(options?.summaryOnly ? null : {
      price_tiers: normalized.price_tiers?.length ? normalized.price_tiers : match.price_tiers,
      platform_display_price_cny: normalized.platform_display_price_cny || match.platform_display_price_cny,
      platform_display_price_usdt: normalized.platform_display_price_usdt || match.platform_display_price_usdt,
      par_value: normalized.par_value?.length ? normalized.par_value : match.par_value,
      order_fields: normalized.order_fields?.length ? normalized.order_fields : match.order_fields
    })
  }
}

function productFromConfig(idValue, imageValue, allProducts = [], options = {}) {
  const productId = toNumber(idValue || 0)
  if (!productId) return null
  const matched = allProducts.find((item) => Number(item?.id || 0) === productId)
  if (!matched) return null
  const normalized = normalizeProduct(matched, options)
  if (imageValue) normalized.image = resolveAssetUrl(imageValue)
  return normalized
}

export function normalizeConfigPayload(raw = {}, options = {}) {
  const { summaryOnly = false } = options
  const configMap = extractConfigMap(raw)
  return {
    siteName: String(configMap.name || findStringByKeys(raw, ['siteName', 'site_name', 'site_title', 'title', 'name', 'website_name', 'web_name']) || '').trim(),
    notice: summaryOnly
      ? summarizeNotice(String(configMap.notice || findStringByKeys(raw, ['notice', 'site_notice', 'announcement', 'bulletin', 'notice_content', 'notice_text', 'gonggao', 'marquee', 'marquee_notice', 'scroll_notice']) || '').trim())
      : sanitizeDisplayText(String(configMap.notice || findStringByKeys(raw, ['notice', 'site_notice', 'announcement', 'bulletin', 'notice_content', 'notice_text', 'gonggao', 'marquee', 'marquee_notice', 'scroll_notice']) || '').trim()),
    rate: String(configMap.rate || findStringByKeys(raw, ['rate', 'exchange_rate', 'reference_rate', 'site_rate', 'usdt_rate']) || '').trim(),
    paymentAddress: String(configMap.payment_address || findStringByKeys(raw, ['payment_address', 'wallet_address', 'site_wallet_address']) || '').trim(),
    agentIntro: sanitizeDisplayText(String(configMap.agent_jieshao || findStringByKeys(raw, ['agent_jieshao', 'agent_notice', 'agent_intro']) || '').trim()),
    agentMoney: String(configMap.agent_money || findStringByKeys(raw, ['agent_money', 'agent_fee']) || '').trim(),
    contactServiceUrl: String(configMap.contact_service_url || findStringByKeys(raw, ['contact_service_url']) || '').trim(),
    contactServiceImage: String(configMap.contact_service_image || findStringByKeys(raw, ['contact_service_image']) || '').trim(),
    chatwootEnabled: toNumber(configMap.chatwoot_enabled || findStringByKeys(raw, ['chatwoot_enabled']) || 0),
    chatwootBaseUrl: String(configMap.chatwoot_base_url || findStringByKeys(raw, ['chatwoot_base_url']) || '').trim(),
    chatwootToken: String(configMap.chatwoot_token || findStringByKeys(raw, ['chatwoot_token']) || '').trim(),
    recommendAId: toNumber(configMap.a_recommend_id || 0),
    recommendAImage: configMap.a_recommend_image ? resolveAssetUrl(configMap.a_recommend_image) : '',
    recommendBId: toNumber(configMap.b_recommend_id || 0),
    recommendBImage: configMap.b_recommend_image ? resolveAssetUrl(configMap.b_recommend_image) : '',
    slides: (findArrayByKeys(raw, ['slides', 'banners', 'carousel', 'swiper', 'banner_list', 'bannerList']) || []).map(normalizeSlide)
  }
}

export function normalizeProductList(raw = {}, keys = ['allProducts', 'product_list', 'products', 'goods_list', 'goods', 'all_products', 'productList', 'goodsList', 'list'], options = {}) {
  return (findArrayByKeys(raw, keys) || [])
    .map((item) => normalizeProduct(item, options))
    .filter((item) => item.id)
    .filter(isEnabledProduct)
    .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
}

export function emptyHomeBootstrap() {
  return {
    siteName: '汇充站',
    notice: '',
    logo: '',
    is_substation: 0,
    subdomain: '',
    full_domain: '',
    rate: '',
    paymentAddress: '',
    agentIntro: '',
    agentMoney: '',
    contactServiceUrl: '',
    contactServiceImage: '',
    chatwootEnabled: 0,
    chatwootBaseUrl: '',
    chatwootToken: '',
    slides: [],
    featuredProducts: [],
    allProducts: [],
    updatedAt: Date.now(),
    source: 'empty'
  }
}

function getHomeCacheKey(scope = HOME_CACHE_KEY) {
  if (typeof window === 'undefined') return `${HOME_CACHE_KEY}:default`
  const host = String(window.location.host || 'default').trim().toLowerCase() || 'default'
  return `${scope}:${host}`
}

function parseCachedHomeBootstrap(parsed = {}) {
  const fallback = emptyHomeBootstrap()
  return mergeBootstrapWithSiteContext({
    ...fallback,
    ...parsed,
    siteName: parsed?.siteName && !SPA_TITLES.has(parsed.siteName) ? parsed.siteName : fallback.siteName,
    logo: parsed?.logo || '',
    is_substation: Number(parsed?.is_substation || 0),
    subdomain: parsed?.subdomain || '',
    full_domain: parsed?.full_domain || '',
    notice: sanitizeDisplayText(parsed?.notice || ''),
    rate: parsed?.rate || fallback.rate,
    paymentAddress: parsed?.paymentAddress || fallback.paymentAddress,
    agentIntro: sanitizeDisplayText(parsed?.agentIntro || fallback.agentIntro),
    agentMoney: parsed?.agentMoney || fallback.agentMoney,
    contactServiceUrl: parsed?.contactServiceUrl || fallback.contactServiceUrl,
    contactServiceImage: parsed?.contactServiceImage || fallback.contactServiceImage,
    chatwootEnabled: toNumber(parsed?.chatwootEnabled ?? fallback.chatwootEnabled ?? 0),
    chatwootBaseUrl: parsed?.chatwootBaseUrl || fallback.chatwootBaseUrl,
    chatwootToken: parsed?.chatwootToken || fallback.chatwootToken,
    slides: Array.isArray(parsed?.slides) && parsed.slides.length ? parsed.slides.map(normalizeSlide) : fallback.slides,
    featuredProducts: Array.isArray(parsed?.featuredProducts) && parsed.featuredProducts.length ? parsed.featuredProducts.map((item) => normalizeProduct(item, { summaryOnly: !Array.isArray(item?.price_tiers) && !Array.isArray(item?.order_fields) && !Array.isArray(item?.par_value) && !item?.tutorial_content })) : fallback.featuredProducts,
    allProducts: Array.isArray(parsed?.allProducts) && parsed.allProducts.length ? parsed.allProducts.map((item) => normalizeProduct(item, { summaryOnly: !Array.isArray(item?.price_tiers) && !Array.isArray(item?.order_fields) && !Array.isArray(item?.par_value) && !item?.tutorial_content })) : fallback.allProducts
  })
}

export function getCachedHomeBootstrap(scope = HOME_CACHE_KEY) {
  const fallback = emptyHomeBootstrap()
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(getHomeCacheKey(scope))
    if (!raw) return fallback
    return parseCachedHomeBootstrap(JSON.parse(raw))
  } catch {
    return fallback
  }
}

export function getCachedHomeFirstScreen() {
  return getCachedHomeBootstrap(HOME_FIRST_SCREEN_CACHE_KEY)
}

export function getCachedHomeProducts() {
  const cache = getCachedHomeBootstrap()
  return [...(cache?.featuredProducts || []), ...(cache?.allProducts || [])]
}

export function findCachedHomeProductById(id) {
  return getCachedHomeProducts().find((item) => Number(item?.id || 0) === Number(id)) || null
}

export function saveCachedHomeBootstrap(payload, scope = HOME_CACHE_KEY) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(getHomeCacheKey(scope), JSON.stringify(payload))
  } catch {
    // ignore
  }
}

export function buildFeaturedProducts(config = {}, allProducts = [], options = {}) {
  const featured = [
    productFromConfig(config.recommendAId, config.recommendAImage, allProducts, options),
    productFromConfig(config.recommendBId, config.recommendBImage, allProducts, options)
  ]
    .filter(Boolean)
    .map((item) => mergeProductWithReference(item, allProducts, options))
    .filter(isEnabledProduct)
    .slice(0, 2)

  if (featured.length) return featured
  return allProducts.slice(0, 2)
}
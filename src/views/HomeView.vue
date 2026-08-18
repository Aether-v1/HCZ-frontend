<template>
  <section class="stack-lg home-page mobile-home-refined">
    <div class="card stack-sm home-brand-card home-simple-hero">
      <div class="section-head simple-head home-brand-head">
        <h2>{{ renderedSiteName }}</h2>
      </div>

      <div v-if="noticeLoading" class="notice-marquee-card is-empty">
        <div class="notice-marquee-label">公告</div>
        <div class="notice-marquee-track">
          <div class="home-skeleton-line home-skeleton-line--notice" aria-hidden="true"></div>
        </div>
      </div>
      <div v-else-if="resolvedNotice" class="notice-marquee-card">
        <div class="notice-marquee-label">公告</div>
        <div class="notice-marquee-track">
          <div class="notice-marquee-content">{{ resolvedNotice }}</div>
        </div>
      </div>
      <div v-else class="notice-marquee-card is-empty">
        <div class="notice-marquee-label">公告</div>
        <div class="notice-marquee-track">
          <div class="notice-marquee-content">暂无公告</div>
        </div>
      </div>

      <div v-if="slidesLoading" class="home-banner-inline">
        <div class="banner-frame home-banner-frame banner-frame-clean home-banner-skeleton" aria-hidden="true">
          <div class="home-skeleton-panel"></div>
        </div>
      </div>
      <div v-else-if="resolvedSlides.length" class="home-banner-inline">
        <div class="banner-frame home-banner-frame banner-frame-clean">
          <LazyImage
            class="home-banner-image"
            :src="resolveAssetUrl(resolvedSlides[activeSlide]?.image)"
            :alt="resolvedSlides[activeSlide]?.name || '轮播图'"
            :eager="activeSlide === 0"
            root-margin="160px 0px"
            :placeholder-src="PLACEHOLDER"
            :fetchpriority="activeSlide === 0 ? 'high' : 'auto'"
            @error="handleImgError"
          />
        </div>
        <div v-if="resolvedSlides.length > 1" class="carousel-dots bottom-dots home-banner-dots">
          <button
            v-for="(slide, index) in resolvedSlides"
            :key="slide.id || index"
            class="dot-btn"
            :class="{ active: index === activeSlide }"
            type="button"
            @click="setActiveSlide(index)"
          />
        </div>
      </div>
    </div>

    <div class="card stack-sm compact-recommend-card desktop-recommend-card">
      <div class="section-head">
        <h2>推荐充值类型</h2>
      </div>
      <div v-if="featuredProductsLoading" class="recommend-grid compact-recommend-grid mobile-two-grid mobile-hot-grid home-simple-grid desktop-recommend-grid">
        <div v-for="index in 2" :key="`featured-skeleton-${index}`" class="service-card compact-service-item service-card-simple service-card-with-thumb home-name-card home-service-thumb-card recommend-card-mini home-product-skeleton" aria-hidden="true">
          <div class="service-thumb mini-thumb home-skeleton-block"></div>
          <div class="service-body compact-service-body simple-service-body product-name-only service-name-only">
            <div class="home-skeleton-line home-skeleton-line--product-title"></div>
            <div class="home-skeleton-line home-skeleton-line--product-desc"></div>
            <div class="home-skeleton-meta-row">
              <div class="home-skeleton-chip home-skeleton-chip--price"></div>
              <div class="home-skeleton-chip home-skeleton-chip--action"></div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="recommend-grid compact-recommend-grid mobile-two-grid mobile-hot-grid home-simple-grid desktop-recommend-grid">
        <router-link
          v-for="product in visibleFeaturedProducts"
          :key="product.id"
          :to="`/product/${product.id}`"
          class="service-card compact-service-item service-card-simple service-card-with-thumb home-name-card home-service-thumb-card recommend-card-mini"
        >
          <div class="service-thumb mini-thumb">
            <LazyImage
              class="recommend-cover"
              :src="resolveAssetUrl(product.image)"
              :alt="product.home_name || product.name"
              root-margin="220px 0px"
              :placeholder-src="PLACEHOLDER"
              fetchpriority="auto"
              @error="handleImgError"
            />
          </div>
          <div class="service-body compact-service-body simple-service-body product-name-only service-name-only">
            <h3>{{ displayProductTitle(product) }}</h3>
            <p v-if="displayProductDesc(product)" class="home-product-desc">{{ displayProductDesc(product) }}</p>
          </div>
        </router-link>
      </div>
    </div>

    <div ref="allProductsSectionRef" class="card stack-sm compact-services-card home-service-panel">
      <div class="section-head">
        <h2>更多充值类型</h2>
      </div>
      <div v-if="allProductsLoading || (!allProductsActivated && resolvedAllProducts.length)" class="service-grid compact-service-grid service-grid-two-col enhanced-service-grid home-service-grid-simple">
        <div v-for="index in 4" :key="`all-skeleton-${index}`" class="service-card compact-service-item service-card-simple service-card-with-thumb home-name-card home-service-thumb-card home-product-skeleton" aria-hidden="true">
          <div class="service-thumb mini-thumb home-skeleton-block"></div>
          <div class="service-body compact-service-body simple-service-body product-name-only service-name-only">
            <div class="home-skeleton-line home-skeleton-line--product-title"></div>
            <div class="home-skeleton-line home-skeleton-line--product-desc"></div>
            <div class="home-skeleton-meta-row">
              <div class="home-skeleton-chip home-skeleton-chip--price"></div>
              <div class="home-skeleton-chip home-skeleton-chip--action"></div>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="visibleAllProducts.length" class="service-grid compact-service-grid service-grid-two-col enhanced-service-grid home-service-grid-simple">
        <router-link
          v-for="product in visibleAllProducts"
          :key="product.id"
          :to="`/product/${product.id}`"
          class="service-card compact-service-item service-card-simple service-card-with-thumb home-name-card home-service-thumb-card"
        >
          <div class="service-thumb mini-thumb">
            <LazyImage :src="resolveAssetUrl(product.image)" :alt="product.name" root-margin="240px 0px" :placeholder-src="PLACEHOLDER" fetchpriority="auto" @error="handleImgError" />
          </div>
          <div class="service-body compact-service-body simple-service-body product-name-only service-name-only">
            <h3>{{ displayProductTitle(product) }}</h3>
            <p v-if="displayProductDesc(product)" class="home-product-desc">{{ displayProductDesc(product) }}</p>
          </div>
        </router-link>
      </div>
      <div v-else class="notice-marquee-card is-empty home-products-empty">
        <div class="notice-marquee-track">
          <div class="notice-marquee-content">暂无更多商品</div>
        </div>
      </div>
      <div
        v-if="allProductsActivated && visibleAllProducts.length < resolvedAllProducts.length"
        ref="allProductsLoadMoreRef"
        class="home-product-batch-placeholder home-product-load-sentinel"
        aria-hidden="true"
      ></div>
    </div>
  </section>

  <AppDialog
    :visible="showTwofaReminder"
    :closable="false"
    title="账户安全提醒"
    variant="danger"
    confirm-text="立即绑定 2FA"
    cancel-text="稍后再说"
    @close="closeTwofaReminder"
    @confirm="goTwofaBinding"
  >
    <div class="twofa-reminder-copy">
      <strong>当前账号还没有绑定 2FA</strong>
      <p>强烈建议立即绑定验证器。开启后，登录和敏感操作都会额外校验 6 位动态码，能明显降低账号被盗和资金风险。</p>
    </div>
  </AppDialog>
</template>

<script setup>
defineOptions({ name: 'HomeView' })
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { apiAccountTwofaStatus } from '../api/account'
import { fetchHomeFirstScreen } from '../api/home'
import { getCachedHomeFirstScreen } from '../api/home-helpers'
import AppDialog from '../components/AppDialog.vue'
import LazyImage from '../components/LazyImage.vue'
import { useUserStore } from '../stores/user'
import { useSiteStore } from '../stores/site'
import { resolveAssetUrl } from '../utils/assets'

const PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360"><rect width="600" height="360" fill="%23102144"/><circle cx="120" cy="92" r="44" fill="%231e2c5a"/><rect x="72" y="170" width="456" height="18" rx="9" fill="%23293c74"/><rect x="72" y="208" width="220" height="14" rx="7" fill="%23213462"/></svg>'
const INITIAL_FEATURED_PRODUCTS_COUNT = 2
const FEATURED_PRODUCTS_BATCH_SIZE = 2
const INITIAL_ALL_PRODUCTS_COUNT = 8
const ALL_PRODUCTS_BATCH_SIZE = 8
const warmedHomeImageUrls = new Set()
const SITE_TITLE_PLACEHOLDER = '\u00A0'

const siteStore = useSiteStore()
const userStore = useUserStore()
const router = useRouter()
const cachedBootstrap = getCachedHomeFirstScreen()
const hasCachedHomeContent = Boolean(
  cachedBootstrap.notice ||
  cachedBootstrap.logo ||
  (Array.isArray(cachedBootstrap.slides) && cachedBootstrap.slides.length) ||
  (Array.isArray(cachedBootstrap.featuredProducts) && cachedBootstrap.featuredProducts.length) ||
  (Array.isArray(cachedBootstrap.allProducts) && cachedBootstrap.allProducts.length)
)
const homeData = reactive({
  siteName: cachedBootstrap.siteName || '',
  notice: cachedBootstrap.notice || '',
  logo: cachedBootstrap.logo || '',
  slides: cachedBootstrap.slides || [],
  featuredProducts: cachedBootstrap.featuredProducts || [],
  allProducts: cachedBootstrap.allProducts || []
})
const activeSlide = ref(0)
const showTwofaReminder = ref(false)
const twofaReminderDismissed = ref(false)
const isHomeFetching = ref(!hasCachedHomeContent)
const deferredTasksStarted = ref(false)
const allProductsSectionRef = ref(null)
const allProductsLoadMoreRef = ref(null)
const allProductsActivated = ref(false)
const visibleFeaturedProductsCount = ref(0)
const visibleAllProductsCount = ref(0)
let slideTimer = null
let allProductsObserver = null
let allProductsLoadMoreObserver = null
let featuredProductsRenderHandle = 0
let featuredProductsRenderMode = ''
let deferredTasksHandle = 0
let deferredTasksHandleMode = ''
let allProductsBatchAppending = false
const twofaBinding = computed(() => userStore.session?.accountBindings?.twofa || {})
const twofaReady = computed(() => Number(twofaBinding.value?.status_checked || 0) === 1)
const twofaEnabled = computed(() => (twofaReady.value ? Number(twofaBinding.value?.is_enabled || 0) === 1 : null))
const shouldShowTwofaReminder = computed(() => deferredTasksStarted.value && twofaReady.value && twofaEnabled.value === false && !twofaReminderDismissed.value)
const resolvedSiteName = computed(() => String(siteStore.site_name || '').trim() || homeData.siteName || '')
const renderedSiteName = computed(() => resolvedSiteName.value || SITE_TITLE_PLACEHOLDER)
const resolvedNotice = computed(() => summarizeNotice(siteStore.displayNotice || homeData.notice || ''))
const resolvedSlides = computed(() => Array.isArray(homeData.slides) ? homeData.slides : [])
const resolvedAllSourceProducts = computed(() => Array.isArray(homeData.allProducts) ? homeData.allProducts : [])
const noticeLoading = computed(() => isHomeFetching.value && !resolvedNotice.value)
const slidesLoading = computed(() => isHomeFetching.value && !resolvedSlides.value.length)

const PLACEHOLDER_TITLES = new Set(['充值业务', '商品标题', '推荐商品'])
const PLACEHOLDER_DESCS = new Set(['充值业务', '商品描述', '点击进入下单', '优惠中'])
let firstScreenReadyNotified = false

function cleanText(value) {
  return String(value || '').trim()
}

function ensureHeadLink(rel, href, attributes = {}) {
  if (typeof document === 'undefined' || !href) return null
  const normalizedHref = (() => {
    try {
      return new URL(href, window.location.origin).href
    } catch {
      return href
    }
  })()
  const existing = Array.from(document.head?.querySelectorAll(`link[rel="${rel}"]`) || []).find((link) => link.href === normalizedHref || link.getAttribute('href') === href)
  if (existing) return existing
  const link = document.createElement('link')
  link.rel = rel
  link.href = href
  Object.entries(attributes).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    link.setAttribute(key, String(value))
  })
  document.head.appendChild(link)
  return link
}

function warmConnection(url) {
  if (typeof window === 'undefined' || !url || url.startsWith('data:') || url.startsWith('blob:')) return
  try {
    const origin = new URL(url, window.location.origin).origin
    ensureHeadLink('dns-prefetch', origin)
    ensureHeadLink('preconnect', origin, { crossorigin: '' })
  } catch {
    // ignore invalid urls
  }
}

function warmImage(url, priority = 'auto') {
  if (typeof window === 'undefined' || !url || warmedHomeImageUrls.has(url) || url.startsWith('data:') || url.startsWith('blob:')) return
  warmedHomeImageUrls.add(url)
  warmConnection(url)
  ensureHeadLink('preload', url, { as: 'image', fetchpriority: priority })
  const image = new window.Image()
  if ('fetchPriority' in image) image.fetchPriority = priority
  image.decoding = 'async'
  image.src = url
  if (typeof image.decode === 'function') {
    image.decode().catch(() => null)
  }
}

function warmHomeImages(payload = {}) {
  const queue = []
  const pushImage = (value) => {
    const url = cleanText(value)
    if (!url || queue.includes(url)) return
    queue.push(url)
  }

  pushImage(payload.logo)
  pushImage(payload.slides?.[0]?.image)

  queue.forEach((url, index) => {
    warmImage(url, index < 2 ? 'high' : 'auto')
  })
}

function summarizeNotice(value = '') {
  return cleanText(String(value || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ')).slice(0, 88)
}

function isValidTitle(value) {
  const text = cleanText(value)
  return Boolean(text) && !PLACEHOLDER_TITLES.has(text)
}

function isValidDesc(value, title = '') {
  const text = cleanText(value)
  const titleText = cleanText(title)
  return Boolean(text) && !PLACEHOLDER_DESCS.has(text) && text != titleText
}

function enrichWithAllProducts(product) {
  const id = Number(product?.id || 0)
  const matched = resolvedAllSourceProducts.value.find((item) => Number(item?.id || 0) === id)
  if (!matched) return product

  const matchedTitle = isValidTitle(matched?.home_name)
    ? matched.home_name
    : (isValidTitle(matched?.name) ? matched.name : '')
  const productTitle = isValidTitle(product?.home_name)
    ? product.home_name
    : (isValidTitle(product?.name) ? product.name : '')
  const title = matchedTitle || productTitle || '充值业务'

  const matchedDesc = String(matched?.describe || '').trim()
  const productDesc = String(product?.describe || '').trim()
  const desc = matchedDesc || productDesc || ''

  return {
    ...matched,
    ...product,
    name: isValidTitle(matched?.name) ? matched.name : product.name,
    home_name: title,
    describe: desc,
    image: product?.image || matched.image
  }
}

function displayProductTitle(product = {}) {
  if (isValidTitle(product.home_name)) return product.home_name
  if (isValidTitle(product.name)) return product.name
  return '充值业务'
}

function displayProductDesc(product = {}) {
  return String(product?.describe || '').trim()
}

const resolvedFeaturedProducts = computed(() => {
  const source = Array.isArray(homeData.featuredProducts) ? homeData.featuredProducts : []
  return source
    .map(enrichWithAllProducts)
    .filter((item) => Number(item?.status ?? 1) === 1)
    .sort((a, b) => Number(a?.sort ?? 0) - Number(b?.sort ?? 0))
})
const visibleFeaturedProducts = computed(() => resolvedFeaturedProducts.value.slice(0, visibleFeaturedProductsCount.value || 0))
const resolvedAllProducts = computed(() => {
  const source = resolvedAllSourceProducts.value
  const enabled = source
    .filter((item) => Number(item?.status ?? 1) === 1)
    .sort((a, b) => Number(a?.sort ?? 0) - Number(b?.sort ?? 0))
  const featuredIds = new Set(resolvedFeaturedProducts.value.map((item) => Number(item.id)).filter(Boolean))
  return enabled.filter((item) => !featuredIds.has(Number(item.id)))
})
const featuredProductsLoading = computed(() => isHomeFetching.value && !resolvedFeaturedProducts.value.length)
const allProductsLoading = computed(() => isHomeFetching.value && !resolvedAllProducts.value.length)
const visibleAllProducts = computed(() => resolvedAllProducts.value.slice(0, visibleAllProductsCount.value || 0))

function handleImgError(event) {
  event.target.src = PLACEHOLDER
}

function setActiveSlide(index) {
  if (index < 0 || index >= resolvedSlides.value.length) return
  activeSlide.value = index
}

function startSlideTimer() {
  if (slideTimer) clearInterval(slideTimer)
  slideTimer = setInterval(() => {
    if (!resolvedSlides.value.length) return
    activeSlide.value = (activeSlide.value + 1) % resolvedSlides.value.length
  }, 3200)
}

function cleanupAllProductsObserver() {
  if (!allProductsObserver) return
  allProductsObserver.disconnect()
  allProductsObserver = null
}

function cleanupAllProductsLoadMoreObserver() {
  if (!allProductsLoadMoreObserver) return
  allProductsLoadMoreObserver.disconnect()
  allProductsLoadMoreObserver = null
}

function cleanupFeaturedProductsRenderHandle() {
  if (!featuredProductsRenderHandle) return
  if (featuredProductsRenderMode === 'idle' && typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(featuredProductsRenderHandle)
  } else {
    window.clearTimeout(featuredProductsRenderHandle)
  }
  featuredProductsRenderHandle = 0
  featuredProductsRenderMode = ''
}

function cleanupDeferredTasksHandle() {
  if (!deferredTasksHandle) return
  if (deferredTasksHandleMode === 'idle' && typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(deferredTasksHandle)
  } else {
    window.clearTimeout(deferredTasksHandle)
  }
  deferredTasksHandle = 0
  deferredTasksHandleMode = ''
}

function queueFeaturedProductsAppend() {
  cleanupFeaturedProductsRenderHandle()
  if (visibleFeaturedProductsCount.value >= resolvedFeaturedProducts.value.length) return

  const appendBatch = () => {
    featuredProductsRenderHandle = 0
    featuredProductsRenderMode = ''
    visibleFeaturedProductsCount.value = Math.min(
      visibleFeaturedProductsCount.value + FEATURED_PRODUCTS_BATCH_SIZE,
      resolvedFeaturedProducts.value.length
    )

    if (visibleFeaturedProductsCount.value < resolvedFeaturedProducts.value.length) {
      queueFeaturedProductsAppend()
    }
  }

  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    featuredProductsRenderMode = 'idle'
    featuredProductsRenderHandle = window.requestIdleCallback(appendBatch, { timeout: 260 })
    return
  }

  featuredProductsRenderMode = 'timeout'
  featuredProductsRenderHandle = window.setTimeout(appendBatch, 80)
}

function activateAllProductsSection() {
  if (allProductsActivated.value) return
  allProductsActivated.value = true
  visibleAllProductsCount.value = Math.min(INITIAL_ALL_PRODUCTS_COUNT, resolvedAllProducts.value.length)
  cleanupAllProductsObserver()
  observeAllProductsLoadMore()
}

function showMoreAllProducts() {
  visibleAllProductsCount.value = Math.min(
    visibleAllProductsCount.value + ALL_PRODUCTS_BATCH_SIZE,
    resolvedAllProducts.value.length
  )
}

function appendAllProductsBatch() {
  if (allProductsBatchAppending) return
  if (visibleAllProductsCount.value >= resolvedAllProducts.value.length) return

  allProductsBatchAppending = true
  showMoreAllProducts()
  window.setTimeout(() => {
    allProductsBatchAppending = false
  }, 120)
}

function observeAllProductsLoadMore() {
  if (!allProductsActivated.value) return
  if (!allProductsLoadMoreRef.value) return
  if (visibleAllProductsCount.value >= resolvedAllProducts.value.length) {
    cleanupAllProductsLoadMoreObserver()
    return
  }

  if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
    appendAllProductsBatch()
    return
  }

  cleanupAllProductsLoadMoreObserver()
  allProductsLoadMoreObserver = new window.IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
        appendAllProductsBatch()
      }
    },
    {
      root: null,
      rootMargin: '260px 0px',
      threshold: 0.01,
    }
  )
  allProductsLoadMoreObserver.observe(allProductsLoadMoreRef.value)
}

function observeAllProductsSection() {
  if (allProductsActivated.value || !allProductsSectionRef.value) return

  if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
    activateAllProductsSection()
    return
  }

  cleanupAllProductsObserver()
  allProductsObserver = new window.IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
        activateAllProductsSection()
      }
    },
    {
      root: null,
      rootMargin: '420px 0px',
      threshold: 0.01,
    }
  )
  allProductsObserver.observe(allProductsSectionRef.value)
}

function runIdleTask(task, fallbackDelay = 240) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => task())
    return
  }

  window.setTimeout(task, fallbackDelay)
}

function queueDeferredTask(task, fallbackDelay = 240) {
  cleanupDeferredTasksHandle()

  if (typeof window.requestIdleCallback === 'function') {
    deferredTasksHandleMode = 'idle'
    deferredTasksHandle = window.requestIdleCallback(() => {
      deferredTasksHandle = 0
      deferredTasksHandleMode = ''
      task()
    })
    return
  }

  deferredTasksHandleMode = 'timeout'
  deferredTasksHandle = window.setTimeout(() => {
    deferredTasksHandle = 0
    deferredTasksHandleMode = ''
    task()
  }, fallbackDelay)
}

function notifyFirstScreenReady() {
  if (firstScreenReadyNotified || typeof window === 'undefined') return
  firstScreenReadyNotified = true
  window.__QD_FIRST_SCREEN_READY__ = true
  window.dispatchEvent(new CustomEvent('qd:first-screen-ready'))
  scheduleDeferredTasks()
}

async function loadBootstrapNow() {
  try {
    const payload = await fetchHomeFirstScreen()
    Object.assign(homeData, payload || {})
    warmHomeImages(payload || {})
  } catch {
    // keep cache
  } finally {
    isHomeFetching.value = false
    notifyFirstScreenReady()
  }
}

async function syncSessionBootstrap() {
  if (!userStore.isLoggedIn) return
  try {
    await userStore.bootstrapSession()
  } catch {
    // ignore
  }
}

function syncTwofaBinding(binding = {}) {
  const normalizedBinding = {
    ...binding,
    status_checked: 1,
    is_enabled: Number(binding.is_enabled ?? binding.twofa_enabled ?? binding.enabled ?? 0) || 0,
    has_recovery_codes: Number(binding.has_recovery_codes ?? 0) || 0,
    recovery_code_count: Number(binding.recovery_code_count ?? 0) || 0
  }

  if (typeof userStore.setTwofaBinding === 'function') {
    userStore.setTwofaBinding(normalizedBinding)
    return normalizedBinding
  }

  if (typeof userStore.setSession === 'function') {
    userStore.setSession({
      accountBindings: {
        twofa: normalizedBinding,
        has_twofa: normalizedBinding.is_enabled
      }
    })
  }

  return normalizedBinding
}

async function syncTwofaStatus() {
  if (twofaReady.value) return
  try {
    const res = await apiAccountTwofaStatus()
    syncTwofaBinding({
      twofa_enabled: Number(res?.data?.twofa_enabled || 0),
      has_recovery_codes: Number(res?.data?.has_recovery_codes || 0),
      recovery_code_count: Number(res?.data?.recovery_code_count || 0)
    })
  } catch {
    // ignore
  }
}

function closeTwofaReminder() {
  twofaReminderDismissed.value = true
  showTwofaReminder.value = false
}

function goTwofaBinding() {
  closeTwofaReminder()
  router.push('/account-twofa')
}

function scheduleDeferredTasks() {
  if (deferredTasksStarted.value) return
  deferredTasksStarted.value = true

  queueDeferredTask(async () => {
    await syncSessionBootstrap()
    if (!twofaReady.value) {
      await syncTwofaStatus()
    }
  }, 1200)
}

function scheduleBootstrapRefresh() {
  if (hasCachedHomeContent) {
    warmHomeImages(homeData)
    window.requestAnimationFrame(() => {
      isHomeFetching.value = false
      notifyFirstScreenReady()
    })
    runIdleTask(() => {
      void loadBootstrapNow()
    }, 420)
    return
  }

  window.requestAnimationFrame(() => {
    notifyFirstScreenReady()
    runIdleTask(() => {
      void loadBootstrapNow()
    }, 80)
  })
}

onMounted(() => {
  runIdleTask(() => {
    startSlideTimer()
  }, 900)
  scheduleBootstrapRefresh()
  observeAllProductsSection()
})

watch(
  () => resolvedFeaturedProducts.value.length,
  (length) => {
    if (!length) {
      visibleFeaturedProductsCount.value = 0
      cleanupFeaturedProductsRenderHandle()
      return
    }

    visibleFeaturedProductsCount.value = Math.min(INITIAL_FEATURED_PRODUCTS_COUNT, length)
    if (length > visibleFeaturedProductsCount.value) {
      queueFeaturedProductsAppend()
    }
  },
  { immediate: true }
)

watch(
  () => resolvedAllProducts.value.length,
  (length) => {
    if (!length) {
      visibleAllProductsCount.value = 0
      cleanupAllProductsLoadMoreObserver()
      return
    }

    if (allProductsActivated.value) {
      if (!visibleAllProductsCount.value) {
        visibleAllProductsCount.value = Math.min(INITIAL_ALL_PRODUCTS_COUNT, length)
      }
      observeAllProductsLoadMore()
      return
    }

    observeAllProductsSection()
  },
  { immediate: true }
)

watch(
  () => [allProductsActivated.value, visibleAllProductsCount.value, resolvedAllProducts.value.length, allProductsLoadMoreRef.value],
  () => {
    observeAllProductsLoadMore()
  }
)

watch(shouldShowTwofaReminder, (visible) => {
  if (visible) showTwofaReminder.value = true
}, { immediate: true })

onBeforeUnmount(() => {
  if (slideTimer) clearInterval(slideTimer)
  cleanupAllProductsObserver()
  cleanupAllProductsLoadMoreObserver()
  cleanupFeaturedProductsRenderHandle()
  cleanupDeferredTasksHandle()
})
</script>

<style scoped>
.twofa-reminder-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.twofa-reminder-copy strong {
  font-size: 18px;
  line-height: 1.45;
}

.twofa-reminder-copy p {
  margin: 0;
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.7;
}

.home-security-callout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  text-decoration: none;
}

.home-security-callout-danger {
  border: 1px solid rgba(217, 119, 6, 0.16);
  background:
    radial-gradient(circle at top right, rgba(251, 191, 36, 0.18), transparent 40%),
    linear-gradient(180deg, rgba(255, 251, 235, 0.98), rgba(255, 247, 237, 0.98));
}

.home-security-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.home-security-eyebrow {
  display: inline-flex;
  align-self: flex-start;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
  font-size: 12px;
  font-weight: 700;
}

.home-security-copy strong {
  color: var(--text-main, #111827);
  font-size: 18px;
  line-height: 1.4;
}

.home-security-copy p {
  margin: 0;
  color: var(--text-muted, #7b7280);
  font-size: 13px;
  line-height: 1.7;
}

.home-security-action {
  display: flex;
  align-items: center;
}

.home-security-btn {
  pointer-events: none;
  white-space: nowrap;
}

.home-skeleton-block,
.home-skeleton-line,
.home-skeleton-panel {
  position: relative;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.18);
}

.home-skeleton-block::after,
.home-skeleton-line::after,
.home-skeleton-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.58), transparent);
  animation: homeSkeletonShimmer 1.25s linear infinite;
}

.home-skeleton-logo {
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  border-radius: 14px;
}

.home-skeleton-line {
  display: block;
  border-radius: 999px;
}

.home-skeleton-line--notice {
  width: 100%;
  height: 16px;
}

.home-skeleton-line--product-title {
  width: 78%;
  height: 16px;
}

.home-skeleton-line--product-desc {
  width: 52%;
  height: 13px;
}

.home-skeleton-meta-row,
.home-product-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.home-skeleton-meta-row {
  margin-top: 2px;
}

.home-skeleton-chip {
  height: 12px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  position: relative;
  overflow: hidden;
}

.home-skeleton-chip::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.58), transparent);
  animation: homeSkeletonShimmer 1.25s linear infinite;
}

.home-skeleton-chip--price {
  width: 42%;
}

.home-skeleton-chip--action {
  width: 28%;
}

.home-banner-skeleton {
  min-height: 180px;
}

.home-skeleton-panel {
  width: 100%;
  height: 100%;
  min-height: 180px;
  border-radius: inherit;
}

.home-product-skeleton {
  pointer-events: none;
}

.home-product-skeleton .service-thumb {
  min-height: 74px;
  border-radius: 18px;
}

.home-product-batch-placeholder {
  padding-top: 6px;
}

.home-product-load-sentinel {
  min-height: 18px;
}

.home-product-meta-row {
  margin-top: 2px;
}

.home-product-price {
  min-width: 0;
  color: var(--text-soft, #7b7280);
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.home-product-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(96, 184, 244, 0.14);
  color: #2893d5;
  font-size: 12px;
  font-weight: 700;
}

@keyframes homeSkeletonShimmer {
  100% {
    transform: translateX(100%);
  }
}

@media (max-width: 640px) {
  .home-security-callout {
    grid-template-columns: 1fr;
  }

  .home-security-action {
    justify-content: flex-start;
  }
}
</style>

<template>
  <section class="stack-lg orders-simple-page">
    <div class="card stack-md orders-toolbar-card">
      <div class="section-head section-head-mobile orders-head-inline">
        <div>
          <h1>订单中心</h1>
        </div>
      </div>

      <div class="search-shell order-search-shell keep-inline-search compact-order-search">
        <label class="search-input-wrap search-input-wrap-refined">
          <span class="search-icon search-icon-centered" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input v-model.trim="filters.content" placeholder="订单号 / 卡号 / 关键信息" @keyup.enter="applySearch()" />
        </label>
        <button class="primary-btn order-search-btn compact-search-btn" type="button" @click="applySearch()">搜索</button>
      </div>

      <div class="order-status-hybrid">
        <div class="order-status-scroll-shell">
          <div class="order-status-scroll">
            <button
              v-for="statusItem in primaryStatusOptions"
              :key="statusItem.value"
              class="chip button-chip order-status-chip order-status-chip-with-badge"
              :class="{ active: filters.status === statusItem.value }"
              @click="selectStatus(statusItem.value)"
            >
              <span>{{ statusItem.label }}</span>
              <span
                v-if="statusItem.value === 'pending_confirm' && filters.status !== 'pending_confirm' && orderPendingConfirmCount > 0"
                class="seg-inline-badge seg-inline-badge--dot order-inline-badge"
                aria-hidden="true"
              ></span>
            </button>
          </div>
          <span class="order-scroll-indicator" aria-hidden="true">›</span>
        </div>
        <button
          class="chip button-chip order-status-chip order-status-fixed order-status-fixed--tail"
          :class="{ active: filters.status === 'all' }"
          @click="selectStatus('all')"
        >
          全部
        </button>
      </div>

      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />
    </div>

    <div v-if="showInitialSkeleton" class="stack-md">
      <article
        v-for="index in 3"
        :key="`order-skeleton-${index}`"
        class="card order-list-card refined-order-card order-card-skeleton"
        aria-hidden="true"
      >
        <div class="order-card-top">
          <div class="stack-xs order-skeleton-copy">
            <span class="order-skeleton-line order-skeleton-line--tiny"></span>
            <span class="order-skeleton-line order-skeleton-line--number"></span>
          </div>
          <span class="order-skeleton-pill"></span>
        </div>

        <div class="order-product-row refined-order-product-row">
          <div class="order-avatar order-avatar-image order-skeleton-block"></div>
          <div class="order-product-meta order-skeleton-copy">
            <span class="order-skeleton-line order-skeleton-line--title"></span>
            <span class="order-skeleton-line order-skeleton-line--time"></span>
          </div>
        </div>

        <div class="order-detail-grid refined-order-detail-grid simple-order-amount-grid">
          <div class="order-skeleton-copy">
            <span class="order-skeleton-line order-skeleton-line--tiny"></span>
            <span class="order-skeleton-line order-skeleton-line--value"></span>
          </div>
          <div class="order-skeleton-copy">
            <span class="order-skeleton-line order-skeleton-line--tiny"></span>
            <span class="order-skeleton-line order-skeleton-line--value"></span>
          </div>
        </div>
      </article>
    </div>

    <div v-else-if="visibleRows.length" class="stack-md">
      <article
        v-for="item in visibleRows"
        :key="item.id || item.order_number"
        class="card order-list-card refined-order-card order-card-clickable"
        @click="openDetail(item)"
      >
        <div class="order-card-top">
          <div>
            <div class="tiny-text muted">订单号</div>
            <strong class="order-number">{{ item.order_number || '-' }}</strong>
          </div>
          <span class="status-badge" :class="statusClassFromKey(item.status_key)">{{ item.status_text }}</span>
        </div>

        <div class="order-product-row refined-order-product-row">
          <div class="order-avatar order-avatar-image" :class="{ fallback: !item.product_image }">
            <img v-if="item.product_image" :src="resolveAssetUrl(item.product_image)" :alt="item.product_name" @error="handleImageError(item)" />
            <span v-else>{{ (item.product_name || '订').slice(0, 1) }}</span>
          </div>
          <div class="order-product-meta">
            <div class="order-product-name">{{ item.product_name }}</div>
            <div class="tiny-text muted">{{ item.time_display }}</div>
          </div>
        </div>

        <div class="order-detail-grid refined-order-detail-grid simple-order-amount-grid">
          <div>
            <span class="tiny-text muted">实付金额</span>
            <div class="detail-value">{{ item.payment_display }}</div>
          </div>
          <div>
            <span class="tiny-text muted">充值金额</span>
            <div class="detail-value">{{ item.amount_display }}</div>
          </div>
        </div>
      </article>

      <div v-if="showPagination" class="pager-bar">
        <button class="ghost-btn pager-btn" type="button" :disabled="filters.page <= 1" aria-label="上一页" @click="goPage(filters.page - 1)">
          <span class="pager-icon">&lt;</span>
        </button>
        <div class="pager-center">
          <div class="pager-count">
            <span class="pager-pill pager-pill--active">{{ filters.page }}</span>
            <span class="pager-sep">/</span>
            <span class="pager-pill">{{ totalPages }}</span>
          </div>
          <div class="pager-track">
            <span class="pager-fill" :style="{ width: `${Math.max(12, (filters.page / totalPages) * 100)}%` }"></span>
          </div>
        </div>
        <button class="ghost-btn pager-btn" type="button" :disabled="filters.page >= totalPages" aria-label="下一页" @click="goPage(filters.page + 1)">
          <span class="pager-icon">&gt;</span>
        </button>
      </div>

      <button v-if="showMoreOrders" class="ghost-btn block" type="button" @click="showMoreOrdersCards">查看更多订单</button>
    </div>

    <div v-else class="card empty-card app-empty simple-empty-orders">
      <div class="empty-emoji">📭</div>
      <h3>暂无订单数据</h3>
    </div>
  </section>
</template>

<script setup>
import FeedbackToast from '@/components/FeedbackToast.vue'
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiOrderList } from '../api/order'
import { useAppBadges } from '../stores/badges'
import { resolveAssetUrl } from '../utils/assets'
import { normalizeOrder, ORDER_FILTER_OPTIONS, ORDERS_CACHE_KEY, statusClassFromKey, writeOrderDetailCache } from '../utils/orders'

const CACHE_KEY = ORDERS_CACHE_KEY
const LEGACY_CACHE_KEYS = [ORDERS_CACHE_KEY]
const CACHE_TTL = 90 * 1000
const ACTIVE_POLL_INTERVAL = 4000
const HIDDEN_POLL_INTERVAL = 15000
const PAGE_SIZE = 10
const INITIAL_VISIBLE_ORDERS = 4
const ORDER_VISIBLE_BATCH = 4
const DEFAULT_SCROLL_TOP = 0
const router = useRouter()
const message = ref('')
const success = ref(false)
const rows = ref([])
const initialLoading = ref(false)
const initialLoaded = ref(false)
const visibleOrderCount = ref(0)
const totalItems = ref(0)
const totalPages = ref(1)
const { orderPendingConfirmCount, refreshAppBadges } = useAppBadges()

const filters = reactive({
  content: '',
  status: 'pending_charge',
  page: 1,
  page_size: PAGE_SIZE
})

const primaryStatusOptions = ORDER_FILTER_OPTIONS.filter((item) => item.value !== 'all')
const showPagination = computed(() => totalItems.value > filters.page_size && totalPages.value > 1)
const showInitialSkeleton = computed(() => initialLoading.value && !rows.value.length && !initialLoaded.value)
const visibleRows = computed(() => rows.value.slice(0, visibleOrderCount.value || 0))
const showMoreOrders = computed(() => visibleRows.value.length < rows.value.length)
let pollTimer = null
let initialActivationHandled = false
let pollingListenersBound = false
let latestLoadRequestId = 0

function resetVisibleOrders(length = rows.value.length) {
  visibleOrderCount.value = Math.min(INITIAL_VISIBLE_ORDERS, Number(length || 0) || 0)
}

function showMoreOrdersCards() {
  visibleOrderCount.value = Math.min(
    visibleOrderCount.value + ORDER_VISIBLE_BATCH,
    rows.value.length
  )
}

function createCacheState() {
  return {
    currentFilters: { ...filters },
    pages: {},
    scopes: {},
    returnScrollY: DEFAULT_SCROLL_TOP,
    returnPending: false,
    timestamp: 0
  }
}

function normalizeSearchContent(value = '') {
  return String(value || '').trim()
}

function getScopeKey(status = filters.status, content = filters.content) {
  return `${String(status || 'pending_charge')}::${normalizeSearchContent(content)}`
}

function getPageKey({ status = filters.status, content = filters.content, page = filters.page, page_size = filters.page_size } = {}) {
  return `${getScopeKey(status, content)}::${Number(page || 1)}::${Number(page_size || PAGE_SIZE)}`
}

function readCache() {
  for (const key of LEGACY_CACHE_KEYS) {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(key) || 'null')
      if (parsed && typeof parsed === 'object') {
        return {
          ...createCacheState(),
          ...parsed,
          currentFilters: { ...filters, ...(parsed.currentFilters || parsed.filters || {}) },
          pages: parsed.pages && typeof parsed.pages === 'object' ? parsed.pages : {},
          scopes: parsed.scopes && typeof parsed.scopes === 'object' ? parsed.scopes : {},
          returnScrollY: Number(parsed.returnScrollY || 0) || 0,
          returnPending: Boolean(parsed.returnPending)
        }
      }
    } catch {
      // ignore broken cache entries
    }
  }
  return null
}

function readMutableCache() {
  return readCache() || createCacheState()
}

function writeCache(cache = readMutableCache()) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore cache errors
  }
}

function persistViewState(extra = {}) {
  const cache = readMutableCache()
  const scopeKey = getScopeKey()
  cache.currentFilters = { ...filters }
  cache.scopes[scopeKey] = {
    ...(cache.scopes[scopeKey] || {}),
    page: filters.page,
    updatedAt: Date.now()
  }
  Object.assign(cache, extra)
  writeCache(cache)
  return cache
}

function persistCurrentPageSnapshot() {
  const cache = persistViewState({ timestamp: Date.now() })
  cache.pages[getPageKey()] = {
    rows: rows.value,
    totalItems: totalItems.value,
    totalPages: totalPages.value,
    timestamp: Date.now()
  }
  writeCache(cache)
}

function readPageSnapshot(params = {}) {
  const cache = readCache()
  if (!cache) return null
  const snapshot = cache.pages?.[getPageKey(params)]
  if (!snapshot) return null
  if (!snapshot.timestamp || (Date.now() - Number(snapshot.timestamp)) > CACHE_TTL) return null
  return snapshot
}

function applyPageSnapshot(params = {}) {
  const snapshot = readPageSnapshot(params)
  if (!snapshot) return false
  rows.value = Array.isArray(snapshot.rows) ? snapshot.rows : []
  resetVisibleOrders(Array.isArray(snapshot.rows) ? snapshot.rows.length : 0)
  totalItems.value = Number(snapshot.totalItems || 0) || rows.value.length
  totalPages.value = Number(snapshot.totalPages || 1) || 1
  message.value = ''
  success.value = false
  return true
}

function saveReturnScrollPosition() {
  if (typeof window === 'undefined') return
  persistViewState({
    returnScrollY: Math.max(DEFAULT_SCROLL_TOP, Number(window.scrollY || window.pageYOffset || 0) || 0)
  })
}

function restoreReturnScrollPosition() {
  const cache = readCache()
  if (!cache?.returnPending || typeof window === 'undefined') return false
  const top = Math.max(DEFAULT_SCROLL_TOP, Number(cache.returnScrollY || 0) || 0)
  cache.returnPending = false
  writeCache(cache)
  nextTick(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top, behavior: 'auto' })
    })
  })
  return true
}

function restoreCache() {
  const cache = readCache()
  if (!cache) return false
  if (cache.currentFilters) {
    filters.content = cache.currentFilters.content || ''
    filters.status = cache.currentFilters.status || 'pending_charge'
    filters.page = cache.currentFilters.page || 1
    filters.page_size = cache.currentFilters.page_size || PAGE_SIZE
  }
  if (!applyPageSnapshot()) {
    const legacyRows = Array.isArray(cache.rows) ? cache.rows : []
    rows.value = legacyRows
    resetVisibleOrders(legacyRows.length)
    totalItems.value = Number(cache.totalItems || 0) || legacyRows.length
    totalPages.value = Number(cache.totalPages || 1) || 1
  }
  return true
}

function cacheFreshEnough() {
  return Boolean(readPageSnapshot())
}

function resetOrderResultsForReload() {
  rows.value = []
  resetVisibleOrders(0)
  totalItems.value = 0
  totalPages.value = 1
}

function selectStatus(status) {
  if (filters.status === status) return
  saveReturnScrollPosition()
  const nextScopeKey = getScopeKey(status, filters.content)
  const cache = readMutableCache()
  filters.status = status
  filters.page = Number(cache.scopes?.[nextScopeKey]?.page || 1) || 1
  persistViewState({ returnScrollY: DEFAULT_SCROLL_TOP, returnPending: false })
  if (applyPageSnapshot()) {
    nextTick(() => {
      window.scrollTo({ top: DEFAULT_SCROLL_TOP, behavior: 'auto' })
    })
    return
  }
  resetOrderResultsForReload()
  initialLoaded.value = false
  loadOrders()
}

function handleImageError(item) {
  item.product_image = ''
}

function openDetail(item) {
  writeOrderDetailCache(item)
  persistCurrentPageSnapshot()
  const cache = readMutableCache()
  cache.returnScrollY = typeof window === 'undefined' ? DEFAULT_SCROLL_TOP : Math.max(DEFAULT_SCROLL_TOP, Number(window.scrollY || window.pageYOffset || 0) || 0)
  cache.returnPending = true
  cache.currentFilters = { ...filters }
  writeCache(cache)
  router.push({ name: 'order-detail', params: { orderNumber: item.order_number } })
}

function stopPolling() {
  if (pollTimer) {
    window.clearTimeout(pollTimer)
    pollTimer = null
  }
}

function scheduleNextPoll() {
  stopPolling()
  pollTimer = window.setTimeout(() => {
    handlePollingRefresh()
  }, typeof document !== 'undefined' && document.visibilityState === 'hidden' ? HIDDEN_POLL_INTERVAL : ACTIVE_POLL_INTERVAL)
}

function handlePollingRefresh() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    scheduleNextPoll()
    return
  }
  if (filters.content.trim() || filters.page !== 1) {
    scheduleNextPoll()
    return
  }
  loadOrders({ silent: true }).catch(() => null).finally(() => {
    scheduleNextPoll()
  })
}

function bindPollingListeners() {
  if (pollingListenersBound || typeof window === 'undefined' || typeof document === 'undefined') return
  window.addEventListener('focus', handlePollingRefresh)
  document.addEventListener('visibilitychange', handlePollingRefresh)
  pollingListenersBound = true
}

function unbindPollingListeners() {
  if (!pollingListenersBound || typeof window === 'undefined' || typeof document === 'undefined') return
  window.removeEventListener('focus', handlePollingRefresh)
  document.removeEventListener('visibilitychange', handlePollingRefresh)
  pollingListenersBound = false
}

function startPolling() {
  bindPollingListeners()
  scheduleNextPoll()
}

function applySearch() {
  filters.page = 1
  persistViewState({ returnScrollY: DEFAULT_SCROLL_TOP, returnPending: false })
  if (applyPageSnapshot()) {
    nextTick(() => {
      window.scrollTo({ top: DEFAULT_SCROLL_TOP, behavior: 'auto' })
    })
    return
  }
  resetOrderResultsForReload()
  initialLoaded.value = false
  loadOrders()
}

function goPage(nextPage) {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === filters.page) return
  filters.page = nextPage
  persistViewState({ returnScrollY: DEFAULT_SCROLL_TOP, returnPending: false })
  if (applyPageSnapshot()) {
    nextTick(() => {
      window.scrollTo({ top: DEFAULT_SCROLL_TOP, behavior: 'auto' })
    })
    return
  }
  loadOrders({ silent: true })
}

async function loadOrders(options = {}) {
  const { silent = false } = options
  const requestId = ++latestLoadRequestId
  const requestParams = {
    content: filters.content,
    status: filters.status,
    page: filters.page,
    page_size: filters.page_size
  }
  const shouldShowSkeleton = !silent && !rows.value.length && !initialLoaded.value
  if (!silent) {
    message.value = ''
    success.value = false
  }
  if (shouldShowSkeleton) {
    initialLoading.value = true
  }
  try {
    const res = await apiOrderList({
      content: requestParams.content,
      status_key: requestParams.status,
      page: requestParams.page,
      page_size: requestParams.page_size
    })
    if (requestId !== latestLoadRequestId) return
    const payload = res.data || {}
    rows.value = (payload.list || payload.data || payload.rows || []).map(normalizeOrder)
    resetVisibleOrders(rows.value.length)
    totalItems.value = Number(payload.total || 0) || rows.value.length
    totalPages.value = Math.max(1, Number(payload.totalPages || payload.total_pages || Math.ceil(totalItems.value / requestParams.page_size) || 1))
    persistCurrentPageSnapshot()
  } catch (error) {
    if (requestId !== latestLoadRequestId) return
    if (!silent || !rows.value.length) {
      message.value = error.message || '加载订单失败'
      if (!rows.value.length) {
        rows.value = []
        resetVisibleOrders(0)
        totalItems.value = 0
        totalPages.value = 1
      }
    }
  } finally {
    if (requestId !== latestLoadRequestId) return
    if (shouldShowSkeleton) {
      initialLoading.value = false
    }
    if (!initialLoaded.value) {
      initialLoaded.value = true
    }
  }
}

onMounted(() => {
  const hasCache = restoreCache()
  initialLoaded.value = hasCache
  refreshAppBadges().catch(() => null)
  startPolling()
  restoreReturnScrollPosition()
  if (!hasCache) {
    loadOrders()
    return
  }
  if (!cacheFreshEnough()) {
    loadOrders({ silent: true })
  }
})

onActivated(() => {
  refreshAppBadges().catch(() => null)
  startPolling()
  if (initialActivationHandled) {
    restoreReturnScrollPosition()
  } else {
    initialActivationHandled = true
  }
  if (!cacheFreshEnough()) {
    loadOrders({ silent: true }).catch(() => null)
  }
})

onDeactivated(() => {
  saveReturnScrollPosition()
  persistCurrentPageSnapshot()
  stopPolling()
  unbindPollingListeners()
})

onBeforeUnmount(() => {
  saveReturnScrollPosition()
  persistCurrentPageSnapshot()
  stopPolling()
  unbindPollingListeners()
})
</script>

<style scoped>
.order-card-skeleton,
.order-skeleton-line,
.order-skeleton-pill,
.order-skeleton-block {
  position: relative;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.18);
}

.order-card-skeleton::after,
.order-skeleton-line::after,
.order-skeleton-pill::after,
.order-skeleton-block::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.62), transparent);
  animation: orderSkeletonShimmer 1.15s linear infinite;
}

.order-card-skeleton {
  display: grid;
  gap: 18px;
  background: rgba(255, 255, 255, 0.04);
}

.order-skeleton-copy {
  display: grid;
  gap: 8px;
}

.order-skeleton-line,
.order-skeleton-pill {
  display: block;
  border-radius: 999px;
}

.order-skeleton-line--tiny {
  width: 42%;
  height: 11px;
}

.order-skeleton-line--number {
  width: 72%;
  height: 16px;
}

.order-skeleton-line--title {
  width: 68%;
  height: 15px;
}

.order-skeleton-line--time {
  width: 46%;
  height: 12px;
}

.order-skeleton-line--value {
  width: 58%;
  height: 15px;
}

.order-skeleton-pill {
  width: 72px;
  height: 26px;
}

.order-skeleton-block {
  min-height: 54px;
  border-radius: 18px;
}

@keyframes orderSkeletonShimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>

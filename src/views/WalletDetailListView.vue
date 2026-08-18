<template>
  <section class="stack-lg wallet-detail-bill-page">
    <div v-if="loading && !records.length" class="card empty-card app-empty compact-empty-card app-loading-card">
      <AppLoader size="md" />
    </div>

    <div v-else-if="loadFailed" class="card empty-card app-empty">
      <div class="empty-emoji">⚠️</div>
      <h3>明细记录加载失败</h3>
      <p class="muted">{{ message || '请稍后重试。' }}</p>
      <button class="primary-btn block" type="button" @click="loadRecords({ force: true })">重新加载</button>
    </div>

    <div v-else class="stack-md">
      <div class="card wallet-detail-bill-top">
        <div class="wallet-detail-bill-copy">
          <p class="wallet-detail-bill-kicker">{{ normalizedTitle }}</p>
          <h2>{{ normalizedTitle }}</h2>
          <p class="muted">{{ summaryCaption }}</p>
        </div>
        <button
          class="ghost-btn wallet-detail-bill-refresh"
          type="button"
          :disabled="refreshing"
          @click="loadRecords({ force: true, silent: records.length > 0, background: records.length > 0 })"
        >
          {{ refreshing ? '刷新中...' : '刷新' }}
        </button>
      </div>

      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />

      <div v-if="groupedRecords.length" class="card wallet-detail-bill-card">
        <section v-for="group in groupedRecords" :key="group.key" class="wallet-detail-bill-group">
          <div class="wallet-detail-bill-group-head">
            <strong>{{ group.label }}</strong>
          </div>

          <article v-for="item in group.items" :key="item.id" class="wallet-detail-bill-row">
            <div class="wallet-detail-bill-row-main">
              <strong>{{ item.title }}</strong>
              <p v-if="item.text && item.text !== '-'" class="wallet-detail-bill-row-text">{{ item.text }}</p>
              <p v-if="item.order_number" class="tiny-text muted">订单号 {{ item.order_number }}</p>
            </div>
            <div class="wallet-detail-bill-row-side">
              <strong :class="['wallet-detail-bill-amount', `is-${resolveAmountTone(item)}`]">
                {{ formatSignedAmount(item) }}
              </strong>
              <span class="tiny-text muted">{{ formatTimeLabel(item.date) }}</span>
            </div>
          </article>
        </section>
      </div>

      <div v-if="groupedRecords.length && hasMoreRecords" ref="loadMoreRef" class="wallet-detail-load-sentinel" aria-hidden="true">
        <span class="tiny-text muted">{{ loadingMore ? '加载中...' : '上滑加载更多' }}</span>
      </div>

      <div v-if="!groupedRecords.length && !loading" class="card empty-card app-empty">
        <div class="empty-emoji">🧾</div>
        <p class="muted">暂无相关明细</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import FeedbackToast from '../components/FeedbackToast.vue'
import AppLoader from '../components/AppLoader.vue'

defineOptions({ name: 'WalletDetailListView' })

import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { formatMoney } from '../utils/format'
import { apiFinanceDetailRecords } from '../api/finance'

const route = useRoute()
const records = ref([])
const page = ref(1)
const pageSize = 20
const totalPages = ref(1)
const loadMoreRef = ref(null)
const loadingMore = ref(false)
const message = ref('')
const success = ref(false)
const loading = ref(false)
const refreshing = ref(false)
const lastUpdatedAt = ref(0)
const loadedSignature = ref('')
const pollTimer = ref(null)
const latestRequestId = ref(0)
const CACHE_KEY_PREFIX = 'wallet-detail-list:v3:'
let loadMoreObserver = null

const ACTIVE_FRESH_AGE = 20 * 1000
const POLL_INTERVAL = 15 * 1000

const normalizedTitle = computed(() => String(route.query.title || '明细记录'))
const queryType = computed(() => String(route.query.type || ''))
const querySignature = computed(() => `${queryType.value}|${normalizedTitle.value}`)
const loadFailed = computed(() => !loading.value && !records.value.length && !success.value && Boolean(message.value))

const groupedRecords = computed(() => groupRecords(records.value))
const hasMoreRecords = computed(() => page.value < totalPages.value)
const summaryCaption = computed(() => {
  return '按时间倒序查看每一笔资金变动'
})

function toNumber(value) {
  const raw = String(value ?? '').replace(/[^\d.-]/g, '').trim()
  const num = Number(raw)
  return Number.isFinite(num) ? num : 0
}

function fallbackDirectionByType(type) {
  if (['4', '8'].includes(String(type || ''))) return 'out'
  if (String(type || '') === '1') return 'neutral'
  return 'in'
}

function normalizeDirection(value, fallback = 'neutral') {
  if (value === 'in' || value === 'out') return value
  return fallback
}

function resolveRecordDirection(item = {}) {
  return normalizeDirection(item.direction, fallbackDirectionByType(queryType.value))
}

function compareRecordIds(a, b) {
  const left = String(a ?? '').trim()
  const right = String(b ?? '').trim()
  const leftNum = Number(left)
  const rightNum = Number(right)
  const leftNumeric = left !== '' && Number.isFinite(leftNum)
  const rightNumeric = right !== '' && Number.isFinite(rightNum)

  if (leftNumeric && rightNumeric) return rightNum - leftNum
  if (leftNumeric) return -1
  if (rightNumeric) return 1
  return right.localeCompare(left)
}

function compareRecords(a = {}, b = {}) {
  const timeDiff = parseTimestamp(b.date) - parseTimestamp(a.date)
  if (timeDiff !== 0) return timeDiff
  return compareRecordIds(a.id, b.id)
}

function buildRecordMergeKey(item = {}, index = 0) {
  const id = item.id
  if (id !== undefined && id !== null && String(id).trim() !== '') {
    return `id:${String(id).trim()}`
  }

  const requestNo = String(item.request_no || item.raw?.request_no || '').trim()
  if (requestNo) return `request:${requestNo}`

  const bizId = String(item.biz_id ?? item.raw?.biz_id ?? '').trim()
  const changeType = String(item.change_type || item.raw?.change_type || '').trim()
  const direction = String(item.direction || '').trim()
  const amount = String(item.amount || item.raw?.amount || '').trim()
  const createTime = String(item.date || item.raw?.create_time || item.raw?.date || '').trim()

  if (bizId && changeType && direction && amount && createTime) {
    return `biz:${bizId}|${changeType}|${direction}|${amount}|${createTime}`
  }

  const orderNumber = String(item.order_number || item.raw?.order_number || item.raw?.orderNo || item.raw?.order_no || item.raw?.biz_no || '').trim()
  if (orderNumber && changeType && direction && amount && createTime) {
    return `order:${orderNumber}|${changeType}|${direction}|${amount}|${createTime}`
  }

  return `fallback:${createTime}|${amount}|${changeType}|${direction}|${index}`
}

function normalizeRecords(payload = {}) {
  const source = Array.isArray(payload.records)
    ? payload.records
    : (Array.isArray(payload.list) ? payload.list : [])

  return source
    .map((item = {}, index) => ({
      id: item.id || item.order_number || `${item.date || item.create_time || ''}-${item.title || ''}-${index}`,
      biz_id: item.biz_id ?? item.bizId ?? item.raw?.biz_id ?? '',
      request_no: String(item.request_no || item.requestNo || ''),
      change_type: String(item.change_type || item.changeType || ''),
      order_number: String(item.order_number || item.orderNo || item.order_no || item.biz_no || ''),
      title: String(item.title || normalizedTitle.value),
      text: String(item.text || item.status_text || item.remark || item.desc || '-'),
      amount: String(item.amount ?? item.money ?? item.actual_amount ?? '0.00'),
      date: String(item.date || item.create_time || item.submit_time || item.update_time || '-'),
      direction: normalizeDirection(item.direction, fallbackDirectionByType(queryType.value)),
      raw: item
    }))
    .sort(compareRecords)
}

function mergeRecords(existing = [], incoming = []) {
  const map = new Map()
  existing.forEach((item, index) => {
    const key = buildRecordMergeKey(item, index)
    map.set(key, item)
  })
  incoming.forEach((item, index) => {
    const key = buildRecordMergeKey(item, index)
    map.set(key, { ...(map.get(key) || {}), ...item })
  })

  return Array.from(map.values()).sort(compareRecords)
}

function parseTimestamp(value) {
  const text = String(value || '').trim()
  if (!text) return 0
  const parsed = new Date(text.replace(/-/g, '/')).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function formatTimeLabel(value) {
  const timestamp = parseTimestamp(value)
  if (!timestamp) return String(value || '-')
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}

function formatGroupLabel(value) {
  const timestamp = parseTimestamp(value)
  if (!timestamp) return '未知日期'

  const today = new Date()
  const target = new Date(timestamp)
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  const diffDays = Math.round((startOfToday - startOfTarget) / 86400000)

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric'
  }).format(timestamp)
}

function buildDateKey(value) {
  const timestamp = parseTimestamp(value)
  if (!timestamp) return 'unknown'
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function groupRecords(list = []) {
  const groups = new Map()

  list.forEach((item) => {
    const key = buildDateKey(item.date)
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: formatGroupLabel(item.date),
        count: 0,
        items: []
      })
    }

    const group = groups.get(key)
    group.count += 1
    group.items.push(item)
  })

  return Array.from(groups.values()).sort((a, b) => String(b.key).localeCompare(String(a.key)))
}

function formatAmount(value) {
  return formatMoney(toNumber(value))
}

function resolveAmountTone(item = {}) {
  const direction = resolveRecordDirection(item)
  if (direction === 'in' || direction === 'out') return direction
  return 'frozen'
}

function formatSignedAmount(item = {}) {
  const amount = formatAmount(item.amount)
  const direction = resolveRecordDirection(item)
  if (direction === 'out') return `-${amount}`
  if (direction === 'in') return `+${amount}`
  return amount
}

function currentCacheKey() {
  return `${CACHE_KEY_PREFIX}${querySignature.value}`
}

function restoreCache() {
  if (typeof sessionStorage === 'undefined') return false
  try {
    const raw = JSON.parse(sessionStorage.getItem(currentCacheKey()) || 'null')
    if (!raw || raw.signature !== querySignature.value || !Array.isArray(raw.records)) return false
    records.value = raw.records
    page.value = Number(raw.page || 1) || 1
    totalPages.value = Math.max(1, Number(raw.totalPages || 1) || 1)
    lastUpdatedAt.value = Number(raw.lastUpdatedAt || 0) || 0
    loadedSignature.value = raw.signature || querySignature.value
    success.value = records.value.length > 0
    return true
  } catch {
    return false
  }
}

function persistCache() {
  if (typeof sessionStorage === 'undefined' || !querySignature.value) return
  try {
    sessionStorage.setItem(currentCacheKey(), JSON.stringify({
      signature: querySignature.value,
      records: records.value,
      page: page.value,
      totalPages: totalPages.value,
      lastUpdatedAt: lastUpdatedAt.value
    }))
  } catch {
    // ignore cache errors
  }
}

function cacheFreshEnough() {
  if (!lastUpdatedAt.value) return false
  return Date.now() - Number(lastUpdatedAt.value || 0) < ACTIVE_FRESH_AGE
}

function clearPoller() {
  if (pollTimer.value) {
    window.clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

function clearLoadMoreObserver() {
  if (!loadMoreObserver) return
  loadMoreObserver.disconnect()
  loadMoreObserver = null
}

function observeLoadMore() {
  if (!loadMoreRef.value || !hasMoreRecords.value) {
    clearLoadMoreObserver()
    return
  }
  if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') return

  clearLoadMoreObserver()
  loadMoreObserver = new window.IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
        loadRecords({ force: true, silent: true, background: true, append: true }).catch(() => null)
      }
    },
    {
      root: null,
      rootMargin: '320px 0px',
      threshold: 0.01,
    }
  )
  loadMoreObserver.observe(loadMoreRef.value)
}

function startPoller() {
  clearPoller()
  pollTimer.value = window.setInterval(() => {
    if (document.visibilityState === 'hidden') return
    loadRecords({ force: true, silent: true, background: true, merge: true }).catch(() => null)
  }, POLL_INTERVAL)
}

async function loadRecords(options = {}) {
  const { force = false, silent = false, background = false, merge = false, append = false } = options
  const type = queryType.value
  const requestId = ++latestRequestId.value

  if (!type) {
    records.value = []
    page.value = 1
    message.value = '缺少明细类型'
    success.value = false
    return
  }

  const signatureChanged = loadedSignature.value !== querySignature.value
  if (signatureChanged) {
    page.value = 1
    totalPages.value = 1
    loadedSignature.value = querySignature.value
  }

  const targetPage = append ? (page.value + 1) : 1
  if (append) {
    if (loadingMore.value || !hasMoreRecords.value) return
    loadingMore.value = true
  }

  const age = Date.now() - Number(lastUpdatedAt.value || 0)
  if (!force && !signatureChanged && records.value.length && age < ACTIVE_FRESH_AGE) {
    return
  }

  try {
    if (!silent && !records.value.length) {
      loading.value = true
    } else if (records.value.length || background) {
      refreshing.value = true
    }
    if (!silent) {
      message.value = ''
    }

    const res = await apiFinanceDetailRecords({ type, page: targetPage, pageSize })
    if (requestId !== latestRequestId.value) return

    const payload = res.data || {}
    const nextRecords = normalizeRecords(payload)
    const responsePage = Number(payload.page || targetPage || 1) || 1
    const responseTotalPages = Math.max(1, Number(payload.totalPages || 1) || 1)

    if (append) {
      records.value = mergeRecords(records.value, nextRecords)
      page.value = Math.max(page.value, responsePage)
    } else if (merge && records.value.length) {
      records.value = mergeRecords(records.value, nextRecords)
      page.value = Math.max(page.value, responsePage)
    } else {
      records.value = nextRecords
      page.value = responsePage
    }

    totalPages.value = responseTotalPages
    lastUpdatedAt.value = Date.now()
    success.value = true
    persistCache()
    observeLoadMore()
  } catch (error) {
    if (requestId !== latestRequestId.value) return

    const hasExistingRecords = records.value.length > 0
    success.value = false
    if (!hasExistingRecords) {
      records.value = []
      page.value = 1
    }
    message.value = error.message || '加载明细失败'
  } finally {
    if (requestId !== latestRequestId.value) return
    loading.value = false
    refreshing.value = false
    loadingMore.value = false
  }
}

watch(querySignature, (next, prev) => {
  if (!next || next === prev) return
  latestRequestId.value += 1
  records.value = []
  lastUpdatedAt.value = 0
  page.value = 1
  totalPages.value = 1
  message.value = ''
  success.value = false
  loadedSignature.value = next
  if (restoreCache()) {
    if (!cacheFreshEnough()) {
      loadRecords({ force: true, silent: true, background: true }).catch(() => null)
    }
    return
  }
  loadRecords({ force: true }).catch(() => null)
})

watch(page, () => {
  persistCache()
})

watch(totalPages, () => {
  persistCache()
})

watch(
  () => [records.value.length, hasMoreRecords.value, loadMoreRef.value],
  () => {
    observeLoadMore()
  }
)

onMounted(() => {
  const hasCache = restoreCache()
  startPoller()
  observeLoadMore()
  if (!hasCache) {
    loadRecords({ force: true }).catch(() => null)
    return
  }
  if (!cacheFreshEnough()) {
    loadRecords({ force: true, silent: true, background: true }).catch(() => null)
  }
})

onActivated(() => {
  if (!cacheFreshEnough()) {
    loadRecords({ force: true, silent: records.value.length > 0, background: records.value.length > 0, merge: false }).catch(() => null)
  }
  startPoller()
  observeLoadMore()
})

onDeactivated(() => {
  persistCache()
  clearPoller()
  clearLoadMoreObserver()
})

onUnmounted(() => {
  persistCache()
  clearPoller()
  clearLoadMoreObserver()
})
</script>

<style scoped>
.wallet-detail-bill-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.wallet-detail-bill-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wallet-detail-bill-copy h2 {
  margin: 0;
  font-size: 22px;
}

.wallet-detail-bill-copy p {
  margin: 0;
}

.wallet-detail-bill-kicker {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.wallet-detail-bill-refresh {
  min-width: 88px;
}

.wallet-detail-bill-card {
  padding: 0;
  overflow: hidden;
}

.wallet-detail-bill-group + .wallet-detail-bill-group {
  border-top: 1px solid var(--border);
}

.wallet-detail-bill-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 10px;
  background: color-mix(in srgb, var(--panel) 90%, transparent);
}

.wallet-detail-bill-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 18px;
}

.wallet-detail-bill-row + .wallet-detail-bill-row {
  border-top: 1px solid var(--border);
}

.wallet-detail-bill-row-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wallet-detail-bill-row-main strong {
  font-size: 15px;
  line-height: 1.35;
}

.wallet-detail-bill-row-text {
  margin: 0;
  color: var(--text-soft);
  line-height: 1.5;
  word-break: break-word;
}

.wallet-detail-bill-row-side {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  text-align: right;
}

.wallet-detail-bill-amount {
  font-size: 16px;
  font-weight: 800;
}

.wallet-detail-bill-amount.is-in {
  color: var(--success);
}

.wallet-detail-bill-amount.is-out {
  color: var(--danger);
}

.wallet-detail-bill-amount.is-frozen {
  color: var(--warning);
}

.wallet-detail-load-sentinel {
  min-height: 28px;
  display: grid;
  place-items: center;
}

@media (max-width: 640px) {
  .wallet-detail-bill-top,
  .wallet-detail-bill-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .wallet-detail-bill-row-side {
    width: 100%;
    align-items: flex-start;
    text-align: left;
  }
}
</style>

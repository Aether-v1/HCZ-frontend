<template>
  <section class="wallet-bill-page" @click="typeDropdownOpen = false">
    <div v-if="loading && !hasCachedContent" class="card empty-card app-empty compact-empty-card app-loading-card">
      <AppLoader size="md" />
    </div>

    <div v-else-if="loadFailed" class="card empty-card app-empty">
      <div class="empty-emoji">⚠️</div>
      <h3>余额明细加载失败</h3>
      <p class="muted">{{ message || '请稍后重试。' }}</p>
    </div>

    <div v-else class="stack-md">
      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />

      <div class="card wallet-bill-overview">
        <div class="wallet-bill-balance-line">
          <span>当前余额</span>
          <strong>{{ availableBalanceDisplay }}</strong>
          <em>USDT</em>
        </div>

        <div class="wallet-bill-summary-strip">
          <div class="wallet-bill-summary-item">
            <span>收入</span>
            <strong class="is-in">{{ formatSignedSummary(filteredIncomeTotal, 'in') }}</strong>
          </div>
          <div class="wallet-bill-summary-item">
            <span>支出</span>
            <strong class="is-out">{{ formatSignedSummary(filteredExpenseTotal, 'out') }}</strong>
          </div>
          <div class="wallet-bill-summary-item">
            <span>记录</span>
            <strong>{{ filteredRecords.length }}</strong>
          </div>
        </div>

        <div class="wallet-bill-filter-panel">
          <div class="wallet-bill-type-select-wrap" @click.stop>
            <button
              class="wallet-bill-type-select"
              type="button"
              :aria-expanded="typeDropdownOpen"
              @click="typeDropdownOpen = !typeDropdownOpen"
            >
              <span>账单类型</span>
              <strong>{{ selectedTypeLabel }}</strong>
              <i aria-hidden="true"></i>
            </button>
            <div v-if="typeDropdownOpen" class="wallet-bill-type-menu">
              <button
                v-for="option in typeOptions"
                :key="option.value"
                class="wallet-bill-type-option"
                :class="{ active: typeFilter === option.value }"
                type="button"
                @click="selectTypeFilter(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="chips wrap wallet-bill-filter-row">
            <button
              v-for="option in directionOptions"
              :key="option.value"
              class="chip button-chip wallet-bill-filter-chip"
              :class="{ active: directionFilter === option.value }"
              type="button"
              @click="directionFilter = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="groupedRecords.length" class="card wallet-bill-sheet">
        <section v-for="group in groupedRecords" :key="group.key" class="wallet-bill-group">
          <div class="wallet-bill-group-head">
            <div class="wallet-bill-group-label">
              <strong>{{ group.label }}</strong>
              <p class="muted">{{ group.weekday }}</p>
            </div>
            <div class="wallet-bill-group-side">
              <span>收 +{{ formatAmount(group.income) }}</span>
              <span>支 -{{ formatAmount(group.expense) }}</span>
            </div>
          </div>

          <article v-for="item in group.items" :key="item.id" class="wallet-bill-row">
            <div class="wallet-bill-row-icon" :class="`is-${item.tone}`">
              {{ item.shortLabel }}
            </div>
            <div class="wallet-bill-row-main">
              <div class="wallet-bill-row-top">
                <strong>{{ item.title }}</strong>
                <span class="wallet-bill-row-amount" :class="`is-${item.direction}`">
                  {{ formatSignedSummary(item.signedAmountValue, item.direction) }}
                </span>
              </div>
              <div class="wallet-bill-row-meta">
                <span>{{ item.metaText }}</span>
                <span>{{ item.timeLabel }}</span>
              </div>
              <p v-if="item.orderNumber" class="wallet-bill-row-order muted">订单号 {{ item.orderNumber }}</p>
              <p v-if="item.detailText && item.detailText !== item.metaText" class="wallet-bill-row-desc muted">
                {{ item.detailText }}
              </p>
            </div>
          </article>
        </section>
      </div>

      <div v-if="groupedRecords.length && (hasMoreRecords || loadingMore)" ref="loadMoreTrigger" class="wallet-bill-load-more">
        <AppLoader v-if="loadingMore" size="sm" />
        <p class="muted">{{ loadingMore ? '加载中...' : '上滑加载更多' }}</p>
      </div>

      <div v-if="!groupedRecords.length && !loading" class="card empty-card app-empty">
        <div class="empty-emoji">🧾</div>
        <p class="muted">当前筛选条件下暂无账单流水</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onActivated, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import FeedbackToast from '../components/FeedbackToast.vue'
import AppLoader from '../components/AppLoader.vue'
import { apiFinanceDetailRecords, apiFinanceDetailSummary } from '../api/finance'
import { useUserStore } from '../stores/user'
import { formatMoney } from '../utils/format'

defineOptions({ name: 'WalletDetailsView' })

const DETAIL_CACHE_KEY = 'wallet-bill-page:v3'
const ACTIVE_FRESH_AGE = 60 * 1000
const DETAIL_PAGE_SIZE = 20

const detailEntries = [
  { title: '余额充值', desc: '充值到账记录', type: 5, amountKey: 'recharge_amount', direction: 'in', tone: 'recharge', shortLabel: '充' },
  { title: '余额提现', desc: '提现申请与结果', type: 4, amountKey: 'withdrawal_amount', direction: 'out', tone: 'withdraw', shortLabel: '提' },
  { title: '代理收益', desc: '代理钱包转入余额', type: 6, amountKey: 'agent_income_amount', direction: 'in', tone: 'rebate', shortLabel: '代' },
  { title: '交易买入', desc: 'USDT 买入流水', type: 7, amountKey: 'transaction_order_u_amount', direction: 'in', tone: 'trade-buy', shortLabel: '买' },
  { title: '交易卖出', desc: 'USDT 卖出流水', type: 8, amountKey: 'transaction_order_t_amount', direction: 'out', tone: 'trade-sell', shortLabel: '卖' },
  { title: '分站收益', desc: '分站划转到账记录', type: 3, amountKey: 'query_business', direction: 'in', tone: 'substation', shortLabel: '站' },
  { title: '订单退款', desc: '退款返还记录', type: 2, amountKey: 'refund_amount', direction: 'in', tone: 'refund', shortLabel: '退' },
  { title: '冻结', desc: '冻结资金变动', type: 1, amountKey: 'frozen_amount', direction: 'neutral', tone: 'frozen', shortLabel: '冻' }
]

const typeOptions = [
  { label: '全部', value: 'all' },
  ...detailEntries.map((entry) => ({ label: entry.title, value: String(entry.type) }))
]

const directionOptions = [
  { label: '全部', value: 'all' },
  { label: '收入', value: 'in' },
  { label: '支出', value: 'out' }
]

const route = useRoute()
const userStore = useUserStore()
const message = ref('')
const success = ref(false)
const loading = ref(false)
const loadFailed = ref(false)
const lastUpdatedAt = ref(0)
const typeFilter = ref('all')
const directionFilter = ref('all')
const typeDropdownOpen = ref(false)
const allRecords = ref([])
const loadingMore = ref(false)
const loadMoreTrigger = ref(null)
const summary = reactive({
  recharge_amount: 0,
  withdrawal_amount: 0,
  agent_income_amount: 0,
  transaction_order_u_amount: 0,
  transaction_order_t_amount: 0,
  query_business: 0,
  refund_amount: 0,
  frozen_amount: 0
})
const pagination = reactive(Object.fromEntries(detailEntries.map((entry) => [String(entry.type), {
  page: 0,
  totalPages: 1,
  total: 0
}])))
const selectedTypeLabel = computed(() => typeOptions.find((option) => option.value === typeFilter.value)?.label || '全部')

let loadMoreObserver = null

const hasCachedContent = computed(() => allRecords.value.length > 0 || lastUpdatedAt.value > 0)
const availableBalanceDisplay = computed(() => (userStore.availableBalance === '--' ? '0.00' : userStore.availableBalance))
const activeTypeValues = computed(() => (typeFilter.value === 'all'
  ? detailEntries.map((entry) => String(entry.type))
  : [String(typeFilter.value)]))
const hasMoreRecords = computed(() => activeTypeValues.value.some((type) => {
  const state = pagination[type]
  return state && Number(state.page || 0) < Number(state.totalPages || 1)
}))

const filteredRecords = computed(() => allRecords.value.filter((item) => {
  const matchType = typeFilter.value === 'all' || String(item.type) === String(typeFilter.value)
  const matchDirection = directionFilter.value === 'all' || item.direction === directionFilter.value
  return matchType && matchDirection
}))

const filteredIncomeTotal = computed(() => filteredRecords.value
  .filter((item) => item.direction === 'in')
  .reduce((sum, item) => sum + Math.abs(Number(item.signedAmountValue || 0)), 0))

const filteredExpenseTotal = computed(() => filteredRecords.value
  .filter((item) => item.direction === 'out')
  .reduce((sum, item) => sum + Math.abs(Number(item.signedAmountValue || 0)), 0))

const groupedRecords = computed(() => {
  const groups = new Map()

  filteredRecords.value.forEach((item) => {
    const key = item.dateKey || 'unknown'
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: formatGroupDateLabel(item.timestamp, item.dateKey),
        weekday: formatGroupWeekday(item.timestamp),
        income: 0,
        expense: 0,
        items: []
      })
    }

    const group = groups.get(key)
    if (item.direction === 'in') group.income += Math.abs(Number(item.signedAmountValue || 0))
    if (item.direction === 'out') group.expense += Math.abs(Number(item.signedAmountValue || 0))
    group.items.push(item)
  })

  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === 'unknown') return 1
    if (b.key === 'unknown') return -1
    return String(b.key).localeCompare(String(a.key))
  })
})

function normalizeTypeFilter(value) {
  const normalized = String(value ?? 'all')
  return typeOptions.some((option) => option.value === normalized) ? normalized : 'all'
}

function normalizeDirectionFilter(value) {
  const normalized = String(value ?? 'all')
  return directionOptions.some((option) => option.value === normalized) ? normalized : 'all'
}

function selectTypeFilter(value) {
  typeFilter.value = normalizeTypeFilter(value)
  typeDropdownOpen.value = false
}

function resetPagination() {
  detailEntries.forEach((entry) => {
    const state = pagination[String(entry.type)]
    state.page = 0
    state.totalPages = 1
    state.total = 0
  })
}

function restorePagination(payload = {}) {
  resetPagination()
  if (!payload || typeof payload !== 'object') return
  detailEntries.forEach((entry) => {
    const state = payload[String(entry.type)]
    if (!state || typeof state !== 'object') return
    pagination[String(entry.type)].page = Math.max(0, Number(state.page || 0) || 0)
    pagination[String(entry.type)].totalPages = Math.max(1, Number(state.totalPages || 1) || 1)
    pagination[String(entry.type)].total = Math.max(0, Number(state.total || 0) || 0)
  })
}

function serializePagination() {
  return Object.fromEntries(detailEntries.map((entry) => {
    const state = pagination[String(entry.type)]
    return [String(entry.type), {
      page: Number(state.page || 0),
      totalPages: Number(state.totalPages || 1),
      total: Number(state.total || 0)
    }]
  }))
}

function toNumber(value) {
  const raw = String(value ?? '').replace(/[^\d.-]/g, '').trim()
  const num = Number(raw)
  return Number.isFinite(num) ? num : 0
}

function applySummary(payload = {}) {
  detailEntries.forEach((entry) => {
    summary[entry.amountKey] = String(payload?.[entry.amountKey] ?? '0.00')
  })
}

function formatAmount(value) {
  const formatted = formatMoney(value)
  return formatted === '--' ? '0.00' : formatted
}

function formatSignedSummary(value, direction = 'neutral') {
  const amount = formatAmount(Math.abs(Number(value || 0)))
  if (direction === 'in') return `+${amount}`
  if (direction === 'out') return `-${amount}`
  return amount
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

function formatGroupDateLabel(timestamp, fallbackKey = '') {
  if (!timestamp) return fallbackKey || '未知日期'

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

function formatGroupWeekday(timestamp) {
  if (!timestamp) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
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

function resolveSignedAmountValue(amountValue, direction) {
  const amount = Math.abs(Number(amountValue || 0))
  if (direction === 'out') return -amount
  if (direction === 'in') return amount
  return amount
}

function normalizeDirection(value, fallback = 'neutral') {
  if (value === 'in' || value === 'out') return value
  return fallback
}

function buildRecordMergeKey(item = {}, index = 0) {
  const id = item.id
  if (id !== undefined && id !== null && String(id).trim() !== '') {
    return `id:${String(id).trim()}`
  }

  const requestNo = String(item.request_no || item.raw?.request_no || '').trim()
  if (requestNo) return `request:${requestNo}`

  const bizId = String(item.biz_id ?? item.raw?.biz_id ?? '').trim()
  const changeType = String(item.raw?.change_type || item.change_type || '').trim()
  const direction = String(item.direction || '').trim()
  const amount = String(item.amountValue ?? item.raw?.amount ?? '').trim()
  const createTime = String(item.date || item.raw?.create_time || item.raw?.date || '').trim()

  if (bizId && changeType && direction && amount && createTime) {
    return `biz:${bizId}|${changeType}|${direction}|${amount}|${createTime}`
  }

  const orderNumber = String(item.orderNumber || item.raw?.order_number || item.raw?.orderNo || item.raw?.order_no || item.raw?.biz_no || '').trim()
  if (orderNumber && changeType && direction && amount && createTime) {
    return `order:${orderNumber}|${changeType}|${direction}|${amount}|${createTime}`
  }

  return `fallback:${item.type || ''}|${createTime}|${amount}|${changeType}|${direction}|${index}`
}

function normalizeRecord(item = {}, entry, index) {
  const rawAmount = item.amount ?? item.money ?? item.actual_amount ?? item.change_amount ?? item.freeze_amount ?? '0.00'
  const parsedAmount = Math.abs(toNumber(rawAmount))
  const statusText = String(item.status_text || item.order_status_text || '').trim()
  const detailText = String(item.text || item.remark || item.desc || entry.desc || '').trim()
  const dateText = String(item.date || item.create_time || item.submit_time || item.update_time || '-')
  const direction = normalizeDirection(item.direction, entry.direction)

  return {
    id: item.id || item.order_number || `${entry.type}-${dateText}-${index}`,
    biz_id: item.biz_id ?? item.bizId ?? item.raw?.biz_id ?? '',
    request_no: String(item.request_no || item.requestNo || ''),
    change_type: String(item.change_type || item.changeType || ''),
    type: entry.type,
    title: String(item.title || entry.title),
    orderNumber: String(item.order_number || item.orderNo || item.order_no || item.biz_no || ''),
    detailText: detailText || statusText || entry.desc,
    metaText: statusText || detailText || entry.desc,
    tone: entry.tone,
    shortLabel: entry.shortLabel,
    direction,
    date: dateText,
    dateKey: buildDateKey(dateText),
    timestamp: parseTimestamp(dateText),
    timeLabel: formatTimeLabel(dateText),
    amountValue: parsedAmount,
    signedAmountValue: resolveSignedAmountValue(parsedAmount, direction),
    raw: item
  }
}

function sortRecords(records = []) {
  return [...records].sort((a, b) => {
    const timeDiff = Number(b.timestamp || 0) - Number(a.timestamp || 0)
    if (timeDiff !== 0) return timeDiff
    return String(b.id || '').localeCompare(String(a.id || ''))
  })
}

function mergeRecords(existing = [], incoming = []) {
  const merged = new Map()

  existing.forEach((item, index) => {
    const key = buildRecordMergeKey(item, index)
    merged.set(key, item)
  })

  incoming.forEach((item, index) => {
    const key = buildRecordMergeKey(item, index)
    merged.set(key, item)
  })

  return sortRecords(Array.from(merged.values()))
}

function replaceTypeRecords(type, nextItems = []) {
  const targetType = String(type)
  const remained = allRecords.value.filter((item) => String(item.type) !== targetType)
  allRecords.value = sortRecords([...remained, ...nextItems])
}

function entryByType(type) {
  return detailEntries.find((entry) => String(entry.type) === String(type)) || null
}

function readCache() {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const cached = JSON.parse(sessionStorage.getItem(DETAIL_CACHE_KEY) || 'null')
    return cached && typeof cached === 'object' ? cached : null
  } catch {
    return null
  }
}

function writeCache() {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(DETAIL_CACHE_KEY, JSON.stringify({
      summary: { ...summary },
      records: allRecords.value,
      pagination: serializePagination(),
      lastUpdatedAt: lastUpdatedAt.value
    }))
  } catch {
    // ignore cache errors
  }
}

function restoreCache() {
  const cached = readCache()
  if (!cached) return false
  if (cached.summary && typeof cached.summary === 'object') {
    applySummary(cached.summary)
  }
  restorePagination(cached.pagination)
  allRecords.value = Array.isArray(cached.records) ? cached.records : []
  lastUpdatedAt.value = Number(cached.lastUpdatedAt || 0) || 0
  return allRecords.value.length > 0 || lastUpdatedAt.value > 0
}

function cacheFreshEnough() {
  return lastUpdatedAt.value > 0 && Date.now() - Number(lastUpdatedAt.value || 0) < ACTIVE_FRESH_AGE
}

function clearLoadMoreObserver() {
  if (loadMoreObserver) {
    loadMoreObserver.disconnect()
    loadMoreObserver = null
  }
}

function setupLoadMoreObserver() {
  clearLoadMoreObserver()
  if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') return
  if (!loadMoreTrigger.value || (!hasMoreRecords.value && !loadingMore.value)) return

  loadMoreObserver = new window.IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      void loadMoreRecords()
    }
  }, {
    rootMargin: '160px 0px'
  })

  loadMoreObserver.observe(loadMoreTrigger.value)
}

async function fetchDetailPage(type, page, pageSize = DETAIL_PAGE_SIZE) {
  const res = await apiFinanceDetailRecords({ type, page, pageSize })
  return res?.data || {}
}

async function loadActiveTypePages(options = {}) {
  const { reset = false } = options
  const tasks = activeTypeValues.value
    .map((type) => {
      const state = pagination[type]
      const nextPage = reset ? 1 : Number(state.page || 0) + 1
      if (!reset && nextPage > Number(state.totalPages || 1)) return null
      return { type, page: nextPage, task: fetchDetailPage(type, nextPage) }
    })
    .filter(Boolean)

  if (!tasks.length) return 0

  const results = await Promise.allSettled(tasks.map((item) => item.task))
  let loadedCount = 0

  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') return

    const { type, page } = tasks[index]
    const entry = entryByType(type)
    if (!entry) return

    const payload = result.value || {}
    const source = Array.isArray(payload.records)
      ? payload.records
      : (Array.isArray(payload.list) ? payload.list : [])
    const normalized = source.map((item, itemIndex) => normalizeRecord(item, entry, itemIndex))

    pagination[type].page = page
    pagination[type].totalPages = Math.max(1, Number(payload.totalPages || payload.total_pages || 1) || 1)
    pagination[type].total = Math.max(0, Number(payload.total || 0) || 0)

    if (reset) {
      replaceTypeRecords(type, normalized)
    } else {
      allRecords.value = mergeRecords(allRecords.value, normalized)
    }

    loadedCount += normalized.length
  })

  return loadedCount
}

async function loadBillPage(options = {}) {
  const { force = false, silent = false } = options
  if (!force && cacheFreshEnough()) return

  loadFailed.value = false
  if (!silent && !hasCachedContent.value) loading.value = true
  loadingMore.value = false
  message.value = ''

  try {
    if (force) {
      allRecords.value = []
      resetPagination()
    }

    const [summaryResult, loadedResult] = await Promise.allSettled([
      apiFinanceDetailSummary(),
      loadActiveTypePages({ reset: true })
    ])

    if (summaryResult.status === 'fulfilled') {
      applySummary(summaryResult.value?.data || {})
    }

    const loadedCount = loadedResult.status === 'fulfilled' ? loadedResult.value : 0

    if (!loadedCount && !hasCachedContent.value) {
      throw new Error('余额明细加载失败')
    }

    lastUpdatedAt.value = Date.now()
    success.value = true
    writeCache()
  } catch (error) {
    success.value = false
    loadFailed.value = !hasCachedContent.value
    message.value = error.message || '余额明细加载失败'
  } finally {
    loading.value = false
  }
}

async function loadMoreRecords() {
  if (loading.value || loadingMore.value || !hasMoreRecords.value) return

  loadingMore.value = true
  try {
    const loadedCount = await loadActiveTypePages({ reset: false })
    if (loadedCount > 0) {
      lastUpdatedAt.value = Date.now()
      writeCache()
    }
  } finally {
    loadingMore.value = false
  }
}

watch(() => route.query.type, (value) => {
  typeFilter.value = normalizeTypeFilter(value)
  if (String(value ?? '') === '1') {
    directionFilter.value = 'all'
  }
}, { immediate: true })

watch(() => route.query.direction, (value) => {
  directionFilter.value = normalizeDirectionFilter(value)
}, { immediate: true })

watch(typeFilter, async () => {
  if (cacheFreshEnough() && activeTypeValues.value.every((type) => Number(pagination[type]?.page || 0) > 0)) {
    await nextTick()
    setupLoadMoreObserver()
    return
  }

  await loadBillPage({ force: true, silent: hasCachedContent.value })
  await nextTick()
  setupLoadMoreObserver()
})

watch(loadMoreTrigger, async () => {
  await nextTick()
  setupLoadMoreObserver()
})

watch(hasMoreRecords, async () => {
  await nextTick()
  setupLoadMoreObserver()
})

onMounted(() => {
  const restored = restoreCache()
  void loadBillPage({ force: !restored, silent: restored })
  void nextTick().then(setupLoadMoreObserver)
})

onActivated(() => {
  void loadBillPage({ force: false, silent: hasCachedContent.value })
  void nextTick().then(setupLoadMoreObserver)
})

onUnmounted(() => {
  clearLoadMoreObserver()
})
</script>

<style scoped>
.wallet-bill-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.wallet-bill-load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 4px 0 10px;
}

.wallet-bill-load-more p {
  margin: 0;
}

.wallet-bill-overview {
  padding: 16px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--panel) 96%, transparent);
  box-shadow: none;
}

.wallet-bill-balance-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.wallet-bill-balance-line span,
.wallet-bill-balance-line em {
  font-size: 13px;
  color: var(--text-dim);
  font-style: normal;
}

.wallet-bill-balance-line strong {
  font-size: 34px;
  line-height: 1;
  letter-spacing: -0.03em;
}

.wallet-bill-summary-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 16px;
  padding: 14px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.wallet-bill-summary-item {
  min-width: 0;
  padding: 0 12px;
}

.wallet-bill-summary-item + .wallet-bill-summary-item {
  border-left: 1px solid rgba(255, 255, 255, 0.07);
}

.wallet-bill-summary-item span,
.wallet-bill-summary-item strong {
  display: block;
}

.wallet-bill-summary-item span {
  font-size: 12px;
  color: var(--text-dim);
}

.wallet-bill-summary-item strong {
  margin-top: 6px;
  font-size: 18px;
  line-height: 1.2;
}

.wallet-bill-summary-item .is-in {
  color: #34d399;
}

.wallet-bill-summary-item .is-out {
  color: #fb7185;
}

.wallet-bill-filter-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 22px;
  background:
    radial-gradient(circle at 10% 0%, rgba(14, 165, 233, 0.16), transparent 34%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.38));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.wallet-bill-type-select-wrap {
  position: relative;
  min-width: 154px;
  z-index: 5;
}

.wallet-bill-type-select {
  min-height: 42px;
  width: 100%;
  padding: 7px 42px 7px 14px;
  border-radius: 16px;
  border: 1px solid rgba(34, 211, 238, 0.22);
  background:
    linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(34, 197, 94, 0.1)),
    rgba(255, 255, 255, 0.06);
  color: var(--text);
  text-align: left;
  outline: none;
  box-shadow: 0 10px 24px rgba(14, 165, 233, 0.12);
  cursor: pointer;
}

.wallet-bill-type-select span {
  display: block;
  font-size: 10px;
  line-height: 1.1;
  color: color-mix(in srgb, var(--text-dim) 84%, white);
}

.wallet-bill-type-select strong {
  display: block;
  margin-top: 2px;
  font-size: 14px;
  line-height: 1.2;
  font-weight: 800;
}

.wallet-bill-type-select i {
  position: absolute;
  right: 15px;
  top: 50%;
  width: 8px;
  height: 8px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: translateY(-65%) rotate(45deg);
  opacity: 0.65;
  transition: transform 0.2s ease;
}

.wallet-bill-type-select[aria-expanded="true"] i {
  transform: translateY(-35%) rotate(225deg);
}

.wallet-bill-type-menu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 8px);
  padding: 8px;
  border: 1px solid rgba(34, 211, 238, 0.18);
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.96);
  box-shadow: 0 20px 46px rgba(2, 6, 23, 0.36);
  backdrop-filter: blur(16px);
}

.wallet-bill-type-option {
  width: 100%;
  min-height: 34px;
  padding: 8px 10px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--text);
  text-align: left;
  font-weight: 700;
  cursor: pointer;
}

.wallet-bill-type-option + .wallet-bill-type-option {
  margin-top: 3px;
}

.wallet-bill-type-option.active {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.28), rgba(34, 197, 94, 0.18));
  color: #f8fafc;
}

.wallet-bill-type-option:not(.active):hover {
  background: rgba(148, 163, 184, 0.12);
}

.wallet-bill-filter-row {
  gap: 8px;
}

.wallet-bill-filter-chip {
  min-height: 42px;
  padding: 9px 16px;
  border-radius: 16px;
  border-color: rgba(148, 163, 184, 0.14);
  background: rgba(255, 255, 255, 0.055);
  color: color-mix(in srgb, var(--text) 86%, var(--text-dim));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07);
}

.wallet-bill-filter-chip.active {
  border-color: transparent;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.92), rgba(34, 197, 94, 0.78));
  color: white;
  box-shadow: 0 12px 24px rgba(14, 165, 233, 0.2);
}

.wallet-bill-sheet {
  padding: 0 16px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--panel) 98%, transparent);
  box-shadow: none;
}

.wallet-bill-group + .wallet-bill-group {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.wallet-bill-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 0 10px;
}

.wallet-bill-group-label strong,
.wallet-bill-group-label p {
  margin: 0;
}

.wallet-bill-group-label strong {
  font-size: 14px;
}

.wallet-bill-group-label p {
  margin-top: 4px;
  font-size: 12px;
}

.wallet-bill-group-side {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  font-size: 12px;
  color: var(--text-dim);
}

.wallet-bill-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 12px;
  padding: 14px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.wallet-bill-row:first-of-type {
  border-top: 0;
}

.wallet-bill-row-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.wallet-bill-row-icon.is-recharge {
  color: #34d399;
  background: rgba(52, 211, 153, 0.14);
}

.wallet-bill-row-icon.is-withdraw {
  color: #fb7185;
  background: rgba(251, 113, 133, 0.14);
}

.wallet-bill-row-icon.is-rebate {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.14);
}

.wallet-bill-row-icon.is-trade-buy {
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.14);
}

.wallet-bill-row-icon.is-trade-sell {
  color: #818cf8;
  background: rgba(129, 140, 248, 0.14);
}

.wallet-bill-row-icon.is-substation {
  color: #2dd4bf;
  background: rgba(45, 212, 191, 0.14);
}

.wallet-bill-row-icon.is-refund {
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.14);
}

.wallet-bill-row-icon.is-frozen {
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.16);
}

.wallet-bill-row-main {
  min-width: 0;
}

.wallet-bill-row-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.wallet-bill-row-top strong {
  min-width: 0;
  font-size: 15px;
  line-height: 1.35;
  font-weight: 600;
}

.wallet-bill-row-amount {
  flex-shrink: 0;
  font-size: 16px;
  line-height: 1.2;
  font-weight: 700;
}

.wallet-bill-row-amount.is-in {
  color: #34d399;
}

.wallet-bill-row-amount.is-out {
  color: #fb7185;
}

.wallet-bill-row-amount.is-neutral {
  color: var(--text);
}

.wallet-bill-row-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-dim);
}

.wallet-bill-row-order,
.wallet-bill-row-desc {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
}

[data-theme="light"] .wallet-bill-overview,
[data-theme="light"] .wallet-bill-sheet {
  background: rgba(255, 255, 255, 0.92);
}

[data-theme="light"] .wallet-bill-summary-strip,
[data-theme="light"] .wallet-bill-summary-item + .wallet-bill-summary-item,
[data-theme="light"] .wallet-bill-group + .wallet-bill-group,
[data-theme="light"] .wallet-bill-row {
  border-color: rgba(86, 110, 166, 0.1);
}

[data-theme="light"] .wallet-bill-filter-panel {
  border-color: rgba(86, 110, 166, 0.12);
  background:
    radial-gradient(circle at 10% 0%, rgba(14, 165, 233, 0.14), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(240, 249, 255, 0.72));
}

[data-theme="light"] .wallet-bill-filter-chip {
  border-color: rgba(86, 110, 166, 0.12);
  background: rgba(255, 255, 255, 0.72);
}

[data-theme="light"] .wallet-bill-type-select {
  border-color: rgba(14, 165, 233, 0.18);
  background:
    linear-gradient(135deg, rgba(14, 165, 233, 0.13), rgba(34, 197, 94, 0.08)),
    rgba(255, 255, 255, 0.82);
}

[data-theme="light"] .wallet-bill-type-menu {
  border-color: rgba(14, 165, 233, 0.16);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 20px 46px rgba(86, 110, 166, 0.18);
}

[data-theme="light"] .wallet-bill-filter-chip.active {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.92), rgba(34, 197, 94, 0.76));
}

@media (max-width: 640px) {
  .wallet-bill-group-head,
  .wallet-bill-row-top,
  .wallet-bill-row-meta {
    flex-direction: column;
    align-items: stretch;
  }

  .wallet-bill-balance-line {
    flex-wrap: wrap;
  }

  .wallet-bill-balance-line strong {
    font-size: 30px;
  }

  .wallet-bill-summary-item {
    padding: 0 8px;
  }

  .wallet-bill-summary-item strong {
    font-size: 16px;
  }

  .wallet-bill-filter-panel {
    align-items: stretch;
  }

  .wallet-bill-type-select-wrap {
    width: 100%;
  }
}
</style>

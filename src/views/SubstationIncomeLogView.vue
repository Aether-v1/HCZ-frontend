<template>
  <section class="stack-lg substation-income-shell">
    <div class="card stack-md">
      <div v-if="loading && !rows.length" class="app-loading-card"><AppLoader size="md" /></div>

      <div v-else-if="rows.length" class="stack-sm">
        <article v-for="item in rows" :key="item.id" class="card substation-income-card">
          <div class="substation-income-headline">
            <strong class="substation-income-order">{{ item.order_number || '--' }}</strong>
            <strong class="substation-income-amount">{{ formatUsdt(item.amount_usdt) }}</strong>
          </div>

          <div class="substation-income-inline">
            <span class="substation-income-product">{{ item.product_name || '--' }}</span>
            <strong class="substation-income-recharge">{{ formatRechargeAmount(item.recharge_amount) }}</strong>
          </div>

          <div class="substation-income-time">{{ item.create_time || '--' }}</div>
        </article>
      </div>

      <div v-else class="empty-card app-empty compact-empty-card"><p class="muted">暂无收益流水</p></div>

      <div class="inline-actions" v-if="rows.length">
        <button
          v-if="hasMore"
          class="ghost-btn"
          type="button"
          :disabled="loadingMore"
          @click="loadMore"
        >{{ loadingMore ? '加载中...' : '加载更多' }}</button>
        <span v-else class="muted tiny-text">没有更多了</span>
      </div>

      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />
    </div>
  </section>
</template>

<script setup>
defineOptions({ name: 'SubstationIncomeLogView' })
import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue'
import { apiSubstationIncomeLog } from '../api/substation'
import AppLoader from '../components/AppLoader.vue'
import FeedbackToast from '../components/FeedbackToast.vue'

const CACHE_KEY = 'substation-income-log:v2'
const ACTIVE_FRESH_AGE = 20 * 1000

const page = ref(1)
const limit = 20
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const message = ref('')
const success = ref(false)
const lastUpdatedAt = ref(0)

function formatUsdt(v) {
  return `${Number(v || 0).toFixed(2)}U`
}

function formatRechargeAmount(value) {
  const text = String(value ?? '').trim()
  return text || '--'
}

function normalizeList(list = []) {
  return list
    .filter((item) => String(item?.scene || '') !== 'substation_wallet_transfer_out')
    .map((item = {}) => ({
      ...item,
      id: item.id || `${item.order_number || ''}-${item.create_time || ''}`
    }))
}

function persistCache() {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      page: page.value,
      total: total.value,
      rows: rows.value,
      lastUpdatedAt: lastUpdatedAt.value
    }))
  } catch {}
}

function restoreCache() {
  if (typeof sessionStorage === 'undefined') return false
  try {
    const raw = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null')
    if (!raw || !Array.isArray(raw.rows)) return false
    page.value = Number(raw.page || 1) || 1
    total.value = Number(raw.total || 0) || 0
    rows.value = normalizeList(raw.rows)
    lastUpdatedAt.value = Number(raw.lastUpdatedAt || 0) || 0
    return rows.value.length > 0
  } catch {
    return false
  }
}

function mergeRows(existing = [], incoming = []) {
  const map = new Map()
  for (const item of existing) map.set(String(item.id), item)
  for (const item of incoming) map.set(String(item.id), item)
  return Array.from(map.values()).sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
}

const hasMore = computed(() => rows.value.length < total.value)

async function fetchList(append = false, force = false) {
  const age = Date.now() - Number(lastUpdatedAt.value || 0)
  if (!force && !append && rows.value.length && age < ACTIVE_FRESH_AGE) return

  const target = append ? loadingMore : loading
  target.value = true
  try {
    const res = await apiSubstationIncomeLog({ page: page.value, limit })
    const payload = res.data || {}
    const list = normalizeList(Array.isArray(payload.list) ? payload.list : [])
    total.value = Number(payload.total || 0) || 0
    rows.value = append ? mergeRows(rows.value, list) : list
    lastUpdatedAt.value = Date.now()
    success.value = true
    message.value = ''
    persistCache()
  } catch (error) {
    message.value = error?.message || '加载失败'
    success.value = false
  } finally {
    target.value = false
  }
}

function loadMore() {
  if (!hasMore.value) return
  page.value += 1
  fetchList(true, true)
}

onMounted(() => {
  restoreCache()
  fetchList(false, !rows.value.length)
})

onActivated(() => {
  restoreCache()
  fetchList(false, false)
})

onDeactivated(() => {
  persistCache()
})

onUnmounted(() => {
  persistCache()
})
</script>

<style scoped>
.substation-income-shell > .card {
  min-height: 420px;
}

.app-loading-card {
  min-height: 320px;
}

.substation-income-card {
  gap: 0.75rem;
}

.substation-income-headline,
.substation-income-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.substation-income-order,
.substation-income-product {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.substation-income-order {
  font-size: 0.95rem;
}

.substation-income-product {
  color: var(--text-primary, #111827);
  font-weight: 600;
}

.substation-income-amount,
.substation-income-recharge {
  flex-shrink: 0;
}

.substation-income-time {
  font-size: 0.78rem;
  color: var(--text-muted, #6b7280);
}
</style>

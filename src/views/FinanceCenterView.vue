<template>
  <section class="stack-lg finance-op-page">
    <div class="wallet-hero-card finance-hero-card">
      <div class="wallet-title-copy wallet-title-copy-compact wallet-balance-only">
        <strong class="wallet-balance-figure wallet-balance-figure-large">{{ displayBalance }}<span class="wallet-unit">U</span></strong>
      </div>
    </div>

    <div class="card stack-md finance-form-card finance-combined-card">
      <div class="chips wrap finance-tab-row finance-main-switch-row finance-main-switch-row-full finance-top-switch">
        <button class="seg-btn wallet-tab-btn" :class="{ active: activeTab === 'recharge' }" type="button" @pointerup.prevent="switchTab('recharge')">钱包充值</button>
        <button class="seg-btn wallet-tab-btn" :class="{ active: activeTab === 'withdraw' }" type="button" @pointerup.prevent="switchTab('withdraw')">余额提现</button>
      </div>

      <div v-show="activeTab === 'recharge'" class="finance-tab-pane">
        <div class="section-head compact-title-head finance-center-title-head"><h1>钱包充值</h1></div>

        <div class="chips wrap payment-type-chip-row payment-type-chip-row-centered">
          <button class="seg-btn points-type-btn" :class="{ active: rechargeForm.pay_type === '1' }" type="button" @click.stop="selectPayType('u')">U 充值</button>
          <button v-if="alipayEnabled" class="seg-btn points-type-btn" :class="{ active: rechargeForm.pay_type === '2' && rechargeForm.epay_type === '1' }" type="button" @click.stop="selectPayType('alipay')">支付宝</button>
          <button v-if="wechatEnabled" class="seg-btn points-type-btn" :class="{ active: rechargeForm.pay_type === '2' && rechargeForm.epay_type === '2' }" type="button" @click.stop="selectPayType('wechat')">微信支付</button>
        </div>

        <div v-if="rechargeForm.pay_type === '1'" class="wallet-bound-tip payment-bound-tip">
          <span>当前钱包地址</span>
          <strong>{{ currentWalletAddress || '未绑定钱包地址，请先去钱包地址页面设置' }}</strong>
        </div>

        <label>
          充值金额
          <input v-model="rechargeForm.amount" type="number" min="1" step="0.01" placeholder="请输入充值金额" />
        </label>

        <div class="summary-box wallet-action-summary">
          <span>充值到账</span>
          <strong>{{ rechargeSummaryText }}</strong>
        </div>

        <button class="primary-btn block" type="button" :disabled="submittingRecharge" @click="handleRecharge">
          {{ submittingRecharge ? '提交中...' : '确认充值' }}
        </button>
      </div>

      <div v-show="activeTab === 'withdraw'" class="finance-tab-pane">
        <div class="section-head compact-title-head finance-center-title-head"><h1>余额提现</h1></div>

        <div class="wallet-bound-tip payment-bound-tip">
          <span>当前钱包地址</span>
          <strong>{{ currentWalletAddress || '未绑定钱包地址，请先去钱包地址页面设置' }}</strong>
        </div>

        <div class="finance-withdraw-amount-wrap">
          <div class="finance-withdraw-amount-head">
            <span>提现金额</span>
            <label v-if="withdrawPointsVisible" class="finance-withdraw-points-toggle">
              <input
                v-model="withdrawUsePointsDeduct"
                type="checkbox"
                :disabled="!withdrawPointsEnabled || submittingWithdraw"
              />
              <span>{{ withdrawPointsHintText }}</span>
            </label>
          </div>
          <input v-model="withdrawForm.amount" type="number" min="1" step="0.01" placeholder="请输入提现金额" />
        </div>

        <div class="summary-box wallet-action-summary">
          <span>预计到账</span>
          <strong>{{ withdrawArrivalText }}</strong>
        </div>

        <button class="primary-btn block" type="button" :disabled="submittingWithdraw" @click="handleWithdrawCreate">
          {{ submittingWithdraw ? '提交中...' : '确认提现' }}
        </button>
      </div>
    </div>

    <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />

    <div class="card stack-md finance-order-card">
      <div class="section-head section-head-mobile">
        <div>
          <h2>{{ activeTab === 'recharge' ? '充值订单' : '提现订单' }}</h2>
        </div>
      </div>

      <div v-if="rows.length" class="stack-sm wallet-detail-list-wrap">
        <article
          v-for="(item, index) in rows"
          :key="`${item.tab}-${item.id || item.order_number}-${index}`"
          class="wallet-detail-record-card finance-order-record-card finance-order-clickable"
          role="button"
          tabindex="0"
          @click="handleOrderClick(item)"
          @keyup.enter="handleOrderClick(item)"
        >
          <div class="wallet-detail-record-top">
            <strong>{{ item.title }}</strong>
            <span class="wallet-detail-record-amount">{{ item.amount }}</span>
          </div>
          <div class="wallet-detail-record-meta">
            <span>{{ item.text || '订单记录' }}</span>
            <span>{{ item.unit || 'USDT' }}</span>
          </div>
          <div class="tiny-text muted">{{ item.date || '-' }}</div>
        </article>
      </div>
      <div v-else class="empty-card app-empty compact-empty-card">
        <div class="empty-emoji">🧾</div>
        <p class="muted">暂无相关订单</p>
      </div>

      <div v-if="totalPages > 1" class="pager-bar">
        <button class="ghost-btn pager-btn" type="button" :disabled="page <= 1" aria-label="上一页" @click="page = Math.max(1, page - 1)">
          <span class="pager-icon">&lt;</span>
        </button>
        <div class="pager-center">
          <div class="pager-count">
            <span class="pager-pill pager-pill--active">{{ page }}</span>
            <span class="pager-sep">/</span>
            <span class="pager-pill">{{ totalPages }}</span>
          </div>
          <div class="pager-track">
            <span class="pager-fill" :style="{ width: `${Math.max(12, (page / totalPages) * 100)}%` }"></span>
          </div>
        </div>
        <button class="ghost-btn pager-btn" type="button" :disabled="page >= totalPages" aria-label="下一页" @click="page = Math.min(totalPages, page + 1)">
          <span class="pager-icon">&gt;</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import FeedbackToast from '@/components/FeedbackToast.vue'
defineOptions({ name: 'FinanceCenterView' })
import { computed, onActivated, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiFinanceOrders, apiFinanceRecharge, apiFinanceRechargeDetail, apiFinanceSummary, apiFinanceWithdrawalPreview } from '../api/finance'
import { getSessionCache, removeSessionCache, setSessionCache } from '../utils/storage'
import { useUserStore } from '../stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const summary = ref({ balance: '0.00', frozen_amount: '0.00', trc20: '', config: {} })
const rechargeForm = reactive({ amount: '', pay_type: '1', epay_type: '1' })
const withdrawForm = reactive({ amount: '' })
const message = ref('')
const success = ref(false)
const submittingRecharge = ref(false)
const submittingWithdraw = ref(false)
const activeTab = ref(route.query.tab === 'withdraw' ? 'withdraw' : 'recharge')
const rows = ref([])
const page = ref(1)
const totalPages = ref(1)
const withdrawPreview = ref(null)
const withdrawUsePointsDeduct = ref(false)
const pageSize = 5
const pendingOrderWatcher = ref(null)
const consumedRechargeSuccessOrders = new Set()
const PENDING_WATCH_INTERVAL = 3000
const PENDING_WATCH_MAX_ATTEMPTS = 200
const WITHDRAW_PREVIEW_DEBOUNCE = 260
let withdrawPreviewTimer = null
let withdrawPreviewRequestId = 0

let pageResumeRefreshing = false

const feedbackClass = computed(() => (success.value ? 'feedback success' : 'feedback error'))
const currentWalletAddress = computed(() => summary.value?.trc20 || userStore.profile?.trc20 || '')
const displayBalance = computed(() => String(summary.value?.balance || userStore.availableBalance || '0.00'))
const pendingRechargeOrderNumber = computed(() => String(route.query.order_number || route.query.recharge_order || '').trim())
const alipayEnabled = computed(() => String(summary.value?.config?.epay_alipay_enabled ?? summary.value?.epay_alipay_enabled ?? '1') !== '0')
const wechatEnabled = computed(() => String(summary.value?.config?.epay_wechat_enabled ?? summary.value?.epay_wechat_enabled ?? '1') !== '0')
const rechargeSummaryText = computed(() => {
  const amount = Number(rechargeForm.amount || 0)
  if (!amount) return '0.00 USDT'
  return `${amount.toFixed(2)} USDT`
})
const withdrawPointsVisible = computed(() => Number(withdrawPreview.value?.points_deduct_visible || 0) === 1)
const withdrawPointsEnabled = computed(() => Number(withdrawPreview.value?.points_deduct_enabled || 0) === 1)
const withdrawPointsAvailableFee = computed(() => {
  if (!withdrawPointsVisible.value || !withdrawPointsEnabled.value) return 0
  const fee = Number(withdrawPreview.value?.points_deduct_available_fee || 0)
  return Number.isFinite(fee) ? Math.max(0, fee) : 0
})
const withdrawPointsAvailablePoints = computed(() => {
  if (!withdrawPointsVisible.value || !withdrawPointsEnabled.value) return 0
  const points = Number(withdrawPreview.value?.points_deduct_available_points || 0)
  return Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0
})
const withdrawPointsUsedFee = computed(() => {
  if (!withdrawUsePointsDeduct.value || !withdrawPointsEnabled.value) return 0
  return withdrawPointsAvailableFee.value
})
const withdrawBaseFee = computed(() => {
  const fee = Number(withdrawPreview.value?.withdrawal_fee_base ?? summary.value?.config?.withdrawal_fee ?? summary.value?.withdrawal_fee ?? 3)
  return Number.isFinite(fee) ? Math.max(0, fee) : 0
})
const withdrawPointsHintText = computed(() => {
  if (!withdrawPointsVisible.value) return ''
  return `${withdrawPointsAvailablePoints.value}积分抵扣${withdrawPointsAvailableFee.value.toFixed(2)}U`
})
const withdrawArrivalText = computed(() => {
  const amount = Number(withdrawForm.amount || 0)
  if (!amount) return '0.00 USDT'
  const finalFee = Math.max(0, withdrawBaseFee.value - withdrawPointsUsedFee.value)
  return `${Math.max(0, amount - finalFee).toFixed(2)} USDT`
})
const cacheKey = computed(() => `tp8-finance-orders-direct-${activeTab.value}-${page.value}`)
const summaryCacheKey = 'tp8-finance-summary-direct-v2'


watch(page, async () => {
  await loadOrders(false)
})

watch(() => route.query.tab, (value) => {
  const nextTab = value === 'withdraw' ? 'withdraw' : 'recharge'
  if (activeTab.value !== nextTab) {
    activeTab.value = nextTab
    page.value = 1
    loadOrders(true).catch(() => null)
  }
})

watch([alipayEnabled, wechatEnabled], () => {
  if (rechargeForm.pay_type !== '2') return
  if (rechargeForm.epay_type === '1' && alipayEnabled.value) return
  if (rechargeForm.epay_type === '2' && wechatEnabled.value) return
  selectPayType('u')
}, { immediate: true })

watch([() => withdrawForm.amount, activeTab], () => {
  scheduleWithdrawPreviewRefresh()
}, { immediate: true })

watch(withdrawPointsEnabled, (enabled) => {
  if (!enabled) withdrawUsePointsDeduct.value = false
})

function clearFinanceCaches() {
  removeSessionCache('tp8-finance-summary-direct')
  removeSessionCache(summaryCacheKey)
  removeSessionCache('tp8-finance-summary-direct-v3')
  for (let currentPage = 1; currentPage <= 20; currentPage += 1) {
    removeSessionCache(`tp8-finance-orders-direct-recharge-${currentPage}`)
    removeSessionCache(`tp8-finance-orders-direct-withdraw-${currentPage}`)
  }
}

function clearPendingOrderWatcher() {
  if (!pendingOrderWatcher.value) return
  window.clearInterval(pendingOrderWatcher.value)
  pendingOrderWatcher.value = null
}

function clearWithdrawPreviewTimer() {
  if (!withdrawPreviewTimer) return
  window.clearTimeout(withdrawPreviewTimer)
  withdrawPreviewTimer = null
}

async function refreshWithdrawPreview() {
  const amount = Number(withdrawForm.amount || 0)
  if (activeTab.value !== 'withdraw' || !amount || amount <= 0) {
    withdrawPreview.value = null
    withdrawUsePointsDeduct.value = false
    return
  }

  const requestId = ++withdrawPreviewRequestId
  try {
    const res = await apiFinanceWithdrawalPreview(amount.toFixed(2))
    if (requestId !== withdrawPreviewRequestId) return
    withdrawPreview.value = res.data || null
    if (Number(withdrawPreview.value?.points_deduct_enabled || 0) !== 1) {
      withdrawUsePointsDeduct.value = false
    }
  } catch {
    if (requestId !== withdrawPreviewRequestId) return
    withdrawPreview.value = null
    withdrawUsePointsDeduct.value = false
  }
}

function scheduleWithdrawPreviewRefresh() {
  clearWithdrawPreviewTimer()
  withdrawPreviewTimer = window.setTimeout(() => {
    refreshWithdrawPreview().catch(() => null)
  }, WITHDRAW_PREVIEW_DEBOUNCE)
}

function clearPendingRechargeOrderQuery() {
  if (!pendingRechargeOrderNumber.value) return
  const nextQuery = { ...route.query }
  delete nextQuery.order_number
  delete nextQuery.recharge_order
  if (!nextQuery.tab) {
    nextQuery.tab = activeTab.value
  }
  router.replace({ path: '/finance-center', query: nextQuery }).catch(() => null)
}

async function handlePageResumeRefresh() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  if (pageResumeRefreshing) return
  pageResumeRefreshing = true
  try {
    await syncSummary(true)
    await loadOrders(true)
    if (activeTab.value === 'recharge' && pendingRechargeOrderNumber.value) {
      await refreshPendingRechargeOrder({ silent: false })
      startPendingOrderWatcher()
    }
  } finally {
    pageResumeRefreshing = false
  }
}

function bindPageResumeEvents() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  window.addEventListener('focus', handlePageResumeRefresh)
  window.addEventListener('pageshow', handlePageResumeRefresh)
  document.addEventListener('visibilitychange', handlePageResumeRefresh)
}

function unbindPageResumeEvents() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  window.removeEventListener('focus', handlePageResumeRefresh)
  window.removeEventListener('pageshow', handlePageResumeRefresh)
  document.removeEventListener('visibilitychange', handlePageResumeRefresh)
}

function selectPayType(type) {
  if (type === 'u') {
    rechargeForm.pay_type = '1'
    rechargeForm.epay_type = '1'
    return
  }
  rechargeForm.pay_type = '2'
  rechargeForm.epay_type = type === 'wechat' ? '2' : '1'
}

function switchTab(tab) {
  if (activeTab.value === tab) return
  activeTab.value = tab
  page.value = 1
  message.value = ''
  router.replace({ path: '/finance-center', query: { tab } }).catch(() => null)
  loadOrders(true).catch(() => null)
}

function normalizeOrderRow(item = {}) {
  return {
    ...item,
    id: item.id,
    order_number: item.order_number || '',
    pay_type: String(item.pay_type ?? ''),
    epay_type: String(item.epay_type ?? ''),
    title: item.title || item.status_text || '订单记录',
    amount: item.amount || '0.00',
    text: item.text || item.status_text || '',
    unit: item.unit || 'USDT',
    date: item.date || item.create_time || '-',
  }
}

async function syncSummary(force = false) {
  const cached = !force ? getSessionCache(summaryCacheKey, 20 * 60 * 1000) : null
  if (cached) {
    summary.value = cached
    userStore.setAccountSummary({ available: cached.balance || '0.00', frozen_amount: cached.frozen_amount || '0.00' })
    userStore.setProfile({ trc20: cached.trc20 || '' })
  }
  try {
    const payload = await userStore.refreshDirectFinance(force)
    summary.value = {
      ...(summary.value || {}),
      ...(payload || {}),
      frozen_amount: payload?.frozen_amount ?? '0.00'
    }
    setSessionCache(summaryCacheKey, summary.value)
    userStore.setAccountSummary({ available: summary.value.balance || '0.00', frozen_amount: summary.value.frozen_amount || '0.00' })
    userStore.setProfile({ trc20: summary.value.trc20 || '' })
  } catch (error) {
    if (!cached) {
      success.value = false
      message.value = error.message || '加载资金信息失败'
    }
  }
}

async function loadOrders(force = false) {
  const cached = !force ? getSessionCache(cacheKey.value, 10 * 60 * 1000) : null
  if (cached) {
    rows.value = (cached.records || []).map(normalizeOrderRow)
    totalPages.value = cached.totalPages || 1
    return
  }
  try {
    const res = await apiFinanceOrders({ tab: activeTab.value, page: page.value, pageSize })
    const payload = res.data || {}
    rows.value = (payload.records || []).map(normalizeOrderRow)
    totalPages.value = Number(payload.totalPages || 1) || 1
    setSessionCache(cacheKey.value, { records: rows.value, totalPages: totalPages.value })
  } catch (error) {
    rows.value = []
    totalPages.value = 1
    success.value = false
    message.value = error.message || '加载订单失败'
  }
}

async function refreshPendingRechargeOrder(options = {}) {
  const { silent = true } = options
  const orderNumber = pendingRechargeOrderNumber.value
  if (!orderNumber) return

  try {
    const res = await apiFinanceRechargeDetail(orderNumber)
    const detail = res?.data || {}
    const status = Number(detail.status ?? -1)
    const isAutomaticOrder = String(detail.pay_type ?? '') === '2' || ['epay', 'bepusdt'].includes(String(detail.gateway ?? ''))

    await loadOrders(true)

    if (status === 3) {
      clearPendingOrderWatcher()
      clearFinanceCaches()
      await syncSummary(true)
      if (consumedRechargeSuccessOrders.has(orderNumber)) {
        clearPendingRechargeOrderQuery()
        return
      }
      if (!consumedRechargeSuccessOrders.has(orderNumber)) {
        consumedRechargeSuccessOrders.add(orderNumber)
        success.value = true
      }
      message.value = '易支付充值成功，余额已自动到账'
      clearPendingRechargeOrderQuery()
      return
    }

    if (status === 2 && isAutomaticOrder) {
      if (!silent) {
        message.value = '姝ｅ湪鍚屾鏀粯缁撴灉...'
        success.value = true
      }
      return
    }

    if (status === 2) {
      clearPendingOrderWatcher()
      if (!silent) {
        success.value = false
        message.value = '该充值订单已取消'
      }
      return
    }

    if (!silent) {
      message.value = '正在同步支付结果...'
      success.value = true
    }
  } catch (error) {
    if (!silent) {
      success.value = false
      message.value = error.message || '查询充值状态失败'
    }
  }
}

function startPendingOrderWatcher() {
  clearPendingOrderWatcher()
  if (!pendingRechargeOrderNumber.value || activeTab.value !== 'recharge') return

  let attempts = 0
  void refreshPendingRechargeOrder({ silent: false })
  pendingOrderWatcher.value = window.setInterval(() => {
    attempts += 1
    if (attempts >= PENDING_WATCH_MAX_ATTEMPTS) {
      clearPendingOrderWatcher()
      return
    }
    void refreshPendingRechargeOrder({ silent: true })
  }, PENDING_WATCH_INTERVAL)
}

async function handleRecharge() {
  if (submittingRecharge.value) return
  const amount = Number(rechargeForm.amount || 0)
  if (!amount || amount <= 0) {
    success.value = false
    message.value = '请输入有效的充值金额'
    return
  }
  try {
    submittingRecharge.value = true
    const payload = {
      amount: amount.toFixed(2),
      pay_type: rechargeForm.pay_type,
      epay_type: rechargeForm.epay_type,
    }
    const res = await apiFinanceRecharge(payload)
    success.value = true
    message.value = res.message || '充值单已创建'
    clearFinanceCaches()
    await loadOrders(true)
    await syncSummary(true)

    const data = res.data || {}
    const payUrl = data.pay_url || data.url || data.redirect_url || ''
    if (payUrl) {
      window.location.replace(payUrl)
      return
    }

    if (String(data.pay_type || rechargeForm.pay_type) === '1' && data.order_number) {
      await router.push({ name: 'finance-recharge-detail', params: { orderNumber: data.order_number } })
      return
    }

    message.value = '充值单已创建，请在充值订单中查看详情'
  } catch (error) {
    success.value = false
    message.value = error.message || '创建充值单失败'
  } finally {
    submittingRecharge.value = false
  }
}

async function handleWithdrawCreate() {
  if (submittingWithdraw.value) return
  const amount = Number(withdrawForm.amount || 0)
  if (!amount || amount <= 0) {
    success.value = false
    message.value = '请输入有效的提现金额'
    return
  }
  try {
    submittingWithdraw.value = true
    const usePointsDeduct = withdrawUsePointsDeduct.value && withdrawPointsEnabled.value ? 1 : 0
    success.value = true
    message.value = '已进入提现确认页'
    await router.push({ name: 'finance-withdrawal', query: { amount: amount.toFixed(2), use_points_deduct: String(usePointsDeduct) } })
  } catch (error) {
    success.value = false
    message.value = error.message || '创建提现确认失败'
  } finally {
    submittingWithdraw.value = false
  }
}

function handleOrderClick(item) {
  if (activeTab.value === 'recharge') {
    if (item.order_number) {
      router.push({ name: 'finance-recharge-detail', params: { orderNumber: item.order_number } })
      return
    }
    return
  }

  if (item.id) {
    router.push({ name: 'finance-withdrawal', query: { id: item.id } })
  }
}

onMounted(async () => {
  bindPageResumeEvents()
  activeTab.value = route.query.tab === 'withdraw' ? 'withdraw' : 'recharge'
  const forceRefresh = Boolean(pendingRechargeOrderNumber.value)
  await syncSummary(forceRefresh)
  await loadOrders(forceRefresh)
  startPendingOrderWatcher()
})

onActivated(async () => {
  const forceRefresh = true
  await syncSummary(forceRefresh)
  await loadOrders(forceRefresh)
  startPendingOrderWatcher()
})

watch(() => route.query.order_number, () => {
  startPendingOrderWatcher()
})

watch(activeTab, (tab) => {
  if (tab !== 'recharge') {
    clearPendingOrderWatcher()
    return
  }
  startPendingOrderWatcher()
})

onBeforeUnmount(() => {
  unbindPageResumeEvents()
  clearPendingOrderWatcher()
  clearWithdrawPreviewTimer()
})
</script>

<style scoped>
.finance-tab-pane {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 292px;
  animation: financeTabPaneFade 0.16s ease;
}

@keyframes financeTabPaneFade {
  from {
    opacity: 0.72;
  }
  to {
    opacity: 1;
  }
}

.finance-withdraw-amount-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.finance-withdraw-amount-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.finance-withdraw-points-toggle {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  user-select: none;
  white-space: nowrap;
}

.finance-withdraw-points-toggle input[type='checkbox'] {
  appearance: none;
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  margin: 0;
  border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--text-muted) 65%, transparent);
  background: transparent;
  cursor: pointer;
  transition: border-color .16s ease, background .16s ease, opacity .16s ease;
}

.finance-withdraw-points-toggle input[type='checkbox']:checked {
  border-color: #3b82f6;
  background: radial-gradient(circle at center, #3b82f6 0 42%, transparent 46%);
}

.finance-withdraw-points-toggle input[type='checkbox']:disabled {
  opacity: .52;
  cursor: not-allowed;
}

</style>

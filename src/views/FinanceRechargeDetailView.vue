<template>
  <section v-if="detail" class="stack-lg finance-submit-page">
    <div class="card stack-md finance-submit-status-card">
      <div class="wallet-detail-record-top finance-submit-top">
        <div>
          <span class="tiny-text muted">订单号</span>
          <strong>{{ detail.order_number }}</strong>
        </div>
        <span class="pill-tag" :class="detail.status === 3 ? '' : 'light'">{{ detail.status_text }}</span>
      </div>
      <div class="tiny-text muted">创建于 {{ detail.create_time || '-' }}</div>
      <div v-if="detail.submit_time" class="tiny-text muted">提交于 {{ detail.submit_time }}</div>
      <div v-if="detail.paid_time" class="tiny-text muted">支付成功于 {{ detail.paid_time }}</div>
      <div v-if="detail.cancel_time" class="tiny-text muted">取消于 {{ detail.cancel_time }}</div>
      <div v-if="showAutoCancelNotice" class="tiny-text muted finance-auto-cancel-note">
        待汇款订单 {{ remainingLabel }} 后将自动取消
      </div>
      <div v-if="isAutomaticRecharge && pollingStatus" class="tiny-text muted finance-auto-cancel-note">
        正在同步易支付结果，支付成功后会自动加款，无需管理员审核。
      </div>
    </div>

    <div v-if="isManual" class="card stack-md">
      <div class="section-head compact-title-head"><h1>平台指定汇款账户</h1></div>
      <div class="finance-submit-pay-box">
        <div class="finance-submit-qr-box">
          <img :src="paymentQrUrl" alt="充值二维码" />
        </div>
        <div class="stack-sm finance-submit-address-box">
          <span class="tiny-text muted">平台充值地址</span>
          <div class="code-block">{{ detail.payment_address }}</div>
          <button class="ghost-btn" type="button" @click="copyText(detail.payment_address)">复制钱包地址</button>
        </div>
      </div>
    </div>

    <div class="card stack-md">
      <div class="section-head compact-title-head"><h2>订单信息</h2></div>
      <div class="result-panel rich-result preview-price-panel order-preview-grid always-show-pricing">
        <div class="result-item preview-stat-card">
          <span class="tiny-text muted">充值金额</span>
          <strong>{{ detail.amount }} USDT</strong>
        </div>
        <div class="result-item preview-stat-card">
          <span class="tiny-text muted">支付方式</span>
          <strong>{{ detail.pay_type_text }}</strong>
        </div>
      </div>

      <div class="wallet-bound-tip payment-bound-tip">
        <span>我的钱包地址</span>
        <strong>{{ detail.wallet_address || '未设置' }}</strong>
      </div>

      <div v-if="isAutomaticRecharge" class="result-panel rich-result preview-price-panel order-preview-grid always-show-pricing">
        <div class="result-item preview-stat-card">
          <span class="tiny-text muted">通道状态</span>
          <strong>{{ detail.gateway_status || '待支付' }}</strong>
        </div>
        <div class="result-item preview-stat-card">
          <span class="tiny-text muted">易支付流水</span>
          <strong>{{ detail.gateway_trade_id || '--' }}</strong>
        </div>
      </div>

      <button v-if="isAutomaticRecharge && detail.pay_url && detail.status === 0" class="primary-btn block" type="button" @click="replaceToPayUrl(detail.pay_url)">
        继续支付
      </button>

      <div v-if="isManual" class="stack-sm">
        <span class="tiny-text muted">汇款凭证</span>
        <label class="finance-proof-box" :class="{ 'has-image': Boolean(detail.image) }">
          <img v-if="proofImageUrl" :src="proofImageUrl" alt="汇款凭证" class="finance-proof-image" />
          <div v-else class="finance-proof-empty">
            <span class="empty-emoji">📷</span>
            <p class="muted">点击上传汇款凭证图片</p>
          </div>
          <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" class="hidden-input" @change="handleProofSelected" />
        </label>
      </div>

      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />

      <div v-if="detail.status === 0 && isManual" class="inline-actions finance-submit-actions">
        <button class="ghost-btn" type="button" :disabled="submittingAction" @click="handleCancel">取消订单</button>
        <button class="primary-btn" type="button" :disabled="submittingAction" @click="handleSubmit">
          {{ submittingAction ? '提交中...' : '已汇款，提交订单' }}
        </button>
      </div>
    </div>
  </section>

  <section v-else class="card empty-card app-empty">
    <div class="empty-emoji">📄</div>
    <h3>充值订单不存在</h3>
    <p class="muted">请确认充值订单号是否正确。</p>
    <router-link to="/finance-center?tab=recharge" class="primary-btn block">返回资金中心</router-link>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FeedbackToast from '@/components/FeedbackToast.vue'
import { apiFinanceRechargeDetail, apiFinanceRechargeSubmit, apiFinanceRechargeSubmitImage } from '../api/finance'
import { refreshAppStateAfterAction } from '../stores/badges'
import { useUserStore } from '../stores/user'
import { resolveAssetUrl } from '../utils/assets'
import { removeSessionCache } from '../utils/storage'

defineOptions({ name: 'FinanceRechargeDetailView' })

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const EPAY_POLL_INTERVAL = 3000
const EPAY_POLL_TIMEOUT = 10 * 60 * 1000

const detail = ref(null)
const message = ref('')
const success = ref(false)
const submittingAction = ref(false)
const remainingSeconds = ref(0)
const autoCancelTriggered = ref(false)
const pollingStatus = ref(false)

let cancelTimer = null
let statusPollTimer = null
let statusPollStopAt = 0
let statusPollInFlight = false
let statusPollFailureCount = 0
let pageLifecycleBound = false

const isBepusdt = computed(() => String(detail.value?.gateway || '') === 'bepusdt')
const isManual = computed(() => String(detail.value?.pay_type || '') === '1' && !isBepusdt.value)
const isEpay = computed(() => String(detail.value?.pay_type || '') === '2')
const isAutomaticRecharge = computed(() => isEpay.value || isBepusdt.value)
const paymentQrUrl = computed(() => resolveAssetUrl(detail.value?.payment_qr_url || ''))
const proofImageUrl = computed(() => resolveAssetUrl(detail.value?.proof_view_url || detail.value?.image || ''))
const showAutoCancelNotice = computed(() => isManual.value && Number(detail.value?.status || 0) === 0 && remainingSeconds.value > 0)
const remainingLabel = computed(() => {
  const total = Math.max(0, Number(remainingSeconds.value || 0))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}分${String(seconds).padStart(2, '0')}秒`
})

function clearFinanceCaches() {
  removeSessionCache('tp8-finance-summary-direct')
  removeSessionCache('tp8-finance-summary-direct-v2')
  removeSessionCache('tp8-finance-summary-direct-v3')
  for (let currentPage = 1; currentPage <= 20; currentPage += 1) {
    removeSessionCache(`tp8-finance-orders-direct-recharge-${currentPage}`)
    removeSessionCache(`tp8-finance-orders-direct-withdraw-${currentPage}`)
  }
}

function applyLocalDetailPatch(patch = {}) {
  if (!detail.value) return
  detail.value = {
    ...detail.value,
    ...patch
  }
}

async function syncRechargeRealtimeState() {
  clearFinanceCaches()
  await Promise.allSettled([
    refreshAppStateAfterAction({ refreshFinanceSummary: true }),
    userStore.refreshDirectFinance(true)
  ])
}

function parseDateTime(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const timestamp = new Date(raw.replace(/-/g, '/')).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function clearCancelTimer() {
  if (!cancelTimer) return
  window.clearInterval(cancelTimer)
  cancelTimer = null
}

function clearStatusPollTimer(resetStopAt = true) {
  pollingStatus.value = false
  statusPollInFlight = false
  statusPollFailureCount = 0
  if (resetStopAt) {
    statusPollStopAt = 0
  }
  if (!statusPollTimer) return
  window.clearInterval(statusPollTimer)
  statusPollTimer = null
}

async function handleAutoCancel() {
  if (!detail.value || submittingAction.value || autoCancelTriggered.value || Number(detail.value.status || 0) !== 0 || !isManual.value) return
  autoCancelTriggered.value = true
  try {
    await apiFinanceRechargeSubmit({ order_number: detail.value.order_number, action: 'cancel' })
    await syncRechargeRealtimeState()
    await loadDetail({ silent: true })
  } catch {
    autoCancelTriggered.value = false
  }
}

function startCancelCountdown() {
  clearCancelTimer()
  remainingSeconds.value = 0
  autoCancelTriggered.value = false
  if (!detail.value || Number(detail.value.status || 0) !== 0 || !isManual.value) return

  const createdAt = parseDateTime(detail.value.create_time)
  if (!createdAt) return

  const deadline = createdAt + 20 * 60 * 1000
  const tick = () => {
    const diff = Math.max(0, Math.floor((deadline - Date.now()) / 1000))
    remainingSeconds.value = diff
    if (diff <= 0) {
      clearCancelTimer()
      handleAutoCancel().catch(() => null)
    }
  }

  tick()
  if (remainingSeconds.value > 0) {
    cancelTimer = window.setInterval(tick, 1000)
  }
}

function handleRechargePaid(prevStatus, nextStatus) {
  if (prevStatus === nextStatus || nextStatus !== 3) return
  success.value = true
  message.value = '充值已到账，余额已自动更新'
  clearStatusPollTimer(true)
  void syncRechargeRealtimeState()
}

function replaceToPayUrl(payUrl) {
  if (!payUrl) return
  window.location.replace(payUrl)
}

function syncStatusPolling() {
  if (!detail.value || !isAutomaticRecharge.value) {
    clearStatusPollTimer(true)
    return
  }

  const status = Number(detail.value.status || 0)
  if (status === 3) {
    clearStatusPollTimer(true)
    return
  }

  if (!statusPollStopAt) {
    statusPollStopAt = Date.now() + EPAY_POLL_TIMEOUT
  }
  if (Date.now() >= statusPollStopAt) {
    clearStatusPollTimer(true)
    return
  }
  pollingStatus.value = true
  if (statusPollTimer) return
  statusPollTimer = window.setInterval(() => {
    if (statusPollInFlight) return
    if (Date.now() >= statusPollStopAt) {
      clearStatusPollTimer(true)
      return
    }
    void loadDetail({ silent: true, fromPolling: true })
  }, EPAY_POLL_INTERVAL)
}

function refreshDetailWhenPageResumed() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  if (!detail.value) return
  if (Number(detail.value.status || 0) === 3) return

  // User might return from a third-party payment page long after the initial poll window.
  // Reset the poll deadline and force a silent refresh immediately.
  statusPollStopAt = Date.now() + EPAY_POLL_TIMEOUT
  syncStatusPolling()
  void loadDetail({ silent: true, fromPolling: true })
}

function bindPageLifecycleRefresh() {
  if (pageLifecycleBound || typeof window === 'undefined' || typeof document === 'undefined') return
  window.addEventListener('focus', refreshDetailWhenPageResumed)
  window.addEventListener('pageshow', refreshDetailWhenPageResumed)
  document.addEventListener('visibilitychange', refreshDetailWhenPageResumed)
  pageLifecycleBound = true
}

function unbindPageLifecycleRefresh() {
  if (!pageLifecycleBound || typeof window === 'undefined' || typeof document === 'undefined') return
  window.removeEventListener('focus', refreshDetailWhenPageResumed)
  window.removeEventListener('pageshow', refreshDetailWhenPageResumed)
  document.removeEventListener('visibilitychange', refreshDetailWhenPageResumed)
  pageLifecycleBound = false
}

async function loadDetail(options = {}) {
  const { silent = false } = options
  try {
    statusPollInFlight = true
    const previousStatus = Number(detail.value?.status ?? -1)
    const res = await apiFinanceRechargeDetail(route.params.orderNumber)
    statusPollFailureCount = 0
    detail.value = res.data || null
    if (!silent) {
      message.value = ''
    }
    startCancelCountdown()
    syncStatusPolling()
    handleRechargePaid(previousStatus, Number(detail.value?.status ?? -1))
  } catch (error) {
    if (silent) {
      statusPollFailureCount += 1
    } else {
      clearCancelTimer()
      clearStatusPollTimer(true)
    }
    if (!silent) {
      detail.value = null
      success.value = false
      message.value = error.message || '加载充值订单失败'
    }
  } finally {
    statusPollInFlight = false
  }
}

async function handleProofSelected(event) {
  const file = event.target?.files?.[0]
  if (!file || !detail.value || !isManual.value) return

  try {
    submittingAction.value = true
    const res = await apiFinanceRechargeSubmitImage(detail.value.order_number, file)
    const proofViewUrl = String(res?.data?.proof_view_url || res?.data?.image || '')
    if (!proofViewUrl) throw new Error('上传凭证失败')
    detail.value = { ...detail.value, image: proofViewUrl, proof_view_url: proofViewUrl }
    success.value = true
    message.value = res.message || '上传成功'
  } catch (error) {
    success.value = false
    message.value = error.message || '上传凭证失败，请检查图片格式后重试'
  } finally {
    submittingAction.value = false
    if (event.target) event.target.value = ''
  }
}

async function handleSubmit() {
  if (!detail.value || submittingAction.value || !isManual.value) return

  try {
    submittingAction.value = true
    const res = await apiFinanceRechargeSubmit({ order_number: detail.value.order_number, action: 'submit' })
    applyLocalDetailPatch({
      status: 1,
      status_text: '已提交',
      submit_time: new Date().toLocaleString('sv-SE').replace('T', ' ')
    })
    remainingSeconds.value = 0
    success.value = true
    message.value = res.message || '提交成功'
    await syncRechargeRealtimeState()
    await loadDetail({ silent: true })
  } catch (error) {
    success.value = false
    message.value = error.message || '提交失败'
  } finally {
    submittingAction.value = false
  }
}

async function handleCancel() {
  if (!detail.value || submittingAction.value) return

  try {
    submittingAction.value = true
    const res = await apiFinanceRechargeSubmit({ order_number: detail.value.order_number, action: 'cancel' })
    applyLocalDetailPatch({
      status: 2,
      status_text: '已取消',
      cancel_time: new Date().toLocaleString('sv-SE').replace('T', ' ')
    })
    remainingSeconds.value = 0
    clearCancelTimer()
    clearStatusPollTimer()
    success.value = true
    message.value = res.message || '取消成功'
    await syncRechargeRealtimeState()
    await loadDetail({ silent: true })
  } catch (error) {
    success.value = false
    message.value = error.message || '取消失败'
  } finally {
    submittingAction.value = false
  }
}

async function copyText(text) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(String(text))
    success.value = true
    message.value = '已复制到剪贴板'
  } catch {
    success.value = false
    message.value = '复制失败，请手动复制'
  }
}

onMounted(() => {
  if (!route.params.orderNumber) {
    router.replace('/finance-center?tab=recharge')
    return
  }
  bindPageLifecycleRefresh()
  void loadDetail()
})

onBeforeUnmount(() => {
  unbindPageLifecycleRefresh()
  clearCancelTimer()
  clearStatusPollTimer()
})
</script>

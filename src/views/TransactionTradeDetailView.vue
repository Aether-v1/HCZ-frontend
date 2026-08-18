<template>
  <section class="stack-lg trade-detail-page">
    <div v-if="detail" class="stack-lg">
      <div class="card stack-md">
        <div class="trade-status-topline">
          <div class="detail-value break-all trade-order-number-inline">{{ detail.orderNumber }}</div>
        </div>
        <div class="section-head"><h2>交易状态</h2></div>
        <div class="detail-value">{{ detail.statusText }}</div>
        <p v-if="showAutoCancelNotice" class="tiny-text muted trade-timeout-text">剩余 {{ remainingLabel }} 后自动取消订单</p>
        <p v-if="detailTip" class="muted">{{ detailTip }}</p>
      </div>

      <div class="card stack-md">
        <div class="section-head trade-info-head">
          <h2>订单信息</h2>
          <span class="tiny-text muted trade-info-time">{{ detail.createTime }}</span>
        </div>
        <div class="detail-rows-compact">
          <div class="detail-pair-row">
            <div class="detail-cell"><span class="tiny-text muted">交易金额</span><div class="detail-value">{{ detail.paymentAmount }}</div></div>
            <div class="detail-cell"><span class="tiny-text muted">USDT 数量</span><div class="detail-value">{{ detail.payAmount }}</div></div>
          </div>
          <div class="detail-pair-row detail-row-full">
            <div class="detail-cell detail-cell-full"><span class="tiny-text muted">单价</span><div class="detail-value">{{ detail.unitPrice }}</div></div>
          </div>
        </div>
      </div>

      <div v-if="!isSeller && paymentFields.length" class="card stack-md">
        <div class="section-head"><h2>卖家收款信息</h2></div>
        <div class="detail-rows-compact">
          <div v-for="field in paymentFields" :key="field.label" class="detail-pair-row detail-row-full">
            <div class="detail-cell detail-cell-full">
              <span class="tiny-text muted">{{ field.label }}</span>
              <div class="detail-value break-all">{{ field.value }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card stack-md">
        <div class="section-head"><h2>{{ isSeller ? '买家凭证' : '汇款凭证' }}</h2></div>
        <label v-if="canEditProof" class="finance-proof-box" :class="{ 'has-image': Boolean(proofImageUrl) }">
          <img
            v-if="proofImageUrl"
            :src="proofImageUrl"
            alt="交易凭证"
            class="finance-proof-image finance-proof-clickable"
            @click.stop.prevent="openProofPreview"
          />
          <div v-else class="finance-proof-empty">
            <span class="empty-emoji">📤</span>
            <p class="muted">点击上传交易凭证图片</p>
          </div>
          <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" class="hidden-input" @change="handleProofSelected" />
        </label>
        <div v-else class="finance-proof-box" :class="{ 'has-image': Boolean(proofImageUrl) }">
          <img
            v-if="proofImageUrl"
            :src="proofImageUrl"
            alt="交易凭证"
            class="finance-proof-image finance-proof-clickable"
            @click="openProofPreview"
          />
          <div v-else class="finance-proof-empty">
            <span class="empty-emoji">🧾</span>
            <p class="muted">{{ isSeller ? '买家暂未上传凭证' : '暂未上传凭证' }}</p>
          </div>
        </div>
        <div v-if="canSubmitProof || canRelease || canCancelTrade" class="inline-actions finance-submit-actions trade-proof-action-row">
          <button v-if="canSubmitProof" class="primary-btn" type="button" :disabled="submittingAction" @click="handleSubmitProof">{{ submittingAction ? '提交中...' : '已汇款，提交凭证' }}</button>
          <button v-if="canRelease" class="ghost-btn trade-release-btn" type="button" :disabled="submittingAction" @click="handleReleaseCoin">{{ submittingAction ? '处理中...' : '确认放币' }}</button>
          <button v-if="canCancelTrade" class="ghost-btn danger-btn trade-cancel-btn" type="button" :disabled="submittingAction" @click="handleCancelTrade">{{ submittingAction ? '处理中...' : '取消订单' }}</button>
        </div>
      </div>

      <p v-if="message" :class="feedbackClass">{{ message }}</p>
    </div>

    <div v-else-if="loading" class="card empty-card app-empty app-loading-card">
      <AppLoader size="lg" />
    </div>

    <div v-else class="card empty-card app-empty">
      <div class="empty-emoji">📭</div>
      <h3>未找到交易订单</h3>
      <p class="muted">请返回交易区重新选择。</p>
      <router-link to="/market" class="primary-btn block">返回交易区</router-link>
    </div>

    <div v-if="proofPreviewVisible && proofImageUrl" class="modal-overlay avatar-preview-overlay proof-preview-overlay" @click.self="closeProofPreview">
      <div class="card stack-md avatar-preview-card proof-preview-card">
        <div class="avatar-preview-frame proof-preview-frame" @click.stop>
          <img :src="proofImageUrl" alt="交易凭证大图" />
        </div>
        <div class="avatar-preview-actions">
          <button class="ghost-btn" type="button" @click="closeProofPreview">关闭</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineOptions({ name: 'TransactionTradeDetailView' })
import AppLoader from '../components/AppLoader.vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { refreshAppStateAfterAction } from '../stores/badges'
import { useUserStore } from '../stores/user'
import { useRoute } from 'vue-router'
import { getSessionCache, setSessionCache } from '../utils/storage'
import { resolveAssetUrl } from '../utils/assets'
import { apiAccountTwofaStatus } from '../api/account'
import { apiTransactionOrderCancel, apiTransactionOrderDetail, apiTransactionOrderProofImageUpload, apiTransactionOrderProofSubmit, apiTransactionOrderRelease } from '../api/transaction'
import { showConfirm, showPrompt } from '../utils/ui'

const route = useRoute()
const userStore = useUserStore()
const loading = ref(true)
const detail = ref(null)
const message = ref('')
const success = ref(false)
const submittingAction = ref(false)
const proofPreviewVisible = ref(false)
const feedbackClass = computed(() => (success.value ? 'feedback success' : 'feedback error'))
const proofImageUrl = computed(() => resolveAssetUrl(detail.value?.proofViewUrl || detail.value?.proof_view_url || detail.value?.proofImage || detail.value?.proof_image || detail.value?.image || detail.value?.voucherImage || ''))
const remainingSeconds = ref(0)
let countdownTimer = null
let detailPollTimer = null
let timeoutRefreshLock = false
const DETAIL_POLL_INTERVAL_MS = 4000

const currentMobile = computed(() => String(userStore.mobile || '').trim())
const isSeller = computed(() => {
  const sellerMobile = String(detail.value?.sellerMobile || '').trim()
  const sellerId = String(detail.value?.sellerId || '').trim()
  const currentId = String(userStore.id || '').trim()
  if (sellerId && currentId) return sellerId === currentId
  return !!sellerMobile && !!currentMobile.value && sellerMobile === currentMobile.value
})
const canSubmitProof = computed(() => !!detail.value && !isSeller.value && ['0', 'pending'].includes(String(detail.value.status || '')) && remainingSeconds.value > 0)
const canEditProof = computed(() => canSubmitProof.value)
const canRelease = computed(() => !!detail.value && String(detail.value.status || '') === '1' && isSeller.value)
const canCancelTrade = computed(() => !!detail.value && !isSeller.value && String(detail.value.status || '') === '0' && remainingSeconds.value > 0)
const showAutoCancelNotice = computed(() => !!detail.value && String(detail.value.status || '') === '0' && remainingSeconds.value > 0)
const detailTip = computed(() => {
  if (!detail.value) return ''
  const status = String(detail.value.status || '')
  if (status === '0') return isSeller.value ? '' : '请尽快按订单要求完成汇款，并推荐上传凭证。'
  return detail.value.tip || ''
})
const remainingLabel = computed(() => {
  const total = Math.max(0, Number(remainingSeconds.value || 0))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}分${String(seconds).padStart(2, '0')}秒`
})
const paymentFields = computed(() => {
  const pairs = [
    ['收款方式', detail.value?.paymentMethod || detail.value?.payTypeText],
    ['收款姓名', detail.value?.payeeName || detail.value?.bankName || detail.value?.accountName],
    ['收款账号', detail.value?.payeeAccount || detail.value?.bankCard || detail.value?.accountNo],
    ['开户行', detail.value?.bankBranch || detail.value?.bankAddress || detail.value?.bankBranchName],
    ['支付宝', detail.value?.alipayAccount],
    ['微信', detail.value?.wechatAccount],
    ['TRC20 地址', detail.value?.walletAddress]
  ]
  return pairs.filter(([, value]) => String(value || '').trim()).map(([label, value]) => ({ label, value }))
})

function openProofPreview() {
  if (!proofImageUrl.value) return
  proofPreviewVisible.value = true
}

function closeProofPreview() {
  proofPreviewVisible.value = false
}

function parseTradeTime(value) {
  if (!value) return null
  const normalized = String(value).trim().replace(/-/g, '/')
  const time = new Date(normalized)
  return Number.isFinite(time.getTime()) ? time : null
}

function isTradeOrderExpired(item = {}) {
  const explicitExpired = [item.status_text, item.tip, item.order_status_text, item.remarks, item.remark, item.close_reason]
    .some((text) => /超时|已过期|已失效/.test(String(text || '')))
  if (explicitExpired) return true
  const remainingCandidates = [item.remaining_seconds, item.left_seconds, item.countdown, item.count_down]
  if (remainingCandidates.some((value) => value !== undefined && value !== null && Number(value) <= 0)) return true
  const expireAt = parseTradeTime(item.expire_time || item.expired_at || item.end_time || item.close_time)
  if (expireAt && expireAt.getTime() <= Date.now()) return true
  const createdAt = parseTradeTime(item.create_time || item.created_at)
  if (createdAt && Date.now() - createdAt.getTime() >= 20 * 60 * 1000) return true
  return false
}

function effectiveTradeStatus(item = {}) {
  const value = String(item.status ?? '')
  return value === '0' && isTradeOrderExpired(item) ? '2' : value
}

function effectiveTradeStatusText(item = {}) {
  return String(item.status ?? '') === '0' && isTradeOrderExpired(item) ? '已超时' : statusText(item.status)
}

function statusText(status) {
  const value = String(status ?? '')
  if (value === '0') return '待汇款'
  if (value === '1') return '待验收'
  if (value === '2') return '已取消'
  if (value === '3') return '已完成'
  return '处理中'
}

function statusTip(status) {
  const value = String(status ?? '')
  if (value === '0') return '请尽快按订单要求完成汇款，并推荐上传凭证。'
  if (value === '1') return '买家已汇款，等待卖家验收并放币。'
  if (value === '2') return '该交易订单已取消。'
  if (value === '3') return '该交易订单已完成。'
  return '请以订单最新状态为准。'
}


function updateMarketCacheOrder(orderNumber, patch = {}) {
  const cache = getSessionCache('tp8-market-view-cache', 20 * 60 * 1000)
  if (!cache) return null
  const normalizeRow = (row) => {
    if (String(row?.order_number || '') !== String(orderNumber || '')) return row
    const next = { ...row, ...patch }
    return {
      ...next,
      _effectiveStatus: effectiveTradeStatus(next),
      _effectiveStatusText: effectiveTradeStatusText(next)
    }
  }
  const orderRows = Array.isArray(cache.orderRows) ? cache.orderRows.map((row) => normalizeRow(row)) : []
  const pendingZero = orderRows.filter((item) => String(item?._effectiveStatus ?? item?.status ?? '') === '0').length
  const pendingOne = orderRows.filter((item) => String(item?._effectiveStatus ?? item?.status ?? '') === '1').length
  cache.orderRows = orderRows
  cache.pendingStatusCounts = { 0: pendingZero, 1: pendingOne }
  cache.summary = { ...(cache.summary || {}), orderCount: pendingZero + pendingOne }
  setSessionCache('tp8-market-view-cache', cache)
  return pendingZero + pendingOne
}

function stripHtml(value = '') {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizePaymentInfo(raw = {}) {
  const item = raw && typeof raw === 'object' ? raw : {}
  return {
    paymentMethod: String(item.payment_method || '').trim(),
    accountName: String(item.account_name || '').trim(),
    bankAccount: String(item.bank_account || '').trim(),
    bankName: String(item.bank_name || '').trim(),
    wechatAccount: String(item.wechat_account || '').trim(),
    alipayAccount: String(item.alipay_account || '').trim(),
    walletAddress: String(item.wallet_address || '').trim()
  }
}

function normalizeFromCache(item = {}) {
  const effectiveStatus = item.effective_status !== undefined && item.effective_status !== null ? item.effective_status : effectiveTradeStatus(item)
  const paymentInfo = normalizePaymentInfo(item.payment_info || item.paymentInfo || {})
  const sellerInfo = item.seller_info || item.sellerInfo || {}
  const buyerInfo = item.buyer_info || item.buyerInfo || {}
  return {
    orderNumber: item.order_number || item.orderNumber || String(route.params.orderNumber || ''),
    status: String(effectiveStatus ?? item.status ?? ''),
    statusText: item.status_text || item.statusText || effectiveTradeStatusText(item),
    tip: statusTip(effectiveStatus),
    paymentAmount: item.payment_amount ? `${Number(item.payment_amount || 0).toFixed(2)} CNY` : '0.00 CNY',
    payAmount: ((item.pay_amount ?? item.usdt_amount) ? `${Number((item.pay_amount ?? item.usdt_amount) || 0).toFixed(2)} USDT` : '0.00 USDT'),
    unitPrice: item.unit_price ? `${Number(item.unit_price || 0).toFixed(2)} CNY` : '0.00 CNY',
    createTime: item.create_time || item.created_at || '-',
    remittanceUserName: item.remittance_user_name || item.pay_user_name || '',
    sellerName: item.nickname || item.seller_nickname || sellerInfo.nickname || sellerInfo.name || '',
    sellerMobile: sellerInfo.mobile || item.seller_mobile || '',
    buyerName: buyerInfo.nickname || buyerInfo.name || item.buyer_nickname || item.user_nickname || item.remittance_user_name || '',
    buyerMobile: buyerInfo.mobile || item.buyer_mobile || item.user_mobile || '',
    paymentMethod: paymentInfo.paymentMethod,
    payeeName: paymentInfo.accountName,
    payeeAccount: paymentInfo.bankAccount,
    bankBranch: paymentInfo.bankName,
    alipayAccount: paymentInfo.alipayAccount,
    wechatAccount: paymentInfo.wechatAccount,
    walletAddress: paymentInfo.walletAddress,
    proofViewUrl: item.proof_view_url || item.proofViewUrl || item.image || item.proof_image || item.voucher_image || '',
    proofImage: item.proof_view_url || item.proofViewUrl || item.image || item.proof_image || item.voucher_image || '',
    id: item.id || item.order_id || '',
    expireTime: item.expire_time || item.expired_at || item.end_time || item.close_time || '',
    cancelTime: item.cancel_time || '',
    remainingSeconds: Number(item.remaining_seconds ?? item.left_seconds ?? item.countdown ?? item.count_down ?? 0),
    pendingTimeoutSeconds: Number(item.pending_timeout_seconds || 1200),
    sellerId: sellerInfo.id || item.seller_id || item.sell_uid || '',
    buyerId: buyerInfo.id || item.buyer_id || item.uid || '',
    hiddenForm: { ...item, payment_info: item.payment_info || item.paymentInfo || {} }
  }
}

function readFromMarketCache() {
  const cache = getSessionCache('tp8-market-view-cache', 20 * 60 * 1000)
  const list = (cache?.orderRows || []).concat(cache?.marketRows || [])
  const matched = list.find((row) => String(row.order_number) === String(route.params.orderNumber || ''))
  return matched ? normalizeFromCache(matched) : null
}

function detailCacheKey() {
  return `tp8-trade-detail-cache:${String(route.params.orderNumber || '').trim()}`
}

function persistDetailCache() {
  if (!detail.value) return
  setSessionCache(detailCacheKey(), detail.value)
}

function readFromDetailCache() {
  const cached = getSessionCache(detailCacheKey(), 20 * 60 * 1000)
  return cached ? normalizeFromCache(cached) : null
}

function syncTradeDetailRealtimeState(options = {}) {
  void refreshAppStateAfterAction(options).catch(() => null)
}

function applyLocalDetailPatch(detailPatch = {}, marketPatch = {}) {
  if (!detail.value) return
  detail.value = {
    ...detail.value,
    ...detailPatch,
    hiddenForm: {
      ...(detail.value.hiddenForm || {}),
      ...marketPatch
    }
  }
  syncRemainingSeconds(detail.value)
  persistDetailCache()
  const pendingTradeCount = updateMarketCacheOrder(detail.value.orderNumber, marketPatch)
  syncTradeDetailRealtimeState({ tradePendingCount: pendingTradeCount })
}




function stopCountdownTimer() {
  if (countdownTimer) {
    window.clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function tradeExpireAtMs(item = {}) {
  const expire = parseTradeTime(item.expireTime || item.expire_time || item.expired_at || item.end_time || item.close_time)
  if (expire) return expire.getTime()
  const created = parseTradeTime(item.createTime || item.create_time || item.created_at)
  if (!created) return 0
  const timeoutMs = Number(item.pendingTimeoutSeconds || item.pending_timeout_seconds || 1200) * 1000
  return created.getTime() + timeoutMs
}

async function triggerTimeoutRefresh() {
  if (timeoutRefreshLock) return
  timeoutRefreshLock = true
  try {
    await loadDetail()
  } finally {
    timeoutRefreshLock = false
  }
}

function syncRemainingSeconds(item = detail.value) {
  if (!item || String(item.status || '') !== '0') {
    remainingSeconds.value = 0
    return
  }
  const explicit = Number(item.remainingSeconds ?? item.remaining_seconds ?? item.left_seconds ?? item.countdown ?? item.count_down ?? NaN)
  if (Number.isFinite(explicit) && explicit > 0) {
    const expireAt = tradeExpireAtMs(item)
    if (expireAt > 0) {
      remainingSeconds.value = Math.max(0, Math.floor((expireAt - Date.now()) / 1000))
      return
    }
    remainingSeconds.value = explicit
    return
  }
  const expireAt = tradeExpireAtMs(item)
  if (expireAt <= 0) {
    remainingSeconds.value = 0
    return
  }
  remainingSeconds.value = Math.max(0, Math.floor((expireAt - Date.now()) / 1000))
}

function startCountdownTimer() {
  stopCountdownTimer()
  syncRemainingSeconds()
  if (!detail.value || String(detail.value.status || '') !== '0') return
  countdownTimer = window.setInterval(async () => {
    syncRemainingSeconds()
    if (remainingSeconds.value <= 0) {
      stopCountdownTimer()
      await triggerTimeoutRefresh()
    }
  }, 1000)
}

function stopDetailPolling() {
  if (detailPollTimer) {
    window.clearInterval(detailPollTimer)
    detailPollTimer = null
  }
}

async function refreshDetailSilently() {
  if (document.visibilityState === 'hidden') return
  await loadDetail({ silent: true })
}

function startDetailPolling() {
  stopDetailPolling()
  detailPollTimer = window.setInterval(() => {
    refreshDetailSilently().catch(() => null)
  }, DETAIL_POLL_INTERVAL_MS)
}

async function handleProofSelected(event) {
  const file = event.target?.files?.[0]
  if (!file || !detail.value) return
  try {
    submittingAction.value = true
    const res = await apiTransactionOrderProofImageUpload({
      id: detail.value.id || detail.value.hiddenForm?.id || detail.value.hiddenForm?.order_id || '',
      order_id: detail.value.id || detail.value.hiddenForm?.id || detail.value.hiddenForm?.order_id || '',
      order_number: detail.value.orderNumber,
      file
    })
    const proofViewUrl = String(res?.data?.proof_view_url || res?.data?.voucher_image || '')
    if (!proofViewUrl) throw new Error('上传交易凭证失败')
    detail.value = {
      ...detail.value,
      proofViewUrl: proofViewUrl,
      proof_view_url: proofViewUrl,
      proofImage: proofViewUrl,
      voucherImage: proofViewUrl,
      image: proofViewUrl
    }
    persistDetailCache()
    success.value = true
    message.value = res.message || '上传成功'
  } catch (error) {
    success.value = false
    message.value = error.message || '上传交易凭证失败'
  } finally {
    submittingAction.value = false
    if (event.target) event.target.value = ''
  }
}

async function handleSubmitProof() {
  if (!detail.value || !detail.value.orderNumber) return
  const orderId = detail.value.id || detail.value.hiddenForm?.id || detail.value.hiddenForm?.order_id || detail.value.hiddenForm?.trade_id || ''
  const proofImage = detail.value.proofViewUrl || detail.value.proof_view_url || detail.value.proofImage || detail.value.voucherImage || detail.value.image || ''
  try {
    submittingAction.value = true
    const submitPayload = {
      order_number: detail.value.orderNumber,
      remittance_user_name: detail.value.remittanceUserName || '',
      status: 1
    }
    if (orderId) {
      submitPayload.id = orderId
      submitPayload.order_id = orderId
    }

    const res = await apiTransactionOrderProofSubmit(submitPayload)

    detail.value = {
      ...detail.value,
      status: '1',
      statusText: '待验收',
      tip: statusTip('1'),
      proofViewUrl: proofImage,
      proof_view_url: proofImage,
      proofImage,
      voucherImage: proofImage,
      image: proofImage,
      hiddenForm: {
        ...(detail.value.hiddenForm || {}),
        id: orderId || detail.value.hiddenForm?.id || '',
        order_id: orderId || detail.value.hiddenForm?.order_id || '',
        order_number: detail.value.orderNumber,
        voucher_image: proofImage,
        proof_view_url: proofImage,
        status: 1
      }
    }
    const pendingTradeCount = updateMarketCacheOrder(detail.value.orderNumber, {
      status: '1',
      voucher_image: proofImage,
      proof_view_url: proofImage,
      image: proofImage,
      proof_image: proofImage
    })
    persistDetailCache()
    success.value = true
    message.value = res.message || '交易凭证已提交'
    syncTradeDetailRealtimeState({ tradePendingCount: pendingTradeCount })
    await loadDetail()
  } catch (error) {
    success.value = false
    message.value = error.message || '提交交易凭证失败'
  } finally {
    submittingAction.value = false
  }
}

async function handleCancelTrade() {
  if (!detail.value) return
  const confirmed = await showConfirm({
    title: '取消交易订单',
    message: '确定取消这笔交易订单吗？',
    variant: 'danger',
    confirmText: '确认取消'
  })
  if (!confirmed) return
  try {
    submittingAction.value = true
    const payload = {
      id: detail.value.id || detail.value.hiddenForm?.id || detail.value.hiddenForm?.order_id || '',
      order_id: detail.value.id || detail.value.hiddenForm?.id || detail.value.hiddenForm?.order_id || '',
      order_number: detail.value.orderNumber
    }
    const res = await apiTransactionOrderCancel(payload)
    const cancelTime = new Date().toLocaleString('sv-SE').replace('T', ' ')
    applyLocalDetailPatch(
      {
        status: '2',
        statusText: '已取消',
        tip: statusTip('2'),
        cancelTime,
        remainingSeconds: 0
      },
      {
        status: '2',
        status_text: '已取消',
        cancel_time: cancelTime
      }
    )
    success.value = true
    message.value = res.message || '取消成功'
    await loadDetail()
  } catch (error) {
    success.value = false
    message.value = error.message || '取消订单失败'
  } finally {
    submittingAction.value = false
  }
}

async function handleReleaseCoin() {
  if (!detail.value) return
  try {
    const statusRes = await apiAccountTwofaStatus()
    const twofaEnabled = Number(statusRes?.data?.twofa_enabled || 0) === 1
    const credential = await showPrompt({
      title: '放币确认',
      message: twofaEnabled ? '请输入 2FA 动态码确认放币。' : '请输入登录密码确认放币。',
      inputLabel: twofaEnabled ? '2FA 动态码' : '登录密码',
      placeholder: twofaEnabled ? '请输入 6 位动态码' : '请输入登录密码',
      inputType: twofaEnabled ? 'text' : 'password',
      confirmText: '确认放币',
      validate: (value) => {
        const text = String(value || '').trim()
        if (!text) return twofaEnabled ? '请输入 2FA 动态码' : '请输入登录密码'
        if (twofaEnabled && !/^\d{6}$/.test(text)) return '请输入有效的 6 位动态码'
        if (!twofaEnabled && text.length < 6) return '登录密码至少需要 6 位'
        return true
      }
    })
    if (!credential) return

    submittingAction.value = true
    const payload = {
      id: detail.value.id || detail.value.hiddenForm?.id || detail.value.hiddenForm?.order_id || '',
      order_number: detail.value.orderNumber
    }
    if (twofaEnabled) payload.twofa_code = credential
    else payload.password = credential
    const res = await apiTransactionOrderRelease(payload)
    applyLocalDetailPatch(
      {
        status: '3',
        statusText: '已完成',
        tip: statusTip('3'),
        remainingSeconds: 0
      },
      {
        status: '3',
        status_text: '已完成'
      }
    )
    success.value = true
    message.value = res.message || '放币成功'
    await loadDetail()
  } catch (error) {
    success.value = false
    message.value = error.message || '放币失败'
  } finally {
    submittingAction.value = false
  }
}

async function loadDetail(options = {}) {
  const silent = Boolean(options?.silent)
  if (!silent || !detail.value) loading.value = true
  if (!silent) message.value = ''
  detail.value = detail.value || readFromDetailCache() || readFromMarketCache()
  try {
    let parsed = null
    try {
      const res = await apiTransactionOrderDetail(route.params.orderNumber)
      const body = res?.data || res
      if (body && typeof body === 'object') parsed = { ...(detail.value || {}), ...normalizeFromCache(body), hiddenForm: body }
    } catch (error) {
      throw error
    }
    if (parsed) {
      detail.value = { ...(detail.value || {}), ...parsed }
      updateMarketCacheOrder(detail.value.orderNumber, {
        status: detail.value.status,
        status_text: detail.value.statusText,
        voucher_image: detail.value.proofViewUrl || detail.value.proofImage || detail.value.voucherImage || detail.value.image || '',
        proof_view_url: detail.value.proofViewUrl || detail.value.proofImage || detail.value.voucherImage || detail.value.image || '',
        image: detail.value.proofViewUrl || detail.value.proofImage || detail.value.voucherImage || detail.value.image || '',
        proof_image: detail.value.proofViewUrl || detail.value.proofImage || detail.value.voucherImage || detail.value.image || '',
        seller_id: detail.value.sellerId || '',
        buyer_id: detail.value.buyerId || '',
        seller_mobile: detail.value.sellerMobile || '',
        buyer_mobile: detail.value.buyerMobile || '',
        sell_uid: detail.value.sellerId || detail.value.hiddenForm?.sell_uid || '',
        uid: detail.value.buyerId || detail.value.hiddenForm?.uid || '',
        role: isSeller.value ? 'seller' : 'buyer',
        is_seller: isSeller.value ? 1 : 0,
        is_buyer: isSeller.value ? 0 : 1
      })
      persistDetailCache()
    }
    syncRemainingSeconds(detail.value)
    startCountdownTimer()
  } catch (error) {
    if (!detail.value) {
      success.value = false
      message.value = error.message || '加载交易订单失败'
    }
  } finally {
    loading.value = false
  }
}

watch(() => detail.value?.status, () => {
  syncRemainingSeconds(detail.value)
  startCountdownTimer()
})

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    refreshDetailSilently().catch(() => null)
  }
}

function handleWindowFocus() {
  refreshDetailSilently().catch(() => null)
}

onMounted(() => {
  detail.value = readFromDetailCache() || readFromMarketCache() || detail.value
  if (detail.value) {
    syncRemainingSeconds(detail.value)
    startCountdownTimer()
  }
  loadDetail()
  startDetailPolling()
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', handleWindowFocus)
})

onBeforeUnmount(() => {
  persistDetailCache()
  stopCountdownTimer()
  stopDetailPolling()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('focus', handleWindowFocus)
})
</script>

<style scoped>
.trade-proof-action-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.trade-release-btn {
  min-width: 120px;
}
.trade-cancel-btn {
  min-width: 108px;
}
.trade-timeout-text {
  margin-top: 6px;
}
.trade-status-topline {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.trade-order-number-inline {
  font-size: 15px;
  line-height: 1.45;
}
.trade-info-head {
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.trade-info-time {
  flex-shrink: 0;
}
.finance-proof-clickable {
  cursor: zoom-in;
}
.proof-preview-overlay {
  padding: 18px;
}
.proof-preview-card {
  width: min(100%, 560px);
}
.proof-preview-frame {
  width: 100%;
  aspect-ratio: auto;
  min-height: 240px;
  max-height: 72vh;
  overflow: hidden;
  background: rgba(6, 14, 30, 0.72);
}
.proof-preview-frame img {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
}
@media (max-width: 640px) {
  .trade-info-head {
    flex-direction: row;
    align-items: center;
  }
  .trade-order-number-inline {
    font-size: 14px;
  }
  .proof-preview-overlay {
    padding: 12px;
  }
}
</style>

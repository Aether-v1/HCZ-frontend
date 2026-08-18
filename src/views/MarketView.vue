<template>
  <section class="stack-lg transaction-page-refined">
    <div class="card stack-md transaction-head-card">
      <div class="section-head section-head-mobile">
        <div class="chips wrap market-primary-tabs">
          <button class="seg-btn" :class="{ active: tab === 'market' }" @click="tab = 'market'">交易市场</button>
          <button class="seg-btn" :class="{ active: tab === 'mine' }" @click="tab = 'mine'">我的挂单</button>
          <button class="seg-btn seg-btn-with-corner-badge" :class="{ active: tab === 'orders' }" @click="tab = 'orders'">
            <span class="seg-btn-text">交易订单</span>
            <span v-if="tab !== 'orders' && summary.orderCount > 0" class="seg-corner-badge seg-corner-badge--dot" aria-hidden="true"></span>
          </button>
        </div>
      </div>

      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />
    </div>

    <div v-if="tab === 'market'" class="card stack-md">
      <div class="section-head section-head-mobile">
        <div>
          <h2>交易市场</h2>
        </div>
        <div class="chips wrap">
          <button class="seg-btn" :class="{ active: marketSort === 'asc' }" @click="marketSort = 'asc'">低价优先</button>
          <button class="seg-btn" :class="{ active: marketSort === 'desc' }" @click="marketSort = 'desc'">高价优先</button>
          <button class="seg-btn" :class="{ active: marketOnlyMine }" @click="marketOnlyMine = !marketOnlyMine">只看我的</button>
        </div>
      </div>

      <div v-if="marketRows.length" class="stack-md">
        <article v-for="item in marketRows" :key="item.id" class="market-card market-card-rich">
          <div class="market-card-top">
            <div class="market-seller-row">
              <div class="agent-user-avatar market-avatar">
                <img v-if="sellerAvatar(item)" :src="sellerAvatar(item)" alt="卖家头像" />
                <span v-else>{{ sellerName(item).slice(0, 2) }}</span>
              </div>
              <div class="market-seller-copy">
                <strong>{{ sellerName(item) }}</strong>
                <span class="tiny-text muted">挂单时间：{{ item.create_time || '-' }}</span>
              </div>
            </div>
            <span class="pill-tag light">{{ marketStatusText(item.status) }}</span>
          </div>

          <div class="market-grid market-grid-rich">
            <div>
              <span class="tiny-text muted">出售数量</span>
              <div class="detail-value small">{{ formatAmount(item.sell_account) }} USDT</div>
            </div>
            <div>
              <span class="tiny-text muted">限额范围</span>
              <div class="detail-value small">{{ formatAmount(item.min_limit) }} - {{ formatAmount(item.max_limit) }}</div>
            </div>
            <div>
              <span class="tiny-text muted">单价</span>
              <div class="detail-value small">{{ formatPrice(item.unit_price) }} CNY</div>
            </div>
            <div>
              <span class="tiny-text muted">成功交易</span>
              <div class="detail-value small">{{ item.TransactionOrder_count || 0 }} 单 / {{ formatAmount(item.pay_amount_s) }} USDT</div>
            </div>
          </div>

          <div class="inline-actions mobile-actions">
            <button class="primary-btn" type="button" @click="openBuy(item)">立即购买</button>
          </div>

        </article>
      </div>

      <div v-if="marketRows.length && marketHasMore" ref="marketLoadMoreRef" class="market-load-sentinel" aria-hidden="true">
        <span class="tiny-text muted">{{ marketLoadingMore ? '加载中...' : '上滑加载更多' }}</span>
      </div>

      <div v-if="!marketRows.length" class="empty-card app-empty">
        <div class="empty-emoji">💱</div>
        <p class="muted">当前没有可购买的挂单</p>
      </div>
    </div>

    <div v-if="tab === 'mine'" class="card stack-md">
      <div class="section-head section-head-mobile">
        <div>
          <h2>我的挂单</h2>
        </div>
        <div class="inline-actions mobile-actions transaction-toolbar">
          <div class="chips wrap">
            <button class="seg-btn" :class="{ active: mineStatus === '' }" @click="mineStatus = ''">全部</button>
            <button class="seg-btn" :class="{ active: mineStatus === '1' }" @click="mineStatus = '1'">上架中</button>
            <button class="seg-btn" :class="{ active: mineStatus === '2' }" @click="mineStatus = '2'">已下架</button>
            <button class="seg-btn" :class="{ active: mineStatus === '3' }" @click="mineStatus = '3'">已撤销</button>
          </div>
          <button class="primary-btn transaction-create-btn" type="button" @click="openSaleModal()">我要出售</button>
        </div>
      </div>

      <div v-if="mineRows.length" class="stack-md">
        <article v-for="item in mineRows" :key="item.id" class="market-card market-card-rich">
          <div class="market-card-top">
            <div>
              <div class="tiny-text muted">挂单编号</div>
              <strong>#{{ item.id }}</strong>
            </div>
            <span class="pill-tag light">{{ marketStatusText(item.status) }}</span>
          </div>

          <div class="market-grid market-grid-rich">
            <div>
              <span class="tiny-text muted">挂单数量</span>
              <div class="detail-value small">{{ formatAmount(item.sell_account) }} USDT</div>
            </div>
            <div>
              <span class="tiny-text muted">单价</span>
              <div class="detail-value small">{{ formatPrice(item.unit_price) }} CNY</div>
            </div>
            <div>
              <span class="tiny-text muted">最小额度</span>
              <div class="detail-value small">{{ formatAmount(item.min_limit) }}</div>
            </div>
            <div>
              <span class="tiny-text muted">最大额度</span>
              <div class="detail-value small">{{ formatAmount(item.max_limit) }}</div>
            </div>
          </div>

          <div class="transaction-action-row">
            <button v-if="String(item.status) === '1'" class="ghost-btn" type="button" @click="operateSale(2, item)">下架</button>
            <button v-if="String(item.status) === '2'" class="ghost-btn" type="button" @click="operateSale(1, item)">上架</button>
            <button v-if="String(item.status) !== '3'" class="ghost-btn" type="button" @click="openSaleModal(item)">编辑</button>
            <button v-if="String(item.status) !== '3'" class="ghost-btn danger-btn" type="button" @click="operateSale(3, item)">撤销</button>
          </div>
        </article>
      </div>

      <div v-else class="empty-card app-empty">
        <div class="empty-emoji">📦</div>
        <p class="muted">你还没有挂单记录</p>
      </div>
    </div>

    <div v-if="tab === 'orders'" class="card stack-md">
      <div class="section-head section-head-mobile">
        <div>
          <h2>交易订单</h2>
        </div>
        <div class="chips market-order-tabs">
          <button class="seg-btn" :class="{ active: orderStatus === 'null' }" @click="orderStatus = 'null'">全部</button>
          <button class="seg-btn seg-btn-with-badge" :class="{ active: orderStatus === '0' }" @click="orderStatus = '0'">
            <span class="seg-btn-text">待汇款</span>
            <span v-if="orderStatus !== '0' && pendingStatusCount(0) > 0" class="seg-inline-badge seg-inline-badge--dot" aria-hidden="true"></span>
          </button>
          <button class="seg-btn seg-btn-with-badge" :class="{ active: orderStatus === '1' }" @click="orderStatus = '1'">
            <span class="seg-btn-text">待验收</span>
            <span v-if="orderStatus !== '1' && pendingStatusCount(1) > 0" class="seg-inline-badge seg-inline-badge--dot" aria-hidden="true"></span>
          </button>
          <button class="seg-btn" :class="{ active: orderStatus === '2' }" @click="orderStatus = '2'">已取消</button>
          <button class="seg-btn" :class="{ active: orderStatus === '3' }" @click="orderStatus = '3'">已完成</button>
        </div>
      </div>

      <div v-if="orderRows.length" class="stack-md">
        <article
          v-for="item in pagedOrderRows"
          :key="item.id || item.order_number"
          class="market-card market-card-rich order-entry-card"
          @click="openTradeDetail(item)"
        >
          <div class="market-card-top">
            <div>
              <div class="tiny-text muted">订单号</div>
              <strong>{{ item.order_number || '--' }}</strong>
            </div>
            <span class="pill-tag light">{{ item._effectiveStatusText || orderStatusText(item.status) }}</span>
          </div>

          <div class="market-grid market-grid-rich">
            <div>
              <span class="tiny-text muted">交易金额</span>
              <div class="detail-value small">{{ formatPrice(item.payment_amount) }} CNY</div>
            </div>
            <div>
              <span class="tiny-text muted">USDT 数量</span>
              <div class="detail-value small">{{ formatAmount(item.pay_amount) }} USDT</div>
            </div>
            <div>
              <span class="tiny-text muted">单价</span>
              <div class="detail-value small">{{ formatPrice(item.unit_price) }} CNY</div>
            </div>
            <div>
              <span class="tiny-text muted">创建时间</span>
              <div class="detail-value small">{{ item.create_time || '-' }}</div>
            </div>
          </div>

          <div v-if="showTradeOrderCountdown(item)" class="tiny-text muted trade-order-timeout-line">剩余 {{ tradeOrderRemainingLabel(item) }} 后自动取消</div>

          <div v-if="canCancelPendingTrade(item)" class="transaction-action-row trade-order-action-row">
            <button class="ghost-btn danger-btn" type="button" @click.stop="cancelPendingTrade(item)">取消订单</button>
          </div>
        </article>
      </div>

      <div v-if="orderRows.length && totalOrderPages > 1" class="pager-bar">
        <button class="ghost-btn pager-btn" type="button" :disabled="orderPage <= 1" aria-label="上一页" @click="orderPage = Math.max(1, orderPage - 1)">
          <span class="pager-icon">&lt;</span>
        </button>
        <div class="pager-center">
          <div class="pager-count">
            <span class="pager-pill pager-pill--active">{{ orderPage }}</span>
            <span class="pager-sep">/</span>
            <span class="pager-pill">{{ totalOrderPages }}</span>
          </div>
          <div class="pager-track">
            <span class="pager-fill" :style="{ width: `${Math.max(12, (orderPage / totalOrderPages) * 100)}%` }"></span>
          </div>
        </div>
        <button class="ghost-btn pager-btn" type="button" :disabled="orderPage >= totalOrderPages" aria-label="下一页" @click="orderPage = Math.min(totalOrderPages, orderPage + 1)">
          <span class="pager-icon">&gt;</span>
        </button>
      </div>

      <div v-if="!orderRows.length" class="empty-card app-empty">
        <div class="empty-emoji">🧾</div>
        <p class="muted">当前没有交易订单</p>
      </div>
    </div>

    <div v-if="showBuyModal" class="tutorial-modal-mask" @click.self="closeBuyModal">
      <div class="tutorial-modal-card transaction-modal-card">
        <div class="tutorial-modal-head section-head">
          <h3>购买 USDT</h3>
          <button class="icon-btn tutorial-close-btn" type="button" @click="closeBuyModal">×</button>
        </div>

        <div v-if="selectedOffer" class="summary-box">
          <span>当前挂单</span>
          <strong>{{ sellerName(selectedOffer) }} · {{ formatPrice(selectedOffer.unit_price) }} CNY</strong>
        </div>

        <div class="form-grid two-col">
          <label>
            <span>购买数量</span>
            <input v-model="buyForm.pay_amount" type="number" min="0" step="0.01" placeholder="请输入购买数量" />
          </label>
          <label>
            <span>汇款人姓名</span>
            <input v-model="buyForm.remittance_user_name" type="text" placeholder="请输入真实姓名" />
          </label>
        </div>

        <div class="summary-box">
          <span>预计支付</span>
          <strong>{{ buyPaymentAmount }}</strong>
        </div>

        <FeedbackToast v-if="buyMessage" :type="buySuccess ? 'success' : 'error'" :message="buyMessage" @close="buyMessage = ''" />

        <div class="tutorial-modal-actions">
          <button class="ghost-btn" type="button" @click="closeBuyModal">取消</button>
          <button class="primary-btn" type="button" :disabled="submittingBuy" @click="submitBuyForm">{{ submittingBuy ? '提交中...' : '确认购买' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showSaleModal" class="tutorial-modal-mask" @click.self="closeSaleModal">
      <div class="tutorial-modal-card transaction-modal-card">
        <div class="tutorial-modal-head section-head">
          <h3>{{ saleForm.id ? '编辑挂单' : '我要出售' }}</h3>
          <button class="icon-btn tutorial-close-btn" type="button" @click="closeSaleModal">×</button>
        </div>

        <div class="form-grid two-col">
          <label>
            <span>挂单数量</span>
            <input v-model="saleForm.sell_account" type="number" min="0" step="0.01" placeholder="请输入挂单数量" />
          </label>
          <label>
            <span>单价 CNY</span>
            <input v-model="saleForm.unit_price" type="number" min="0" step="0.01" placeholder="请输入单价" />
          </label>
          <label>
            <span>最小额度</span>
            <input v-model="saleForm.min_limit" type="number" min="0" step="0.01" placeholder="请输入最小额度" />
          </label>
          <label>
            <span>最大额度</span>
            <input v-model="saleForm.max_limit" type="number" min="0" step="0.01" placeholder="请输入最大额度" />
          </label>
        </div>

        <p class="muted transaction-modal-tip">挂单会自动读取你的默认收款信息；如未设置，请先到“收款信息”页面完善。</p>

        <div class="tutorial-modal-actions">
          <button class="ghost-btn" type="button" @click="closeSaleModal">取消</button>
          <button class="primary-btn" type="button" :disabled="submittingSale" @click="submitSaleForm">{{ submittingSale ? '保存中...' : '确认保存' }}</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import FeedbackToast from '@/components/FeedbackToast.vue'
defineOptions({ name: 'MarketView' })
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { refreshAppStateAfterAction } from '../stores/badges'
import { useUserStore } from '../stores/user'
import { getSessionCache, setSessionCache } from '../utils/storage'
import { apiTransactionBuy, apiTransactionMarket, apiTransactionMySale, apiTransactionOrderCancel, apiTransactionOrders, apiTransactionSaleStatus, apiTransactionSaleSubmit } from '../api/transaction'
import { resolveAssetUrl } from '../utils/assets'
import { showConfirm } from '../utils/ui'

const router = useRouter()
const userStore = useUserStore()
const tab = ref('market')
const message = ref('')
const success = ref(false)
const loading = ref(false)
const marketRows = ref([])
const mineRows = ref([])
const allOrderRows = ref([])
const marketLoadMoreRef = ref(null)
const marketSort = ref('asc')
const marketOnlyMine = ref(false)
const mineStatus = ref('')
const orderStatus = ref('null')
const marketPage = ref(1)
const marketTotalPages = ref(1)
const marketLoadingMore = ref(false)
const orderPage = ref(1)
const orderPageSize = 5
const marketPageSize = 10
const summary = reactive({ productCount: 0, orderCount: 0 })
const pendingStatusCounts = reactive({ 0: 0, 1: 0 })
const marketCacheKey = 'tp8-market-view-cache'
const mySaleIds = ref([])
const nowTs = ref(Date.now())
let restoringState = false
let marketPollTimer = null
let orderCountdownTimer = null
let orderTimeoutRefreshLock = false
let marketPollingListenersBound = false
let marketLoadMoreObserver = null
const MARKET_ACTIVE_POLL_INTERVAL_MS = 4000
const MARKET_HIDDEN_POLL_INTERVAL_MS = 15000

const showBuyModal = ref(false)
const selectedOffer = ref(null)
const submittingBuy = ref(false)
const buyForm = reactive({ pay_amount: '', remittance_user_name: '' })
const buyMessage = ref('')
const buySuccess = ref(false)

const showSaleModal = ref(false)
const submittingSale = ref(false)
const saleForm = reactive({ id: '', sell_account: '', unit_price: '', min_limit: '', max_limit: '' })

const feedbackClass = computed(() => (success.value ? 'feedback success' : 'feedback error'))
const buyFeedbackClass = computed(() => (buySuccess.value ? 'feedback success' : 'feedback error'))
const marketHasMore = computed(() => marketPage.value < marketTotalPages.value)
const orderRows = computed(() => filterTradeOrdersByStatus(allOrderRows.value))
const totalOrderPages = computed(() => Math.max(1, Math.ceil(orderRows.value.length / orderPageSize)))
const pagedOrderRows = computed(() => {
  const start = (orderPage.value - 1) * orderPageSize
  return orderRows.value.slice(start, start + orderPageSize)
})
const buyPaymentAmount = computed(() => {
  const quantity = Number(buyForm.pay_amount || 0)
  const price = Number(selectedOffer.value?.unit_price || 0)
  if (!quantity || !price) return '0.00 CNY'
  return `${(quantity * price).toFixed(2)} CNY`
})

watch([tab, marketSort, marketOnlyMine, mineStatus, orderStatus], async ([nextTab], [prevTab]) => {
  if (restoringState) return
  if (nextTab === 'orders' && prevTab !== 'orders') orderPage.value = 1
  if (prevTab === 'orders' && nextTab !== 'orders') orderPage.value = 1
  await loadCurrentTab()
  persistState()
})

watch(orderPage, () => persistState())

function formatAmount(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number.toFixed(2) : '0.00'
}

function formatPrice(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number.toFixed(2) : '0.00'
}

function sellerAvatar(item) {
  const avatar = item?.user_info?.avatar || item?.avatar || ''
  return avatar ? resolveAssetUrl(avatar) : ''
}

function sellerName(item) {
  return item?.user_info?.nickname || item?.nickname || `卖家-${item?.uid || '--'}`
}

function isSellerTradeOrder(item = {}) {
  const currentId = String(userStore.id || '').trim()
  const currentMobile = String(userStore.mobile || '').trim()
  const sellerId = String(item?.seller_id || item?.sell_uid || item?.sellerInfo?.id || item?.seller_info?.id || '').trim()
  const sellerMobile = String(item?.seller_mobile || item?.sellerInfo?.mobile || item?.seller_info?.mobile || '').trim()
  const role = String(item?.role || '').trim()
  if (role === 'seller') return true
  if (role === 'buyer') return false
  if (sellerId && currentId) return sellerId === currentId
  return !!sellerMobile && !!currentMobile && sellerMobile === currentMobile
}


function parseTradeTime(value) {
  if (!value) return null
  const normalized = String(value).trim().replace(/-/g, '/')
  const time = new Date(normalized)
  return Number.isFinite(time.getTime()) ? time : null
}

function isTradeOrderExpired(item = {}) {
  const explicitExpired = [
    item.status_text,
    item.tip,
    item.order_status_text,
    item.remarks,
    item.remark,
    item.close_reason
  ].some((text) => /超时|已过期|已失效/.test(String(text || '')))
  if (explicitExpired) return true

  const remainingCandidates = [item.remaining_seconds, item.left_seconds, item.countdown, item.count_down]
  if (remainingCandidates.some((value) => value !== undefined && value !== null && Number(value) <= 0)) return true

  const expireAt = parseTradeTime(item.expire_time || item.expired_at || item.end_time || item.close_time)
  if (expireAt && expireAt.getTime() <= Date.now()) return true

  const createdAt = parseTradeTime(item.create_time || item.created_at)
  if (createdAt) {
    const elapsed = Date.now() - createdAt.getTime()
    if (elapsed >= 20 * 60 * 1000) return true
  }

  return false
}

function normalizeTradeOrder(item = {}) {
  const value = String(item?.status ?? '')
  const expired = value === '0' && isTradeOrderExpired(item)
  const effectiveStatus = expired ? '2' : value
  const effectiveStatusText = expired ? '已超时' : orderStatusText(value)
  return {
    ...item,
    remaining_seconds: Number(item.remaining_seconds ?? item.left_seconds ?? item.countdown ?? item.count_down ?? 0),
    pending_timeout_seconds: Number(item.pending_timeout_seconds || 1200),
    role: item.role || '',
    is_seller: Number(item.is_seller || 0),
    is_buyer: Number(item.is_buyer || 0),
    _effectiveStatus: effectiveStatus,
    _effectiveStatusText: effectiveStatusText,
    _expired: expired
  }
}

function marketStatusText(status) {
  const value = String(status ?? '')
  if (value === '1') return '上架中'
  if (value === '2') return '已下架'
  if (value === '3') return '已撤销'
  return '待处理'
}

function orderStatusText(status) {
  const value = String(status ?? '')
  if (value === '0') return '待汇款'
  if (value === '1') return '待验收'
  if (value === '2') return '已取消'
  if (value === '3') return '已完成'
  return '处理中'
}

function tradeOrderExpireAtMs(item = {}) {
  const expireAt = parseTradeTime(item.expire_time || item.expired_at || item.end_time || item.close_time)
  if (expireAt) return expireAt.getTime()
  const createdAt = parseTradeTime(item.create_time || item.created_at)
  if (!createdAt) return 0
  const timeoutMs = Number(item.pending_timeout_seconds || 1200) * 1000
  return createdAt.getTime() + timeoutMs
}

function tradeOrderRemainingSeconds(item = {}) {
  const explicit = Number(item.remaining_seconds ?? item.left_seconds ?? item.countdown ?? item.count_down ?? NaN)
  const expireAt = tradeOrderExpireAtMs(item)
  if (expireAt > 0) return Math.max(0, Math.floor((expireAt - nowTs.value) / 1000))
  if (Number.isFinite(explicit)) return Math.max(0, explicit)
  return 0
}

function tradeOrderRemainingLabel(item = {}) {
  const total = Math.max(0, tradeOrderRemainingSeconds(item))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}分${String(seconds).padStart(2, '0')}秒`
}

function showTradeOrderCountdown(item = {}) {
  return String(item?._effectiveStatus ?? item?.status ?? '') === '0' && tradeOrderRemainingSeconds(item) > 0
}

function canCancelPendingTrade(item = {}) {
  return !isSellerTradeOrder(item) && String(item?._effectiveStatus ?? item?.status ?? '') === '0' && tradeOrderRemainingSeconds(item) > 0
}

function stopOrderCountdownTimer() {
  if (orderCountdownTimer) {
    window.clearInterval(orderCountdownTimer)
    orderCountdownTimer = null
  }
}

async function refreshTimedOutOrders() {
  if (orderTimeoutRefreshLock) return
  orderTimeoutRefreshLock = true
  try {
    if (tab.value === 'orders') await loadTradeOrders({ merge: true })
    else await refreshPendingSummary({ merge: true })
  } finally {
    orderTimeoutRefreshLock = false
  }
}

function startOrderCountdownTimer() {
  stopOrderCountdownTimer()
  orderCountdownTimer = window.setInterval(async () => {
    nowTs.value = Date.now()
    const hasExpiredPending = allOrderRows.value.some((item) => String(item?._effectiveStatus ?? item?.status ?? '') === '0' && tradeOrderRemainingSeconds(item) <= 0)
    if (hasExpiredPending) await refreshTimedOutOrders()
  }, 1000)
}

function pendingTradeCountFromList(list = []) {
  return list.filter((item) => ['0', '1'].includes(String(item?._effectiveStatus ?? item?.status ?? ''))).length
}

function cleanupMarketLoadMoreObserver() {
  if (!marketLoadMoreObserver) return
  marketLoadMoreObserver.disconnect()
  marketLoadMoreObserver = null
}

function observeMarketLoadMore() {
  if (tab.value !== 'market') {
    cleanupMarketLoadMoreObserver()
    return
  }
  if (!marketLoadMoreRef.value || !marketHasMore.value) {
    cleanupMarketLoadMoreObserver()
    return
  }
  if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') return

  cleanupMarketLoadMoreObserver()
  marketLoadMoreObserver = new window.IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
        void loadMoreMarket()
      }
    },
    {
      root: null,
      rootMargin: '320px 0px',
      threshold: 0.01,
    }
  )
  marketLoadMoreObserver.observe(marketLoadMoreRef.value)
}

function pendingStatusCount(status) {
  return Number(pendingStatusCounts[String(status)] || 0)
}

function applyPendingSummary(list = []) {
  pendingStatusCounts[0] = list.filter((item) => String(item?._effectiveStatus ?? item?.status ?? '') === '0').length
  pendingStatusCounts[1] = list.filter((item) => String(item?._effectiveStatus ?? item?.status ?? '') === '1').length
  summary.orderCount = pendingTradeCountFromList(list)
}


function rememberOwnSaleIds(list = []) {
  const ids = list.map((item) => String(item?.id || '')).filter(Boolean)
  if (!ids.length) return
  mySaleIds.value = Array.from(new Set([...mySaleIds.value, ...ids]))
}

async function ensureOwnSaleIdsLoaded(force = false) {
  if (!force && mySaleIds.value.length) return mySaleIds.value
  try {
    const res = await apiTransactionMySale({ status: '' })
    const list = res.data?.list || []
    mySaleIds.value = list.map((item) => String(item?.id || '')).filter(Boolean)
    return mySaleIds.value
  } catch {
    return mySaleIds.value
  }
}

function isOwnOffer(item = {}) {
  const offerId = String(item?.id || '')
  const sellerId = String(item?.uid || item?.sell_uid || item?.user_id || '')
  const currentId = String(userStore.session?.id || userStore.session?.uid || userStore.profile?.id || '')
  if (offerId && mySaleIds.value.includes(offerId)) return true
  if (sellerId && currentId && sellerId === currentId) return true
  return false
}

function filterTradeOrdersByStatus(list = []) {
  if (orderStatus.value === 'null') return list
  return list.filter((item) => String(item._effectiveStatus ?? item.status ?? '') === String(orderStatus.value))
}

function mergeTradeRows(existing = [], incoming = []) {
  const map = new Map()
  existing.forEach((item, index) => {
    const key = String(item?.order_number || item?.id || `old-${index}`)
    map.set(key, { ...item, _originIndex: index })
  })
  incoming.forEach((item, index) => {
    const key = String(item?.order_number || item?.id || `new-${index}`)
    const prev = map.get(key) || {}
    map.set(key, { ...prev, ...item, _latestIndex: index })
  })
  return Array.from(map.values())
    .sort((a, b) => {
      const idDiff = Number(b?.id || 0) - Number(a?.id || 0)
      if (idDiff !== 0) return idDiff
      const aTime = new Date(a?.create_time || a?.expired_at || 0).getTime() || 0
      const bTime = new Date(b?.create_time || b?.expired_at || 0).getTime() || 0
      if (bTime !== aTime) return bTime - aTime
      return String(b?.order_number || '').localeCompare(String(a?.order_number || ''))
    })
    .map(({ _originIndex, _latestIndex, ...item }) => item)
}

async function refreshPendingSummary(options = {}) {
  const { merge = false } = options
  try {
    const res = await apiTransactionOrders({ status: 'null' })
    const list = (res.data?.list || []).map((item) => normalizeTradeOrder(item))
    const merged = merge && allOrderRows.value.length ? mergeTradeRows(allOrderRows.value, list) : list
    applyPendingSummary(merged)
    if (tab.value === 'orders') {
      allOrderRows.value = merged
      if (orderPage.value > totalOrderPages.value) orderPage.value = totalOrderPages.value
    }
  } catch {
    applyPendingSummary([])
  }
}

function appendMarketRows(list = []) {
  if (!Array.isArray(list) || !list.length) return
  const existingIds = new Set(marketRows.value.map((item) => String(item?.id || '')))
  const incoming = list.filter((item) => {
    const id = String(item?.id || '')
    if (id === '') return true
    if (existingIds.has(id)) return false
    existingIds.add(id)
    return true
  })
  if (incoming.length) {
    marketRows.value = [...marketRows.value, ...incoming]
  }
}

async function loadMarket(options = {}) {
  const { reset = true } = options
  const nextPage = reset ? 1 : (marketPage.value + 1)

  if (!reset) {
    if (marketLoadingMore.value || !marketHasMore.value) return
    marketLoadingMore.value = true
  }

  try {
    const res = await apiTransactionMarket({
      upper_lower: marketSort.value === 'desc' ? 1 : 0,
      user_status: marketOnlyMine.value ? 1 : '',
      page: nextPage,
      pageSize: marketPageSize,
    })

    const list = res.data?.list || []
    const currentPage = Number(res.data?.page || nextPage || 1) || 1
    const totalPages = Math.max(1, Number(res.data?.totalPages || 1) || 1)

    if (reset) {
      marketRows.value = list
      marketPage.value = currentPage
    } else {
      appendMarketRows(list)
      marketPage.value = currentPage
    }

    marketTotalPages.value = totalPages
    summary.productCount = Number(res.data?.TransactionProduct_count || 0)
    await refreshPendingSummary()
  } finally {
    if (!reset) {
      marketLoadingMore.value = false
    }
    observeMarketLoadMore()
  }
}

async function loadMoreMarket() {
  await loadMarket({ reset: false })
}

async function loadMine() {
  const res = await apiTransactionMySale({ status: mineStatus.value })
  mineRows.value = res.data?.list || []
  rememberOwnSaleIds(mineRows.value)
}

async function loadTradeOrders(options = {}) {
  const { merge = false } = options
  const res = await apiTransactionOrders({ status: 'null' })
  const list = (res.data?.list || []).map((item) => normalizeTradeOrder(item))
  allOrderRows.value = merge && allOrderRows.value.length ? mergeTradeRows(allOrderRows.value, list) : list
  applyPendingSummary(allOrderRows.value)
  if (orderPage.value > totalOrderPages.value) orderPage.value = totalOrderPages.value
}

async function loadCurrentTab() {
  try {
    loading.value = true
    message.value = ''
    if (tab.value === 'market') await loadMarket({ reset: true })
    if (tab.value === 'mine') await loadMine()
    if (tab.value === 'orders') await loadTradeOrders()
  } catch (error) {
    success.value = false
    message.value = error.message || '加载交易区失败'
  } finally {
    loading.value = false
    persistState()
  }
}

async function openBuy(item) {
  await ensureOwnSaleIdsLoaded()
  if (isOwnOffer(item)) {
    buySuccess.value = false
    buyMessage.value = '不能购买自己发布的挂单'
    success.value = false
    message.value = '不能购买自己发布的挂单'
    showBuyModal.value = false
    return
  }
  selectedOffer.value = item
  buyForm.pay_amount = ''
  buyForm.remittance_user_name = ''
  buyMessage.value = ''
  buySuccess.value = false
  showBuyModal.value = true
}

function closeBuyModal() {
  showBuyModal.value = false
  selectedOffer.value = null
  buyMessage.value = ''
}

function syncTradeRealtimeState(options = {}) {
  void refreshAppStateAfterAction(options).catch(() => null)
}

function patchTradeOrderState(orderNumber, patch = {}) {
  if (!orderNumber) return
  allOrderRows.value = allOrderRows.value.map((item) => {
    if (String(item?.order_number || '') !== String(orderNumber || '')) return item
    return normalizeTradeOrder({ ...item, ...patch })
  })
  applyPendingSummary(allOrderRows.value)
  persistState()
  return pendingTradeCountFromList(allOrderRows.value)
}

async function goToTradeDetail(orderNumber = '') {
  const value = String(orderNumber || '').trim()
  if (!value) return false
  try {
    await router.push({ name: 'transaction-trading-details', params: { orderNumber: value } })
    return true
  } catch {
    try {
      window.location.href = `/transaction-trading-details/${encodeURIComponent(value)}`
      return true
    } catch {
      return false
    }
  }
}

function extractOrderNumberFromAny(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || {})
  const match = String(text || '').match(/20\d{10,}/)
  return match?.[0] || ''
}

function sleep(ms = 0) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function resolveLatestTradeOrderNumber(selected = null) {
  const selectedId = String(selected?.id || '')
  const selectedPrice = Number(selected?.unit_price || 0)
  const selectedAmount = Number(buyForm.pay_amount || 0)
  const expectedPayment = selectedPrice > 0 && selectedAmount > 0 ? Number((selectedPrice * selectedAmount).toFixed(2)) : 0
  const requests = [{ status: '0' }, { status: 'null' }, { status: '' }]
  for (const request of requests) {
    try {
      const latest = await apiTransactionOrders(request)
      const list = (latest.data?.list || []).map((item) => normalizeTradeOrder(item))
      if (!list.length) continue
      allOrderRows.value = mergeTradeRows(allOrderRows.value, list)
      const exact = list.find((item) => {
        const effective = String(item._effectiveStatus ?? item.status ?? '')
        const byStatus = effective === '0'
        const parentId = String(item.product_id || item.transact_id || item.transaction_product_id || '')
        const byParent = selectedId ? parentId === selectedId : true
        const payment = Number(item.payment_amount || 0)
        const byPayment = expectedPayment > 0 ? Math.abs(payment - expectedPayment) < 0.01 : true
        return byStatus && byParent && byPayment
      })
      const target = exact || list.find((item) => String(item._effectiveStatus ?? item.status ?? '') === '0') || list[0]
      if (target?.order_number) return target.order_number
    } catch {
      // ignore
    }
  }
  return ''
}

async function submitBuyForm() {
  if (!selectedOffer.value?.id) return
  await ensureOwnSaleIdsLoaded()
  if (isOwnOffer(selectedOffer.value)) {
    buySuccess.value = false
    buyMessage.value = '不能购买自己发布的挂单'
    return
  }
  try {
    submittingBuy.value = true
    buyMessage.value = ''
    buySuccess.value = false
    const res = await apiTransactionBuy({
      transact_id: selectedOffer.value.id,
      pay_amount: buyForm.pay_amount,
      remittance_user_name: buyForm.remittance_user_name
    })
    success.value = true
    message.value = res.message || '下单成功'
    buySuccess.value = true

    let orderNumber = ''
    if (typeof res.data === 'string') orderNumber = extractOrderNumberFromAny(res.data)
    if (!orderNumber) orderNumber = res.data?.order_number || res.data?.orderNumber || ''
    if (!orderNumber) orderNumber = extractOrderNumberFromAny(res.message)
    if (!orderNumber) orderNumber = extractOrderNumberFromAny(res.data)

    await loadTradeOrders()
    tab.value = 'orders'
    syncTradeRealtimeState()
    if (!orderNumber) {
      await sleep(280)
      orderNumber = await resolveLatestTradeOrderNumber(selectedOffer.value)
    }
    if (orderNumber) {
      closeBuyModal()
      const pushed = await goToTradeDetail(orderNumber)
      if (!pushed) {
        buyMessage.value = '已创建订单，请到交易订单里继续付款'
        buySuccess.value = true
      }
    } else {
      buyMessage.value = '已创建订单，请到交易订单里继续付款'
      buySuccess.value = true
    }
  } catch (error) {
    buySuccess.value = false
    buyMessage.value = error.message || '购买失败'
  } finally {
    submittingBuy.value = false
  }
}

function openSaleModal(item = null) {
  saleForm.id = item?.id ? String(item.id) : ''
  saleForm.sell_account = item?.sell_account ? String(item.sell_account) : ''
  saleForm.unit_price = item?.unit_price ? String(item.unit_price) : ''
  saleForm.min_limit = item?.min_limit ? String(item.min_limit) : ''
  saleForm.max_limit = item?.max_limit ? String(item.max_limit) : ''
  showSaleModal.value = true
}

function closeSaleModal() {
  showSaleModal.value = false
}

async function submitSaleForm() {
  try {
    submittingSale.value = true
    const payload = {
      id: saleForm.id || undefined,
      sell_account: saleForm.sell_account,
      unit_price: saleForm.unit_price,
      min_limit: saleForm.min_limit,
      max_limit: saleForm.max_limit
    }
    const res = await apiTransactionSaleSubmit(payload)
    success.value = true
    message.value = res.message || '保存成功'
    closeSaleModal()
    await loadMine()
    await loadMarket()
  } catch (error) {
    success.value = false
    message.value = error.message || '保存挂单失败'
  } finally {
    submittingSale.value = false
  }
}

async function operateSale(status, item) {
  const actionMap = { 1: '上架', 2: '下架', 3: '撤销' }
  const confirmed = await showConfirm({
    title: `${actionMap[status] || '操作'}确认`,
    message: `确定${actionMap[status] || '操作'}这条挂单吗？`,
    variant: status === 3 ? 'danger' : 'default',
    confirmText: `确认${actionMap[status] || '操作'}`
  })
  if (!confirmed) return
  try {
    const res = await apiTransactionSaleStatus({ status, id: item.id })
    success.value = true
    message.value = res.message || '操作成功'
    await loadMine()
    await loadMarket()
  } catch (error) {
    success.value = false
    message.value = error.message || '挂单操作失败'
  }
}

async function cancelPendingTrade(item) {
  if (!item?.order_number) return
  const confirmed = await showConfirm({
    title: '取消交易订单',
    message: '确定取消这笔交易订单吗？',
    variant: 'danger',
    confirmText: '确认取消'
  })
  if (!confirmed) return
  try {
    const payload = {
      id: item.id || item.order_id || '',
      order_id: item.id || item.order_id || '',
      order_number: item.order_number
    }
    const res = await apiTransactionOrderCancel(payload)
    const pendingTradeCount = patchTradeOrderState(item.order_number, {
      status: '2',
      cancel_time: new Date().toLocaleString('sv-SE').replace('T', ' ')
    })
    success.value = true
    message.value = res.message || '取消成功'
    syncTradeRealtimeState({ tradePendingCount: pendingTradeCount })
    void loadTradeOrders({ merge: true }).catch(() => null)
  } catch (error) {
    success.value = false
    message.value = error.message || '取消订单失败'
  }
}

async function openTradeDetail(item) {
  if (!item?.order_number) return
  await goToTradeDetail(item.order_number)
}

function persistState() {
  setSessionCache(marketCacheKey, {
    tab: tab.value,
    marketRows: marketRows.value,
    marketPage: marketPage.value,
    marketTotalPages: marketTotalPages.value,
    mineRows: mineRows.value,
    orderRows: allOrderRows.value,
    marketSort: marketSort.value,
    marketOnlyMine: marketOnlyMine.value,
    mineStatus: mineStatus.value,
    orderStatus: orderStatus.value,
    orderPage: orderPage.value,
    summary: { ...summary },
    pendingStatusCounts: { ...pendingStatusCounts }
  })
}

async function refreshActiveTabSilently() {
  try {
    if (tab.value === 'orders') {
      await loadTradeOrders({ merge: true })
    } else if (tab.value === 'market') {
      if (marketPage.value > 1) {
        await refreshPendingSummary({ merge: true })
      } else {
        await loadMarket({ reset: true })
      }
    } else if (tab.value === 'mine') {
      await loadMine()
      await refreshPendingSummary({ merge: true })
    } else {
      await refreshPendingSummary()
    }
  } catch {
    // ignore background refresh errors
  } finally {
    persistState()
  }
}

function stopMarketPolling() {
  if (marketPollTimer) {
    window.clearTimeout(marketPollTimer)
    marketPollTimer = null
  }
}

function scheduleMarketPolling() {
  stopMarketPolling()
  marketPollTimer = window.setTimeout(() => {
    handleMarketPollingRefresh()
  }, typeof document !== 'undefined' && document.visibilityState === 'hidden' ? MARKET_HIDDEN_POLL_INTERVAL_MS : MARKET_ACTIVE_POLL_INTERVAL_MS)
}

function handleMarketPollingRefresh() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    scheduleMarketPolling()
    return
  }
  refreshActiveTabSilently().catch(() => null).finally(() => {
    scheduleMarketPolling()
  })
}

function bindMarketPollingListeners() {
  if (marketPollingListenersBound || typeof window === 'undefined' || typeof document === 'undefined') return
  window.addEventListener('focus', handleMarketPollingRefresh)
  document.addEventListener('visibilitychange', handleMarketPollingRefresh)
  marketPollingListenersBound = true
}

function unbindMarketPollingListeners() {
  if (!marketPollingListenersBound || typeof window === 'undefined' || typeof document === 'undefined') return
  window.removeEventListener('focus', handleMarketPollingRefresh)
  document.removeEventListener('visibilitychange', handleMarketPollingRefresh)
  marketPollingListenersBound = false
}

function startMarketPolling() {
  bindMarketPollingListeners()
  scheduleMarketPolling()
}

onMounted(async () => {
  startOrderCountdownTimer()
  const cached = getSessionCache(marketCacheKey, 20 * 60 * 1000)
  if (cached) {
    restoringState = true
    tab.value = cached.tab || 'market'
    marketRows.value = cached.marketRows || []
    marketPage.value = Number(cached.marketPage || 1) || 1
    marketTotalPages.value = Number(cached.marketTotalPages || 1) || 1
    mineRows.value = cached.mineRows || []
    allOrderRows.value = cached.orderRows || []
    marketSort.value = cached.marketSort || 'asc'
    marketOnlyMine.value = Boolean(cached.marketOnlyMine)
    mineStatus.value = cached.mineStatus ?? ''
    orderStatus.value = cached.orderStatus ?? 'null'
    orderPage.value = Number(cached.orderPage || 1) || 1
    Object.assign(summary, cached.summary || {})
    Object.assign(pendingStatusCounts, cached.pendingStatusCounts || {})
    restoringState = false
    startMarketPolling()
    observeMarketLoadMore()
    refreshActiveTabSilently().catch(() => null)
    return
  }
  await loadCurrentTab()
  persistState()
  startMarketPolling()
  observeMarketLoadMore()
})

onActivated(() => {
  startMarketPolling()
  startOrderCountdownTimer()
  observeMarketLoadMore()
  refreshActiveTabSilently().catch(() => null)
})

onDeactivated(() => {
  stopMarketPolling()
  unbindMarketPollingListeners()
  stopOrderCountdownTimer()
  cleanupMarketLoadMoreObserver()
})

onBeforeUnmount(() => {
  stopMarketPolling()
  unbindMarketPollingListeners()
  stopOrderCountdownTimer()
  cleanupMarketLoadMoreObserver()
})

watch(
  () => [tab.value, marketRows.value.length, marketHasMore.value, marketLoadMoreRef.value],
  () => {
    observeMarketLoadMore()
  }
)
</script>

<style scoped>
.trade-order-timeout-line {
  margin-top: 10px;
}
.trade-order-action-row {
  margin-top: 10px;
}

.market-load-sentinel {
  min-height: 28px;
  display: grid;
  place-items: center;
}
</style>

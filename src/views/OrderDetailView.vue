<template>
  <section class="stack-lg order-detail-page">
    <div v-if="order" class="stack-lg">
      <div class="card order-detail-hero">
        <div class="order-detail-top">
          <div>
            <div class="tiny-text muted">当前状态</div>
            <h1>{{ order.status_text }}</h1>
          </div>
          <span class="status-badge large" :class="statusClassFromKey(order.status_key)">{{ order.status_text }}</span>
        </div>
        <p class="muted order-detail-tip">{{ statusTip }}</p>
      </div>

      <div v-if="canConfirm" class="card stack-md order-confirm-card-top">
        <div class="section-head"><h2>到账确认</h2></div>
        <p class="muted">请核对充值是否已到账后再确认。</p>
        <div class="inline-actions mobile-actions two-action-grid">
          <button class="ghost-btn" type="button" :disabled="actionLoading || cancelLoading || deleteLoading" @click="submitConfirm(1)">未收到</button>
          <button class="primary-btn" type="button" :disabled="actionLoading || cancelLoading || deleteLoading" @click="submitConfirm(2)">已收到</button>
        </div>
      </div>

      <div class="card stack-md">
        <div class="section-head order-info-head">
          <h2>订单信息</h2>
          <span class="tiny-text muted order-info-time">下单时间 {{ order.time_display }}</span>
        </div>
        <div class="detail-rows-compact">
          <div class="detail-pair-row order-basic-row">
            <div class="detail-cell">
              <span class="tiny-text muted">商品名称</span>
              <div class="detail-value">{{ order.product_name }}</div>
            </div>
            <div class="detail-cell">
              <span class="tiny-text muted">订单号</span>
              <div class="detail-value break-all">{{ order.order_number || '-' }}</div>
            </div>
          </div>
          <div class="detail-pair-row order-basic-row">
            <div class="detail-cell">
              <span class="tiny-text muted">充值金额</span>
              <div class="detail-value">{{ order.amount_display }}</div>
            </div>
            <div class="detail-cell">
              <span class="tiny-text muted">优惠金额</span>
              <div class="detail-value">{{ order.discount_amount_display }}</div>
            </div>
          </div>
          <div class="detail-pair-row detail-pay-row order-basic-row">
            <div class="detail-cell">
              <span class="tiny-text muted">参考汇率</span>
              <div class="detail-value">{{ order.rate_display }}</div>
            </div>
            <div class="detail-cell">
              <span class="tiny-text muted">实付金额</span>
              <div class="detail-value highlight detail-payment-value">{{ order.payment_display }}</div>
            </div>
          </div>
          <div v-if="showActualReceived" class="detail-pair-row detail-row-full">
            <div class="detail-cell detail-cell-full actual-received-row">
              <span class="tiny-text muted">实际到账</span>
              <div class="detail-value actual-received-value">{{ order.actual_received_display }}</div>
            </div>
          </div>
          <div v-if="order.has_wallet_refund" class="detail-pair-row detail-row-full">
            <div class="detail-cell detail-cell-full refund-wallet-row">
              <span class="tiny-text muted">退款说明</span>
              <div class="detail-value refund-wallet-value">{{ order.refund_wallet_text }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card stack-md">
        <div class="section-head"><h2>充值信息</h2></div>
        <div v-if="order.order_info_entries.length" class="stack-sm">
          <div v-for="entry in order.order_info_entries" :key="entry.label + entry.value" class="detail-line">
            <span class="tiny-text muted">{{ entry.label }}</span>
            <strong class="detail-line-value">{{ entry.value }}</strong>
          </div>
        </div>
        <p v-else class="muted">暂无充值信息</p>
      </div>

      <div class="order-action-plain stack-md">
        <button class="primary-btn block order-action-btn" type="button" :disabled="actionLoading || cancelLoading || deleteLoading" @click="goContactService">联系客服</button>
        <button v-if="canCancel" class="ghost-btn block order-action-btn" type="button" :disabled="actionLoading || cancelLoading || deleteLoading" @click="handleCancelOrder">
          {{ cancelLoading ? '取消中...' : '取消订单' }}
        </button>
        <button class="danger-btn block order-action-btn" type="button" :disabled="actionLoading || cancelLoading || deleteLoading" @click="handleDeleteOrder">
          {{ deleteLoading ? '删除中...' : '删除订单' }}
        </button>
      </div>

      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />
    </div>

    <div v-else-if="loading" class="card empty-card app-empty app-loading-card">
      <AppLoader size="lg" />
    </div>

    <div v-else-if="loadFailed" class="card empty-card app-empty">
      <div class="empty-emoji">⚠️</div>
      <h3>订单详情加载失败</h3>
      <p class="muted">{{ message || '请稍后重试。' }}</p>
      <button class="primary-btn block" type="button" @click="loadOrderDetail">重新加载</button>
    </div>

    <div v-else class="card empty-card app-empty">
      <div class="empty-emoji">📭</div>
      <h3>未找到订单</h3>
      <p class="muted">请返回订单页重新选择。</p>
      <router-link to="/orders" class="primary-btn block">返回订单列表</router-link>
    </div>
  </section>
</template>

<script setup>
import FeedbackToast from '../components/FeedbackToast.vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiOrderCancel, apiOrderConfirmReceipt, apiOrderDelete, apiOrderDetail } from '../api/order'
import { refreshAppStateAfterAction } from '../stores/badges'
import {
  normalizeOrder,
  removeOrderFromOrdersCache,
  statusClassFromKey,
  updateOrderInOrdersCache,
  writeOrderDetailCache
} from '../utils/orders'
import { showConfirm } from '../utils/ui'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const actionLoading = ref(false)
const cancelLoading = ref(false)
const deleteLoading = ref(false)
const order = ref(null)
const message = ref('')
const success = ref(false)
const feedbackClass = computed(() => (success.value ? 'feedback success' : 'feedback error'))
const loadFailed = computed(() => !loading.value && !order.value && !success.value && Boolean(message.value))

const canConfirm = computed(() => order.value?.status_key === 'pending_confirm')
const canCancel = computed(() => order.value?.status_key === 'pending_charge')
const showActualReceived = computed(() => !!order.value && (order.value.has_actual_received || canConfirm.value || order.value.status_key === 'completed' || order.value.status_key === 'not_received'))
const statusTip = computed(() => {
  const key = order.value?.status_key
  if (key === 'pending_charge') return '订单已提交，等待系统处理。'
  if (key === 'processing') return '订单正在处理中，请耐心等待。'
  if (key === 'pending_confirm') return '系统已完成充值，请确认是否到账。'
  if (key === 'completed') return '您已确认收到，本单已完成。'
  if (key === 'not_received') return '您已反馈未收到，订单进入跟进状态。'
  if (key === 'cancelled') return '订单已取消。'
  return '请以订单最新状态为准。'
})

function syncOrderRealtimeState() {
  void refreshAppStateAfterAction().catch(() => null)
}

function applyLocalOrderPatch(patch = {}) {
  if (!order.value) return
  order.value = {
    ...order.value,
    ...patch
  }
  writeOrderDetailCache(order.value)
  updateOrderInOrdersCache(order.value)
}

async function loadOrderDetail() {
  loading.value = true
  message.value = ''
  try {
    const direct = await apiOrderDetail(route.params.orderNumber)
    const payload = direct.data || {}
    const normalized = payload ? normalizeOrder(payload) : null
    if (!normalized?.order_number) {
      throw new Error(direct.message || '订单详情为空')
    }
    order.value = normalized
    writeOrderDetailCache(order.value)
    updateOrderInOrdersCache(order.value)
    success.value = true
  } catch (error) {
    order.value = null
    message.value = error.message || '订单加载失败'
    success.value = false
  } finally {
    loading.value = false
  }
}

async function submitConfirm(confirmStatus) {
  if (!order.value?.id) return
  actionLoading.value = true
  message.value = ''
  try {
    const res = await apiOrderConfirmReceipt({
      id: order.value.id,
      order_number: order.value.order_number,
      product_type: order.value.product_type || order.value.type || 0,
      confirm_status: confirmStatus
    })
    applyLocalOrderPatch(confirmStatus === 2
      ? {
          status: 2,
          confirm_status: 2,
          status_key: 'completed',
          status_text: '已完成'
        }
      : {
          confirm_status: 3,
          status_key: 'not_received',
          status_text: '未收到'
        })
    success.value = true
    message.value = res.message || '操作成功'
    syncOrderRealtimeState()
    await loadOrderDetail()
  } catch (error) {
    success.value = false
    message.value = error.message || '操作失败'
  } finally {
    actionLoading.value = false
  }
}

async function handleCancelOrder() {
  if (!canCancel.value || !order.value?.id) return
  const confirmed = await showConfirm({
    title: '取消订单确认',
    message: '确定取消这笔待充值订单吗？取消后余额将退回钱包。',
    variant: 'danger',
    confirmText: '确认取消'
  })
  if (!confirmed) return
  cancelLoading.value = true
  message.value = ''
  try {
    const res = await apiOrderCancel({ id: order.value.id })
    applyLocalOrderPatch({
      status: 3,
      status_key: 'cancelled',
      status_text: '已取消'
    })
    success.value = true
    message.value = res.message || '取消成功'
    syncOrderRealtimeState()
    await loadOrderDetail()
  } catch (error) {
    success.value = false
    message.value = error.message || '取消失败'
  } finally {
    cancelLoading.value = false
  }
}

async function handleDeleteOrder() {
  if (!order.value?.id && !route.params.orderNumber) return
  const confirmed = await showConfirm({
    title: '删除订单确认',
    message: '确定删除这笔订单吗？删除后只会在当前用户前端隐藏，后台和数据库仍会保留。',
    variant: 'danger',
    confirmText: '确认删除'
  })
  if (!confirmed) return
  deleteLoading.value = true
  message.value = ''
  try {
    const res = await apiOrderDelete({
      id: order.value?.id || '',
      del_id: order.value?.id || route.params.orderNumber,
      order_number: order.value?.order_number || route.params.orderNumber
    })
    success.value = true
    message.value = res.message || '删除成功，订单已隐藏'
    removeOrderFromOrdersCache(order.value?.order_number || route.params.orderNumber)
    setTimeout(() => {
      router.replace('/orders')
    }, 250)
  } catch (error) {
    success.value = false
    message.value = error.message || '删除失败'
  } finally {
    deleteLoading.value = false
  }
}

function goContactService() {
  router.push('/contact-service')
}

onMounted(() => {
  loadOrderDetail()
})
</script>

<style scoped>
.order-action-plain {
  display: grid;
  gap: 12px;
  width: 100%;
  align-self: stretch;
}

.order-action-btn {
  width: 100%;
  max-width: none;
  display: block;
}

.order-info-head {
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.order-info-time {
  white-space: nowrap;
}

.actual-received-row {
  background: rgba(80, 114, 255, 0.06);
  border: 1px solid rgba(104, 137, 255, 0.12);
}

.actual-received-value {
  color: var(--brand-primary);
  font-weight: 800;
  font-size: 1.125rem;
}

.refund-wallet-row {
  background: rgba(24, 160, 88, 0.08);
  border: 1px solid rgba(24, 160, 88, 0.16);
}

.refund-wallet-value {
  color: #167c45;
  font-weight: 700;
}
</style>

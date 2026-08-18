import { getCachedHomeBootstrap } from '../api/home-helpers'
import { resolveAssetUrl } from './assets'
import { formatMoney } from './format'

export const ORDERS_CACHE_KEY = 'tp8_orders_cache_v9'

const ORDER_DETAIL_CACHE_PREFIX = 'tp8_order_detail_v2_'
const LEGACY_ORDER_DETAIL_CACHE_PREFIX = 'tp8_order_detail_'

export const ORDER_FILTER_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '待充值', value: 'pending_charge' },
  { label: '充值中', value: 'processing' },
  { label: '待确认', value: 'pending_confirm' },
  { label: '已完成', value: 'completed' },
  { label: '未收到', value: 'not_received' },
  { label: '已取消', value: 'cancelled' }
]

export function parseProductInfo(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

export function parseOrderInfoEntries(value) {
  if (!value) return []
  let list = value
  if (typeof value === 'string') {
    try {
      list = JSON.parse(value)
    } catch {
      list = [value]
    }
  }
  if (!Array.isArray(list)) {
    if (typeof list === 'object') {
      return Object.entries(list).map(([label, val]) => ({ label, value: String(val || '-') }))
    }
    list = [String(list)]
  }
  return list.map((item, index) => {
    const text = typeof item === 'string' ? item : JSON.stringify(item)
    const match = text.match(/^\[([^\]]+)\](.*)$/)
    if (match) {
      return { label: match[1], value: (match[2] || '-').trim() || '-' }
    }
    return { label: `信息${index + 1}`, value: String(text || '-') }
  })
}

export function parseOrderInfoDisplay(value) {
  return parseOrderInfoEntries(value).map((item) => `${item.label}：${item.value}`).join(' / ') || '-'
}

export function deriveOrderStatus(raw = {}) {
  const status = Number(raw.status)
  const confirmStatus = Number(raw.confirm_status ?? 0)
  if (status === 3) return { key: 'cancelled', text: '已取消' }
  if (confirmStatus === 3) return { key: 'not_received', text: '未收到' }
  if (status === 2 && confirmStatus === 1) return { key: 'pending_confirm', text: '待确认' }
  if (status === 2) return { key: 'completed', text: '已完成' }
  if (status === 1) return { key: 'processing', text: '充值中' }
  return { key: 'pending_charge', text: '待充值' }
}

function getCachedProducts() {
  const cache = getCachedHomeBootstrap()
  return [...(cache?.featuredProducts || []), ...(cache?.allProducts || [])]
}

function resolveProductFallback(item, productInfo) {
  const products = getCachedProducts()
  const productId = item.product_id || productInfo.id || productInfo.product_id
  const byId = products.find((entry) => Number(entry?.id || 0) === Number(productId))
  if (byId) return byId
  return products.find((entry) => entry.name === item.product_name || entry.name === productInfo.name || entry.home_name === item.product_name || entry.home_name === productInfo.name) || null
}

export function normalizeOrder(item) {
  const productInfo = parseProductInfo(item.product_info)
  const localProduct = resolveProductFallback(item, productInfo)
  const rechargeRaw = item.amount_money ?? item.recharge_amount ?? item.par_value ?? item.amount ?? item.money ?? '-'
  const paymentRaw = item.cny_amount ?? item.payment_amount ?? item.real_amount ?? item.pay_money ?? item.discount_money ?? item.amount ?? '-'
  const discountAmountRaw = item.discount_amount ?? item.preferential_amount ?? item.save_amount ?? ''
  const orderStatus = deriveOrderStatus(item)
  const actualReceivedRaw = item.amount_received ?? item.actual_amount ?? item.received_amount ?? item.arrival_amount ?? item.complete_amount ?? item.receipt_amount ?? ''
  const actualReceivedNumber = Number(actualReceivedRaw)
  const hasActualReceived = !(actualReceivedRaw === undefined || actualReceivedRaw === null || String(actualReceivedRaw).trim() === '') && !Number.isNaN(actualReceivedNumber) && actualReceivedNumber > 0
  const actualReceivedDisplayRaw = item.amount_received_display ?? (hasActualReceived ? actualReceivedRaw : (Number(item.status) === 2 ? rechargeRaw : actualReceivedRaw))
  const refundWalletRaw = item.refund_wallet_amount_raw ?? item.refund_wallet_amount ?? item.settlement_refund_usdt_amount ?? 0
  const refundWalletAmount = Number(refundWalletRaw)
  const hasWalletRefund = !Number.isNaN(refundWalletAmount) && refundWalletAmount > 0
  const refundWalletAmountDisplay = hasWalletRefund ? formatMoney(refundWalletAmount) : '--'
  const refundWalletText = item.refund_wallet_text || (hasWalletRefund ? `已退款到钱包 ${refundWalletAmountDisplay} USDT` : '')

  return {
    ...item,
    product_name: item.product_name || productInfo.name || productInfo.product_name || item.name || localProduct?.name || '未知产品',
    product_image: resolveAssetUrl(item.product_image || productInfo.image || localProduct?.image || ''),
    amount_display: formatMoney(rechargeRaw),
    payment_display: formatMoney(paymentRaw),
    discount_amount_display: formatMoney(discountAmountRaw),
    actual_received_display: formatMoney(actualReceivedDisplayRaw),
    has_actual_received: hasActualReceived,
    has_wallet_refund: hasWalletRefund,
    refund_wallet_amount_display: refundWalletAmountDisplay,
    refund_wallet_text: refundWalletText,
    rate_display: item.rate ? String(item.rate) : '--',
    time_display: item.create_time || item.created_at || item.complete_time || item.update_time || '-',
    status_key: orderStatus.key,
    status_text: orderStatus.text,
    type_label: Number(item.type) === 2 ? '查询类' : '充值类',
    order_info_entries: parseOrderInfoEntries(item.order_info || item.order_content || item.info),
    order_info_display: parseOrderInfoDisplay(item.order_info || item.order_content || item.info)
  }
}

export function filterOrdersByStatus(list = [], status = 'all') {
  if (status === 'all') return list
  return list.filter((item) => item.status_key === status)
}

export function statusClassFromKey(key = '') {
  const map = {
    pending_charge: 'pending',
    processing: 'progress',
    pending_confirm: 'confirm',
    completed: 'done',
    not_received: 'danger',
    cancelled: 'cancel'
  }
  return map[key] || 'pending'
}

export function writeOrderDetailCache(order) {
  if (!order?.order_number) return
  try {
    sessionStorage.setItem(`${ORDER_DETAIL_CACHE_PREFIX}${order.order_number}`, JSON.stringify(order))
  } catch {
    // ignore
  }
}

export function readOrderDetailCache(orderNumber) {
  try {
    return JSON.parse(sessionStorage.getItem(`${ORDER_DETAIL_CACHE_PREFIX}${orderNumber}`) || 'null')
  } catch {
    return null
  }
}

export function updateOrderInOrdersCache(order) {
  if (!order?.order_number || typeof sessionStorage === 'undefined') return
  const keys = [ORDERS_CACHE_KEY]
  for (const key of keys) {
    try {
      const cache = JSON.parse(sessionStorage.getItem(key) || 'null')
      if (!cache || !Array.isArray(cache.rows)) continue
      cache.rows = cache.rows.map((item) => (String(item.order_number) === String(order.order_number) ? { ...item, ...order } : item))
      sessionStorage.setItem(key, JSON.stringify(cache))
    } catch {
      // ignore cache errors
    }
  }
}

export function removeOrderFromOrdersCache(orderNumber) {
  if (!orderNumber || typeof sessionStorage === 'undefined') return
  const keys = [ORDERS_CACHE_KEY]
  for (const key of keys) {
    try {
      const cache = JSON.parse(sessionStorage.getItem(key) || 'null')
      if (!cache || !Array.isArray(cache.rows)) continue
      cache.rows = cache.rows.filter((item) => String(item.order_number) !== String(orderNumber))
      sessionStorage.setItem(key, JSON.stringify(cache))
    } catch {}
  }
  try {
    sessionStorage.removeItem(`${ORDER_DETAIL_CACHE_PREFIX}${orderNumber}`)
    sessionStorage.removeItem(`${LEGACY_ORDER_DETAIL_CACHE_PREFIX}${orderNumber}`)
  } catch {}
}

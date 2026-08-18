import http from './http'

export async function apiFinanceSummary() {
  const res = await http.get('/api/finance/summary')
  const payload = res.data || {}
  return {
    ...res,
    data: payload.summary || payload
  }
}

export function apiFinanceOrders(params = {}) {
  return http.get('/api/finance/orders', { params })
}

export function apiFinanceRecharge(payload) {
  return http.post('/api/finance/recharge', payload)
}

export function apiFinanceRechargeDetail(orderNumber) {
  return http.get('/api/finance/recharge-detail', { params: { order_number: orderNumber } })
}

export function apiFinanceRechargeSubmit(payload) {
  return http.post('/api/finance/recharge-submit', payload)
}

export function apiFinanceRechargeSubmitImage(orderNumber, file) {
  const form = new FormData()
  form.append('order_number', String(orderNumber || ''))
  form.append('action', 'image')
  form.append('file', file)
  return http.post('/api/finance/recharge-submit', form, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export function apiFinanceWithdrawal(payload) {
  return http.post('/api/finance/withdrawal', payload)
}

export function apiFinanceWithdrawalPreview(amount) {
  return http.get('/api/finance/withdrawal-preview', { params: { amount } })
}

export function apiFinanceWithdrawalSubmit(payload) {
  return http.post('/api/finance/withdrawal-submit', payload)
}

export function apiFinanceWithdrawalDetail(id) {
  return http.get('/api/finance/withdrawal-detail', { params: { id } })
}

function normalizeFinanceRecord(item = {}, tab = 'recharge') {
  const amount = item.actual_amount || item.amount || '0.00'
  const statusText = String(item.status_text || item.text || item.title || '').trim()
  return {
    id: item.id || item.order_number || `${tab}-${item.create_time || ''}-${amount}`,
    order_number: item.order_number || '',
    title: tab === 'withdraw' ? '余额提现' : '余额充值',
    amount: String(amount || '0.00'),
    text: statusText || (tab === 'withdraw' ? '提现记录' : '充值记录'),
    unit: item.unit || 'USDT',
    date: item.date || item.create_time || item.submit_time || '-',
    status: Number(item.status ?? item.order_status ?? item.pay_status ?? 0),
    status_text: statusText,
    raw: item
  }
}

function isCreditedRechargeRecord(item = {}) {
  const status = Number(item.status ?? item.order_status ?? item.pay_status ?? -999)
  const text = `${item.status_text || ''} ${item.text || ''} ${item.title || ''}`
  if (/待汇款|待审核|待确认|待处理|上传凭证|已取消|取消|失败|驳回|关闭/.test(text)) return false
  if (status === 3) return true
  return /成功|已到账|已完成|审核通过|充值成功/.test(text)
}

export async function getFinanceOrderRecords(tab = 'recharge', options = {}) {
  const pageSize = Number(options.pageSize || 20) || 20
  const maxPages = Number(options.maxPages || 20) || 20
  const records = []
  let page = 1
  let totalPages = 1

  do {
    const res = await apiFinanceOrders({ tab, page, pageSize })
    const payload = res.data || {}
    const currentRecords = Array.isArray(payload.records) ? payload.records : []
    records.push(...currentRecords.map((item) => normalizeFinanceRecord(item, tab)))
    totalPages = Number(payload.totalPages || payload.total_pages || 1) || 1
    page += 1
  } while (page <= totalPages && page <= maxPages)

  if (tab === 'recharge') {
    return records.filter((item) => isCreditedRechargeRecord(item.raw || item))
  }

  return records
}


export async function apiFinanceDetailSummary() {
  const res = await http.get('/api/finance/detail-summary')
  return {
    ...res,
    data: res.data || {}
  }
}

export function apiFinanceDetailRecords(params = {}) {
  return http.get('/api/finance/detail-records', { params })
}

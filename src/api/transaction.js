import http from './http'

async function tryCalls(attempts = []) {
  let lastError = null
  for (const attempt of attempts) {
    try {
      return await attempt()
    } catch (error) {
      lastError = error
      const code = Number(error?.code || 0)
      if (code && code !== 404 && code !== 500) break
    }
  }
  throw lastError || new Error('请求失败')
}

export function apiTransactionMarket(payload = {}) {
  return http.get('/api/transaction/market', {
    params: payload
  })
}

export function apiTransactionMySale(payload = {}) {
  return http.get('/api/transaction/my-sale', {
    params: {
      page: payload.page || 1,
      pageSize: payload.limit || payload.pageSize || 10,
      status: typeof payload.status !== 'undefined' ? payload.status : ''
    }
  })
}

export function apiTransactionSaleStatus(payload) {
  return http.post('/api/transaction/sale-status', payload)
}

export function apiTransactionSaleSubmit(payload) {
  return http.post('/api/transaction/sale-submit', payload)
}

export function apiTransactionBuy(payload) {
  return http.post('/api/transaction/buy', payload)
}

export function apiTransactionOrders(payload = {}) {
  return http.get('/api/transaction/orders', {
    params: {
      page: payload.page || 1,
      pageSize: payload.limit || payload.pageSize || 10,
      tab: payload.tab ? payload.tab : 'all'
    }
  })
}

export function apiTransactionOrderRelease(payload) {
  return http.post('/api/transaction/order-release', payload)
}


export function apiTransactionOrderDetail(orderNumber) {
  const value = encodeURIComponent(String(orderNumber || ''))
  return http.get(`/api/transaction/order-detail/${value}`)
}

export function apiTransactionOrderProofImageUpload(payload = {}) {
  const form = new FormData()
  if (payload.id !== undefined && payload.id !== null) form.append('id', String(payload.id))
  if (payload.order_id !== undefined && payload.order_id !== null) form.append('order_id', String(payload.order_id))
  if (payload.order_number !== undefined && payload.order_number !== null) form.append('order_number', String(payload.order_number))
  form.append('file', payload.file)
  return http.post('/api/transaction/order-proof-image', form, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export async function apiTransactionOrderProofSubmit(payload) {
  return http.post('/api/transaction/order-proof-submit', payload)
}

export function apiTransactionOrderCancel(payload) {
  return http.post('/api/transaction/order-cancel', payload)
}

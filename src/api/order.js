import http from './http'

export function apiOrderList(payload = {}) {
  return http.get('/api/order/list', {
    params: payload
  })
}

export function apiOrderCancel(payload) {
  return http.post('/api/order/cancel', payload)
}

export function apiOrderQuery(payload) {
  return http.post('/api/order/query', payload)
}

export async function apiOrderConfirmReceipt(payload) {
  return http.post('/api/order/confirm-receipt', payload)
}

export function apiOrderDelete(payload) {
  return http.post('/api/order/delete', payload)
}

export function apiOrderDetail(orderNumber) {
  return http.get(`/api/order/detail/${encodeURIComponent(orderNumber)}`)
}

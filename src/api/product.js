import http from './http'

export function apiProductDetail(id) {
  const value = encodeURIComponent(String(id || ''))
  return http.get(`/api/product/detail/${value}`)
}

export function apiProductConfirmRecharge(payload) {
  return http.post('/api/product/confirm-recharge', payload)
}

export function apiProductConfirmPayment(payload) {
  return http.post('/api/product/confirm-payment', payload)
}

export function apiProductDiscount(payload) {
  return http.post('/api/product/discount', payload)
}

export function apiProductQuerySubmit(payload) {
  return http.post('/api/product/query-submit', payload)
}

export function apiProductQueryPayment(payload) {
  return http.post('/api/product/query-payment', payload)
}

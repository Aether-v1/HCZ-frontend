import http from './http'
import { buildSubstationTierSavePayload } from './substation-helpers'

export function apiSubstationMyStatus() {
  return http.get('/api/substation/my/status')
}

export function apiSubstationMyProfile() {
  return http.get('/api/substation/my/profile')
}

export function apiSubstationOpenPay() {
  return http.post('/api/substation/open-pay')
}

export function apiSubstationApply(payload) {
  return http.post('/api/substation/apply', payload)
}

export function apiSubstationSubmitProfileAudit(payload) {
  return http.post('/api/substation/my/profile-audit', payload)
}

export function apiSubstationProductTierList(productId) {
  return http.get('/api/substation/my/product-tier-list', { params: { product_id: productId } })
}

export function apiSubstationProductCatalog() {
  return http.get('/api/substation/my/product-catalog')
}

export function apiSubstationSaveProductTierPrice(productId, tiers, productDescribe = '') {
  return http.post('/api/substation/my/product-tier-save', buildSubstationTierSavePayload(productId, tiers, productDescribe))
}

export function apiSubstationIncomeLog(params = {}) {
  return http.get('/api/substation/my/income-log', { params })
}

export function apiSubstationWalletTransfer(payload) {
  return http.post('/api/substation/my/wallet-transfer', payload)
}

import http from './http'

function extractBinding(payload = {}, key) {
  if (payload?.[key] && typeof payload[key] === 'object') return payload[key]
  return payload
}

export function apiAccountProfile() {
  return http.get('/api/account/profile')
}

export function apiAccountSettings() {
  return http.get('/api/account/settings')
}

export function apiAccountTelegramBindingStatus() {
  return http.get('/api/account/telegram-binding-status')
}

export function apiAccountTwofaStatus() {
  return http.get('/api/account/twofa/status')
}

export function apiAccountTwofaInit() {
  return http.post('/api/account/twofa/init')
}

export function apiAccountTwofaVerify(payload) {
  return http.post('/api/account/twofa/verify', payload)
}

export function apiAccountTwofaDisable(payload) {
  return http.post('/api/account/twofa/disable', payload)
}

export function apiAccountTwofaReset(payload) {
  return http.post('/api/account/twofa/reset', payload)
}

export function apiAccountTwofaRecover(payload) {
  return http.post('/api/account/twofa/recover', payload)
}

export function apiAccountTwofaRecoveryCodesRegenerate(payload) {
  return http.post('/api/account/twofa/recovery-codes/regenerate', payload)
}

export function apiAccountTelegramBindingCode() {
  return http.post('/api/account/telegram-binding-code')
}

export function apiAccountTelegramUnbind() {
  return http.post('/api/account/telegram-unbind')
}

export function apiAccountProfileSave(payload) {
  return http.post('/api/account/profile-save', payload)
}

export function apiAccountPasswordSave(payload) {
  return http.post('/api/account/password-save', payload)
}

export function apiAccountWalletAddressSave(payload) {
  return http.post('/api/account/wallet-address-save', payload)
}

export function apiAuthCheckPassword(payload) {
  return http.post('/api/auth/check-password', payload)
}

export function apiAccountBankCardSave(payload) {
  return http.post('/api/account/bank-card-save', payload)
}

export function apiAccountBankCardDelete(payload) {
  return http.post('/api/account/bank-card-delete', payload)
}

export function apiAccountBankCardDefault(payload) {
  return http.post('/api/account/bank-card-default', payload)
}

export function getWalletSummary(payload = {}) {
  const hasRange = Boolean(payload?.start_time || payload?.end_time)
  if (hasRange) return http.post('/api/finance/wallet-details', payload)
  return http.get('/api/finance/summary')
}

export async function apiAccountWalletAddress() {
  const res = await http.get('/api/account/wallet-address')
  return {
    ...res,
    data: extractBinding(res.data, 'wallet_address')
  }
}

export async function apiAccountBankCard() {
  const res = await http.get('/api/account/bank-card')
  return {
    ...res,
    data: extractBinding(res.data, 'bank_card')
  }
}

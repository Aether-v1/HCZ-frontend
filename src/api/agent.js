import http from './http'
import { normalizeAgentSummary, normalizeAgentUsersPayload } from './agent-helpers'

export async function apiAgentSummary() {
  const res = await http.get('/api/agent/summary')
  return {
    ...res,
    data: normalizeAgentSummary(res.data || {})
  }
}

export function apiAgentActivate() {
  return http.post('/api/agent/activate', {})
}

export async function apiAgentUsers(level = 1, page = 1, pageSize = 100) {
  const res = await http.get('/api/agent/users', { params: { level, page, pageSize } })
  return {
    ...res,
    data: normalizeAgentUsersPayload(res.data || {})
  }
}

export function apiAgentWalletTransfer(payload) {
  return http.post('/api/agent/wallet-transfer', payload)
}

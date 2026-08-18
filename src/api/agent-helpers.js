import { resolveAssetUrl } from '../utils/assets'

export function normalizeAgentAsset(value = '') {
  const text = String(value || '').trim()
  if (!text) return ''
  try {
    return resolveAssetUrl(text)
  } catch {
    return text
  }
}

export function normalizeAgentSummary(payload = {}) {
  return {
    ...payload,
    avatar: normalizeAgentAsset(payload.avatar || '')
  }
}

export function normalizeAgentUsersPayload(payload = {}) {
  const list = Array.isArray(payload.list)
    ? payload.list.map((item = {}) => ({
        ...item,
        id: item.id ?? item.user_id ?? item.uid ?? '',
        nickname: item.nickname || item.name || item.user_name || '',
        mobile: item.mobile || item.phone || '',
        avatar: normalizeAgentAsset(item.avatar || item.user_avatar || ''),
        create_time: item.create_time || item.join_time || item.latest_rebate_time || '',
        total_rebate: item.total_rebate || item.rebate_total || item.amount_total || '0.00'
      }))
    : []

  return {
    ...payload,
    list
  }
}
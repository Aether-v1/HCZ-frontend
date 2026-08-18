const messageTypeLabels = {
  official: '官方消息',
  global: '全局消息',
  recharge: '充值',
  withdraw: '提现',
  order: '订单',
  trade: '交易',
  agent: '分销',
  auth: '实名',
  other: '其他'
}

function parseDate(value) {
  if (!value) return null
  const normalized = String(value).trim().replace(/-/g, '/')
  const date = new Date(normalized)
  return Number.isFinite(date.getTime()) ? date : null
}

function pad(value) {
  return String(value).padStart(2, '0')
}

export function getMessageTypeLabel(type) {
  return messageTypeLabels[String(type || '').trim()] || '其他'
}

export function formatMessageTime(value) {
  const date = parseDate(value)
  if (!date) return String(value || '')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatUnreadCount(count) {
  const value = Number(count || 0)
  if (value <= 0) return ''
  if (value > 99) return '99+'
  return String(value)
}

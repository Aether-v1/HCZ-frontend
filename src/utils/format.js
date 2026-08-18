export function formatMoney(value) {
  if (value === undefined || value === null || value === '') return '--'
  const raw = String(value).replace(/[￥$,\s]/g, '').trim()
  if (!raw) return '--'
  const num = Number(raw)
  if (Number.isNaN(num)) return String(value)
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function parseLocationParts(value) {
  const parts = String(value || '').split(/[\/｜|,-]+|\s{2,}|\s*\/\s*|\s*·\s*/).map((item) => item.trim()).filter(Boolean)
  return {
    province: parts[0] || '',
    city: parts[1] || '',
    district: parts[2] || ''
  }
}

export function buildLocation(parts = {}) {
  return [parts.province, parts.city, parts.district].map((item) => String(item || '').trim()).filter(Boolean).join(' / ')
}

export function resolveCurrentOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return ''
}

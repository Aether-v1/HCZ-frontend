import http from './http'
import { fallbackPhoneMeta, isValidChinaMobile, normalizeChinaMobile } from '../utils/phone'

export async function getPhoneMeta(mobile) {
  const normalized = normalizeChinaMobile(mobile)
  if (!isValidChinaMobile(normalized)) {
    return fallbackPhoneMeta(normalized)
  }

  try {
    const res = await http.post('/api/phone/meta', { mobile: normalized })
    const payload = res.data || {}
    return {
      mobile: normalized,
      is_valid: payload.is_valid !== undefined ? Boolean(payload.is_valid) : true,
      province: payload.province || '',
      city: payload.city || '',
      carrier: payload.carrier || fallbackPhoneMeta(normalized).carrier
    }
  } catch {
    return fallbackPhoneMeta(normalized)
  }
}

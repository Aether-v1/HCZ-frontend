const carrierMap = [
  { name: '中国移动', prefixes: ['134','135','136','137','138','139','147','148','150','151','152','157','158','159','165','172','178','182','183','184','187','188','195','197','198'] },
  { name: '中国联通', prefixes: ['130','131','132','145','146','155','156','166','167','171','175','176','185','186','196'] },
  { name: '中国电信', prefixes: ['133','149','153','162','173','174','177','180','181','189','190','191','193','199'] },
  { name: '中国广电', prefixes: ['192'] },
  { name: '虚拟运营商', prefixes: ['170'] }
]

export function normalizeChinaMobile(value) {
  let mobile = String(value || '').replace(/\D+/g, '')
  if (mobile.startsWith('0086')) mobile = mobile.slice(4)
  if (mobile.startsWith('86') && mobile.length > 11) mobile = mobile.slice(2)
  return mobile.slice(0, 11)
}

export function isValidChinaMobile(value) {
  return /^1[3-9]\d{9}$/.test(String(value || ''))
}

export function isLikelyPhoneField(label = '') {
  return /充值号码|手机号码|手机号|付款码手机号|联系电话|电话/.test(String(label))
}

export function lookupCarrier(mobile) {
  const prefix = normalizeChinaMobile(mobile).slice(0, 3)
  const matched = carrierMap.find((item) => item.prefixes.includes(prefix))
  return matched?.name || ''
}

export function fallbackPhoneMeta(mobile) {
  const normalized = normalizeChinaMobile(mobile)
  return {
    mobile: normalized,
    is_valid: isValidChinaMobile(normalized),
    province: '',
    city: '',
    carrier: lookupCarrier(normalized)
  }
}

export function formatPhoneHint(meta = {}) {
  const parts = [meta.province, meta.city].filter(Boolean)
  const location = parts.join(' ')
  if (location && meta.carrier) return `${location} · ${meta.carrier}`
  if (location) return location
  if (meta.carrier) return meta.carrier
  return ''
}

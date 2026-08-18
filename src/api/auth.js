import http from './http'

export function apiAuthLogin(payload) {
  return http.post('/api/auth/login', payload)
}

export function apiAuthTwofaRecover(payload) {
  return http.post('/api/auth/twofa/recover', {
    ...payload,
    is_login: 1
  })
}

export function apiAuthRegister(payload) {
  return http.post('/api/auth/register', payload)
}

export function apiAuthLogout() {
  return http.post('/api/auth/logout')
}

export async function apiAuthProbeSession() {
  try {
    await http.get('/api/user/bootstrap')
    return { ok: true }
  } catch (error) {
    const code = Number(error?.code || error?.response?.status || 0)
    const msg = String(error?.message || '')
    if (code === 401 || code === 403 || msg.includes('未登录') || msg.includes('请先登录') || msg.includes('禁止请求')) {
      return { ok: false, message: '当前会话未建立，请使用同域名访问后重试' }
    }
    return { ok: true, soft: true }
  }
}

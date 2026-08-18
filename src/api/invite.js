import http from './http'

export function apiInviteInfo() {
  return http.get('/api/invite/info')
}

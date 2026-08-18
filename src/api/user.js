import http from './http'

export function getUserBootstrap() {
  return http.get('/api/user/bootstrap')
}

import http from './http'
import { buildFreshMessageParams } from './message-helpers'

export function apiUserMessages(payload = {}) {
  return http.get('/api/user/messages', {
    params: buildFreshMessageParams({
      page: payload.page || 1,
      pageSize: payload.pageSize || payload.limit || 20,
      page_size: payload.pageSize || payload.limit || 20
    })
  })
}

export function apiUserMessageDetail(id) {
  return http.get('/api/user/messages/detail', {
    params: buildFreshMessageParams({ id })
  })
}

export function apiUserMessageRead(payload) {
  return http.post('/api/user/messages/read', payload)
}

export function apiUserMessageReadAll() {
  return http.post('/api/user/messages/read-all', {})
}

export function apiUserMessageDelete(payload) {
  return http.post('/api/user/messages/delete', payload)
}

export function apiUserMessageUnreadCount() {
  return http.get('/api/user/messages/unread-count', {
    params: buildFreshMessageParams()
  })
}

import http from './http'

export function apiPointsInfo() {
  return http.get('/api/points/info')
}

export function apiPointsCheckin() {
  return http.post('/api/points/checkin')
}

export function apiPointsTasks() {
  return http.get('/api/points/tasks')
}

export function apiPointsClaimTask(taskKey) {
  return http.post('/api/points/task/claim', { task_key: taskKey })
}

export function apiPointsExchangeItems() {
  return http.get('/api/points/exchange/items')
}

export function apiPointsExchangeSubmit(itemId) {
  return http.post('/api/points/exchange/submit', { item_id: itemId })
}

export function apiPointsRecords(params) {
  return http.get('/api/points/records', { params })
}

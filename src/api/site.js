import http from './http'

export function apiSiteSubstationContext() {
  return http.get('/api/site/substation/context')
}
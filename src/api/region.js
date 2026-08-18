import http from './http'
import { extractRegionList, getCachedRegionTree, setCachedRegionTree } from './region-helpers'

function isRemoteRegionApiEnabled() {
  if (typeof window === 'undefined') return false
  return window.__TP8_REGION_API_ENABLED__ === true
}

function inferRegionApiBase() {
  if (typeof window !== 'undefined') {
    const runtimeBase = String(window.__TP8_API_BASE__ || '').trim()
    if (runtimeBase) return runtimeBase
  }
  const envBase = String(import.meta.env.VITE_API_BASE || '').trim()
  if (envBase) return envBase
  return ''
}

function joinBaseAndPath(base, path) {
  const normalizedBase = String(base || '').trim().replace(/\/+$/, '')
  const normalizedPath = String(path || '').trim().replace(/^\/+/, '')
  if (!normalizedBase) return `/${normalizedPath}`
  return `${normalizedBase}/${normalizedPath}`
}

export async function fetchRegionTree(options = {}) {
  const force = Boolean(options?.force)
  const preferRemote = options?.preferRemote === true || isRemoteRegionApiEnabled()

  if (!preferRemote) {
    throw new Error('地区接口开关未开启，请检查 runtime-config.js 中的 __TP8_REGION_API_ENABLED__ 配置')
  }

  const cached = getCachedRegionTree(force)
  if (Array.isArray(cached) && cached.length) return cached

  const requestUrl = joinBaseAndPath(inferRegionApiBase(), '/api/region/tree')
  const res = await http.get(requestUrl, { baseURL: '' })
  const list = extractRegionList(res)

  if (!list.length) {
    throw new Error(`地区接口已请求成功，但未返回有效地区树：${requestUrl}`)
  }

  return setCachedRegionTree(list)
}

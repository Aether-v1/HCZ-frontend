import { getSessionCache, setSessionCache } from '../utils/storage'

export const REGION_TREE_CACHE_KEY = 'tp8-region-tree-mainland-cache-backend-v1'
export const REGION_TREE_CACHE_MAX_AGE = 24 * 60 * 60 * 1000
export const fallbackRegionTree = []

let memoryRegionTree = null

function normalizeDistrict(item, index = 0) {
  if (typeof item === 'string' || typeof item === 'number') {
    const label = String(item).trim()
    return label ? { code: `${index}`, label, value: label } : null
  }
  if (!item || typeof item !== 'object') return null
  const label = String(item.label ?? item.value ?? item.name ?? '').trim()
  if (!label) return null
  return {
    code: String(item.code ?? item.id ?? item.key ?? index),
    label,
    value: String(item.value ?? label).trim() || label
  }
}

function normalizeCity(item, index = 0) {
  if (!item || typeof item !== 'object') return null
  const label = String(item.label ?? item.value ?? item.name ?? '').trim()
  if (!label) return null
  const districts = Array.isArray(item.districts)
    ? item.districts.map((district, districtIndex) => normalizeDistrict(district, districtIndex)).filter(Boolean)
    : []
  return {
    code: String(item.code ?? item.id ?? item.key ?? index),
    label,
    value: String(item.value ?? label).trim() || label,
    districts
  }
}

function normalizeProvince(item, index = 0) {
  if (!item || typeof item !== 'object') return null
  const label = String(item.label ?? item.value ?? item.name ?? '').trim()
  if (!label) return null
  const cities = Array.isArray(item.cities)
    ? item.cities.map((city, cityIndex) => normalizeCity(city, cityIndex)).filter(Boolean)
    : []
  return {
    code: String(item.code ?? item.id ?? item.key ?? index),
    label,
    value: String(item.value ?? label).trim() || label,
    cities
  }
}

export function normalizeRegionTree(input = []) {
  return Array.isArray(input)
    ? input.map((province, provinceIndex) => normalizeProvince(province, provinceIndex)).filter(Boolean)
    : []
}

export function findRegionProvince(tree = [], provinceLabel = '') {
  const value = String(provinceLabel || '').trim()
  if (!value) return null
  return tree.find((item) => item.label === value || item.value === value) || null
}

export function extractRegionList(payload) {
  const raw = payload?.data ?? payload
  return normalizeRegionTree(raw?.list || raw?.tree || raw || [])
}

export function clearRegionTreeCache() {
  memoryRegionTree = null
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(REGION_TREE_CACHE_KEY)
  }
}

export function getCachedRegionTree(force = false) {
  if (!force && Array.isArray(memoryRegionTree) && memoryRegionTree.length) {
    return memoryRegionTree
  }

  if (!force) {
    const cached = getSessionCache(REGION_TREE_CACHE_KEY, REGION_TREE_CACHE_MAX_AGE)
    if (Array.isArray(cached) && cached.length) {
      memoryRegionTree = cached
      return cached
    }
  }

  return null
}

export function setCachedRegionTree(list = []) {
  memoryRegionTree = list
  setSessionCache(REGION_TREE_CACHE_KEY, list)
  return list
}
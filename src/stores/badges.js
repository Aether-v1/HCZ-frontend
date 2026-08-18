import { computed, reactive } from 'vue'
import { apiUserMessageUnreadCount, apiUserMessages } from '../api/message'
import { apiOrderList } from '../api/order'
import { apiTransactionOrders } from '../api/transaction'
import { deriveOrderStatus } from '../utils/orders'
import { useUserStore } from './user'

const BADGE_CACHE_KEY = 'app_badge_cache_v1'
const BADGE_ZERO_CONFIRM_THRESHOLD = 3
const BADGE_ZERO_GRACE_MS = 12000
const MESSAGE_ZERO_CONFIRM_THRESHOLD = 4
const MESSAGE_ZERO_GRACE_MS = 12000
const BADGE_ACTIVE_POLL_INTERVAL_MS = 4000
const BADGE_HIDDEN_POLL_INTERVAL_MS = 15000
const BADGE_ACTION_POLL_INTERVAL_MS = 3000
const BADGE_ACTION_FAST_WINDOW_MS = 12000
const BADGE_REFRESH_DEDUP_MS = 8000

const state = reactive({
  orderPendingConfirmCount: 0,
  orderPendingConfirmZeroStreak: 0,
  orderPendingConfirmLastPositiveAt: 0,
  profilePendingCount: 0,
  profilePendingZeroStreak: 0,
  profilePendingLastPositiveAt: 0,
  messageUnreadCount: 0,
  messageUnreadZeroStreak: 0,
  messageUnreadLastPositiveAt: 0,
  lastUpdatedAt: 0
})

let timer = null
let consumers = 0
let refreshing = false
let listenersBound = false
let hydrated = false
let currentRefreshPromise = null
let pollingRefreshOptions = {
  includeMessageListFallback: false,
  minIntervalMs: BADGE_REFRESH_DEDUP_MS
}
let actionFastPollingUntil = 0
let profilePendingOverrideCount = null
let profilePendingOverrideUntil = 0

function readBadgeCache() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(BADGE_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function persistBadgeCache() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(BADGE_CACHE_KEY, JSON.stringify({
      orderPendingConfirmCount: Number(state.orderPendingConfirmCount || 0),
      orderPendingConfirmLastPositiveAt: Number(state.orderPendingConfirmLastPositiveAt || 0),
      profilePendingCount: Number(state.profilePendingCount || 0),
      profilePendingLastPositiveAt: Number(state.profilePendingLastPositiveAt || 0),
      messageUnreadCount: Number(state.messageUnreadCount || 0),
      messageUnreadLastPositiveAt: Number(state.messageUnreadLastPositiveAt || 0),
      lastUpdatedAt: Number(state.lastUpdatedAt || 0)
    }))
  } catch {
    // ignore cache failures
  }
}

function hydrateBadgeCache() {
  if (hydrated) return
  hydrated = true
  const cached = readBadgeCache()
  if (!cached) return
  state.orderPendingConfirmCount = Math.max(0, Number(cached.orderPendingConfirmCount || 0))
  state.orderPendingConfirmLastPositiveAt = Math.max(0, Number(cached.orderPendingConfirmLastPositiveAt || 0))
  state.profilePendingCount = Math.max(0, Number(cached.profilePendingCount || 0))
  state.profilePendingLastPositiveAt = Math.max(0, Number(cached.profilePendingLastPositiveAt || 0))
  state.messageUnreadCount = Math.max(0, Number(cached.messageUnreadCount || 0))
  state.messageUnreadLastPositiveAt = Math.max(0, Number(cached.messageUnreadLastPositiveAt || 0))
  state.lastUpdatedAt = Math.max(0, Number(cached.lastUpdatedAt || 0))
}

function applyStableBadgeCount(countKey, zeroStreakKey, lastPositiveAtKey, nextCount, options = {}) {
  const {
    forceZero = false,
    zeroConfirmThreshold = BADGE_ZERO_CONFIRM_THRESHOLD,
    zeroGraceMs = BADGE_ZERO_GRACE_MS
  } = options
  const value = Math.max(0, Number(nextCount || 0))
  if (value > 0) {
    state[countKey] = value
    state[zeroStreakKey] = 0
    state[lastPositiveAtKey] = Date.now()
    state.lastUpdatedAt = Date.now()
    persistBadgeCache()
    return
  }

  if (forceZero) {
    state[countKey] = 0
    state[zeroStreakKey] = 0
    state[lastPositiveAtKey] = 0
    state.lastUpdatedAt = Date.now()
    persistBadgeCache()
    return
  }

  if (Number(state[countKey] || 0) <= 0) {
    state[countKey] = 0
    state[zeroStreakKey] = 0
    state.lastUpdatedAt = Date.now()
    persistBadgeCache()
    return
  }

  state[zeroStreakKey] = Number(state[zeroStreakKey] || 0) + 1
  const positiveAge = Date.now() - Number(state[lastPositiveAtKey] || 0)
  if (state[zeroStreakKey] >= zeroConfirmThreshold && positiveAge >= zeroGraceMs) {
    state[countKey] = 0
    state[zeroStreakKey] = 0
    state[lastPositiveAtKey] = 0
    state.lastUpdatedAt = Date.now()
    persistBadgeCache()
  }
}

function clearProfilePendingOverride() {
  profilePendingOverrideCount = null
  profilePendingOverrideUntil = 0
}

function resolveProfilePendingCount(nextCount) {
  const value = Math.max(0, Number(nextCount || 0))
  if (profilePendingOverrideCount === null || profilePendingOverrideUntil <= 0) {
    return { count: value, forceZero: false }
  }

  if (Date.now() >= profilePendingOverrideUntil) {
    clearProfilePendingOverride()
    return { count: value, forceZero: false }
  }

  const overrideCount = Math.max(0, Number(profilePendingOverrideCount || 0))
  if (value <= overrideCount) {
    clearProfilePendingOverride()
    return { count: value, forceZero: value <= 0 }
  }

  return { count: overrideCount, forceZero: overrideCount <= 0 }
}

export function setTradePendingBadgeCount(nextCount, options = {}) {
  const {
    protectWindowMs = BADGE_ACTION_FAST_WINDOW_MS,
    forceZero = Number(nextCount || 0) <= 0
  } = options
  const value = Math.max(0, Number(nextCount || 0))
  if (protectWindowMs > 0) {
    profilePendingOverrideCount = value
    profilePendingOverrideUntil = Date.now() + Math.max(0, Number(protectWindowMs || 0) || 0)
  } else {
    clearProfilePendingOverride()
  }
  applyStableBadgeCount(
    'profilePendingCount',
    'profilePendingZeroStreak',
    'profilePendingLastPositiveAt',
    value,
    { forceZero }
  )
  return value
}

function applyMessageUnreadCount(nextCount, options = {}) {
  const { forceZero = false } = options
  const value = Math.max(0, Number(nextCount || 0))
  if (value > 0) {
    state.messageUnreadCount = value
    state.messageUnreadZeroStreak = 0
    state.messageUnreadLastPositiveAt = Date.now()
    state.lastUpdatedAt = Date.now()
    persistBadgeCache()
    return
  }

  if (forceZero) {
    state.messageUnreadCount = 0
    state.messageUnreadZeroStreak = 0
    state.lastUpdatedAt = Date.now()
    persistBadgeCache()
  }
}

function parseTradeTime(value) {
  if (!value) return null
  const normalized = String(value).trim().replace(/-/g, '/')
  const time = new Date(normalized)
  return Number.isFinite(time.getTime()) ? time : null
}

function isTradeOrderExpired(item = {}) {
  const explicitExpired = [
    item.status_text,
    item.tip,
    item.order_status_text,
    item.remarks,
    item.remark,
    item.close_reason
  ].some((text) => /超时|已过期|已失效/.test(String(text || '')))
  if (explicitExpired) return true

  const remainingCandidates = [item.remaining_seconds, item.left_seconds, item.countdown, item.count_down]
  if (remainingCandidates.some((value) => value !== undefined && value !== null && Number(value) <= 0)) return true

  const expireAt = parseTradeTime(item.expire_time || item.expired_at || item.end_time || item.close_time)
  if (expireAt && expireAt.getTime() <= Date.now()) return true

  const createdAt = parseTradeTime(item.create_time || item.created_at)
  if (createdAt) {
    const elapsed = Date.now() - createdAt.getTime()
    if (elapsed >= 20 * 60 * 1000) return true
  }

  return false
}

function normalizeTradeOrder(item = {}) {
  const value = String(item?.status ?? '')
  const expired = value === '0' && isTradeOrderExpired(item)
  return { ...item, _effectiveStatus: expired ? '2' : value }
}

function normalizeRefreshOptions(options = {}) {
  return {
    includeMessageListFallback: Boolean(options.includeMessageListFallback),
    minIntervalMs: Math.max(0, Number(options.minIntervalMs || 0) || 0)
  }
}

function clearPollingTimer() {
  if (!timer) return
  window.clearTimeout(timer)
  timer = null
}

function currentPollIntervalMs() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return BADGE_HIDDEN_POLL_INTERVAL_MS
  }
  if (Date.now() < actionFastPollingUntil) {
    return BADGE_ACTION_POLL_INTERVAL_MS
  }
  return BADGE_ACTIVE_POLL_INTERVAL_MS
}

function scheduleNextPoll() {
  if (typeof window === 'undefined' || consumers <= 0) return
  clearPollingTimer()
  timer = window.setTimeout(() => {
    if (!shouldRefresh()) {
      scheduleNextPoll()
      return
    }
    refreshAppBadges(pollingRefreshOptions).catch(() => null).finally(() => {
      scheduleNextPoll()
    })
  }, currentPollIntervalMs())
}

function triggerPollingRefresh(force = false) {
  if (!shouldRefresh()) {
    scheduleNextPoll()
    return
  }
  const nextOptions = force
    ? { ...pollingRefreshOptions, minIntervalMs: 0, force: true }
    : pollingRefreshOptions
  refreshAppBadges(nextOptions).catch(() => null).finally(() => {
    scheduleNextPoll()
  })
}

export function markAppBadgeActionActive(windowMs = BADGE_ACTION_FAST_WINDOW_MS) {
  actionFastPollingUntil = Math.max(actionFastPollingUntil, Date.now() + Math.max(0, Number(windowMs || 0) || 0))
  if (consumers > 0) {
    scheduleNextPoll()
  }
}

export async function refreshAppBadges(options = {}) {
  const {
    includeMessageListFallback = true,
    minIntervalMs = 0,
    force = false
  } = options
  hydrateBadgeCache()
  const userStore = useUserStore()
  if (!userStore.isLoggedIn) {
    clearProfilePendingOverride()
    state.orderPendingConfirmCount = 0
    state.orderPendingConfirmZeroStreak = 0
    state.orderPendingConfirmLastPositiveAt = 0
    state.profilePendingCount = 0
    state.profilePendingZeroStreak = 0
    state.profilePendingLastPositiveAt = 0
    state.messageUnreadCount = 0
    state.messageUnreadZeroStreak = 0
    state.messageUnreadLastPositiveAt = 0
    state.lastUpdatedAt = Date.now()
    persistBadgeCache()
    return state
  }
  if (!force && minIntervalMs > 0 && state.lastUpdatedAt && Date.now() - Number(state.lastUpdatedAt || 0) < minIntervalMs) {
    return state
  }
  if (refreshing) {
    if (force && currentRefreshPromise) {
      return currentRefreshPromise.then(
        () => refreshAppBadges({ includeMessageListFallback, minIntervalMs: 0, force: true }),
        () => refreshAppBadges({ includeMessageListFallback, minIntervalMs: 0, force: true })
      )
    }
    return currentRefreshPromise || Promise.resolve(state)
  }
  refreshing = true
  currentRefreshPromise = (async () => {
    const [ordersRes, tradesRes, messagesRes] = await Promise.allSettled([
      apiOrderList({ content: '', status: 4, page: 1, page_size: 100 }),
      apiTransactionOrders({ status: 'null' }),
      apiUserMessageUnreadCount()
    ])

    if (ordersRes.status === 'fulfilled') {
      const list = ordersRes.value?.data?.list || ordersRes.value?.data?.data || ordersRes.value?.data?.rows || []
      applyStableBadgeCount(
        'orderPendingConfirmCount',
        'orderPendingConfirmZeroStreak',
        'orderPendingConfirmLastPositiveAt',
        list.filter((item) => deriveOrderStatus(item).key === 'pending_confirm').length
      )
    }

    if (tradesRes.status === 'fulfilled') {
      const list = (tradesRes.value?.data?.list || []).map((item) => normalizeTradeOrder(item))
      const tradePendingCount = list.filter((item) => ['0', '1'].includes(String(item?._effectiveStatus ?? item?.status ?? ''))).length
      const resolvedTradeCount = resolveProfilePendingCount(tradePendingCount)
      applyStableBadgeCount(
        'profilePendingCount',
        'profilePendingZeroStreak',
        'profilePendingLastPositiveAt',
        resolvedTradeCount.count,
        { forceZero: resolvedTradeCount.forceZero }
      )
    }

    if (messagesRes.status === 'fulfilled') {
      let nextUnreadCount = Number(messagesRes.value?.data?.count || 0)
      if (includeMessageListFallback && nextUnreadCount <= 0) {
        try {
          const messagesListRes = await apiUserMessages({ page: 1, pageSize: 20 })
          const messageList = Array.isArray(messagesListRes?.data?.list) ? messagesListRes.data.list : []
          const unreadInList = messageList.filter((item) => !Number(item?.is_read || 0)).length
          if (unreadInList > 0) {
            nextUnreadCount = unreadInList
          }
        } catch {
          // ignore fallback failures
        }
      }

      if (nextUnreadCount > 0) {
        applyMessageUnreadCount(nextUnreadCount)
      } else if (state.messageUnreadCount > 0) {
        state.messageUnreadZeroStreak += 1
        const positiveAge = Date.now() - Number(state.messageUnreadLastPositiveAt || 0)
        if (state.messageUnreadZeroStreak >= MESSAGE_ZERO_CONFIRM_THRESHOLD && positiveAge >= MESSAGE_ZERO_GRACE_MS) {
          state.messageUnreadCount = 0
          state.messageUnreadZeroStreak = 0
          state.lastUpdatedAt = Date.now()
          persistBadgeCache()
        }
      } else {
        state.messageUnreadCount = 0
        state.messageUnreadZeroStreak = 0
        state.lastUpdatedAt = Date.now()
        persistBadgeCache()
      }
    }

    state.lastUpdatedAt = Date.now()
    persistBadgeCache()
    return state
  })()
  try {
    return await currentRefreshPromise
  } finally {
    refreshing = false
    currentRefreshPromise = null
  }
}

function shouldRefresh() {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden'
}

export async function refreshAppStateAfterAction(options = {}) {
  const {
    refreshFinanceSummary = false,
    refreshBootstrap = false,
    includeMessageListFallback = false,
    fastWindowMs = BADGE_ACTION_FAST_WINDOW_MS,
    tradePendingCount,
    tradePendingProtectWindowMs = BADGE_ACTION_FAST_WINDOW_MS
  } = options
  const userStore = useUserStore()
  if (fastWindowMs > 0) {
    markAppBadgeActionActive(fastWindowMs)
  }
  if (tradePendingCount !== undefined && tradePendingCount !== null) {
    setTradePendingBadgeCount(tradePendingCount, {
      protectWindowMs: tradePendingProtectWindowMs,
      forceZero: Number(tradePendingCount || 0) <= 0
    })
  }
  const tasks = [
    refreshAppBadges({ includeMessageListFallback, minIntervalMs: 0, force: true })
  ]
  if (userStore.isLoggedIn && refreshFinanceSummary) {
    tasks.push(userStore.refreshDirectFinance(true))
  } else if (userStore.isLoggedIn && refreshBootstrap) {
    tasks.push(userStore.refreshBootstrap(true))
  }
  await Promise.allSettled(tasks)
  return state
}

export function startAppBadgePolling(options = {}) {
  const {
    skipImmediateRefresh = false,
    refreshOptions = {}
  } = options
  hydrateBadgeCache()
  pollingRefreshOptions = normalizeRefreshOptions({
    includeMessageListFallback: false,
    minIntervalMs: BADGE_REFRESH_DEDUP_MS,
    ...refreshOptions
  })
  consumers += 1
  if (!listenersBound && typeof window !== 'undefined' && typeof document !== 'undefined') {
    const triggerRefresh = () => {
      if (document.visibilityState === 'hidden') {
        scheduleNextPoll()
        return
      }
      triggerPollingRefresh(true)
    }
    window.__appBadgeRefreshHandler = triggerRefresh
    document.addEventListener('visibilitychange', triggerRefresh)
    window.addEventListener('focus', triggerRefresh)
    listenersBound = true
  }
  if (!skipImmediateRefresh) {
    triggerPollingRefresh(true)
    return
  }
  scheduleNextPoll()
}

export function stopAppBadgePolling() {
  consumers = Math.max(0, consumers - 1)
  if (consumers > 0) return
  clearPollingTimer()
  if (listenersBound && typeof window !== 'undefined' && typeof document !== 'undefined') {
    const triggerRefresh = window.__appBadgeRefreshHandler
    if (triggerRefresh) {
      document.removeEventListener('visibilitychange', triggerRefresh)
      window.removeEventListener('focus', triggerRefresh)
      delete window.__appBadgeRefreshHandler
    }
    listenersBound = false
  }
}

export function useAppBadges() {
  hydrateBadgeCache()
  const orderPendingConfirmCount = computed(() => Number(state.orderPendingConfirmCount || 0))
  const profilePendingCount = computed(() => Number(state.profilePendingCount || 0))
  const messageUnreadCount = computed(() => Number(state.messageUnreadCount || 0))
  const profileBadgeCount = computed(() => profilePendingCount.value + messageUnreadCount.value)
  function setMessageUnreadCount(count) {
    applyMessageUnreadCount(count, { forceZero: Number(count || 0) <= 0 })
  }
  return {
    badgeState: state,
    orderPendingConfirmCount,
    profilePendingCount,
    messageUnreadCount,
    profileBadgeCount,
    setTradePendingBadgeCount,
    setMessageUnreadCount,
    refreshAppBadges,
    startAppBadgePolling,
    stopAppBadgePolling
  }
}

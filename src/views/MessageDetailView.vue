<template>
  <section class="stack-lg message-detail-page">
    <div v-if="loading" class="card message-loading-card">
      <AppLoader size="md" />
    </div>

    <div v-else-if="detail" class="card stack-md message-detail-card">
      <div class="message-detail-head">
        <div class="message-title-row">
          <strong>{{ detail.title || '消息详情' }}</strong>
          <span class="message-type-chip">{{ getMessageTypeLabel(detail.message_type) }}</span>
        </div>
        <div class="message-detail-meta">
          <span class="tiny-text muted">{{ formatMessageTime(detail.created_at) }}</span>
        </div>
      </div>

      <FeedbackToast
        v-if="message"
        :type="success ? 'success' : 'error'"
        :message="message"
        @close="message = ''"
      />

      <article class="message-detail-content">{{ detail.content || '暂无内容' }}</article>

      <button
        v-if="hasAction"
        class="primary-btn message-detail-action"
        type="button"
        @click="openAction"
      >
        查看相关内容
      </button>
    </div>

    <div v-else class="card message-empty-card">
      <div class="empty-emoji">😥</div>
      <h3>消息不存在或已失效</h3>
      <p class="muted">请返回消息通知列表后重试。</p>
    </div>
  </section>
</template>

<script setup>
defineOptions({ name: 'MessageDetailView' })

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchSiteConfigSnapshot } from '../api/home'
import { getCachedHomeBootstrap } from '../api/home-helpers'
import AppLoader from '../components/AppLoader.vue'
import FeedbackToast from '../components/FeedbackToast.vue'
import { apiUserMessageDetail, apiUserMessageRead } from '../api/message'
import { useAppBadges } from '../stores/badges'
import { formatMessageTime, getMessageTypeLabel } from '../utils/messages'

const MESSAGE_CACHE_KEY = 'user_message_cache'
const MESSAGE_BLOCKED_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'file:']
const MESSAGE_ROUTE_RULES = [
  /^\/$/,
  /^\/orders(?:\/[^/?#]+)?$/,
  /^\/wallet(?:-details|-detail-list)?$/,
  /^\/profile$/,
  /^\/account-(?:settings|telegram|profile|password|twofa)$/,
  /^\/finance-center$/,
  /^\/finance-recharge\/[^/?#]+$/,
  /^\/finance-withdrawal$/,
  /^\/points$/,
  /^\/market$/,
  /^\/transaction-trading-details\/[^/?#]+$/,
  /^\/invite-friends$/,
  /^\/contact-service$/,
  /^\/official-info(?:\/detail\/[^/?#]+)?$/,
  /^\/help-center$/,
  /^\/agent-center$/,
  /^\/substation-(?:center|profile|product-price|income-log)$/,
  /^\/bank-card$/,
  /^\/wallet-address$/
]
const MESSAGE_STATIC_EXTERNAL_HOSTS = ['your-frontend-domain.com']

const route = useRoute()
const router = useRouter()
const detail = ref(null)
const loading = ref(false)
const message = ref('')
const success = ref(false)
const markingRead = ref(false)
const { refreshAppBadges } = useAppBadges()

function hasBlockedProtocol(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return MESSAGE_BLOCKED_PROTOCOLS.some((protocol) => normalized.startsWith(protocol))
}

function extractAllowedHttpsHost(value) {
  try {
    const url = new URL(String(value || '').trim())
    if (url.protocol !== 'https:' || url.username || url.password) return ''
    return url.host.toLowerCase()
  } catch {
    return ''
  }
}

function buildAllowedExternalHosts(siteConfig = null) {
  const hosts = new Set(MESSAGE_STATIC_EXTERNAL_HOSTS)
  if (typeof window !== 'undefined' && window.location.host) {
    hosts.add(String(window.location.host).toLowerCase())
  }
  for (const key of ['contactServiceUrl', 'chatwootBaseUrl']) {
    const host = extractAllowedHttpsHost(siteConfig?.[key] || '')
    if (host) hosts.add(host)
  }
  return hosts
}

async function resolveAllowedExternalHosts() {
  const cachedHosts = buildAllowedExternalHosts(getCachedHomeBootstrap())
  if (cachedHosts.size > MESSAGE_STATIC_EXTERNAL_HOSTS.length + (typeof window !== 'undefined' && window.location.host ? 1 : 0)) {
    return cachedHosts
  }

  const payload = await fetchSiteConfigSnapshot().catch(() => null)
  return buildAllowedExternalHosts(payload)
}

function normalizeSafeRouteTarget(value) {
  const text = String(value || '').trim()
  if (!text || hasBlockedProtocol(text) || typeof window === 'undefined') return ''

  try {
    const url = new URL(text, window.location.origin)
    if (url.origin !== window.location.origin) return ''
    if (!MESSAGE_ROUTE_RULES.some((rule) => rule.test(url.pathname))) return ''
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return ''
  }
}

async function resolveSafeLinkTarget(value) {
  const text = String(value || '').trim()
  if (!text || hasBlockedProtocol(text)) return ''

  try {
    const url = new URL(text)
    if (url.protocol !== 'https:' || url.username || url.password) return ''
    const allowedHosts = await resolveAllowedExternalHosts()
    return allowedHosts.has(url.host.toLowerCase()) ? url.toString() : ''
  } catch {
    return ''
  }
}

function readMessageCacheItem(id) {
  if (!id || typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(MESSAGE_CACHE_KEY)
    const cache = raw ? JSON.parse(raw) : {}
    const item = cache?.[String(id)]
    return item && typeof item === 'object' ? item : null
  } catch {
    return null
  }
}

function writeMessageCacheItem(item) {
  if (!item?.id || typeof window === 'undefined') return
  try {
    const raw = window.sessionStorage.getItem(MESSAGE_CACHE_KEY)
    const cache = raw ? JSON.parse(raw) : {}
    cache[String(item.id)] = {
      ...(cache[String(item.id)] || {}),
      ...item
    }
    window.sessionStorage.setItem(MESSAGE_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore cache failures
  }
}

function mergeMessageDetail(remoteDetail, cachedDetail) {
  if (!remoteDetail && !cachedDetail) return null
  return {
    ...(cachedDetail || {}),
    ...(remoteDetail || {}),
    title: String(remoteDetail?.title || cachedDetail?.title || '').trim(),
    summary: String(remoteDetail?.summary || cachedDetail?.summary || '').trim(),
    content: String(remoteDetail?.content || cachedDetail?.content || cachedDetail?.summary || '').trim(),
    message_type: String(remoteDetail?.message_type || cachedDetail?.message_type || 'official').trim() || 'official',
    action_type: String(remoteDetail?.action_type || cachedDetail?.action_type || 'none').trim() || 'none',
    action_value: String(remoteDetail?.action_value || cachedDetail?.action_value || '').trim(),
    source_type: String(remoteDetail?.source_type || cachedDetail?.source_type || 'system').trim() || 'system',
    created_at: String(remoteDetail?.created_at || cachedDetail?.created_at || '').trim(),
    is_read: Number(remoteDetail?.is_read ?? cachedDetail?.is_read ?? 0)
  }
}

const hasAction = computed(() => {
  const actionType = String(detail.value?.action_type || '').trim()
  const actionValue = String(detail.value?.action_value || '').trim()
  return actionType && actionType !== 'none' && actionValue
})

async function autoMarkAsRead(id) {
  if (!id || markingRead.value) return
  markingRead.value = true
  try {
    await apiUserMessageRead({ id })
    if (detail.value && Number(detail.value.id) === Number(id)) {
      detail.value = {
        ...detail.value,
        is_read: 1
      }
      writeMessageCacheItem(detail.value)
    }
  } catch (error) {
  } finally {
    markingRead.value = false
    refreshAppBadges().catch(() => null)
  }
}

async function loadDetail(id) {
  if (!id) {
    detail.value = null
    return
  }

  loading.value = true
  message.value = ''

  const cachedDetail = readMessageCacheItem(id)
  if (cachedDetail) {
    detail.value = mergeMessageDetail(null, cachedDetail)
  }

  try {
    const res = await apiUserMessageDetail(id)
    detail.value = mergeMessageDetail(res.data || null, cachedDetail)
    if (detail.value) {
      writeMessageCacheItem(detail.value)
    }
    success.value = true
    if (detail.value && !Number(detail.value.is_read)) {
      await autoMarkAsRead(detail.value.id)
    }
  } catch (error) {
    detail.value = cachedDetail ? mergeMessageDetail(null, cachedDetail) : null
    success.value = Boolean(detail.value)
    message.value = detail.value ? '' : (error.message || '消息详情加载失败')
  } finally {
    loading.value = false
  }
}

async function openAction() {
  const actionType = String(detail.value?.action_type || '').trim()
  const actionValue = String(detail.value?.action_value || '').trim()
  if (!actionType || !actionValue || actionType === 'none') return

  if (actionType === 'link') {
    const safeLink = await resolveSafeLinkTarget(actionValue)
    if (!safeLink) {
      success.value = false
      message.value = '当前跳转地址不在允许范围内'
      return
    }
    window.open(safeLink, '_blank', 'noopener,noreferrer')
    return
  }

  const safeRoute = normalizeSafeRouteTarget(actionValue)
  if (!safeRoute) {
    success.value = false
    message.value = '当前站内跳转已被安全策略拦截'
    return
  }

  await router.push(safeRoute).catch(() => {
    success.value = false
    message.value = '页面跳转失败，请稍后重试'
  })
}

watch(
  () => route.params.id,
  (value) => {
    loadDetail(value).catch(() => null)
  },
  { immediate: true }
)
</script>

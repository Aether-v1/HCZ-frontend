<template>
  <section class="stack-lg message-notice-page">
    <div class="card stack-md message-list-shell">
      <div class="section-head compact-title-head message-toolbar">
        <h1>消息通知</h1>
        <div v-if="showReadAllButton" class="message-toolbar-actions">
          <button
            class="ghost-btn message-toolbar-btn compact"
            type="button"
            :disabled="loadingReadAll"
            @click="handleReadAll"
          >
            {{ loadingReadAll ? '处理中...' : '全部已读' }}
          </button>
        </div>
      </div>

      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />

      <div v-if="loading && !items.length" class="message-loading-card">
        <AppLoader size="md" />
      </div>

      <template v-else>
        <div v-if="items.length" class="stack-sm message-item-list">
          <button
            v-for="item in items"
            :key="item.id"
            class="message-item-card"
            :class="{ unread: !Number(item.is_read) }"
            type="button"
            @click="openDetail(item)"
          >
            <div class="message-item-head">
              <div class="message-title-row">
                <span v-if="!Number(item.is_read)" class="message-item-dot" aria-hidden="true"></span>
                <strong>{{ item.title || '消息通知' }}</strong>
                <span v-if="Number(item.is_pinned)" class="message-pin-chip">置顶</span>
                <span class="message-type-chip">{{ getMessageTypeLabel(item.message_type) }}</span>
              </div>
            </div>

            <p class="message-item-summary">{{ resolveSummary(item) }}</p>

            <div class="message-item-foot">
              <span class="tiny-text muted">{{ formatMessageTime(item.created_at) }}</span>
            </div>
          </button>
        </div>

        <div v-else class="message-empty-card">
          <div class="empty-emoji">🔔</div>
          <h3>暂无消息通知</h3>
          <p class="muted">有新的消息时会显示在这里。</p>
        </div>

        <button
          v-if="hasMore"
          class="ghost-btn message-load-more"
          type="button"
          :disabled="loadingMore"
          @click="loadMessages()"
        >
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </button>
      </template>
    </div>
  </section>
</template>

<script setup>
defineOptions({ name: 'OfficialInfoView' })

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLoader from '../components/AppLoader.vue'
import FeedbackToast from '../components/FeedbackToast.vue'
import { apiUserMessageReadAll, apiUserMessages } from '../api/message'
import { useAppBadges } from '../stores/badges'
import { formatMessageTime, getMessageTypeLabel } from '../utils/messages'

const MESSAGE_CACHE_KEY = 'user_message_cache'
const LIVE_REFRESH_INTERVAL_MS = 4000
const router = useRouter()
const items = ref([])
const page = ref(1)
const pageSize = 20
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const loadingReadAll = ref(false)
const message = ref('')
const success = ref(false)
const { messageUnreadCount, refreshAppBadges, setMessageUnreadCount } = useAppBadges()
let liveTimer = null

const hasMore = computed(() => items.value.length < Number(total.value || 0))
const showReadAllButton = computed(() => {
  if (items.value.some((item) => !Number(item?.is_read || 0))) return true
  return Number(messageUnreadCount.value || 0) > 0
})

function readMessageCache() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(MESSAGE_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeMessageCache(messageItems = []) {
  if (typeof window === 'undefined') return
  const cache = readMessageCache()
  messageItems.forEach((item) => {
    const id = Number(item?.id || 0)
    if (!id) return
    cache[String(id)] = {
      ...(cache[String(id)] || {}),
      ...item
    }
  })
  window.sessionStorage.setItem(MESSAGE_CACHE_KEY, JSON.stringify(cache))
}

function normalizeRows(list = []) {
  return [...list]
    .map((item) => ({
      ...item,
      id: Number(item?.id || 0),
      is_read: Number(item?.is_read || 0),
      is_pinned: Number(item?.is_pinned || 0),
      title: String(item?.title || '').trim(),
      summary: String(item?.summary || '').trim(),
      content: String(item?.content || '').trim(),
      created_at: String(item?.created_at || '').trim()
    }))
    .filter((item) => item.id > 0)
    .sort((a, b) => {
      if (Number(b.is_pinned || 0) !== Number(a.is_pinned || 0)) {
        return Number(b.is_pinned || 0) - Number(a.is_pinned || 0)
      }
      return Number(b.id || 0) - Number(a.id || 0)
    })
}

function syncItems(nextItems = []) {
  items.value = normalizeRows(nextItems)
  writeMessageCache(items.value)
  const unreadCount = items.value.filter((item) => !Number(item?.is_read || 0)).length
  if (unreadCount > 0 && unreadCount >= Number(messageUnreadCount.value || 0)) {
    setMessageUnreadCount(unreadCount)
  }
}

function sanitizeMessageText(value = '') {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveSummary(item = {}) {
  const source = sanitizeMessageText(item.summary || item.content)
  if (!source) return '暂无摘要'
  return source.length > 46 ? `${source.slice(0, 46)}...` : source
}

async function loadMessages(options = {}) {
  const { reset = false, silent = false } = options
  const nextPage = reset ? 1 : page.value

  if (reset) {
    if (!silent) loading.value = true
  } else {
    loadingMore.value = true
  }

  try {
    message.value = ''
    const res = await apiUserMessages({ page: nextPage, pageSize })
    const payload = res.data || {}
    const list = Array.isArray(payload.list) ? payload.list : []
    const merged = reset ? list : items.value.concat(list)
    syncItems(merged)
    total.value = Number(payload.total || items.value.length || 0)
    page.value = nextPage + 1
    success.value = true
  } catch (error) {
    success.value = false
    if (reset) items.value = []
    message.value = error.message || '消息加载失败'
  } finally {
    if (!silent) loading.value = false
    loadingMore.value = false
  }
}

async function handleReadAll() {
  if (loadingReadAll.value || !showReadAllButton.value) return
  loadingReadAll.value = true
  try {
    await apiUserMessageReadAll()
    syncItems(items.value.map((item) => ({ ...item, is_read: 1 })))
    success.value = true
    message.value = '已全部标记为已读'
    setMessageUnreadCount(0)
    await refreshAppBadges()
  } catch (error) {
    success.value = false
    message.value = error.message || '全部已读失败'
  } finally {
    loadingReadAll.value = false
  }
}

function openDetail(item) {
  writeMessageCache([item])
  router.push({ name: 'official-info-detail', params: { id: item.id } })
}

function handleLiveRefresh() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  loadMessages({ reset: true, silent: true }).catch(() => null)
  refreshAppBadges().catch(() => null)
}

function startLiveRefresh() {
  stopLiveRefresh()
  liveTimer = window.setInterval(handleLiveRefresh, LIVE_REFRESH_INTERVAL_MS)
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleLiveRefresh)
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleLiveRefresh)
  }
}

function stopLiveRefresh() {
  if (liveTimer) {
    window.clearInterval(liveTimer)
    liveTimer = null
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', handleLiveRefresh)
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleLiveRefresh)
  }
}

onMounted(async () => {
  await loadMessages({ reset: true })
  startLiveRefresh()
})

onBeforeUnmount(() => {
  stopLiveRefresh()
})
</script>

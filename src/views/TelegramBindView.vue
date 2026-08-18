<template>
  <section class="stack-lg telegram-bind-page">
    <div class="card stack-md">
      <div class="section-head compact-title-head">
        <h1>TG绑定</h1>
      </div>

      <div class="telegram-bind-status" :class="isBound ? 'is-bound' : 'is-unbound'">
        <span>当前状态</span>
        <strong>{{ statusReady ? (isBound ? '已绑定 TG' : '未绑定 TG') : '同步中...' }}</strong>
        <p v-if="statusReady && isBound && bindingState.tg_username">@{{ bindingState.tg_username }} / {{ bindingState.tg_chat_id }}</p>
        <p v-else-if="statusReady && isBound && bindingState.tg_chat_id">{{ bindingState.tg_chat_id }}</p>
        <p v-else-if="statusReady && bindingState.bind_code">当前存在一个可用绑定码，请尽快完成绑定。</p>
        <p v-else-if="statusReady">点击下方按钮生成一个 10 分钟内有效的一次性绑定码。</p>
        <p v-else>正在同步最新 TG 绑定状态。</p>
      </div>

      <div class="telegram-bind-actions">
        <button class="primary-btn" type="button" :disabled="loading || !statusReady || isBound" @click="handleGenerateCode">
          {{ loading ? '处理中...' : '获取绑定码' }}
        </button>
        <button v-if="botJumpUrl" class="ghost-btn" type="button" @click="openBotLink">
          打开机器人
        </button>
        <button v-if="statusReady && isBound" class="ghost-btn danger-outline-btn" type="button" :disabled="loading" @click="handleUnbind">
          {{ loading ? '处理中...' : '解绑 TG' }}
        </button>
      </div>

      <div v-if="statusReady && !isBound && bindingState.bind_code" class="telegram-bind-panel">
        <div class="telegram-bind-panel-row">
          <span>绑定码</span>
          <strong>{{ bindingState.bind_code }}</strong>
          <button class="ghost-btn" type="button" @click="copyText(bindingState.bind_code, '绑定码已复制')">复制绑定码</button>
        </div>

        <div class="telegram-bind-panel-row telegram-bind-panel-row--command">
          <span>完整命令</span>
          <strong>{{ bindingCommand }}</strong>
          <button class="ghost-btn" type="button" @click="copyText(bindingCommand, '命令已复制')">复制命令</button>
        </div>

        <div class="telegram-bind-countdown">
          <span>剩余有效时间</span>
          <strong>{{ countdownText }}</strong>
        </div>
      </div>

      <div class="telegram-bind-guide">
        <h2>操作说明</h2>
        <p v-if="botUsername" class="telegram-bind-bot-meta">当前机器人：@{{ botUsername }}</p>
        <ol>
          <li>点击“获取绑定码”。</li>
          <li>复制绑定码或完整命令。</li>
          <li>点击“打开机器人”按钮，进入 Telegram 机器人私聊窗口。</li>
          <li>发送 {{ bindingCommand || '/bind 绑定码' }}。</li>
          <li>收到成功提示后，后续订单通知会自动推送到当前 TG。</li>
        </ol>
      </div>

      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />
    </div>
  </section>
</template>

<script setup>
import FeedbackToast from '@/components/FeedbackToast.vue'
import { computed, onActivated, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { apiAccountTelegramBindingCode, apiAccountTelegramUnbind } from '../api/account'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
const loading = ref(false)
const statusReady = ref(false)
const success = ref(false)
const message = ref('')
const timerId = ref(null)
const bindingState = reactive({
  is_bound: 0,
  tg_user_id: '',
  tg_chat_id: '',
  tg_username: '',
  bot_username: '',
  bot_url: '',
  bind_code: '',
  expire_time: '',
  remaining_seconds: 0,
  command_text: '',
  instruction: ''
})

const isBound = computed(() => Number(bindingState.is_bound || 0) === 1)
const botUsername = computed(() => String(bindingState.bot_username || '').trim().replace(/^@+/, ''))
const botJumpUrl = computed(() => normalizeTelegramBotUrl(bindingState.bot_url, botUsername.value))
const bindingCommand = computed(() => bindingState.command_text || (bindingState.bind_code ? `/bind ${bindingState.bind_code}` : ''))
const countdownText = computed(() => {
  const seconds = Number(bindingState.remaining_seconds || 0)
  if (seconds <= 0) return '已过期'
  const minutes = Math.floor(seconds / 60)
  const remainSeconds = seconds % 60
  return `${minutes}分${remainSeconds}秒`
})

function applyBindingState(payload = {}) {
  bindingState.is_bound = Number(payload.is_bound || 0)
  bindingState.tg_user_id = payload.tg_user_id || ''
  bindingState.tg_chat_id = payload.tg_chat_id || ''
  bindingState.tg_username = payload.tg_username || ''
  bindingState.bot_username = payload.bot_username || ''
  bindingState.bot_url = payload.bot_url || ''
  bindingState.bind_code = payload.bind_code || ''
  bindingState.expire_time = payload.expire_time || ''
  bindingState.remaining_seconds = Number(payload.remaining_seconds || 0)
  bindingState.command_text = payload.command_text || (bindingState.bind_code ? `/bind ${bindingState.bind_code}` : '')
  bindingState.instruction = payload.instruction || ''

  userStore.setTelegramBinding(payload)

  resetCountdown()
}

function resetCountdown() {
  if (timerId.value) {
    window.clearInterval(timerId.value)
    timerId.value = null
  }

  if (isBound.value || Number(bindingState.remaining_seconds || 0) <= 0) return

  timerId.value = window.setInterval(() => {
    if (bindingState.remaining_seconds <= 1) {
      bindingState.remaining_seconds = 0
      bindingState.bind_code = ''
      bindingState.command_text = ''
      resetCountdown()
      return
    }
    bindingState.remaining_seconds -= 1
  }, 1000)
}

function normalizeTelegramBotUrl(value, fallbackUsername = '') {
  const raw = String(value || '').trim()
  const username = String(fallbackUsername || '').trim().replace(/^@+/, '')

  if (raw) {
    try {
      const url = new URL(raw)
      const host = String(url.host || '').toLowerCase()
      if (url.protocol === 'https:' && !url.username && !url.password && (host === 't.me' || host === 'telegram.me')) {
        return url.toString()
      }
    } catch {
      // fall through to username-based link
    }
  }

  if (/^[A-Za-z0-9_]{4,}$/.test(username)) {
    return `https://t.me/${username}`
  }

  return ''
}

async function loadBindingStatus() {
  loading.value = true
  try {
    const payload = await userStore.refreshTelegramBinding()
    applyBindingState(payload)
  } catch (error) {
    success.value = false
    message.value = error.message || '获取 TG 绑定状态失败'
  } finally {
    statusReady.value = true
    loading.value = false
  }
}

async function handleGenerateCode() {
  loading.value = true
  try {
    const res = await apiAccountTelegramBindingCode()
    applyBindingState(res.data || {})
    success.value = true
    message.value = res.message || '绑定码生成成功'
  } catch (error) {
    success.value = false
    message.value = error.message || '生成绑定码失败'
  } finally {
    loading.value = false
  }
}

async function handleUnbind() {
  loading.value = true
  try {
    const res = await apiAccountTelegramUnbind()
    applyBindingState(res.data || {})
    success.value = true
    message.value = res.message || '解绑成功'
  } catch (error) {
    success.value = false
    message.value = error.message || '解绑失败'
  } finally {
    loading.value = false
  }
}

function openBotLink() {
  if (!botJumpUrl.value) {
    success.value = false
    message.value = '当前未配置机器人跳转地址'
    return
  }
  window.open(botJumpUrl.value, '_blank', 'noopener,noreferrer')
}

async function copyText(text, okMessage) {
  if (!text) return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', 'readonly')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    success.value = true
    message.value = okMessage
  } catch (error) {
    success.value = false
    message.value = error.message || '复制失败，请手动复制'
  }
}

onMounted(() => {
  loadBindingStatus()
})

onActivated(() => {
  loadBindingStatus()
})

onBeforeUnmount(() => {
  if (timerId.value) {
    window.clearInterval(timerId.value)
    timerId.value = null
  }
})
</script>

<style scoped>
.telegram-bind-page {
  padding-bottom: 16px;
}

.telegram-bind-status {
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(45, 90, 135, 0.12), rgba(45, 90, 135, 0.04));
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.telegram-bind-status.is-bound {
  background: linear-gradient(135deg, rgba(26, 136, 96, 0.14), rgba(26, 136, 96, 0.05));
}

.telegram-bind-status span,
.telegram-bind-countdown span,
.telegram-bind-panel-row span {
  color: var(--text-muted, #7b7280);
  font-size: 13px;
}

.telegram-bind-status strong,
.telegram-bind-panel-row strong,
.telegram-bind-countdown strong {
  font-size: 18px;
  word-break: break-all;
}

.telegram-bind-status p {
  margin: 0;
  color: var(--text-muted, #7b7280);
}

.telegram-bind-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.telegram-bind-actions .primary-btn,
.telegram-bind-actions .ghost-btn {
  flex: 1;
  min-width: 140px;
}

.telegram-bind-panel {
  padding: 16px;
  border: 1px solid rgba(45, 90, 135, 0.12);
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.telegram-bind-panel-row {
  display: grid;
  grid-template-columns: 88px 1fr auto;
  align-items: center;
  gap: 12px;
}

.telegram-bind-panel-row--command strong {
  font-size: 16px;
}

.telegram-bind-countdown {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.telegram-bind-guide {
  padding: 16px;
  border-radius: 18px;
  background: rgba(245, 245, 247, 0.9);
}

.telegram-bind-guide h2 {
  margin: 0 0 12px;
  font-size: 17px;
}

.telegram-bind-bot-meta {
  margin: 0 0 12px;
  color: var(--text-muted, #7b7280);
}

.telegram-bind-guide ol {
  margin: 0;
  padding-left: 18px;
  color: var(--text-muted, #7b7280);
}

.telegram-bind-guide li + li {
  margin-top: 8px;
}

@media (max-width: 640px) {
  .telegram-bind-panel-row {
    grid-template-columns: 1fr;
  }

  .telegram-bind-countdown {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

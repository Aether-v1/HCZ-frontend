<template>
  <section class="stack-lg contact-service-page">
    <div class="card stack-md contact-card-shell">
      <div>
        <h1>联系客服</h1>
        <p class="muted">已为你打开在线客服窗口，若未自动弹出，可点击下方按钮。</p>
      </div>
      <div class="inline-actions mobile-actions">
        <button class="primary-btn block" type="button" @click="openChat">打开客服聊天</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { fetchSiteConfigSnapshot } from '../api/home'
import { getCachedHomeBootstrap } from '../api/home-helpers'
import { useUserStore } from '../stores/user'

const CHATWOOT_SCRIPT_ID = 'qd-chatwoot-sdk'
const CHATWOOT_GLOBAL_KEY = '__QD_CHATWOOT_STATE__'
const CHATWOOT_OPEN_RETRY_DELAY = 180
const CHATWOOT_OPEN_RETRY_LIMIT = 10
const CHATWOOT_UI_SETTINGS = {
  position: 'right',
  type: 'standard',
  launcherTitle: '联系我们',
  hideMessageBubble: true,
  darkMode: 'light',
  widgetColor: '#0ea5e9'
}

const userStore = useUserStore()
const homeBootstrap = ref(getCachedHomeBootstrap())
let sdkLoading = false
let readyHandlerBound = false
let pendingChatOpen = false

function getChatwootState() {
  if (typeof window === 'undefined') {
    return { bootstrapped: false, baseUrl: '', websiteToken: '' }
  }

  if (!window[CHATWOOT_GLOBAL_KEY] || typeof window[CHATWOOT_GLOBAL_KEY] !== 'object') {
    window[CHATWOOT_GLOBAL_KEY] = {
      bootstrapped: false,
      baseUrl: '',
      websiteToken: ''
    }
  }

  return window[CHATWOOT_GLOBAL_KEY]
}

function parseHttpUrl(value = '') {
  const text = String(value || '').trim()
  if (!text) return null
  try {
    const url = new URL(text)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (url.username || url.password) return null
    return url
  } catch {
    return null
  }
}

function normalizeChatwootBaseUrl(value = '') {
  const url = parseHttpUrl(value)
  if (!url) return ''
  const pathname = url.pathname.replace(/\/+$/, '')
  return `${url.origin}${pathname === '/' ? '' : pathname}`
}

function normalizeContactUrl(value = '') {
  const url = parseHttpUrl(value)
  return url ? url.toString() : ''
}

function getChatwootConfig() {
  return {
    enabled: Number(homeBootstrap.value?.chatwootEnabled || 0) === 1,
    baseUrl: normalizeChatwootBaseUrl(homeBootstrap.value?.chatwootBaseUrl || ''),
    websiteToken: String(homeBootstrap.value?.chatwootToken || '').trim(),
    fallbackUrl: normalizeContactUrl(homeBootstrap.value?.contactServiceUrl || '')
  }
}

function buildChatwootScriptUrl(baseUrl = '') {
  const normalizedBaseUrl = normalizeChatwootBaseUrl(baseUrl)
  return normalizedBaseUrl ? `${normalizedBaseUrl}/packs/js/sdk.js` : ''
}

function isAllowedChatwootScriptUrl(scriptUrl = '', baseUrl = '') {
  const expectedScriptUrl = buildChatwootScriptUrl(baseUrl)
  if (!expectedScriptUrl) return false
  try {
    return new URL(scriptUrl).toString() === new URL(expectedScriptUrl).toString()
  } catch {
    return false
  }
}

function openConfiguredContactUrl() {
  const { fallbackUrl } = getChatwootConfig()
  if (!fallbackUrl || typeof window === 'undefined') return false
  window.open(fallbackUrl, '_blank', 'noopener,noreferrer')
  return true
}

function markChatwootBootstrapped(baseUrl = '', websiteToken = '') {
  const state = getChatwootState()
  state.bootstrapped = true
  state.baseUrl = baseUrl || state.baseUrl || ''
  state.websiteToken = websiteToken || state.websiteToken || ''
}

function applyChatwootSettings() {
  if (typeof window === 'undefined') return
  window.chatwootSettings = {
    ...(window.chatwootSettings || {}),
    ...CHATWOOT_UI_SETTINGS
  }
}

function runChatwootSdk(baseUrl = '', websiteToken = '') {
  if (typeof window === 'undefined' || !window.chatwootSDK || !baseUrl || !websiteToken) return false

  applyChatwootSettings()
  const state = getChatwootState()
  if (state.bootstrapped && state.baseUrl === baseUrl && state.websiteToken === websiteToken && window.$chatwoot) {
    return true
  }

  state.baseUrl = baseUrl
  state.websiteToken = websiteToken

  try {
    window.chatwootSDK.run({
      websiteToken,
      baseUrl
    })
    return true
  } catch {
    return false
  }
}

function applyChatwootUser() {
  if (!window.$chatwoot) return
  const profile = userStore.profile || {}
  const mobile = userStore.mobile || ''
  if (!mobile) return

  try {
    window.$chatwoot.setUser(String(mobile), {
      name: profile.nickname || profile.surname || mobile,
      phone_number: mobile
    })
  } catch {
    // ignore
  }
}

function handleChatwootReady() {
  const { baseUrl, websiteToken } = getChatwootConfig()
  markChatwootBootstrapped(baseUrl, websiteToken)
  if (pendingChatOpen) {
    window.setTimeout(() => {
      launchChatwoot()
    }, 0)
  }
}

function bindChatwootReadyListener() {
  if (typeof window === 'undefined' || readyHandlerBound) return
  window.addEventListener('chatwoot:ready', handleChatwootReady)
  document.addEventListener('chatwoot:ready', handleChatwootReady)
  readyHandlerBound = true
}

function unbindChatwootReadyListener() {
  if (typeof window === 'undefined' || !readyHandlerBound) return
  window.removeEventListener('chatwoot:ready', handleChatwootReady)
  document.removeEventListener('chatwoot:ready', handleChatwootReady)
  readyHandlerBound = false
}

function launchChatwoot(attempt = 0) {
  if (typeof window === 'undefined') return false
  if (!window.$chatwoot) {
    if (attempt >= CHATWOOT_OPEN_RETRY_LIMIT) return false
    pendingChatOpen = true
    window.setTimeout(() => {
      launchChatwoot(attempt + 1)
    }, CHATWOOT_OPEN_RETRY_DELAY)
    return false
  }

  pendingChatOpen = false
  const { baseUrl, websiteToken } = getChatwootConfig()
  markChatwootBootstrapped(baseUrl, websiteToken)
  applyChatwootUser()

  try {
    if (typeof window.$chatwoot.toggleBubbleVisibility === 'function') {
      window.$chatwoot.toggleBubbleVisibility('show')
    }
  } catch {
    // ignore
  }

  try {
    if (typeof window.$chatwoot.toggle === 'function') {
      window.$chatwoot.toggle('open')
      return true
    }
  } catch {
    // ignore and fall through to legacy toggle usage
  }

  try {
    if (typeof window.$chatwoot.toggle === 'function') {
      window.$chatwoot.toggle()
      return true
    }
  } catch {
    // ignore
  }

  try {
    if (typeof window.$chatwoot.popoutChatWindow === 'function') {
      window.$chatwoot.popoutChatWindow()
      return true
    }
  } catch {
    // ignore
  }

  return false
}

function ensureChatwoot() {
  if (typeof window === 'undefined') return false
  const { enabled, baseUrl, websiteToken } = getChatwootConfig()
  if (!enabled || !baseUrl || !websiteToken) return false
  applyChatwootSettings()
  if (window.$chatwoot) {
    markChatwootBootstrapped(baseUrl, websiteToken)
    return true
  }

  bindChatwootReadyListener()

  if (window.chatwootSDK) {
    sdkLoading = false
    return runChatwootSdk(baseUrl, websiteToken)
  }

  if (sdkLoading) return true

  const scriptUrl = buildChatwootScriptUrl(baseUrl)
  if (!isAllowedChatwootScriptUrl(scriptUrl, baseUrl)) return false

  const existingScript = document.getElementById(CHATWOOT_SCRIPT_ID)
  if (existingScript) {
    sdkLoading = existingScript.dataset.loaded !== '1'
    if (window.chatwootSDK) {
      sdkLoading = false
      return runChatwootSdk(baseUrl, websiteToken)
    }
    return true
  }

  sdkLoading = true
  applyChatwootSettings()
  const script = document.createElement('script')
  script.id = CHATWOOT_SCRIPT_ID
  script.src = scriptUrl
  script.async = true
  script.onload = () => {
    script.dataset.loaded = '1'
    sdkLoading = false
    if (runChatwootSdk(baseUrl, websiteToken) && window.$chatwoot) {
      launchChatwoot()
    }
  }
  script.onerror = () => {
    sdkLoading = false
    pendingChatOpen = false
    openConfiguredContactUrl()
  }
  document.body.appendChild(script)
  return true
}

function openChat() {
  pendingChatOpen = true
  if (!ensureChatwoot()) {
    pendingChatOpen = false
    openConfiguredContactUrl()
    return
  }
  launchChatwoot()
}

onMounted(async () => {
  const payload = await fetchSiteConfigSnapshot().catch(() => null)
  if (payload) homeBootstrap.value = payload
  openChat()
})

onBeforeUnmount(() => {
  unbindChatwootReadyListener()
})
</script>

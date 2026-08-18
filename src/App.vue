<template>
  <router-view />
  <AsyncUiOverlayHost v-if="uiOverlayReady" />

  <div v-if="antiRedirectVisible" class="anti-red-overlay">
    <div class="anti-red-card">
      <div class="anti-red-badge">{{ envLabel }} 内打开提醒</div>
      <h2>请复制域名后在系统浏览器打开</h2>
      <p class="muted anti-red-copy">
        当前页面正处于 {{ envLabel }} 内置环境。为避免被拦截、无法跳转或下单异常，请先复制域名，再到系统浏览器打开。
      </p>

      <div class="anti-red-scene-row">
        <span class="pill-tag light">不要直接在 {{ envLabel }} 内访问</span>
        <span class="pill-tag light">推荐 Safari / Chrome / 系统浏览器</span>
      </div>

      <div class="anti-red-browser-box">
        <div class="anti-red-browser-top">
          <span class="anti-red-dot"></span>
          <span class="anti-red-dot"></span>
          <span class="anti-red-dot"></span>
          <span class="anti-red-browser-label">系统浏览器</span>
        </div>
        <div class="anti-red-domain-box">
          <span class="tiny-text muted">当前域名</span>
          <strong>{{ currentDomain }}</strong>
        </div>
      </div>

      <button type="button" class="primary-btn anti-red-copy-btn" @click="copyDomain">一键复制域名</button>
      <p v-if="antiRedirectMessage" :class="antiRedirectFeedbackClass">{{ antiRedirectMessage }}</p>

      <div class="anti-red-step-grid">
        <div class="anti-red-step-card">
          <span class="anti-red-step-no">1</span>
          <div>
            <strong>点右上角菜单</strong>
            <p>在 {{ envLabel }} 页面右上角打开菜单。</p>
          </div>
        </div>
        <div class="anti-red-step-card">
          <span class="anti-red-step-no">2</span>
          <div>
            <strong>选择浏览器打开</strong>
            <p>没有该选项时，先复制域名，再到浏览器粘贴访问。</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSiteStore } from './stores/site'
import { getCachedSiteBrand } from './utils/siteBrand'
import { useThemeStore } from './stores/theme'

const AsyncUiOverlayHost = defineAsyncComponent(() => import('./components/UiOverlayHost.vue'))

const route = useRoute()
const siteStore = useSiteStore()
const themeStore = useThemeStore()
const uiOverlayReady = ref(false)
const antiRedirectVisible = ref(false)
const antiRedirectMessage = ref('')
const antiRedirectSuccess = ref(false)
const currentDomain = ref('')
const detectedEnv = ref('微信 / QQ')
const cachedSiteBrand = getCachedSiteBrand()
const antiRedirectFeedbackClass = computed(() => (antiRedirectSuccess.value ? 'feedback success' : 'feedback error'))
const envLabel = computed(() => detectedEnv.value || '微信 / QQ')
const resolvedSiteName = computed(() => String(siteStore.site_name || '').trim() || cachedSiteBrand.siteName || '')

function reapplyTheme() {
  themeStore.init()
}

function handleVisibilityRestore() {
  if (typeof document !== 'undefined' && !document.hidden) {
    themeStore.init()
    window.setTimeout(() => themeStore.init(), 80)
    window.setTimeout(() => themeStore.init(), 240)
  }
}

function applySiteTitle(value = '') {
  const nextTitle = String(value || '').trim()
  document.title = nextTitle
}

function scheduleUiOverlayHost() {
  const mountOverlayHost = () => {
    uiOverlayReady.value = true
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => mountOverlayHost(), { timeout: 320 })
    return
  }

  window.setTimeout(mountOverlayHost, 180)
}

watch(
  () => [route.fullPath, route.meta?.title, resolvedSiteName.value],
  ([, title, siteName]) => {
    const routeTitle = String(title || '').trim()
    const nextTitle = siteName ? (routeTitle ? `${routeTitle} - ${siteName}` : siteName) : ''
    applySiteTitle(nextTitle)
  },
  { immediate: true }
)

function detectInnerBrowser() {
  if (typeof navigator === 'undefined') return ''
  const ua = navigator.userAgent || ''
  if (/MicroMessenger/i.test(ua)) return '微信'
  if (/\bQQ\//i.test(ua) || /QQBrowser/i.test(ua)) return 'QQ'
  return ''
}

async function copyDomain() {
  const text = currentDomain.value || window.location.host || ''
  if (!text) return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', 'readonly')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    antiRedirectMessage.value = '域名已复制，请到系统浏览器打开'
    antiRedirectSuccess.value = true
  } catch {
    antiRedirectMessage.value = '复制失败，请手动复制域名到浏览器打开'
    antiRedirectSuccess.value = false
  }
}

onMounted(() => {
  scheduleUiOverlayHost()
  themeStore.init()
  window.addEventListener('focus', reapplyTheme)
  window.addEventListener('pageshow', reapplyTheme)
  document.addEventListener('visibilitychange', handleVisibilityRestore)
  currentDomain.value = window.location.host || ''
  const env = detectInnerBrowser()
  detectedEnv.value = env || '微信 / QQ'
  antiRedirectVisible.value = Boolean(env)
})
onBeforeUnmount(() => {
  window.removeEventListener('focus', reapplyTheme)
  window.removeEventListener('pageshow', reapplyTheme)
  document.removeEventListener('visibilitychange', handleVisibilityRestore)
})
</script>

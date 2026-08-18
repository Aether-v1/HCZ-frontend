<template>
  <nav class="bottom-tabbar" aria-label="底部导航">
    <a
      :href="TAB_ROUTES.home"
      class="tab-item"
      :class="{ active: displayActiveTab === 'home' }"
      aria-label="首页"
      title="首页"
      :aria-current="displayActiveTab === 'home' ? 'page' : undefined"
      @pointerdown="handleTabPointerDown('home')"
      @click.prevent="handleTabClick('home')"
    >
      <span class="tab-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10.5V20h13V10.5" />
        </svg>
      </span>
      <span class="sr-only">首页</span>
    </a>
    <a
      :href="TAB_ROUTES.orders"
      class="tab-item"
      :class="{ active: displayActiveTab === 'orders' }"
      aria-label="订单"
      title="订单"
      :aria-current="displayActiveTab === 'orders' ? 'page' : undefined"
      @pointerdown="handleTabPointerDown('orders')"
      @click.prevent="handleTabClick('orders')"
    >
      <span v-if="showOrdersBadge" class="tab-badge tab-badge--dot" aria-hidden="true"></span>
      <span class="tab-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </svg>
      </span>
      <span class="sr-only">订单</span>
    </a>
    <a
      :href="TAB_ROUTES.profile"
      class="tab-item"
      :class="{ active: displayActiveTab === 'profile' }"
      aria-label="我的"
      title="我的"
      :aria-current="displayActiveTab === 'profile' ? 'page' : undefined"
      @pointerdown="handleTabPointerDown('profile')"
      @click.prevent="handleTabClick('profile')"
    >
      <span v-if="showProfileBadge" class="tab-badge tab-badge--dot" aria-hidden="true"></span>
      <span class="tab-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="7" r="4" />
          <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
        </svg>
      </span>
      <span class="sr-only">我的</span>
    </a>
  </nav>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppBadges } from '../stores/badges'
import { warmCoreTabViewChunk } from '../utils/coreTabWarmup'

const TAB_ROUTES = {
  home: '/',
  orders: '/orders',
  profile: '/profile'
}

const route = useRoute()
const router = useRouter()
const activeTab = computed(() => route.meta.tab || '')
const pendingTab = ref('')
const displayActiveTab = computed(() => pendingTab.value || activeTab.value || '')
const { orderPendingConfirmCount, profileBadgeCount, startAppBadgePolling, stopAppBadgePolling } = useAppBadges()

const showOrdersBadge = computed(() => activeTab.value !== 'orders' && orderPendingConfirmCount.value > 0)
const showProfileBadge = computed(() => activeTab.value !== 'profile' && profileBadgeCount.value > 0)

let firstScreenReadyTimer = null

watch(
  () => route.meta.tab,
  (nextTab) => {
    if (!nextTab) {
      pendingTab.value = ''
      return
    }
    if (String(nextTab || '') === pendingTab.value) {
      pendingTab.value = ''
    }
  },
  { immediate: true }
)

function handleTabPointerDown(tabName) {
  pendingTab.value = tabName
  void warmCoreTabViewChunk(tabName).catch(() => null)
}

function handleTabClick(tabName) {
  pendingTab.value = tabName
  void warmCoreTabViewChunk(tabName).catch(() => null)

  if (activeTab.value === tabName) {
    pendingTab.value = ''
    return
  }

  router.push(TAB_ROUTES[tabName]).catch(() => {
    if (pendingTab.value === tabName) {
      pendingTab.value = ''
    }
  })
}

function startBadgePollingSafely() {
  stopAppBadgePolling()
  startAppBadgePolling()
}

function handleFirstScreenReady() {
  if (firstScreenReadyTimer) {
    window.clearTimeout(firstScreenReadyTimer)
    firstScreenReadyTimer = null
  }
  window.removeEventListener('qd:first-screen-ready', handleFirstScreenReady)
  startBadgePollingSafely()
}

onMounted(() => {
  void warmCoreTabViewChunk(activeTab.value || 'home').catch(() => null)
  if (activeTab.value !== 'home' || window.__QD_FIRST_SCREEN_READY__) {
    startBadgePollingSafely()
    return
  }

  window.addEventListener('qd:first-screen-ready', handleFirstScreenReady, { once: true })
  firstScreenReadyTimer = window.setTimeout(handleFirstScreenReady, 2200)
})

onBeforeUnmount(() => {
  pendingTab.value = ''
  if (firstScreenReadyTimer) {
    window.clearTimeout(firstScreenReadyTimer)
    firstScreenReadyTimer = null
  }
  window.removeEventListener('qd:first-screen-ready', handleFirstScreenReady)
  stopAppBadgePolling()
})
</script>

<style scoped>
.tab-item {
  border: 0;
  background: transparent;
  text-decoration: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
</style>

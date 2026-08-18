<template>
  <div class="app-shell">
    <AppHeader v-if="showHeader" />
    <main class="page-shell" :class="pageShellClass">
      <router-view v-slot="{ Component, route: currentRoute }">
        <keep-alive :max="60">
          <component
            v-if="currentRoute.meta.keepAlive"
            :is="Component"
            :key="buildCacheKey(currentRoute)"
          />
        </keep-alive>
        <component
          v-if="!currentRoute.meta.keepAlive"
          :is="Component"
          :key="String(currentRoute.fullPath || currentRoute.name || '')"
        />
      </router-view>
    </main>
    <BottomTabBar v-if="showTabBar" />
  </div>
</template>

<script setup>
import '../styles/main.css'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import BottomTabBar from '../components/BottomTabBar.vue'

const route = useRoute()
const showHeader = computed(() => Boolean(route.meta.showHeader))
const showTabBar = computed(() => !route.meta.hideTabBar)
const desktopWideRoutes = new Set(['profile', 'market', 'agent-center', 'points', 'wallet-details', 'official-info', 'official-info-detail', 'help-center'])

const pageShellClass = computed(() => ({
  'page-shell--home-wide': route.name === 'home',
  'page-shell--orders-wide': route.name === 'orders',
  'page-shell--desktop-wide': desktopWideRoutes.has(String(route.name || ''))
}))

function buildCacheKey(currentRoute) {
  const tabName = String(currentRoute?.meta?.tab || '')
  if (tabName === 'home' || tabName === 'orders' || tabName === 'profile') {
    return tabName
  }
  return String(currentRoute?.fullPath || currentRoute?.name || '')
}
</script>

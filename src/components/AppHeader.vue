<template>
  <header class="topbar simple-page-topbar">
    <div class="topbar-sub simple-topbar-sub">
      <button class="icon-btn" type="button" @click="goBack" aria-label="返回">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div class="page-title">{{ pageTitle }}</div>
      <span class="topbar-spacer"></span>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const pageTitle = computed(() => {
  if (route.meta.hideHeaderTitle) return ''
  return String(route.query.title || route.meta.title || '页面')
})

function goBack() {
  const backTarget = route.meta.backTarget
  const backMode = String(route.meta.backMode || '')
  if (backTarget && backMode === 'replace') {
    router.replace(backTarget)
    return
  }
  if (backTarget && backMode === 'push') {
    router.push(backTarget)
    return
  }
  if (window.history.length > 1) {
    router.back()
    return
  }
  if (backTarget) {
    router.replace(backTarget)
    return
  }
  router.push('/')
}
</script>

<template>
  <section class="stack-lg profile-overview-page">
    <div class="profile-hero-card compact-profile-hero profile-user-card">
      <div class="profile-hero-top profile-hero-inline profile-hero-no-label">
        <button class="profile-avatar profile-large-avatar profile-image-avatar profile-avatar-upload" type="button" @click="openAvatarPreview">
          <img v-if="avatarUrl" :src="avatarUrl" :alt="displayName" @error="handleAvatarError" />
          <span v-else>{{ avatarText }}</span>
        </button>
        <input ref="avatarInput" class="hidden-input" type="file" accept="image/png,image/jpeg,image/jpg,image/webp" @change="handleAvatarSelected" />
        <div class="profile-user-copy">
          <h1>{{ displayName }}</h1>
        </div>
        <button class="profile-theme-toggle" type="button" :aria-label="themeToggleLabel" :title="themeToggleLabel" @click="toggleThemeWithAnimation">
          <input :checked="!themeStore.isDark" class="profile-theme-toggle-input" type="checkbox" aria-hidden="true" tabindex="-1" />
          <div class="profile-theme-icon profile-theme-icon--moon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path fill-rule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <div class="profile-theme-icon profile-theme-icon--sun">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"></path>
            </svg>
          </div>
        </button>
        <router-link to="/official-info" class="profile-notice-bell" aria-label="消息通知" title="消息通知">
          <span v-if="messageUnreadCount > 0" class="profile-notice-bell-badge profile-notice-bell-badge--dot" aria-hidden="true"></span>
          <svg viewBox="0 0 448 512" class="profile-notice-bell-icon" aria-hidden="true">
            <path d="M224 0c-17.7 0-32 14.3-32 32V49.9C119.5 61.4 64 124.2 64 200v33.4c0 45.4-15.5 89.5-43.8 124.9L5.3 377c-5.8 7.2-6.9 17.1-2.9 25.4S14.8 416 24 416H424c9.2 0 17.6-5.3 21.6-13.6s2.9-18.2-2.9-25.4l-14.9-18.6C399.5 322.9 384 278.8 384 233.4V200c0-75.8-55.5-138.6-128-150.1V32c0-17.7-14.3-32-32-32zm0 96h8c57.4 0 104 46.6 104 104v33.4c0 47.9 13.9 94.6 39.7 134.6H72.3C98.1 328 112 281.3 112 233.4V200c0-57.4 46.6-104 104-104h8zm64 352H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7s18.7-28.3 18.7-45.3z"></path>
          </svg>
        </router-link>
      </div>

      <div v-if="membershipReady" class="profile-equity-row">
        <router-link to="/membership-center" class="profile-equity-entry" :class="`profile-equity-entry--${membershipStatus.tone}`">
          <span class="profile-equity-badge">{{ membershipStatus.tone === 'normal' ? '普通用户' : membershipStatus.badge }}</span>
          <span class="profile-equity-label">权益中心 ›</span>
        </router-link>
      </div>

      <div class="profile-balance-grid profile-balance-tight">
        <template v-if="showBalanceSkeleton">
          <div v-for="index in 2" :key="`profile-balance-skeleton-${index}`" class="profile-balance-card profile-balance-link profile-skeleton-card" aria-hidden="true">
            <span class="profile-skeleton-line profile-skeleton-line--meta"></span>
            <span class="profile-skeleton-line profile-skeleton-line--value"></span>
          </div>
        </template>
        <template v-else>
          <router-link to="/wallet" class="profile-balance-card profile-balance-link">
            <span>可用余额</span>
            <strong>{{ userStore.availableBalance }}</strong>
          </router-link>
          <router-link :to="{ name: 'wallet-details', query: { type: '1', direction: 'all' } }" class="profile-balance-card profile-balance-link">
            <span>冻结余额</span>
            <strong>{{ userStore.frozenBalance }}</strong>
          </router-link>
        </template>
      </div>
    </div>

    <router-link to="/market" class="card usdt-market-card standalone-market-card usdt-entry-card">
      <span v-if="pendingTradeCount > 0" class="market-pending-badge market-pending-badge--dot" aria-hidden="true"></span>
      <div class="usdt-market-inner">
        <AppGlyph name="market" variant="mint" />
        <div>
          <strong>USDT 交易区</strong>
        </div>
      </div>
    </router-link>

    <router-link to="/invite-friends" class="card profile-setting-entry standalone-invite-card invite-entry-card">
      <div class="usdt-market-inner">
        <AppGlyph name="invite" variant="red" />
        <div>
          <strong>邀请好友</strong>
        </div>
      </div>
    </router-link>

    <div class="card stack-md finance-entry-card finance-entry-card-clean finance-entry-only-grid">
      <div class="profile-shortcuts profile-money-grid profile-money-grid-two">
        <router-link to="/substation-center" class="menu-tile profile-main-tile">
          <AppGlyph name="substation" variant="mint" />
          <div>
            <strong>分站中心</strong>
          </div>
        </router-link>
        <router-link to="/agent-center" class="menu-tile profile-main-tile">
          <AppGlyph name="agent" variant="green" />
          <div>
            <strong>代理中心</strong>
          </div>
        </router-link>
        <router-link to="/points" class="menu-tile profile-main-tile">
          <AppGlyph name="points" variant="orange" />
          <div>
            <strong>积分中心</strong>
          </div>
        </router-link>
        <button class="menu-tile profile-main-tile" type="button" @click="openHelpCenterInNewPage">
          <AppGlyph name="help-center" variant="purple" />
          <div>
            <strong>帮助中心</strong>
          </div>
        </button>
      </div>
    </div>

    <div class="profile-action-grid">
      <router-link to="/contact-service" class="card profile-setting-entry">
        <div class="usdt-market-inner">
          <AppGlyph name="service" variant="cyan" />
          <div>
            <strong>联系客服</strong>
          </div>
        </div>
      </router-link>

      <router-link to="/account-settings" class="card profile-setting-entry profile-setting-bottom">
        <div class="usdt-market-inner">
          <AppGlyph name="settings" variant="indigo" />
          <div>
            <strong>账户设置</strong>
          </div>
        </div>
      </router-link>
    </div>

    <div v-if="avatarPreviewVisible" class="modal-overlay avatar-preview-overlay" @click.self="closeAvatarPreview">
      <div class="card stack-md avatar-preview-card">
        <div class="avatar-preview-frame">
          <img v-if="avatarUrl" :src="avatarUrl" :alt="displayName" @error="handleAvatarError" />
          <div v-else class="avatar-preview-fallback">{{ avatarText }}</div>
        </div>
        <div class="avatar-preview-actions">
          <button class="ghost-btn" type="button" @click="closeAvatarPreview">关闭</button>
          <button class="primary-btn" type="button" :disabled="uploadingAvatar" @click="triggerAvatarPick">
            {{ uploadingAvatar ? '上传中...' : '更换头像' }}
          </button>
        </div>
      </div>
    </div>

    <FeedbackToast v-if="message" :type="toastType" :message="message" @close="message = ''" />
  </section>
</template>

<script setup>
defineOptions({ name: 'ProfileView' })
import { computed, onActivated, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiAccountProfileSave } from '../api/account'
import { apiAgentSummary } from '../api/agent'
import { apiSubstationMyStatus } from '../api/substation'
import { uploadImageFile } from '../api/upload'
import { useUserStore } from '../stores/user'
import { resolveAssetUrl } from '../utils/assets'
import { getSessionCache, setSessionCache } from '../utils/storage'
import { useAppBadges } from '../stores/badges'
import { useThemeStore } from '../stores/theme'
import AppGlyph from '../components/AppGlyph.vue'
import FeedbackToast from '../components/FeedbackToast.vue'

const PROFILE_MEMBERSHIP_CACHE_KEY = 'tp8-profile-membership-v1'
const PROFILE_MEMBERSHIP_CACHE_TTL = 2 * 60 * 1000
const PROFILE_BOOTSTRAP_CACHE_TTL = 90 * 1000

const userStore = useUserStore()
const themeStore = useThemeStore()
const route = useRoute()
const router = useRouter()
const avatarBroken = ref(false)
const message = ref('')
const success = ref(false)
const avatarInput = ref(null)
const uploadingAvatar = ref(false)
const avatarPreviewVisible = ref(false)
const secondLayerLoading = ref(false)
const secondLayerReady = ref(false)
const thirdLayerReady = ref(false)
const membershipReady = ref(false)
const agentSnapshot = ref({})
const substationStatus = ref({})
const { profilePendingCount, messageUnreadCount } = useAppBadges()
const pendingTradeCount = profilePendingCount

const displayName = computed(() => userStore.profile.nickname || userStore.profile.surname || '用户')
const avatarUrl = computed(() => {
  if (avatarBroken.value) return ''
  const avatar = userStore.profile.avatar || ''
  return avatar ? resolveAssetUrl(avatar) : ''
})
const avatarText = computed(() => (displayName.value || 'U').slice(0, 2))
const themeToggleLabel = computed(() => (themeStore.isDark ? '切换到浅色模式' : '切换到深色模式'))
const toastType = computed(() => (success.value ? 'success' : 'error'))
const hasBalanceSnapshot = computed(() => Boolean(userStore.accountSummary?.available || userStore.accountSummary?.frozen_amount))
const hasProfileIdentitySnapshot = computed(() => Boolean(userStore.profile.nickname || userStore.profile.surname || userStore.profile.avatar))
const showBalanceSkeleton = computed(() => secondLayerLoading.value && !hasBalanceSnapshot.value)
const membershipStatus = computed(() => {
  const substationOpened = Number(substationStatus.value?.status || 0) === 2
  const agentOpened = Number(agentSnapshot.value?.agent_status || 0) === 1

  if (substationOpened) {
    return {
      tone: 'svip',
      badge: 'SVIP'
    }
  }

  if (agentOpened) {
    return {
      tone: 'vip',
      badge: 'VIP'
    }
  }

  return {
    tone: 'normal',
    badge: '普通'
  }
})

function toggleTheme() {
  themeStore.setMode(themeStore.isDark ? 'light' : 'dark')
}

function toggleThemeWithAnimation(event) {
  const button = event?.currentTarget
  if (!(button instanceof HTMLElement)) {
    toggleTheme()
    return
  }

  const rect = button.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  )

  if (typeof document.startViewTransition !== 'function') {
    toggleTheme()
    return
  }

  const transition = document.startViewTransition(() => {
    toggleTheme()
  })

  transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`
        ]
      },
      {
        duration: 500,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)'
      }
    )
  }).catch(() => {})
}

function syncCachedSummary() {
  const cached = getSessionCache('tp8-finance-summary-direct-v2', 20 * 60 * 1000)
  if (!cached) return
  userStore.setAccountSummary({
    ...(userStore.accountSummary || {}),
    available: cached.balance ?? userStore.accountSummary?.available ?? '0.00',
    frozen_amount: cached.frozen_amount ?? '0.00'
  })
  if (cached.trc20) userStore.setProfile({ trc20: cached.trc20 })
}

function hydrateMembershipStatusFromCache(maxAge = PROFILE_MEMBERSHIP_CACHE_TTL) {
  const cached = getSessionCache(PROFILE_MEMBERSHIP_CACHE_KEY, maxAge)
  if (!cached || typeof cached !== 'object') return false
  agentSnapshot.value = cached.agentSnapshot || {}
  substationStatus.value = cached.substationStatus || {}
  membershipReady.value = true
  return true
}

async function loadMembershipStatus() {
  const [agentResult, substationResult] = await Promise.allSettled([
    apiAgentSummary(),
    apiSubstationMyStatus()
  ])

  if (agentResult.status === 'fulfilled') {
    agentSnapshot.value = agentResult.value?.data || {}
  }

  if (substationResult.status === 'fulfilled') {
    substationStatus.value = substationResult.value?.data || {}
  }

  setSessionCache(PROFILE_MEMBERSHIP_CACHE_KEY, {
    agentSnapshot: agentSnapshot.value,
    substationStatus: substationStatus.value
  })
  membershipReady.value = true
}

hydrateMembershipStatusFromCache()

let profileBootstrapPromise = null
let profileSecondaryPromise = null

function hydrateProfileCoreFromCache() {
  let hydrated = false
  if (userStore.hydrateBootstrapFromCache(PROFILE_BOOTSTRAP_CACHE_TTL)) {
    hydrated = true
  }
  if (hydrateMembershipStatusFromCache()) {
    hydrated = true
  }
  return hydrated
}

function bootstrapProfilePage(options = {}) {
  const force = options.force === true
  if (profileBootstrapPromise && !force) {
    return profileBootstrapPromise
  }

  const hydratedFromCache = !force && hydrateProfileCoreFromCache()
  secondLayerLoading.value = true
  const secondLayerTasks = []

  if (force || !userStore.hydrateBootstrapFromCache(PROFILE_BOOTSTRAP_CACHE_TTL)) {
    secondLayerTasks.push(userStore.refreshDirectFinance(true).catch(() => null))
  }

  if (force || !hydrateMembershipStatusFromCache()) {
    secondLayerTasks.push(loadMembershipStatus().catch(() => null))
  }

  profileBootstrapPromise = Promise.allSettled(secondLayerTasks)
    .finally(() => {
      secondLayerLoading.value = false
      secondLayerReady.value = true
      profileBootstrapPromise = null
    })

  if (!profileSecondaryPromise && !thirdLayerReady.value && !hasProfileIdentitySnapshot.value) {
    const scheduleSecondary = () => {
      profileSecondaryPromise = userStore.loadLegacySnapshot().catch(() => null).finally(() => {
        thirdLayerReady.value = true
        profileSecondaryPromise = null
      })
    }

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(scheduleSecondary, { timeout: 520 })
    } else {
      window.setTimeout(scheduleSecondary, 220)
    }
  } else if (hasProfileIdentitySnapshot.value || hydratedFromCache) {
    thirdLayerReady.value = true
  }

  return profileBootstrapPromise
}




function handleAvatarError() {
  avatarBroken.value = true
}

function openAvatarPreview() {
  avatarPreviewVisible.value = true
}

function closeAvatarPreview() {
  avatarPreviewVisible.value = false
}

function triggerAvatarPick() {
  avatarInput.value?.click()
}

function openHelpCenterInNewPage() {
  const route = router.resolve({ path: '/help-center' })
  window.open(route.href, '_blank', 'noopener,noreferrer')
}

function showToast(text, ok = false) {
  success.value = ok
  message.value = text
}

function consumeRechargeReturnQuery() {
  const rechargeOrder = String(route.query.recharge_order || '').trim()
  if (!rechargeOrder) return false

  router.replace({
    name: 'finance-center',
    query: {
      tab: 'recharge',
      order_number: rechargeOrder
    }
  }).catch(() => null)

  return true
}

async function handleAvatarSelected(event) {
  const file = event.target?.files?.[0]
  if (!file) return
  try {
    uploadingAvatar.value = true
    const uploadRes = await uploadImageFile(file)
    const avatar = String(uploadRes?.data?.url || '').trim()
    if (!avatar) throw new Error('Avatar upload failed')
    const payload = {
      nickname: userStore.profile.nickname || '',
      surname: userStore.profile.surname || '',
      city: userStore.profile.city || '',
      birthday: userStore.profile.birthday || '',
      gender: userStore.profile.gender ?? 0,
      avatar
    }
    await apiAccountProfileSave(payload)
    avatarBroken.value = false
    userStore.setProfile({ ...userStore.profile, avatar })
    avatarPreviewVisible.value = false
    showToast('Avatar updated', true)
  } catch (error) {
    showToast(error.message || 'Avatar update failed')
  } finally {
    uploadingAvatar.value = false
    if (event.target) event.target.value = ''
  }
}

onMounted(() => {
  if (consumeRechargeReturnQuery()) return
  syncCachedSummary()
  void bootstrapProfilePage()
})

onActivated(() => {
  if (consumeRechargeReturnQuery()) return
  syncCachedSummary()
  void bootstrapProfilePage()
})
</script>

<style scoped>
.profile-skeleton-stack {
  display: grid;
  gap: 16px;
}

.profile-skeleton-card,
.profile-skeleton-line,
.profile-skeleton-tile {
  position: relative;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.18);
}

.profile-skeleton-card::after,
.profile-skeleton-line::after,
.profile-skeleton-tile::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  animation: profileSkeletonShimmer 1.2s linear infinite;
}

.profile-skeleton-panel {
  min-height: 84px;
}

.profile-skeleton-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.profile-skeleton-grid--actions {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.profile-skeleton-tile {
  display: block;
  min-height: 84px;
  border-radius: 22px;
}

.profile-skeleton-line {
  display: block;
  border-radius: 999px;
}

.profile-skeleton-line--title {
  width: 62%;
  height: 16px;
}

.profile-skeleton-line--meta {
  width: 42%;
  height: 12px;
  margin-bottom: 10px;
}

.profile-skeleton-line--value {
  width: 56%;
  height: 18px;
}

.usdt-entry-card {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  background: linear-gradient(120deg, #0f766e, #15803d, #16a34a, #22c55e) !important;
  background-size: 300% 300%;
  box-shadow: 0 12px 30px rgba(34,197,94,0.28);
  animation: usdtEntryGradientFlow 5s ease-in-out infinite;
}

.usdt-entry-card::after {
  content: '';
  position: absolute;
  top: -45%;
  left: -70%;
  width: 42%;
  height: 190%;
  transform: skewX(-24deg) translateX(0);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.42), transparent);
  pointer-events: none;
  animation: usdtEntrySweep 2.8s ease-in-out infinite;
}

.usdt-entry-card .market-pending-badge {
  z-index: 2;
}

.usdt-entry-card .usdt-market-inner {
  position: relative;
  z-index: 2;
}

.invite-entry-card {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  background: linear-gradient(120deg, #f59e0b, #f97316, #facc15, #fb923c) !important;
  background-size: 300% 300%;
  box-shadow: 0 12px 30px rgba(245,158,11,0.28);
  animation: inviteEntryGradientFlow 5s ease-in-out infinite;
}

.invite-entry-card::after {
  content: '';
  position: absolute;
  top: -45%;
  left: -70%;
  width: 42%;
  height: 190%;
  transform: skewX(-24deg) translateX(0);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.42), transparent);
  pointer-events: none;
  animation: inviteEntrySweep 3s ease-in-out infinite;
}

.invite-entry-card .usdt-market-inner {
  position: relative;
  z-index: 2;
}

.finance-entry-only-grid .profile-main-tile {
  border: 1px solid rgba(255, 255, 255, 0.14);
}

:global([data-theme="light"]) .usdt-entry-card {
  background: linear-gradient(120deg, #0f766e, #15803d, #16a34a, #22c55e) !important;
  background-size: 300% 300% !important;
  box-shadow: 0 12px 30px rgba(34,197,94,0.28) !important;
}

:global([data-theme="light"]) .finance-entry-only-grid .profile-main-tile {
  border-color: rgba(15, 23, 42, 0.1);
}

:global([data-theme="light"]) .invite-entry-card {
  background: linear-gradient(120deg, #f59e0b, #f97316, #facc15, #fb923c) !important;
  background-size: 300% 300% !important;
  box-shadow: 0 12px 30px rgba(245,158,11,0.28) !important;
}

@keyframes usdtEntryGradientFlow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes usdtEntrySweep {
  0% {
    transform: skewX(-24deg) translateX(0);
  }
  46%,
  100% {
    transform: skewX(-24deg) translateX(430%);
  }
}

@keyframes inviteEntryGradientFlow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes inviteEntrySweep {
  0% {
    transform: skewX(-24deg) translateX(0);
  }
  46%,
  100% {
    transform: skewX(-24deg) translateX(430%);
  }
}

@keyframes profileSkeletonShimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>

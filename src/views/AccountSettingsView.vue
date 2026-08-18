<template>
  <section class="stack-lg account-settings-page">
    <router-link to="/account-profile" class="card settings-link-row simple-settings-row settings-box-link settings-inline-link">
      <strong>个人资料</strong>
      <span class="settings-link-arrow">›</span>
    </router-link>

    <router-link to="/account-password" class="card settings-link-row simple-settings-row settings-box-link settings-inline-link">
      <strong>修改密码</strong>
      <span class="settings-link-arrow">›</span>
    </router-link>

    <router-link to="/account-twofa" class="card settings-link-row simple-settings-row settings-box-link settings-inline-link settings-status-row">
      <div class="settings-status-copy">
        <strong>2FA 绑定</strong>
        <span v-if="twofaStatusText">{{ twofaStatusText }}</span>
      </div>
      <span class="settings-link-arrow">›</span>
    </router-link>

    <router-link to="/account-telegram" class="card settings-link-row simple-settings-row settings-box-link settings-inline-link settings-status-row">
      <div class="settings-status-copy">
        <strong>TG 绑定</strong>
        <span v-if="telegramStatusText">{{ telegramStatusText }}</span>
      </div>
      <span class="settings-link-arrow">›</span>
    </router-link>

    <div class="card stack-md">
      <button class="ghost-btn danger-outline-btn" type="button" @click="handleLogout">退出登录</button>
    </div>
  </section>

  <AppDialog
    :visible="showTwofaReminder"
    title="账户安全提醒"
    variant="danger"
    confirm-text="立即绑定 2FA"
    cancel-text="稍后再说"
    @close="closeTwofaReminder"
    @confirm="goTwofaBinding"
  >
    <div class="twofa-reminder-copy">
      <strong>当前账号还没有绑定 2FA</strong>
      <p>未开启二次验证时，账号密码一旦泄露，登录、改密和资金相关操作的风险都会明显升高。现在绑定验证器，后续登录和敏感操作都会多一道动态码保护。</p>
    </div>
  </AppDialog>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { apiAccountTwofaStatus } from '../api/account'
import AppDialog from '../components/AppDialog.vue'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const showTwofaReminder = ref(false)
const twofaReminderDismissed = ref(false)
const telegramBinding = computed(() => userStore.session?.accountBindings?.telegram || {})
const twofaBinding = computed(() => userStore.session?.accountBindings?.twofa || {})
const bindingReady = computed(() => Number(telegramBinding.value?.status_checked || 0) === 1)
const twofaReady = computed(() => Number(twofaBinding.value?.status_checked || 0) === 1)
const twofaEnabled = computed(() => (twofaReady.value ? Number(twofaBinding.value?.is_enabled || 0) === 1 : null))
const shouldShowTwofaReminder = computed(() => twofaReady.value && twofaEnabled.value === false && !twofaReminderDismissed.value)

const twofaStatusText = computed(() => {
  if (!twofaReady.value || twofaEnabled.value === null) return ''
  return twofaEnabled.value ? '已开启，登录需验证动态码' : '未启用，建议尽快绑定'
})

const telegramStatusText = computed(() => {
  if (!bindingReady.value) return ''
  if (Number(telegramBinding.value?.is_bound || 0) === 1) {
    if (telegramBinding.value?.tg_username) return `已绑定 @${telegramBinding.value.tg_username}`
    if (telegramBinding.value?.tg_chat_id) return `已绑定 ${telegramBinding.value.tg_chat_id}`
    return '已绑定 TG'
  }
  if (telegramBinding.value?.bind_code) return '已有可用绑定码'
  return '未绑定'
})

async function syncTelegramBinding() {
  if (bindingReady.value) return
  try {
    await userStore.refreshTelegramBinding()
  } catch {
    // ignore
  }
}

function syncTwofaBinding(binding = {}) {
  const normalizedBinding = {
    ...binding,
    status_checked: 1,
    is_enabled: Number(binding.is_enabled ?? binding.twofa_enabled ?? binding.enabled ?? 0) || 0,
    has_recovery_codes: Number(binding.has_recovery_codes ?? 0) || 0,
    recovery_code_count: Number(binding.recovery_code_count ?? 0) || 0
  }

  if (typeof userStore.setTwofaBinding === 'function') {
    userStore.setTwofaBinding(normalizedBinding)
    return normalizedBinding
  }

  if (typeof userStore.setSession === 'function') {
    userStore.setSession({
      accountBindings: {
        twofa: normalizedBinding,
        has_twofa: normalizedBinding.is_enabled
      }
    })
  }

  return normalizedBinding
}

async function syncTwofaStatus() {
  if (twofaReady.value) return
  try {
    const res = await apiAccountTwofaStatus()
    syncTwofaBinding({
      twofa_enabled: Number(res?.data?.twofa_enabled || 0),
      has_recovery_codes: Number(res?.data?.has_recovery_codes || 0),
      recovery_code_count: Number(res?.data?.recovery_code_count || 0)
    })
  } catch {
    // ignore
  }
}

function syncSecurityState() {
  void syncTelegramBinding()
  void syncTwofaStatus()
}

async function handleLogout() {
  await userStore.logoutAction()
  router.push('/login')
}

function closeTwofaReminder() {
  twofaReminderDismissed.value = true
  showTwofaReminder.value = false
}

function goTwofaBinding() {
  closeTwofaReminder()
  router.push('/account-twofa')
}

watch(shouldShowTwofaReminder, (visible) => {
  if (visible) showTwofaReminder.value = true
}, { immediate: true })

onMounted(() => syncSecurityState())
</script>

<style scoped>
.twofa-reminder-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.twofa-reminder-copy strong {
  font-size: 18px;
  line-height: 1.45;
}

.twofa-reminder-copy p {
  margin: 0;
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.7;
}

.settings-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.settings-status-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-status-copy span {
  color: var(--text-muted, #7b7280);
  font-size: 13px;
}

.settings-security-callout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  text-decoration: none;
}

.settings-security-callout-danger {
  border: 1px solid rgba(220, 38, 38, 0.14);
  background:
    radial-gradient(circle at top right, rgba(248, 113, 113, 0.12), transparent 42%),
    linear-gradient(180deg, rgba(255, 249, 249, 0.98), rgba(255, 244, 244, 0.98));
}

.settings-security-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.settings-security-eyebrow {
  display: inline-flex;
  align-self: flex-start;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.settings-security-copy strong {
  color: var(--text-main, #111827);
  font-size: 18px;
  line-height: 1.4;
}

.settings-security-copy p {
  margin: 0;
  color: var(--text-muted, #7b7280);
  font-size: 13px;
  line-height: 1.7;
}

.settings-security-action {
  display: flex;
  align-items: center;
}

.settings-security-btn {
  pointer-events: none;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .settings-security-callout {
    grid-template-columns: 1fr;
  }

  .settings-security-action {
    justify-content: flex-start;
  }
}
</style>

<template>
  <section class="auth-page auth-shell auth-mobile-page">
    <div class="auth-mobile-card minimal-auth-card refined-auth-card">
      <form class="auth-form-card auth-form-card-mobile minimal-auth-form refined-auth-form" @submit.prevent="handleSubmit">
        <div class="auth-form-top compact-auth-top minimal-auth-top refined-auth-top auth-form-top-enhanced">
          <p class="auth-site-title auth-site-title-large">{{ siteTitle }}</p>
          <h2 class="auth-section-title-sm">登录账户</h2>
        </div>

        <div class="auth-input-group refined-auth-group">
          <label>
            账号
            <input
              v-model.trim="form.mobile"
              type="text"
              placeholder="请输入账号"
              autocomplete="username"
              autocapitalize="off"
              spellcheck="false"
            />
          </label>
          <label>
            密码
            <input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              autocomplete="current-password"
              autocapitalize="off"
              spellcheck="false"
            />
          </label>
        </div>

        <button class="primary-btn auth-submit-btn refined-auth-submit" :disabled="submitDisabled">
          {{ userStore.loading ? '登录中...' : submitText }}
        </button>

        <p v-if="message && !twofaRequired" :class="feedbackClass">{{ message }}</p>

        <div class="auth-switch-row compact-switch-row refined-auth-switch-row">
          <span class="muted">还没有账号？</span>
          <router-link to="/register" class="auth-switch-link">去注册</router-link>
        </div>
      </form>
    </div>

    <AppDialog
      :visible="twofaRequired"
      title="输入动态码"
      :closable="!userStore.loading"
      :show-cancel="!userStore.loading"
      :confirm-text="'确认登录'"
      :confirm-disabled="!twofaCodeReady"
      :confirm-loading="userStore.loading"
      :close-on-mask="!userStore.loading"
      @close="resetTwofaState()"
      @confirm="handleSubmit({ source: 'twofa' })"
    >
      <div class="stack-sm">
        <label class="auth-twofa-field">
          <span>动态码</span>
          <input
            ref="twofaInputRef"
            v-model="form.twofa_code"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="请输入 6 位动态码"
            :disabled="userStore.loading"
            @input="handleTwofaCodeInput"
            @keyup.enter="handleSubmit({ source: 'twofa' })"
          />
        </label>
        <p v-if="message" :class="feedbackClass">{{ message }}</p>
      </div>
    </AppDialog>
  </section>
</template>

<script setup>
import { computed, defineAsyncComponent, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { resolveCoreTabNameByPath, scheduleWarmCoreTabViewChunks, warmCoreTabViewChunk } from '../utils/coreTabWarmup'
import { getCachedSiteName } from '../utils/siteBrand'

const AppDialog = defineAsyncComponent(() => import('../components/AppDialog.vue'))

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const message = ref('')
const success = ref(false)
const twofaRequired = ref(false)
const form = reactive({
  mobile: '',
  password: '',
  twofa_code: '',
  recovery_code: ''
})
const twofaInputRef = ref(null)
const autoSubmittingTwofa = ref(false)
const cachedSiteName = getCachedSiteName()
const SITE_TITLE_PLACEHOLDER = '\u00A0'

const siteTitle = computed(() => String(userStore.session?.siteInfo?.site_name || '').trim() || cachedSiteName || SITE_TITLE_PLACEHOLDER)
const feedbackClass = computed(() => (success.value ? 'feedback success' : 'feedback error'))
const submitText = computed(() => '立即登录')
const submitDisabled = computed(() => userStore.loading || !String(form.mobile || '').trim() || !String(form.password || '').trim())
const twofaCodeReady = computed(() => /^\d{6}$/.test(String(form.twofa_code || '').trim()))
const redirectTarget = computed(() => {
  const raw = route.query.redirect
  return typeof raw === 'string' && raw.startsWith('/') ? raw : '/'
})
const redirectCoreTab = computed(() => resolveCoreTabNameByPath(redirectTarget.value) || 'home')

const ACCOUNT_RE = /^[A-Za-z0-9]{6,32}$/

function resetTwofaInputs() {
  form.twofa_code = ''
  form.recovery_code = ''
  autoSubmittingTwofa.value = false
}

function resetTwofaState() {
  twofaRequired.value = false
  resetTwofaInputs()
  message.value = ''
}

function focusTwofaInput() {
  nextTick(() => {
    const target = twofaInputRef.value
    if (!target) return
    target.focus()
    target.select?.()
  })
}

function handleTwofaCodeInput(event) {
  form.twofa_code = String(event?.target?.value || '').replace(/\D/g, '').slice(0, 6)
  if (message.value) {
    message.value = ''
  }
}

watch(
  () => [form.mobile, form.password],
  ([mobile, password], [previousMobile, previousPassword]) => {
    if (!twofaRequired.value) return
    if (mobile !== previousMobile || password !== previousPassword) {
      resetTwofaState()
      message.value = ''
    }
  }
)

watch(twofaRequired, (enabled) => {
  if (enabled) {
    nextTick(() => {
      focusTwofaInput()
    })
  }
})

async function handleSubmit(options = {}) {
  const isTwofaStep = options.source === 'twofa'
  message.value = ''
  success.value = false

  if (!ACCOUNT_RE.test(String(form.mobile || '').trim())) {
    message.value = '账号需为 6-32 位字母或数字，不能包含特殊符号'
    return
  }

  if (!form.password) {
    message.value = '请输入密码'
    return
  }

  if (twofaRequired.value) {
    if (!/^\d{6}$/.test(String(form.twofa_code || '').trim())) {
      message.value = '请输入 6 位动态验证码'
      return
    }
  }

  try {
    const res = await userStore.loginAction(form)
    void warmCoreTabViewChunk(redirectCoreTab.value).catch(() => null)
    scheduleWarmCoreTabViewChunks({ exclude: redirectCoreTab.value, immediate: true })
    void import('../utils/ui')
      .then(({ showMessage }) => {
        showMessage({
          type: 'success',
          message: res.message || '登录成功'
        })
      })
      .catch(() => null)
    await router.replace(redirectTarget.value)
  } catch (error) {
    const needTwofa = Number(error?.data?.twofa_required || 0) === 1
    if (needTwofa) {
      twofaRequired.value = true
      if (!error?.message || error.message.includes('2FA')) {
        message.value = isTwofaStep ? '动态码有误，请重新输入' : ''
      } else {
        message.value = error.message
      }
      resetTwofaInputs()
      nextTick(() => focusTwofaInput())
      return
    }

    message.value = error.message || '登录失败'
  } finally {
    if (isTwofaStep) {
      autoSubmittingTwofa.value = false
    }
  }
}
</script>

<style scoped>
.auth-page.auth-mobile-page {
  align-items: center;
  justify-content: center;
  padding-top: max(12px, env(safe-area-inset-top));
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}

.auth-twofa-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.auth-twofa-field span {
  color: var(--text-soft, #7b7280);
  font-size: 13px;
}

.auth-twofa-field input {
  min-height: 52px;
  border: 1px solid rgba(96, 184, 244, 0.24);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #183153;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.auth-twofa-field input:focus {
  outline: none;
  border-color: #60b8f4;
  box-shadow: 0 0 0 4px rgba(96, 184, 244, 0.18);
}
</style>

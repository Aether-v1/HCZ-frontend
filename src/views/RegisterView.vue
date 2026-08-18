<template>
  <section class="auth-page auth-shell auth-mobile-page">
    <div class="auth-mobile-card minimal-auth-card refined-auth-card">
      <form class="auth-form-card auth-form-card-mobile minimal-auth-form refined-auth-form" @submit.prevent="handleSubmit">
        <div class="auth-form-top compact-auth-top minimal-auth-top refined-auth-top auth-form-top-enhanced">
          <p class="auth-site-title auth-site-title-large">{{ siteTitle }}</p>
          <h2 class="auth-section-title-sm">注册账号</h2>
        </div>

        <div class="auth-input-group refined-auth-group">
          <label>
            账号
            <input v-model.trim="form.mobile" type="text" placeholder="请输入6-32位字母或数字账号" autocomplete="username" autocapitalize="off" spellcheck="false" />
          </label>
          <label>
            密码
            <input v-model="form.password" type="password" placeholder="请输入密码" autocomplete="off" autocapitalize="off" spellcheck="false" />
          </label>
          <label>
            邀请码
            <input v-model.trim="form.invite_code" :readonly="inviteLocked" :class="{ 'is-locked-input': inviteLocked }" placeholder="请输入邀请码" autocomplete="off" autocapitalize="off" spellcheck="false" />
          </label>
        </div>


        <button class="primary-btn auth-submit-btn refined-auth-submit" :disabled="userStore.loading">
          {{ userStore.loading ? '提交中...' : '立即注册' }}
        </button>

        <AsyncFeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />

        <div class="auth-switch-row compact-switch-row refined-auth-switch-row">
          <span class="muted">已经有账号？</span>
          <router-link to="/login" class="auth-switch-link">去登录</router-link>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup>
import { computed, defineAsyncComponent, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSiteStore } from '../stores/site'
import { useUserStore } from '../stores/user'
import { getCachedSiteName } from '../utils/siteBrand'

const AsyncFeedbackToast = defineAsyncComponent(() => import('@/components/FeedbackToast.vue'))

const router = useRouter()
const route = useRoute()
const siteStore = useSiteStore()
const userStore = useUserStore()
const message = ref('')
const success = ref(false)
const inviteCode = String(route.query.code || route.query.invite_code || '')
const form = reactive({ mobile: '', password: '', invite_code: inviteCode })
const cachedSiteName = getCachedSiteName()
const SITE_TITLE_PLACEHOLDER = '\u00A0'
const siteTitle = computed(() => String(siteStore.site_name || '').trim() || cachedSiteName || SITE_TITLE_PLACEHOLDER)
const inviteLocked = ref(Boolean(inviteCode))
const ACCOUNT_RE = /^[A-Za-z0-9]{6,32}$/

async function handleSubmit() {
  message.value = ''
  success.value = false
  if (!ACCOUNT_RE.test(String(form.mobile || '').trim())) {
    message.value = '账号需为6-32位字母或数字，不能包含特殊符号'
    return
  }
  try {
    const res = await userStore.registerAction(form)
    success.value = true
    message.value = res.message || '注册成功'
    setTimeout(() => router.push('/login'), 600)
  } catch (error) {
    message.value = error.message || '注册失败'
  }
}
</script>

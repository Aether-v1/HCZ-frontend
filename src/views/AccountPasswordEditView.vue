<template>
  <section class="stack-lg">
    <div class="card stack-md">
      <div class="section-head compact-title-head">
        <h1>修改密码</h1>
      </div>
      <div class="form-grid three-col account-password-grid">
        <label>
          旧密码
          <input v-model="password.old_password" type="password" />
        </label>
        <label>
          新密码
          <input v-model="password.new_password" type="password" />
        </label>
        <label>
          确认新密码
          <input v-model="password.confirm_password" type="password" />
        </label>
        <label v-if="twofaEnabled">
          2FA 动态码
          <input v-model.trim="password.twofa_code" inputmode="numeric" maxlength="6" placeholder="请输入 6 位动态码" />
        </label>
      </div>
      <button class="primary-btn centered-form-btn" @click="handleSavePassword">修改密码</button>
      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />
    </div>
  </section>
</template>

<script setup>
import FeedbackToast from '@/components/FeedbackToast.vue'
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiAccountPasswordSave, apiAccountTwofaStatus } from '../api/account'

const router = useRouter()
const message = ref('')
const success = ref(false)
const twofaEnabled = ref(false)
const feedbackClass = computed(() => (success.value ? 'feedback success' : 'feedback error'))
const password = reactive({ old_password: '', new_password: '', confirm_password: '', twofa_code: '' })

async function loadTwofaStatus() {
  try {
    const res = await apiAccountTwofaStatus()
    twofaEnabled.value = Number(res?.data?.twofa_enabled || 0) === 1
  } catch {
    twofaEnabled.value = false
  }
}

async function handleSavePassword() {
  try {
    const payload = {
      old_password: password.old_password,
      password_one: password.new_password,
      password_two: password.confirm_password
    }
    if (twofaEnabled.value) payload.twofa_code = password.twofa_code
    const res = await apiAccountPasswordSave(payload)
    success.value = true
    message.value = res.message || '修改成功'
    password.old_password = ''
    password.new_password = ''
    password.confirm_password = ''
    password.twofa_code = ''
    setTimeout(() => router.push('/account-settings'), 500)
  } catch (error) {
    success.value = false
    message.value = error.message || '修改密码失败'
  }
}

onMounted(loadTwofaStatus)
onActivated(loadTwofaStatus)
</script>

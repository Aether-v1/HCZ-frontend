<template>
  <section class="stack-lg">
    <div class="card stack-md">
      <div class="section-head compact-title-head">
        <h1>钱包地址</h1>
      </div>
      <div class="wallet-bound-tip">
        <span>已绑定地址</span>
        <strong>{{ walletAddress.address || '暂未绑定' }}</strong>
      </div>
      <div class="form-grid two-col single-form-grid">
        <label>
          TRC20 地址
          <input v-model.trim="walletAddress.address" placeholder="请输入 TRC20 地址" />
        </label>
        <label v-if="!twofaEnabled">
          登录密码
          <input v-model="walletAddress.password" type="password" placeholder="用于验证身份" />
        </label>
        <label v-else>
          2FA 动态码
          <input v-model.trim="walletAddress.twofa_code" inputmode="numeric" maxlength="6" placeholder="请输入 6 位动态码" />
        </label>
      </div>
      <button class="primary-btn centered-form-btn" @click="handleSaveWalletAddress">保存钱包地址</button>
      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />
    </div>
  </section>
</template>

<script setup>
import FeedbackToast from '@/components/FeedbackToast.vue'
defineOptions({ name: 'WalletAddressView' })
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { apiAccountTwofaStatus, apiAccountWalletAddress, apiAccountWalletAddressSave } from '../api/account'
import { useUserStore } from '../stores/user'
import { getSessionCache, setSessionCache } from '../utils/storage'

const userStore = useUserStore()
const message = ref('')
const success = ref(false)
const twofaEnabled = ref(false)
const feedbackClass = computed(() => (success.value ? 'feedback success' : 'feedback error'))
const walletAddressCacheKey = 'tp8-wallet-address-direct'
const walletAddress = reactive({ address: userStore.walletAddress.address || userStore.profile.trc20 || '', password: '', twofa_code: '' })

async function loadTwofaStatus() {
  try {
    const res = await apiAccountTwofaStatus()
    twofaEnabled.value = Number(res?.data?.twofa_enabled || 0) === 1
  } catch {
    twofaEnabled.value = false
  }
}

async function loadBoundWalletAddress(force = false) {
  const cached = !force ? getSessionCache(walletAddressCacheKey, 20 * 60 * 1000) : null
  if (cached) {
    walletAddress.address = cached.address || cached.trc20 || ''
    userStore.setWalletAddress({ ...cached, address: walletAddress.address, trc20: walletAddress.address })
  }
  try {
    const res = await apiAccountWalletAddress()
    const payload = res.data || {}
    walletAddress.address = payload.address || payload.trc20 || ''
    userStore.setWalletAddress({ ...payload, address: walletAddress.address, trc20: walletAddress.address })
    setSessionCache(walletAddressCacheKey, payload)
  } catch {
    // ignore
  }
}

async function handleSaveWalletAddress() {
  try {
    const payload = { address: walletAddress.address }
    if (twofaEnabled.value) payload.twofa_code = walletAddress.twofa_code
    else payload.password = walletAddress.password
    const res = await apiAccountWalletAddressSave(payload)
    userStore.setWalletAddress({ address: walletAddress.address, trc20: walletAddress.address, status: walletAddress.address ? 1 : 0, is_bound: walletAddress.address ? 1 : 0 })
    setSessionCache(walletAddressCacheKey, { address: walletAddress.address, trc20: walletAddress.address, status: walletAddress.address ? 1 : 0, is_bound: walletAddress.address ? 1 : 0 })
    success.value = true
    message.value = res.message || '保存成功'
    walletAddress.password = ''
    walletAddress.twofa_code = ''
  } catch (error) {
    success.value = false
    message.value = error.message || '保存钱包地址失败'
  }
}

onMounted(() => {
  loadTwofaStatus()
  loadBoundWalletAddress(false)
})
onActivated(() => {
  loadTwofaStatus()
  loadBoundWalletAddress(true)
})
</script>

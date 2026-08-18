<template>
  <section class="stack-lg">
    <div class="card stack-md">
      <div class="section-head compact-title-head">
        <h1>收款信息</h1>
      </div>
      <div class="wallet-bound-tip payment-bound-tip">
        <span>当前已绑定</span>
        <strong>{{ boundSummary }}</strong>
      </div>
      <div class="form-grid two-col single-form-grid">
        <label>
          姓名
          <input v-model.trim="bankCard.name" />
        </label>
        <label>
          手机号
          <input v-model.trim="bankCard.mobile" />
        </label>
        <label>
          微信账号
          <input v-model.trim="bankCard.wx_account" />
        </label>
        <label>
          支付宝账号
          <input v-model.trim="bankCard.zfb_account" />
        </label>
        <label v-if="!twofaEnabled">
          登录密码
          <input v-model="bankCard.password" type="password" placeholder="用于验证身份" />
        </label>
        <label v-else>
          2FA 动态码
          <input v-model.trim="bankCard.twofa_code" inputmode="numeric" maxlength="6" placeholder="请输入 6 位动态码" />
        </label>
      </div>
      <label class="checkbox-row checkbox-card">
        <input v-model="bankCard.default_selection" type="checkbox" />
        <span>设为默认收款信息</span>
      </label>
      <button class="primary-btn centered-form-btn" @click="handleSaveBankCard">保存收款信息</button>
      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />
    </div>
  </section>
</template>

<script setup>
import FeedbackToast from '@/components/FeedbackToast.vue'
defineOptions({ name: 'BankCardView' })
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { apiAccountBankCard, apiAccountBankCardSave, apiAccountTwofaStatus } from '../api/account'
import { getSessionCache, setSessionCache } from '../utils/storage'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
const message = ref('')
const success = ref(false)
const twofaEnabled = ref(false)
const feedbackClass = computed(() => (success.value ? 'feedback success' : 'feedback error'))
const bankCardCacheKey = 'tp8-bank-card-direct'
const bankCard = reactive({
  name: userStore.bankCard.name || '',
  mobile: userStore.bankCard.mobile || '',
  wx_account: userStore.bankCard.wx_account || '',
  zfb_account: userStore.bankCard.zfb_account || '',
  default_selection: Boolean(userStore.bankCard.default_selection),
  password: '',
  twofa_code: ''
})

async function loadTwofaStatus() {
  try {
    const res = await apiAccountTwofaStatus()
    twofaEnabled.value = Number(res?.data?.twofa_enabled || 0) === 1
  } catch {
    twofaEnabled.value = false
  }
}

const boundSummary = computed(() => {
  const parts = [bankCard.name, bankCard.mobile, bankCard.wx_account || bankCard.zfb_account].filter(Boolean)
  return parts.length ? parts.join(' / ') : '暂未绑定'
})

async function loadBoundBankCard(force = false) {
  const cached = !force ? getSessionCache(bankCardCacheKey, 20 * 60 * 1000) : null
  if (cached) {
    bankCard.name = cached.name || ''
    bankCard.mobile = cached.mobile || ''
    bankCard.wx_account = cached.wx_account || ''
    bankCard.zfb_account = cached.zfb_account || ''
    bankCard.default_selection = Boolean(cached.default_selection)
    userStore.setBankCard(cached)
  }
  try {
    const res = await apiAccountBankCard()
    const payload = res.data || {}
    bankCard.name = payload.name || ''
    bankCard.mobile = payload.mobile || ''
    bankCard.wx_account = payload.wx_account || ''
    bankCard.zfb_account = payload.zfb_account || ''
    bankCard.default_selection = Boolean(payload.default_selection)
    userStore.setBankCard(payload)
    setSessionCache(bankCardCacheKey, payload)
  } catch {
    // ignore
  }
}

async function handleSaveBankCard() {
  try {
    const payload = {
      name: bankCard.name,
      mobile: bankCard.mobile,
      wx_account: bankCard.wx_account,
      zfb_account: bankCard.zfb_account,
      default_selection: bankCard.default_selection ? 1 : 0
    }
    if (twofaEnabled.value) payload.twofa_code = bankCard.twofa_code
    else payload.password = bankCard.password
    const res = await apiAccountBankCardSave(payload)
    success.value = true
    message.value = res.message || '保存成功'
    const savedBankCard = {
      name: bankCard.name,
      mobile: bankCard.mobile,
      wx_account: bankCard.wx_account,
      zfb_account: bankCard.zfb_account,
      default_selection: bankCard.default_selection,
      status: 1,
      is_bound: 1
    }
    userStore.setBankCard(savedBankCard)
    setSessionCache(bankCardCacheKey, savedBankCard)
    bankCard.password = ''
    bankCard.twofa_code = ''
  } catch (error) {
    success.value = false
    message.value = error.message || '保存收款信息失败'
  }
}

onMounted(() => {
  loadTwofaStatus()
  loadBoundBankCard(false)
})
onActivated(() => {
  loadTwofaStatus()
  loadBoundBankCard(true)
})
</script>

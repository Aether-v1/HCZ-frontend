<template>
  <section class="stack-lg finance-submit-page" v-if="mode === 'preview' && preview">
    <div class="card stack-md">
      <div class="section-head compact-title-head"><h1>提现详细</h1></div>
      <div class="result-panel rich-result preview-price-panel order-preview-grid always-show-pricing">
        <div class="result-item preview-stat-card">
          <span class="tiny-text muted">提现数量</span>
          <strong>{{ preview.amount }} USDT</strong>
        </div>
        <div class="result-item preview-stat-card">
          <span class="tiny-text muted">提现手续费</span>
          <strong>-{{ withdrawalFeeDisplay }} USDT</strong>
        </div>
        <div class="result-item preview-stat-card" v-if="usePointsDeduct && canUsePointsDeduction">
          <span class="tiny-text muted">积分抵扣</span>
          <strong>{{ pointsDeductAppliedPointsDisplay }} 积分 / {{ pointsDeductAppliedFeeDisplay }} USDT</strong>
        </div>
        <div class="result-item preview-stat-card">
          <span class="tiny-text muted">实际到账</span>
          <strong>{{ actualAmountDisplay }} USDT</strong>
        </div>
      </div>
      <div class="wallet-bound-tip payment-bound-tip">
        <span>提现到钱包地址</span>
        <strong>{{ preview.wallet_address }}</strong>
      </div>
      <label>
        登录密码
        <input v-model="submitForm.password" type="password" placeholder="请输入登录密码" />
      </label>
      <label v-if="preview.twofa_enabled">
        2FA 动态验证码
        <input v-model.trim="submitForm.twofa_code" maxlength="6" placeholder="请输入 6 位验证码" />
      </label>
      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />
      <button class="primary-btn block" type="button" :disabled="submitting" @click="handleSubmit">
        {{ submitting ? '提交中...' : '确认提现' }}
      </button>
    </div>
  </section>

  <section class="stack-lg finance-submit-page" v-else-if="mode === 'detail' && detail">
    <div class="card stack-md finance-submit-status-card">
      <div class="wallet-detail-record-top finance-submit-top">
        <div>
          <span class="tiny-text muted">订单号</span>
          <strong>{{ detail.order_number }}</strong>
        </div>
        <span class="pill-tag" :class="detail.status === 1 ? '' : 'light'">{{ detail.status_text }}</span>
      </div>
      <div class="tiny-text muted">创建于 {{ detail.create_time || '-' }}</div>
      <div class="tiny-text muted" v-if="Number(detail.status || 0) === 0">预计一小时内到账</div>
    </div>
    <div class="card stack-md">
      <div class="section-head compact-title-head"><h2>提现信息</h2></div>
      <div class="result-panel rich-result preview-price-panel order-preview-grid always-show-pricing">
        <div class="result-item preview-stat-card">
          <span class="tiny-text muted">提现数量</span>
          <strong>{{ detail.amount }} USDT</strong>
        </div>
        <div class="result-item preview-stat-card">
          <span class="tiny-text muted">手续费</span>
          <strong>-{{ detail.withdrawal_fee }} USDT</strong>
        </div>
        <div class="result-item preview-stat-card" v-if="Number(detail.points_deduct_fee || 0) > 0">
          <span class="tiny-text muted">积分抵扣</span>
          <strong>{{ detail.points_deduct_fee }} USDT</strong>
        </div>
        <div class="result-item preview-stat-card">
          <span class="tiny-text muted">实际到账</span>
          <strong>{{ detail.actual_amount }} USDT</strong>
        </div>
      </div>
      <div class="wallet-bound-tip payment-bound-tip">
        <span>钱包地址</span>
        <strong>{{ detail.wallet_address || '未设置' }}</strong>
      </div>
      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />
    </div>
  </section>

  <section v-else class="card empty-card app-empty">
    <div class="empty-emoji">💸</div>
    <h3>提现信息不存在</h3>
    <p class="muted">请重新从资金中心进入提现流程。</p>
    <router-link to="/finance-center?tab=withdraw" class="primary-btn block">返回资金中心</router-link>
  </section>
</template>

<script setup>
import FeedbackToast from '@/components/FeedbackToast.vue'
defineOptions({ name: 'FinanceWithdrawalView' })
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiFinanceWithdrawalDetail, apiFinanceWithdrawalPreview, apiFinanceWithdrawalSubmit } from '../api/finance'
import { useUserStore } from '../stores/user'
import { removeSessionCache } from '../utils/storage'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const preview = ref(null)
const detail = ref(null)
const submitForm = reactive({ password: '', twofa_code: '' })
const submitting = ref(false)
const message = ref('')
const success = ref(false)
const mode = ref('preview')
const usePointsDeduct = ref(false)
const feedbackClass = computed(() => (success.value ? 'feedback success' : 'feedback error'))

function toNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function money(value, digits = 2) {
  return toNumber(value, 0).toFixed(digits)
}

const showPointsDeduction = computed(() => mode.value === 'preview' && Number(preview.value?.points_deduct_visible || 0) === 1)
const canUsePointsDeduction = computed(() => Number(preview.value?.points_deduct_enabled || 0) === 1)
const pointsDeductAvailableFee = computed(() => {
  if (!showPointsDeduction.value || !canUsePointsDeduction.value) return 0
  return toNumber(preview.value?.points_deduct_available_fee || 0)
})
const pointsDeductAvailablePoints = computed(() => {
  if (!showPointsDeduction.value || !canUsePointsDeduction.value) return 0
  return Math.max(0, toNumber(preview.value?.points_deduct_available_points || 0))
})
const pointsDeductFee = computed(() => {
  if (!showPointsDeduction.value || !canUsePointsDeduction.value || !usePointsDeduct.value) return 0
  return pointsDeductAvailableFee.value
})
const pointsDeductAppliedFeeDisplay = computed(() => {
  if (!usePointsDeduct.value || !canUsePointsDeduction.value) return '0.00'
  return money(pointsDeductFee.value)
})
const pointsDeductAppliedPointsDisplay = computed(() => {
  if (!usePointsDeduct.value || !canUsePointsDeduction.value) return 0
  return pointsDeductAvailablePoints.value
})
const withdrawalFeeDisplay = computed(() => {
  if (!preview.value) return '0.00'
  const baseFee = toNumber(preview.value.withdrawal_fee_base ?? preview.value.withdrawal_fee, 0)
  return money(Math.max(0, baseFee - pointsDeductFee.value))
})
const actualAmountDisplay = computed(() => {
  if (!preview.value) return '0.000000'
  const amount = toNumber(preview.value.amount, 0)
  const fee = toNumber(withdrawalFeeDisplay.value, 0)
  return money(Math.max(0, amount - fee), 6)
})

function clearFinanceCaches() {
  removeSessionCache('tp8-finance-summary-direct')
  for (let currentPage = 1; currentPage <= 20; currentPage += 1) {
    removeSessionCache(`tp8-finance-orders-direct-recharge-${currentPage}`)
    removeSessionCache(`tp8-finance-orders-direct-withdraw-${currentPage}`)
  }
}

async function loadByRoute() {
  message.value = ''
  const presetUsePointsDeduct = String(route.query.use_points_deduct || '') === '1'
  if (route.query.id) {
    mode.value = 'detail'
    try {
      const res = await apiFinanceWithdrawalDetail(route.query.id)
      detail.value = res.data || null
      preview.value = null
      usePointsDeduct.value = false
    } catch (error) {
      detail.value = null
      success.value = false
      message.value = error.message || '加载提现详情失败'
    }
    return
  }

  if (!route.query.amount) {
    mode.value = 'preview'
    preview.value = null
    detail.value = null
    usePointsDeduct.value = false
    return
  }

  mode.value = 'preview'
  try {
    const res = await apiFinanceWithdrawalPreview(route.query.amount)
    preview.value = res.data || null
    detail.value = null
    usePointsDeduct.value = presetUsePointsDeduct && Number(preview.value?.points_deduct_enabled || 0) === 1
  } catch (error) {
    preview.value = null
    success.value = false
    message.value = error.message || '加载提现确认信息失败'
  }
}

async function handleSubmit() {
  if (submitting.value || !preview.value) return
  try {
    submitting.value = true
    const payload = {
      amount: preview.value.amount,
      password: submitForm.password,
      use_points_deduct: usePointsDeduct.value && canUsePointsDeduction.value ? 1 : 0
    }
    if (preview.value.twofa_enabled) payload.twofa_code = submitForm.twofa_code
    const res = await apiFinanceWithdrawalSubmit(payload)
    success.value = true
    message.value = res.message || '提现申请已提交'
    submitForm.password = ''
    submitForm.twofa_code = ''
    clearFinanceCaches()
    await userStore.refreshDirectFinance(true).catch(() => null)
    await router.replace({ name: 'finance-withdrawal', query: { id: res.data?.id } })
  } catch (error) {
    success.value = false
    message.value = error.message || '提现提交失败'
  } finally {
    submitting.value = false
  }
}

watch(() => route.fullPath, () => {
  loadByRoute()
})

onMounted(() => {
  loadByRoute()
})
</script>

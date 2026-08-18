<template>
  <section class="stack-lg membership-center-page">
    <div class="card membership-hero-card">
      <div>
        <span class="tiny-text muted">当前权益</span>
        <h1>{{ currentTierLabel }}</h1>
        <p class="muted">普通用户、VIP、SVIP 权益统一展示，激活金额与公告读取后台支付设置。</p>
      </div>
      <div class="membership-hero-badge" :class="`is-${currentTierTone}`">{{ currentTierLabel }}</div>
    </div>

    <div v-if="loading" class="card app-loading-card membership-loading-card">
      <AppLoader size="md" />
    </div>

    <template v-else>
      <article
        v-for="tier in tiers"
        :key="tier.key"
        class="card membership-tier-card"
        :class="[`is-${tier.tone}`, { active: tier.active }]"
      >
        <div class="membership-tier-top">
          <div>
            <span class="membership-tier-kicker">{{ tier.kicker }}</span>
            <h2>{{ tier.name }}</h2>
          </div>
          <span class="membership-tier-status">{{ tier.statusText }}</span>
        </div>

        <p class="membership-tier-desc">{{ tier.desc }}</p>

        <div class="membership-tier-meta">
          <div>
            <span>激活金额</span>
            <strong>{{ tier.priceText }}</strong>
          </div>
          <div>
            <span>激活方式</span>
            <strong>{{ tier.payText }}</strong>
          </div>
        </div>

        <div class="membership-notice-box">
          <span>权益公告</span>
          <p>{{ tier.notice }}</p>
        </div>

        <div class="membership-action-row">
          <button
            v-if="tier.key === 'normal'"
            class="ghost-btn membership-action-btn"
            type="button"
            disabled
          >
            当前基础权益
          </button>

          <template v-else-if="tier.key === 'vip'">
            <button
              class="primary-btn membership-action-btn"
              type="button"
              :disabled="tier.active || activatingVip"
              @click="openActivateConfirm('vip')"
            >
              {{ tier.active ? '已激活' : (activatingVip ? '激活中...' : '开通VIP') }}
            </button>
          </template>

          <template v-else>
            <button
              class="primary-btn membership-action-btn"
              type="button"
              :disabled="tier.pending || activatingSvip"
              @click="handleSvipAction(tier)"
            >
              {{ tier.active ? '修改分站资料' : (tier.pending ? '审核中' : (tier.paid ? '提交开通资料' : (activatingSvip ? '支付中...' : '开通SVIP'))) }}
            </button>
            <!-- SVIP 已激活：提供直达分站中心入口 -->
            <router-link
              v-if="tier.active"
              class="ghost-btn membership-action-btn membership-substation-link"
              to="/substation-center"
            >
              进入分站中心
            </router-link>
          </template>
        </div>
      </article>
    </template>

    <AppDialog
      :visible="confirmVisible"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-text="confirmConfirmText"
      cancel-text="取消"
      :confirm-loading="confirmLoading"
      loading-text="处理中..."
      @close="closeActivateConfirm"
      @confirm="submitActivateConfirm"
    />

    <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />
  </section>
</template>

<script setup>
defineOptions({ name: 'MembershipCenterView' })
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiAgentActivate, apiAgentSummary } from '../api/agent'
import { apiSubstationMyStatus, apiSubstationOpenPay } from '../api/substation'
import AppDialog from '../components/AppDialog.vue'
import AppLoader from '../components/AppLoader.vue'
import FeedbackToast from '../components/FeedbackToast.vue'

const loading = ref(true)
const activatingVip = ref(false)
const activatingSvip = ref(false)
const confirmVisible = ref(false)
const confirmType = ref('')
const agentInfo = ref({})
const substationInfo = ref({})
const message = ref('')
const success = ref(false)
const router = useRouter()

const confirmLoading = computed(() => {
  if (confirmType.value === 'vip') return activatingVip.value
  if (confirmType.value === 'svip') return activatingSvip.value
  return false
})

const confirmTitle = computed(() => {
  if (confirmType.value === 'vip') return '确认开通 VIP'
  if (confirmType.value === 'svip') return '确认支付开通 SVIP'
  return '确认操作'
})

const confirmMessage = computed(() => {
  if (confirmType.value === 'vip') {
    return `确认使用余额开通 VIP？\n开通金额：${formatAmountU(agentInfo.value?.agent_money)}`
  }
  if (confirmType.value === 'svip') {
    return `确认使用余额支付开通 SVIP？\n开通金额：${formatAmountU(substationInfo.value?.open_price)}`
  }
  return '请确认是否继续当前操作。'
})

const confirmConfirmText = computed(() => {
  if (confirmType.value === 'vip') return '确认开通'
  if (confirmType.value === 'svip') return '确认支付'
  return '确认'
})

const isVip = computed(() => Number(agentInfo.value?.agent_status || 0) === 1)
const isSvip = computed(() => Number(substationInfo.value?.status || 0) === 2)
const isSvipPaid = computed(() => {
  const status = Number(substationInfo.value?.status || 0)
  return Number(substationInfo.value?.paid_open || 0) === 1 || [1, 2, 3, 5].includes(status)
})
const isSvipPending = computed(() => Number(substationInfo.value?.status || 0) === 1 || Number(substationInfo.value?.has_pending_audit || 0) === 1)
const currentTierLabel = computed(() => {
  if (isSvip.value) return 'SVIP'
  if (isVip.value) return 'VIP'
  return '普通用户'
})
const currentTierTone = computed(() => {
  if (isSvip.value) return 'svip'
  if (isVip.value) return 'vip'
  return 'normal'
})

const tiers = computed(() => [
  {
    key: 'normal',
    name: '普通用户',
    kicker: '基础权益',
    tone: 'normal',
    active: !isVip.value && !isSvip.value,
    pending: false,
    statusText: !isVip.value && !isSvip.value ? '当前等级' : '已包含',
    priceText: '免费',
    payText: '无需支付',
    desc: '适合自用下单与基础账户功能。',
    notice: '普通用户可使用平台基础购买、充值、提现与订单查询能力。'
  },
  {
    key: 'vip',
    name: 'VIP',
    kicker: '代理权益',
    tone: 'vip',
    active: isVip.value || isSvip.value,
    pending: false,
    statusText: isSvip.value ? '已包含于SVIP' : ((isVip.value || isSvip.value) ? '已激活' : '可激活'),
    priceText: formatAmountU(agentInfo.value?.agent_money),
    payText: isSvip.value ? '已包含，无需支付' : '余额激活',
    desc: '激活后获得代理入口、邀请返佣与佣金钱包能力。',
    notice: isSvip.value
      ? '当前账号已开通 SVIP，默认包含 VIP 全部权益，无需重复开通。'
      : (String(agentInfo.value?.agent_intro || '').trim() || '激活 VIP 后可查看代理用户与佣金收益，未激活状态下佣金将冻结在佣金钱包。')
  },
  {
    key: 'svip',
    name: 'SVIP',
    kicker: '分站权益',
    tone: 'svip',
    active: isSvip.value,
    paid: isSvipPaid.value,
    pending: isSvipPending.value,
    statusText: isSvip.value ? '已激活' : (isSvipPending.value ? '审核中' : (isSvipPaid.value ? '待提交资料' : '可激活')),
    priceText: formatAmountU(substationInfo.value?.open_price),
    payText: isSvip.value ? '已开通，可修改资料' : (isSvipPending.value ? '资料审核中' : (isSvipPaid.value ? '已支付，待提交开通资料' : '余额激活')),
    desc: '先支付开通 SVIP，再提交开通资料等待审核；SVIP 默认包含 VIP 权益，开通后可单独修改分站资料。',
    notice: String(substationInfo.value?.open_intro || '').trim() || 'SVIP 分站需先支付开通，支付成功后才能提交站点资料，审核通过后正式开通，并默认包含 VIP 全部权益。'
  }
])

function formatAmountU(value) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount) || amount <= 0) return '0.00U'
  return `${amount.toFixed(2)}U`
}

async function loadMembership() {
  loading.value = true
  try {
    const [agentResult, substationResult] = await Promise.allSettled([
      apiAgentSummary(),
      apiSubstationMyStatus()
    ])
    if (agentResult.status === 'fulfilled') agentInfo.value = agentResult.value?.data || {}
    if (substationResult.status === 'fulfilled') substationInfo.value = substationResult.value?.data || {}
  } catch (error) {
    success.value = false
    message.value = error?.message || '加载权益信息失败'
  } finally {
    loading.value = false
  }
}

async function activateVip() {
  if (isVip.value || isSvip.value || activatingVip.value) return
  activatingVip.value = true
  try {
    const res = await apiAgentActivate()
    success.value = true
    message.value = res.message || 'VIP 激活成功'
    await loadMembership()
  } catch (error) {
    success.value = false
    message.value = error?.message || 'VIP 激活失败'
  } finally {
    activatingVip.value = false
  }
}

async function activateSvip() {
  if (activatingSvip.value || isSvip.value || isSvipPending.value || isSvipPaid.value) return
  activatingSvip.value = true
  try {
    const res = await apiSubstationOpenPay()
    success.value = true
    message.value = res.message || 'SVIP 支付开通成功，请提交分站资料'
    await loadMembership()
  } catch (error) {
    success.value = false
    message.value = error?.message || 'SVIP 支付开通失败'
  } finally {
    activatingSvip.value = false
  }
}

function openActivateConfirm(type) {
  if (type === 'vip' && (isVip.value || isSvip.value || activatingVip.value)) return
  if (type === 'svip' && (isSvip.value || isSvipPending.value || isSvipPaid.value || activatingSvip.value)) return
  confirmType.value = type
  confirmVisible.value = true
}

function closeActivateConfirm() {
  if (confirmLoading.value) return
  confirmVisible.value = false
  confirmType.value = ''
}

async function submitActivateConfirm() {
  if (confirmType.value === 'vip') {
    await activateVip()
  } else if (confirmType.value === 'svip') {
    await activateSvip()
  }
  closeActivateConfirm()
}

function handleSvipAction(tier) {
  if (tier.pending) return
  if (tier.paid) {
    router.push('/substation-profile').catch(() => null)
    return
  }
  openActivateConfirm('svip')
}

onMounted(loadMembership)
</script>

<style scoped>
.membership-center-page {
  padding-bottom: 18px;
}

.membership-hero-card {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 150px;
  border-radius: 28px;
  background:
    radial-gradient(circle at 18% 18%, rgba(250, 204, 21, 0.22), transparent 28%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(23, 37, 84, 0.92));
}

.membership-hero-card h1 {
  margin: 6px 0;
  font-size: 34px;
}

.membership-hero-card p {
  max-width: 420px;
  margin: 0;
  line-height: 1.6;
}

.membership-hero-badge {
  flex: 0 0 auto;
  min-width: 86px;
  padding: 12px 16px;
  border-radius: 999px;
  text-align: center;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.membership-hero-badge.is-normal {
  background: rgba(148, 163, 184, 0.18);
}

.membership-hero-badge.is-vip {
  color: #2b1700;
  background: linear-gradient(135deg, #facc15, #f59e0b);
}

.membership-hero-badge.is-svip {
  color: #031b32;
  background: linear-gradient(135deg, #67e8f9, #38bdf8, #3b82f6);
}

.membership-loading-card {
  min-height: 360px;
  display: grid;
  place-items: center;
}

.membership-tier-card {
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 14px;
  border-radius: 26px;
}

.membership-tier-card::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.16;
  pointer-events: none;
}

.membership-tier-card.is-normal::before {
  background: linear-gradient(135deg, #94a3b8, transparent 58%);
}

.membership-tier-card.is-vip::before {
  background: linear-gradient(135deg, #facc15, transparent 58%);
}

.membership-tier-card.is-svip::before {
  background: linear-gradient(135deg, #38bdf8, transparent 58%);
}

.membership-tier-card.active {
  border-color: rgba(250, 204, 21, 0.36);
  box-shadow: 0 14px 34px rgba(250, 204, 21, 0.12);
}

.membership-tier-top,
.membership-tier-meta,
.membership-notice-box,
.membership-action-row,
.membership-tier-desc {
  position: relative;
  z-index: 1;
}

.membership-tier-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.membership-tier-kicker,
.membership-tier-meta span,
.membership-notice-box span {
  color: var(--text-soft);
  font-size: 12px;
}

.membership-tier-top h2 {
  margin: 4px 0 0;
  font-size: 24px;
}

.membership-tier-status {
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 12px;
  font-weight: 800;
}

.membership-tier-desc {
  margin: 0;
  color: var(--text-soft);
  line-height: 1.6;
}

.membership-tier-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.membership-tier-meta > div,
.membership-notice-box {
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.membership-tier-meta strong {
  display: block;
  margin-top: 4px;
  font-size: 18px;
}

.membership-notice-box p {
  margin: 6px 0 0;
  color: var(--text);
  line-height: 1.65;
  white-space: pre-wrap;
}

.membership-action-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.membership-action-btn {
  min-height: 44px;
  text-align: center;
}

.membership-action-btn.disabled {
  opacity: 0.58;

  .membership-substation-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }
  pointer-events: none;
}

[data-theme="light"] .membership-hero-card {
  background:
    radial-gradient(circle at 18% 18%, rgba(250, 204, 21, 0.24), transparent 28%),
    linear-gradient(135deg, #ffffff, #eef6ff);
}

[data-theme="light"] .membership-tier-meta > div,
[data-theme="light"] .membership-notice-box,
[data-theme="light"] .membership-tier-status {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(99, 118, 170, 0.14);
}

@media (max-width: 640px) {
  .membership-hero-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .membership-hero-card h1 {
    font-size: 30px;
  }

  .membership-tier-meta,
  .membership-action-row {
    grid-template-columns: 1fr;
  }
}
</style>

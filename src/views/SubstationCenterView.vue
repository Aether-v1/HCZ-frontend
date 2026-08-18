<template>
  <section class="stack-lg substation-center-shell">
    <div class="card stack-md substation-center-card">
      <div v-if="loading" class="app-loading-card"><AppLoader size="md" /></div>

      <template v-else>
        <div class="substation-status-single">
          <div class="substation-stat-card"><span>状态</span><strong>{{ statusText }}</strong></div>
        </div>
        <div class="substation-wallet-grid">
          <div class="substation-stat-card"><span>累计入账</span><strong>{{ formatUsdt(statusData.wallet_total_income) }}</strong></div>
          <div class="substation-stat-card"><span>分站钱包</span><strong>{{ formatUsdt(statusData.wallet_balance) }}</strong></div>
        </div>

        <div v-if="canTransferOpen" class="substation-transfer-center">
          <button class="primary-btn substation-transfer-btn" type="button" @click="openTransferModal">转到账户钱包</button>
        </div>

        <div class="substation-profile-card">
          <div class="substation-profile-copy">
            <strong>{{ profile.site_name || '未设置网站名' }}</strong>
            <p class="muted">域名：{{ profile.full_domain || profile.subdomain || '未配置' }}</p>
            <p class="muted">公告：{{ profile.notice || '暂无公告' }}</p>
          </div>
          <img v-if="logoUrl" class="substation-logo" :src="logoUrl" alt="logo" />
        </div>

        <div class="substation-action-list">
          <router-link class="menu-tile profile-main-tile full-row-tile" to="/substation-profile">
            <AppGlyph name="substation" variant="green" />
            <div><strong>{{ isOpened ? '修改分站资料' : '提交开通资料' }}</strong></div>
          </router-link>
          <router-link v-if="isOpened" class="menu-tile profile-main-tile full-row-tile" to="/substation-product-price">
            <AppGlyph name="substation-price" variant="purple" />
            <div><strong>档位价格设置</strong></div>
          </router-link>
          <router-link v-if="isOpened" class="menu-tile profile-main-tile full-row-tile" to="/substation-income-log">
            <AppGlyph name="substation-income" variant="orange" />
            <div><strong>收益流水</strong></div>
          </router-link>
        </div>
      </template>
    </div>

    <FeedbackToast v-if="message" :type="toastType" :message="message" @close="message = ''" />

    <AppDialog
      :visible="transferVisible"
      title="分站钱包划转"
      :message="'请输入要划转到账户钱包的金额，并输入登录密码确认。'"
      confirm-text="确认划转"
      :confirm-loading="transferLoading"
      loading-text="划转中..."
      @close="closeTransferModal"
      @confirm="submitTransfer"
    >
      <label>
        划转金额
        <input v-model="transferAmount" type="number" min="0.01" step="0.01" placeholder="请输入划转金额(U)" />
      </label>

      <label>
        登录密码
        <input v-model="transferPassword" type="password" placeholder="请输入登录密码" />
      </label>

      <div class="chips wrap">
        <button class="chip button-chip" type="button" @click="fillTransferAll">全部划转</button>
      </div>
    </AppDialog>

    <AppDialog
      :visible="showSvipGateDialog"
      title="分站中心访问受限"
      message="当前账号尚未开通 SVIP，暂不可使用分站中心功能。"
      :closable="false"
      :close-on-mask="false"
      :show-cancel="false"
      confirm-text="前往权益中心"
      @confirm="goMembershipCenter"
    />
  </section>
</template>

<script setup>
defineOptions({ name: 'SubstationCenterView' })
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiSubstationMyProfile, apiSubstationMyStatus, apiSubstationWalletTransfer } from '../api/substation'
import { resolveAssetUrl } from '../utils/assets'
import { getSessionCache, setSessionCache } from '../utils/storage'
import AppLoader from '../components/AppLoader.vue'
import AppGlyph from '../components/AppGlyph.vue'
import AppDialog from '../components/AppDialog.vue'
import FeedbackToast from '../components/FeedbackToast.vue'

const SUBSTATION_CENTER_CACHE_KEY = 'tp8-substation-center'
const SUBSTATION_CENTER_CACHE_TTL = 5 * 60 * 1000

const loading = ref(false)
const transferLoading = ref(false)
const transferVisible = ref(false)
const transferAmount = ref('')
const transferPassword = ref('')
const message = ref('')
const success = ref(false)
const statusData = ref({})
const profile = ref({})
const router = useRouter()

const statusText = computed(() => ({ 0: '未开通', 1: '待审核', 2: '已开通', 3: '已驳回', 4: '已禁用', 5: '已支付待提交资料' }[Number(statusData.value?.status) || 0] || '未知'))
const isSvipOpened = computed(() => Number(statusData.value?.status || 0) === 2)
const isOpened = computed(() => isSvipOpened.value)
const showSvipGateDialog = computed(() => !loading.value && !isSvipOpened.value)
const canTransferOpen = computed(() => isOpened.value && Number(statusData.value?.wallet_balance || 0) > 0)
const logoUrl = computed(() => profile.value?.logo ? resolveAssetUrl(profile.value.logo) : '')
const toastType = computed(() => (success.value ? 'success' : 'error'))

function formatUsdt(value) {
  return `${Number(value || 0).toFixed(2)}U`
}

function showToast(text, ok = false) {
  success.value = ok
  message.value = text
}

async function loadData() {
  const cached = getSessionCache(SUBSTATION_CENTER_CACHE_KEY, SUBSTATION_CENTER_CACHE_TTL)
  if (cached && !loading.value && !Object.keys(statusData.value || {}).length && !Object.keys(profile.value || {}).length) {
    statusData.value = cached.statusData || {}
    profile.value = cached.profile || {}
  }

  loading.value = true
  try {
    const [statusRes, profileRes] = await Promise.all([apiSubstationMyStatus(), apiSubstationMyProfile()])
    statusData.value = statusRes.data || {}
    profile.value = profileRes.data || {}
    setSessionCache(SUBSTATION_CENTER_CACHE_KEY, {
      statusData: statusData.value,
      profile: profile.value
    })
  } catch (error) {
    showToast(error?.message || '分站信息加载失败')
  } finally {
    loading.value = false
  }
}

function openTransferModal() {
  transferAmount.value = ''
  transferPassword.value = ''
  transferVisible.value = true
}

function closeTransferModal() {
  if (transferLoading.value) return
  transferVisible.value = false
}

function fillTransferAll() {
  transferAmount.value = Number(statusData.value?.wallet_balance || 0).toFixed(2)
}

async function submitTransfer() {
  const amount = Number(transferAmount.value || 0)
  if (amount <= 0) {
    showToast('请输入正确的划转金额')
    return
  }
  if (!transferPassword.value) {
    showToast('请输入登录密码')
    return
  }
  transferLoading.value = true
  try {
    const res = await apiSubstationWalletTransfer({ amount, password: transferPassword.value })
    transferVisible.value = false
    transferAmount.value = ''
    transferPassword.value = ''
    showToast(res?.message || '划转成功', true)
    await loadData()
  } catch (error) {
    showToast(error?.message || '划转失败')
  } finally {
    transferLoading.value = false
  }
}

function goMembershipCenter() {
  router.push('/membership-center')
}

onMounted(loadData)
</script>

<style scoped>
.substation-status-single {
  display: grid;
  grid-template-columns: 1fr;
}

.substation-wallet-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.substation-transfer-center {
  display: flex;
  justify-content: center;
}

.substation-transfer-btn {
  min-width: 220px;
}

.substation-action-list {
  display: grid;
  gap: 12px;
}

.full-row-tile {
  width: 100%;
}

.substation-center-card {
  min-height: 520px;
}

.app-loading-card {
  min-height: 440px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.substation-locked-gate {
  min-height: 440px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding: 32px 24px;
}

.substation-locked-icon {
  font-size: 48px;
  line-height: 1;
}

.substation-locked-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

.substation-locked-desc {
  margin: 0;
  max-width: 280px;
  line-height: 1.6;
}

.substation-locked-btn {
  min-width: 200px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

[data-theme="light"] .substation-stat-card,
[data-theme="light"] .substation-profile-card,
[data-theme="light"] .substation-action-list .menu-tile {
  background: rgba(255, 255, 255, 0.96);
  border-color: rgba(99, 118, 170, 0.14);
  color: #0f172a;
}

[data-theme="light"] .substation-stat-card span,
[data-theme="light"] .substation-profile-copy p {
  color: #475569;
}

[data-theme="light"] .substation-stat-card strong,
[data-theme="light"] .substation-profile-copy strong,
[data-theme="light"] .substation-action-list strong {
  color: #0f172a;
}

@media (max-width: 640px) {
  .substation-wallet-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>

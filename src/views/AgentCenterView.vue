<template>
  <section class="stack-lg agent-center-page">
    <div class="card stack-md agent-hero-card">
      <div class="section-head compact-title-head">
        <AppLoader v-if="rowsLoading || loading" size="sm" />
      </div>

      <template v-if="loading && !snapshotReady">
        <div class="agent-loading-card muted app-loading-card">
          <AppLoader size="md" />
        </div>
      </template>

      <template v-else>
        <div class="agent-summary-grid">
          <div class="agent-summary-item wide">
            <span>代理状态</span>
            <strong>{{ agentStatus ? '已激活' : '未激活' }}</strong>
          </div>
          <div class="agent-summary-item">
            <span>今日佣金</span>
            <strong>{{ formatAmountU(agentInfo.rebate_jr) }}</strong>
          </div>
          <div class="agent-summary-item">
            <span>累计佣金</span>
            <strong>{{ formatAmountU(agentInfo.rebate_s) }}</strong>
          </div>
          <div class="agent-summary-item wide">
            <span>{{ agentStatus ? '佣金钱包' : '冻结佣金' }}</span>
            <strong>{{ formatAmountU(agentInfo.agent_wallet) }}</strong>
          </div>
        </div>

        <div class="inline-actions agent-wallet-action-row">
          <button
            v-if="agentStatus"
            class="primary-btn agent-inline-btn"
            type="button"
            :disabled="transferSubmitting"
            @click="openTransferModal"
          >
            {{ transferSubmitting ? '转入中...' : '转入钱包' }}
          </button>
        </div>

        <div class="agent-level-strip">
          <button
            v-for="level in levels"
            :key="level"
            type="button"
            class="agent-level-chip"
            :class="{ active: activeLevel === level }"
            @click="activeLevel = level"
          >
            {{ level }}级
          </button>
        </div>

        <div class="stack-sm agent-list-card">
          <div v-if="pagedAgentRows.length" class="stack-sm">
            <article v-for="item in pagedAgentRows" :key="item.id || item.mobile || item.create_time" class="agent-user-row">
              <div class="agent-user-avatar">
                <img v-if="item.avatar" :src="item.avatar" alt="用户头像" @error="item.avatar = ''" />
                <span v-else>{{ avatarText(item) }}</span>
              </div>
              <div class="agent-user-copy">
                <strong>{{ item.nickname || item.name || item.user_name || maskMobile(item.mobile) || `用户-${item.id || '--'}` }}</strong>
              </div>
              <div class="agent-user-time">{{ item.create_time || '未知' }}</div>
            </article>
          </div>
          <div v-else class="empty-card app-empty compact-empty-card">
            <div class="empty-emoji">👥</div>
            <p class="muted">当前等级暂无代理用户</p>
          </div>

          <div v-if="totalAgentPages > 1" class="pager-bar">
            <button class="ghost-btn pager-btn" type="button" :disabled="levelPage <= 1" aria-label="上一页" @click="levelPage = Math.max(1, levelPage - 1)">
              <span class="pager-icon">&lt;</span>
            </button>
            <div class="pager-center">
              <div class="pager-count">
                <span class="pager-pill pager-pill--active">{{ levelPage }}</span>
                <span class="pager-sep">/</span>
                <span class="pager-pill">{{ totalAgentPages }}</span>
              </div>
              <div class="pager-track">
                <span class="pager-fill" :style="{ width: `${Math.max(12, (levelPage / totalAgentPages) * 100)}%` }"></span>
              </div>
            </div>
            <button class="ghost-btn pager-btn" type="button" :disabled="levelPage >= totalAgentPages" aria-label="下一页" @click="levelPage = Math.min(totalAgentPages, levelPage + 1)">
              <span class="pager-icon">&gt;</span>
            </button>
          </div>
        </div>
      </template>

      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />
    </div>

    <div v-if="transferVisible" class="modal-overlay avatar-preview-overlay" @click.self="closeTransferModal">
      <div class="card stack-md avatar-preview-card agent-transfer-card">
        <div class="stack-sm">
          <h3 class="agent-transfer-title">转入钱包</h3>
          <p class="muted">可转入佣金钱包余额：{{ formatAmountU(agentInfo.agent_wallet) }}</p>
        </div>

        <label>
          转入金额
          <input v-model="transferAmount" type="number" min="0.01" step="0.01" placeholder="请输入转入金额" />
        </label>

        <div class="chips wrap">
          <button class="chip button-chip" type="button" @click="fillTransferAll">全部转入</button>
        </div>

        <FeedbackToast v-if="transferMessage" :type="transferSuccess ? 'success' : 'error'" :message="transferMessage" @close="transferMessage = ''" />

        <div class="avatar-preview-actions">
          <button class="ghost-btn" type="button" :disabled="transferSubmitting" @click="closeTransferModal">取消</button>
          <button class="primary-btn" type="button" :disabled="transferSubmitting" @click="handleTransferConfirm">
            {{ transferSubmitting ? '转入中...' : '确认转入' }}
          </button>
        </div>
      </div>
    </div>

    <AppDialog
      :visible="showVipGateDialog"
      title="代理中心访问受限"
      message="当前账号尚未开通 VIP，请先前往权益中心开通后再使用代理中心功能。"
      :closable="false"
      :close-on-mask="false"
      :show-cancel="false"
      confirm-text="前往权益中心"
      @confirm="goMembershipCenter"
    />
  </section>
</template>

<script setup>
import FeedbackToast from '../components/FeedbackToast.vue'
import AppLoader from '../components/AppLoader.vue'
import AppDialog from '../components/AppDialog.vue'
defineOptions({ name: 'AgentCenterView' })
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { apiAgentSummary, apiAgentUsers, apiAgentWalletTransfer } from '../api/agent'
import { apiSubstationMyStatus } from '../api/substation'
import { getSessionCache, setSessionCache } from '../utils/storage'

const AGENT_SNAPSHOT_CACHE_KEY = 'tp8-agent-center-snapshot'
const AGENT_ROWS_CACHE_KEY = 'tp8-agent-center-rows'
const AGENT_CACHE_TTL = 5 * 60 * 1000

const agentInfo = ref({})
const agentRows = ref([])
const activeLevel = ref(1)
const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const loading = ref(false)
const snapshotReady = ref(false)
const rowsLoading = ref(false)
const transferSubmitting = ref(false)
const transferVisible = ref(false)
const transferAmount = ref('')
const transferMessage = ref('')
const transferSuccess = ref(false)
const message = ref('')
const success = ref(false)
const levelPage = ref(1)
const pageSize = 5
const totalRows = ref(0)
const membershipStatusReady = ref(false)
const substationStatus = ref(0)
const router = useRouter()

const agentStatus = computed(() => Number(agentInfo.value?.agent_status) === 1)
const agentLevel = computed(() => Number(agentInfo.value?.agent_level) || 1)
const feedbackClass = computed(() => (success.value ? 'feedback success' : 'feedback error'))
const transferFeedbackClass = computed(() => (transferSuccess.value ? 'feedback success' : 'feedback error'))
const totalAgentPages = computed(() => Math.max(1, Number(agentInfo.value?.total_pages || agentInfo.value?.totalPages || Math.ceil(totalRows.value / pageSize) || 1)))
const pagedAgentRows = computed(() => agentRows.value)
const isSvipOpened = computed(() => Number(substationStatus.value || 0) === 2)
const hasAgentCenterAccess = computed(() => agentStatus.value || isSvipOpened.value)
const showVipGateDialog = computed(() => membershipStatusReady.value && !hasAgentCenterAccess.value)

watch(activeLevel, async () => {
  levelPage.value = 1
  await loadAgentRows(activeLevel.value, levelPage.value)
})

watch(levelPage, async (value, prev) => {
  if (value === prev) return
  await loadAgentRows(activeLevel.value, value)
})

function maskMobile(mobile) {
  const value = String(mobile || '')
  if (value.length < 7) return value
  return `${value.slice(0, 3)}****${value.slice(-4)}`
}

function avatarText(item) {
  return String(item?.nickname || item?.name || item?.user_name || 'U').slice(0, 2)
}

function formatAmount(value) {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num.toFixed(2) : '0.00'
}

function formatAmountU(value) {
  return `${formatAmount(value)}U`
}

async function loadAgentSnapshot(force = false) {
  const cached = !force ? getSessionCache(AGENT_SNAPSHOT_CACHE_KEY, AGENT_CACHE_TTL) : null
  if (cached && !loading.value && !snapshotReady.value) {
    agentInfo.value = cached
    snapshotReady.value = true
    if (!activeLevel.value) activeLevel.value = Number(cached?.agent_level || 1) || 1
  }

  try {
    loading.value = true
    const res = await apiAgentSummary()
    agentInfo.value = res.data || {}
    snapshotReady.value = true
    setSessionCache(AGENT_SNAPSHOT_CACHE_KEY, agentInfo.value)
    if (!activeLevel.value) activeLevel.value = Number(agentInfo.value?.agent_level || 1) || 1
  } catch (error) {
    if (!snapshotReady.value) {
      success.value = false
      message.value = error.message || '加载代理信息失败'
    }
  } finally {
    loading.value = false
  }
}

async function loadMembershipStatus() {
  try {
    const res = await apiSubstationMyStatus()
    substationStatus.value = Number(res?.data?.status || 0)
    membershipStatusReady.value = true
  } catch (_error) {
    // Fail closed: 状态查询失败时默认按未开通处理，避免误放行代理中心。
    substationStatus.value = 0
    membershipStatusReady.value = true
  }
}

async function loadAgentRows(level = 1, page = 1, force = false) {
  const rowCache = !force ? (getSessionCache(AGENT_ROWS_CACHE_KEY, AGENT_CACHE_TTL) || {}) : {}
  const cacheKey = `${level}-${page}`
  if (rowCache[cacheKey] && !rowsLoading.value) {
    agentRows.value = Array.isArray(rowCache[cacheKey].list) ? rowCache[cacheKey].list : []
    totalRows.value = Number(rowCache[cacheKey].total || agentRows.value.length || 0)
  }

  try {
    rowsLoading.value = true
    const res = await apiAgentUsers(level, page, pageSize)
    const payload = res.data || {}
    agentRows.value = Array.isArray(payload.list) ? payload.list : []
    totalRows.value = Number(payload.total || agentRows.value.length || 0)
    setSessionCache(AGENT_ROWS_CACHE_KEY, {
      ...rowCache,
      [cacheKey]: {
        list: agentRows.value,
        total: totalRows.value
      }
    })
  } catch (error) {
    agentRows.value = []
    totalRows.value = 0
    success.value = false
    message.value = error.message || '加载代理列表失败'
  } finally {
    rowsLoading.value = false
  }
}

function openTransferModal() {
  transferAmount.value = ''
  transferMessage.value = ''
  transferVisible.value = true
}

function closeTransferModal() {
  if (transferSubmitting.value) return
  transferVisible.value = false
}

function fillTransferAll() {
  transferAmount.value = formatAmount(agentInfo.value?.agent_wallet)
}

async function handleTransferConfirm() {
  const amount = Number(transferAmount.value || 0)
  const wallet = Number(agentInfo.value?.agent_wallet || 0)
  if (!amount || amount <= 0) {
    transferSuccess.value = false
    transferMessage.value = '请输入有效的转入金额'
    return
  }
  if (amount > wallet) {
    transferSuccess.value = false
    transferMessage.value = '转入金额不能超过佣金钱包余额'
    return
  }
  try {
    transferSubmitting.value = true
    const res = await apiAgentWalletTransfer({ amount: amount.toFixed(2) })
    transferSuccess.value = true
    transferMessage.value = res.message || '转入成功'
    success.value = true
    message.value = transferMessage.value
    await hydrate(true)
    window.setTimeout(() => {
      transferVisible.value = false
    }, 500)
  } catch (error) {
    transferSuccess.value = false
    transferMessage.value = error.message || '转入钱包失败'
    success.value = false
    message.value = transferMessage.value
  } finally {
    transferSubmitting.value = false
  }
}

async function hydrate(force = false) {
  await Promise.all([loadAgentSnapshot(force), loadMembershipStatus()])
  const nextLevel = agentLevel.value || activeLevel.value || 1
  if (activeLevel.value !== nextLevel) {
    activeLevel.value = nextLevel
  }
  await loadAgentRows(nextLevel, levelPage.value, force)
}

function goMembershipCenter() {
  router.push('/membership-center')
}

onMounted(async () => {
  await hydrate()
})
</script>

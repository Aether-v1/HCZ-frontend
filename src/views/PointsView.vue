<template>
  <section class="stack-lg points-page-refined">
    <div class="points-hero-card points-hero-card-compact points-hero-card-minimal points-hero-card-balance">
      <strong class="points-balance-figure">{{ info.points_balance ?? info.points ?? 0 }}</strong>
      <button class="primary-btn points-checkin-btn" @click="handleCheckin">立即签到</button>
    </div>

    <div class="stats-grid enhanced-stats points-stats-grid-two points-stats-inline">
      <div class="stat-card"><span>本月获得</span><strong>{{ info.month_earned ?? 0 }}</strong></div>
      <div class="stat-card"><span>本月使用</span><strong>{{ info.month_used ?? 0 }}</strong></div>
    </div>

    <div class="card points-exchange-entry">
      <div class="points-exchange-entry-main">
        <strong>积分兑换</strong>
        <p class="muted tiny-text">可兑换优惠券、实物礼品，库存有限先到先得</p>
      </div>
      <router-link class="primary-btn" to="/points-exchange">去兑换</router-link>
    </div>

    <div class="card stack-md points-task-center">
      <div class="section-head section-head-mobile">
        <div>
          <h2>任务中心</h2>
          <p class="muted tiny-text">完成任务领取积分奖励，同一任务不可重复领取</p>
        </div>
      </div>

      <div class="points-task-block">
        <div class="points-task-title">
          <span>每日任务</span>
        </div>
        <article v-for="task in taskState.daily" :key="task.key" class="points-task-card">
          <div class="points-task-main">
            <strong>{{ task.title }}</strong>
            <span>{{ task.description }}</span>
            <em>{{ task.progress_text || task.limit_text }}</em>
          </div>
          <div class="points-task-action">
            <b>+{{ task.points }} 积分</b>
            <button
              class="primary-btn points-task-btn"
              type="button"
              :disabled="task.claimed || !task.claimable || claimingTask === task.key"
              @click="handleClaimTask(task.key)"
            >
              {{ task.claimed ? '已领取' : (task.claimable ? (claimingTask === task.key ? '领取中' : '领取') : '未完成') }}
            </button>
          </div>
        </article>
      </div>

      <div class="points-task-block">
        <div class="points-task-title">
          <span>新手任务</span>
        </div>
        <article v-for="task in taskState.newbie" :key="task.key" class="points-task-card points-task-card-newbie">
          <div class="points-task-main">
            <strong>{{ task.title }}</strong>
            <span>{{ task.description }}</span>
            <em>{{ task.progress_text || task.limit_text }}</em>
          </div>
          <div class="points-task-action">
            <b>+{{ task.points }} 积分</b>
            <button
              class="primary-btn points-task-btn"
              type="button"
              :disabled="task.claimed || !task.claimable || claimingTask === task.key"
              @click="handleClaimTask(task.key)"
            >
              {{ task.claimed ? '已领取' : (task.claimable ? (claimingTask === task.key ? '领取中' : '领取') : '未完成') }}
            </button>
          </div>
        </article>
      </div>
    </div>

    <div class="card stack-md">
      <div class="section-head section-head-mobile">
        <div>
          <h2>积分记录</h2>
        </div>
        <div class="chips wrap points-type-switches">
          <button class="seg-btn points-type-btn" :class="{ active: type === 'earned' }" @click="switchType('earned')">获得记录</button>
          <button class="seg-btn points-type-btn" :class="{ active: type === 'used' }" @click="switchType('used')">使用记录</button>
        </div>
      </div>

      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />

      <div v-if="records.length" class="stack-sm">
        <article v-for="item in records" :key="item.id" class="record-card record-card-clean">
          <div>
            <strong>{{ item.reason || item.title || '积分变动' }}</strong>
            <div class="tiny-text muted">{{ item.time || item.create_time || '-' }}</div>
          </div>
          <div class="record-points" :class="recordClass(item)">
            {{ recordSign(item) }}{{ recordPoints(item) }}
          </div>
        </article>
      </div>

      <div v-else class="empty-card app-empty">
        <div class="empty-emoji">⭐</div>
        <p class="muted">暂无积分记录</p>
      </div>

      <div v-if="totalPages > 1" class="pager-bar">
        <button class="ghost-btn pager-btn" type="button" :disabled="page <= 1" aria-label="上一页" @click="goPage(page - 1)">
          <span class="pager-icon">&lt;</span>
        </button>
        <div class="pager-center">
          <div class="pager-count">
            <span class="pager-pill pager-pill--active">{{ page }}</span>
            <span class="pager-sep">/</span>
            <span class="pager-pill">{{ totalPages }}</span>
          </div>
          <div class="pager-track">
            <span class="pager-fill" :style="{ width: `${Math.max(12, (page / totalPages) * 100)}%` }"></span>
          </div>
        </div>
        <button class="ghost-btn pager-btn" type="button" :disabled="page >= totalPages" aria-label="下一页" @click="goPage(page + 1)">
          <span class="pager-icon">&gt;</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import FeedbackToast from '@/components/FeedbackToast.vue'
defineOptions({ name: 'PointsView' })
import { computed, onMounted, ref, watch } from 'vue'
import { getSessionCache, setSessionCache } from '../utils/storage'
import { apiPointsClaimTask, apiPointsCheckin, apiPointsInfo, apiPointsRecords, apiPointsTasks } from '../api/points'

const info = ref({})
const records = ref([])
const type = ref('earned')
const page = ref(1)
const totalPages = ref(0)
const message = ref('')
const success = ref(false)
const taskState = ref({ daily: [], newbie: [] })
const claimingTask = ref('')
const pageSize = 5
const loadingRecords = ref(false)
const infoCacheKey = 'tp8-points-info'
const recordsCacheKey = computed(() => `tp8-points-records-${type.value}-${page.value}`)

const feedbackClass = computed(() => (success.value ? 'feedback success' : 'feedback error'))

watch(page, () => { loadRecords() })

function switchType(nextType) {
  if (type.value === nextType) return
  type.value = nextType
  page.value = 1
  const cachedRecords = getSessionCache(`tp8-points-records-${type.value}-1`, 20 * 60 * 1000)
  if (cachedRecords) {
    records.value = cachedRecords.records || []
    totalPages.value = cachedRecords.totalPages || 0
  } else {
    records.value = []
    totalPages.value = 0
  }
  loadRecords()
}

function goPage(nextPage) {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === page.value) return
  page.value = nextPage
}

function recordPoints(item) {
  return Math.abs(Number(item.points || item.value || 0))
}

function recordClass(item) {
  const currentType = String(item._recordType || item.type || type.value)
  return currentType === 'used' ? 'negative' : 'positive'
}

function recordSign(item) {
  return String(item._recordType || item.type || type.value) === 'used' ? '-' : '+'
}

function normalizeRecords(list = [], currentType = type.value) {
  return list.map((item) => ({ ...item, _recordType: currentType }))
}

async function loadInfo() {
  try {
    const res = await apiPointsInfo()
    info.value = res.data || {}
    setSessionCache(infoCacheKey, info.value)
  } catch (error) {
    success.value = false
    message.value = error.message || '加载积分信息失败'
  }
}

async function loadTasks() {
  try {
    const res = await apiPointsTasks()
    const data = res.data || {}
    taskState.value = {
      daily: data.daily || [],
      newbie: data.newbie || []
    }
  } catch (error) {
    success.value = false
    message.value = error.message || '加载任务中心失败'
  }
}

async function loadRecords() {
  try {
    message.value = ''
    loadingRecords.value = true
    const res = await apiPointsRecords({ type: type.value, page: page.value, pageSize, page_size: pageSize })
    const data = res.data || {}
    records.value = normalizeRecords(data.records || data.list || [], type.value)
    totalPages.value = Number(data.totalPages || data.total_pages || 0) || Math.max(1, Math.ceil(Number(data.total || 0) / pageSize))
    setSessionCache(recordsCacheKey.value, { records: records.value, totalPages: totalPages.value })
    if (!records.value.length && page.value > 1) {
      page.value = 1
    }
  } catch (error) {
    records.value = []
    totalPages.value = 0
    success.value = false
    message.value = error.message || '加载积分记录失败'
  } finally {
    loadingRecords.value = false
  }
}

async function handleCheckin() {
  try {
    const res = await apiPointsCheckin()
    success.value = true
    message.value = res.message
    await loadInfo()
    await loadTasks()
    page.value = 1
    await loadRecords()
  } catch (error) {
    success.value = false
    message.value = error.message || '签到失败'
  }
}

async function handleClaimTask(taskKey) {
  if (!taskKey || claimingTask.value) return
  try {
    claimingTask.value = taskKey
    const res = await apiPointsClaimTask(taskKey)
    success.value = true
    message.value = res.message || '领取成功'
    await loadInfo()
    await loadTasks()
    page.value = 1
    await loadRecords()
  } catch (error) {
    success.value = false
    message.value = error.message || '领取失败'
  } finally {
    claimingTask.value = ''
  }
}

onMounted(async () => {
  const cachedInfo = getSessionCache(infoCacheKey, 20 * 60 * 1000)
  const cachedRecords = getSessionCache(recordsCacheKey.value, 20 * 60 * 1000)
  if (cachedInfo) info.value = cachedInfo
  if (cachedRecords) {
    records.value = normalizeRecords(cachedRecords.records || [], type.value)
    totalPages.value = cachedRecords.totalPages || 0
  }
  await loadInfo()
  await loadTasks()
  await loadRecords()
})
</script>

<style scoped>
.points-task-center {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(34, 197, 94, 0.14);
  background:
    radial-gradient(circle at 10% 0%, rgba(34, 197, 94, 0.16), transparent 28%),
    radial-gradient(circle at 90% 10%, rgba(14, 165, 233, 0.12), transparent 30%),
    var(--card-bg, #fff);
}

.points-exchange-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  background:
    radial-gradient(circle at 15% 20%, rgba(96, 165, 250, 0.14), transparent 34%),
    radial-gradient(circle at 84% 30%, rgba(14, 165, 233, 0.1), transparent 36%),
    var(--card-bg, #fff);
}

.points-exchange-entry-main {
  display: grid;
  gap: 4px;
}

.points-exchange-entry-main strong {
  font-size: 16px;
  color: var(--text-color, #111827);
}

.points-task-block {
  display: grid;
  gap: 10px;
}

.points-task-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-color, #111827);
}

.points-task-title span {
  font-weight: 800;
}

.points-task-title small {
  color: var(--muted-color, #6b7280);
  font-size: 12px;
}

.points-task-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px;
  border: 1px solid rgba(34, 197, 94, 0.16);
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(240, 253, 244, 0.86), rgba(236, 254, 255, 0.78));
  box-shadow: 0 10px 24px rgba(15, 118, 110, 0.08);
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.points-task-card-newbie {
  border-color: rgba(245, 158, 11, 0.18);
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.9), rgba(255, 247, 237, 0.78));
  box-shadow: 0 10px 24px rgba(245, 158, 11, 0.08);
}

.points-task-main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.points-task-main strong {
  color: var(--text-color, #111827);
  font-size: 15px;
}

.points-task-main span,
.points-task-main em {
  color: var(--muted-color, #6b7280);
  font-size: 12px;
  font-style: normal;
  line-height: 1.45;
}

.points-task-action {
  display: grid;
  justify-items: end;
  gap: 8px;
  flex: 0 0 auto;
}

.points-task-action b {
  color: #16a34a;
  font-size: 13px;
}

.points-task-card-newbie .points-task-action b {
  color: #f97316;
}

.points-task-btn {
  min-width: 74px;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
}

.points-task-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  filter: grayscale(0.2);
}

.points-task-card:hover {
  transform: translateY(-1px);
}

[data-theme="dark"] .points-task-center {
  border-color: rgba(56, 189, 248, 0.22);
  background:
    radial-gradient(circle at 8% 0%, rgba(34, 197, 94, 0.2), transparent 32%),
    radial-gradient(circle at 92% 8%, rgba(14, 165, 233, 0.2), transparent 34%),
    linear-gradient(160deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.9));
}

[data-theme="dark"] .points-exchange-entry {
  border-color: rgba(59, 130, 246, 0.35);
  background:
    radial-gradient(circle at 12% 16%, rgba(56, 189, 248, 0.24), transparent 34%),
    radial-gradient(circle at 86% 26%, rgba(59, 130, 246, 0.22), transparent 36%),
    linear-gradient(160deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.9));
}

[data-theme="dark"] .points-exchange-entry-main strong {
  color: #f8fafc;
}

[data-theme="dark"] .points-task-title span,
[data-theme="dark"] .points-task-main strong {
  color: #f8fafc;
}

[data-theme="dark"] .points-task-title small,
[data-theme="dark"] .points-task-main span,
[data-theme="dark"] .points-task-main em {
  color: #cbd5e1;
}

[data-theme="dark"] .points-task-card {
  border-color: rgba(74, 222, 128, 0.28);
  background: linear-gradient(135deg, rgba(22, 101, 52, 0.34), rgba(15, 118, 110, 0.3));
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.35);
}

[data-theme="dark"] .points-task-card-newbie {
  border-color: rgba(251, 191, 36, 0.3);
  background: linear-gradient(135deg, rgba(146, 64, 14, 0.32), rgba(154, 52, 18, 0.28));
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.35);
}

[data-theme="dark"] .points-task-card:hover {
  border-color: rgba(125, 211, 252, 0.52);
}

[data-theme="dark"] .points-task-action b {
  color: #86efac;
}

[data-theme="dark"] .points-task-card-newbie .points-task-action b {
  color: #fdba74;
}

[data-theme="light"] .points-task-title small,
[data-theme="light"] .points-task-main span,
[data-theme="light"] .points-task-main em {
  color: #475569;
}

[data-theme="light"] .points-task-main strong,
[data-theme="light"] .points-task-title span {
  color: #0f172a;
}

@media (max-width: 520px) {
  .points-task-card {
    align-items: flex-start;
    padding: 12px;
  }

  .points-task-action {
    gap: 7px;
  }

  .points-task-btn {
    min-width: 68px;
    padding: 0 12px;
  }
}
</style>

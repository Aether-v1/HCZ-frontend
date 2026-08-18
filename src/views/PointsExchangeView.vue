<template>
  <section class="stack-lg points-exchange-page">
    <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />

    <div v-if="items.length" class="points-exchange-grid">
      <article v-for="item in items" :key="item.id" class="card points-exchange-item">
        <div class="points-exchange-item-head">
          <span class="chip" :class="item.type === 'physical' ? 'chip-physical' : 'chip-coupon'">
            {{ item.type === 'physical' ? '实物' : '优惠券' }}
          </span>
          <span class="tiny-text muted">
            {{ item.stock === 0 ? '不限库存' : '剩余库存 ' + Math.max(0, item.stock - (usedCounts[item.id] || 0)) }}
          </span>
        </div>
        <div class="points-exchange-item-title-row">
          <strong>{{ item.title }}</strong>
          <b>{{ item.points }} 积分</b>
        </div>
        <p class="tiny-text muted">{{ item.description || '暂无说明' }}</p>
        <div class="points-exchange-item-foot">
          <span class="tiny-text muted">提交兑换后按平台规则审核处理</span>
          <button
            class="primary-btn"
            type="button"
            :disabled="(item.stock > 0 && (usedCounts[item.id] || 0) >= item.stock) || submittingId === item.id"
            @click="confirmExchange(item)"
          >
            {{ submittingId === item.id ? '处理中…' : (item.stock > 0 && (usedCounts[item.id] || 0) >= item.stock ? '已售罄' : '立即兑换') }}
          </button>
        </div>
      </article>
    </div>

    <div v-else class="empty-card app-empty">
      <div class="empty-emoji">🎁</div>
      <p class="muted">暂无可兑换商品</p>
    </div>

    <div class="card points-exchange-rules">
      <div class="section-head section-head-mobile">
        <div>
          <h3>兑换规则</h3>
        </div>
      </div>
      <p class="tiny-text muted">{{ notice || '兑换申请提交后，客服会尽快处理。' }}</p>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import FeedbackToast from '@/components/FeedbackToast.vue'
import { apiPointsExchangeItems, apiPointsExchangeSubmit } from '../api/points'

defineOptions({ name: 'PointsExchangeView' })

const items = ref([])
const notice = ref('')
const message = ref('')
const success = ref(false)
const submittingId = ref(null)
// 已兑换数量缓存（item_id => count）用于前端乐观渲染，后端会二次校验
const usedCounts = ref({})

function normalizeItems(list = []) {
  return list.map((item, index) => ({
    id: String(item.id || `item-${index + 1}`),
    type: String(item.type || 'coupon') === 'physical' ? 'physical' : 'coupon',
    title: String(item.title || '未命名兑换项'),
    points: Math.max(1, Number(item.points || 0)),
    stock: Math.max(0, Number(item.stock || 0)),
    description: String(item.description || ''),
  }))
}

async function loadExchangeItems() {
  try {
    const res = await apiPointsExchangeItems()
    const data = res.data || {}
    items.value = normalizeItems(Array.isArray(data.items) ? data.items : [])
    notice.value = String(data.notice || '')
    // 服务端返回已用库存快照
    if (data.used_counts && typeof data.used_counts === 'object') {
      usedCounts.value = Object.fromEntries(
        Object.entries(data.used_counts).map(([k, v]) => [String(k), Number(v)])
      )
    }
  } catch (error) {
    success.value = false
    message.value = error.message || '加载兑换配置失败'
  }
}

async function confirmExchange(item) {
  const confirmed = window.confirm(
    `确认使用 ${item.points} 积分兑换「${item.title}」？`
  )
  if (!confirmed) return
  submittingId.value = item.id
  try {
    const res = await apiPointsExchangeSubmit(item.id)
    if (res.code === 200) {
      success.value = true
      const newBalance = res.data?.new_balance
      message.value = `兑换申请已提交！${newBalance !== undefined ? '当前积分：' + newBalance : ''}`
      // 刷新列表以获取最新库存
      await loadExchangeItems()
    } else {
      success.value = false
      message.value = res.message || '兑换失败'
    }
  } catch (error) {
    success.value = false
    message.value = error.message || '兑换请求失败，请稍后重试'
  } finally {
    submittingId.value = null
  }
}

onMounted(async () => {
  await loadExchangeItems()
})
</script>

<style scoped>
.points-exchange-page {
  display: grid;
  gap: 12px;
}

.points-exchange-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.points-exchange-item {
  display: grid;
  gap: 10px;
}

.points-exchange-item-head,
.points-exchange-item-title-row,
.points-exchange-item-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.points-exchange-item-title-row {
  align-items: flex-start;
}

.points-exchange-item-title-row strong {
  font-size: 16px;
  line-height: 1.45;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.chip-coupon {
  color: #1d4ed8;
  background: rgba(59, 130, 246, 0.12);
}

.chip-physical {
  color: #92400e;
  background: rgba(245, 158, 11, 0.2);
}

.points-exchange-item-title-row b {
  color: #16a34a;
  white-space: nowrap;
}

.points-exchange-item-foot {
  align-items: flex-end;
}

.points-exchange-item-foot .primary-btn {
  flex: 0 0 auto;
}

.points-exchange-rules p {
  margin: 0;
}

@media (max-width: 768px) {
  .points-exchange-grid {
    grid-template-columns: 1fr;
  }

  .points-exchange-item-title-row,
  .points-exchange-item-foot,
  .points-exchange-item-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .points-exchange-item-foot .primary-btn {
    width: 100%;
  }
}
</style>

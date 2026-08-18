<template>
  <section class="stack-lg">
    <div class="card stack-md">
      <div class="section-head">
        <h2>分站折扣设置</h2>
      </div>

      <div class="inline-actions">
        <button class="ghost-btn" type="button" :disabled="loading" @click="loadCatalog">
          {{ loading ? '加载中...' : '刷新商品' }}
        </button>
      </div>

      <div v-if="loading" class="app-loading-card">正在加载商品档位...</div>

      <div v-else-if="products.length" class="stack-md">
        <article v-for="product in products" :key="product.id" class="card stack-sm substation-product-card">
          <div class="substation-product-head">
            <div class="substation-product-copy">
              <strong>{{ product.home_name || product.name || `商品 #${product.id}` }}</strong>
              <p class="muted">商品ID：{{ product.id }}</p>
              <p class="muted">平台描述：{{ product.describe || '未设置' }}</p>
            </div>
            <img
              v-if="product.image"
              class="substation-product-cover"
              :src="resolveAssetUrl(product.image)"
              :alt="product.name || product.home_name || 'product'"
            />
          </div>

          <label class="substation-product-desc-field">
            <span>分站首页描述</span>
            <textarea
              v-model.trim="product.substation_describe"
              rows="3"
              placeholder="请输入分站首页展示的商品描述"
            />
            <small>分站首页会优先显示这里保存的描述。</small>
          </label>

          <article v-for="(tier, index) in product.tiers" :key="`${product.id}-${tier.tier_key}`" class="card substation-tier-card">
            <div class="substation-tier-head">
              <strong>{{ tier.par_value_snapshot || tier.tier_key }}</strong>
              <span class="muted">平台折扣 {{ formatDiscount(tier.platform_discount) }}</span>
            </div>
            <div class="substation-tier-meta muted">
              档位 {{ formatRange(tier) }} | 平台预览价 {{ formatMoney(platformPreviewPrice(tier)) }}
            </div>
            <label>
              分站折扣
              <input v-model.number="product.tiers[index].substation_discount" type="number" step="0.0001" min="0" />
            </label>
            <div class="substation-tier-meta muted">
              最低可设 {{ formatDiscount(tier.min_allowed_discount || tier.platform_discount) }} | 当前预览价
              {{ formatMoney(previewPrice(product.tiers[index])) }}
            </div>
          </article>

          <div class="inline-actions">
            <button class="primary-btn" type="button" :disabled="savingProductId === product.id" @click="saveProduct(product)">
              {{ savingProductId === product.id ? '保存中...' : '保存该商品折扣' }}
            </button>
          </div>
        </article>
      </div>

      <div v-else class="empty-card app-empty compact-empty-card">
        <p class="muted">暂无可配置的上架商品</p>
      </div>

      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />
    </div>
  </section>
</template>

<script setup>
defineOptions({ name: 'SubstationProductPriceView' })
import { onMounted, ref } from 'vue'
import { getCachedHomeBootstrap } from '../api/home-helpers'
import { apiSubstationProductCatalog, apiSubstationSaveProductTierPrice } from '../api/substation'
import { resolveAssetUrl } from '../utils/assets'
import FeedbackToast from '../components/FeedbackToast.vue'

const products = ref([])
const loading = ref(false)
const savingProductId = ref(0)
const message = ref('')
const success = ref(false)
const cachedHomeBootstrap = getCachedHomeBootstrap()

function resolveRate(tier) {
  const rate = Number(tier?.reference_exchange_rate || cachedHomeBootstrap?.rate || 0)
  return rate > 0 ? rate : 1
}

function formatMoney(v) {
  const num = Number(v || 0)
  return `${num.toFixed(2)}U`
}

function formatDiscount(v) {
  return Number(v || 0).toFixed(4).replace(/\.?0+$/, '')
}

function formatRange(tier) {
  const min = tier.min_amount ?? '--'
  const max = tier.max_amount
  return tier.tier_type === 1 ? `${min}` : `${min} ~ ${max === null ? '以上' : max}`
}

function platformPreviewPrice(tier) {
  const direct = Number(tier.platform_price_usdt || 0)
  if (direct > 0) return direct
  const price = Number(tier.platform_price || 0)
  return price > 0 ? price / resolveRate(tier) : 0
}

function previewPrice(tier) {
  const minAmount = Number(tier.min_amount || 0)
  const discount = Number(tier.substation_discount || tier.platform_discount || 0)
  if (!minAmount || !discount) return 0
  return (minAmount * (discount / 10)) / resolveRate(tier)
}

async function loadCatalog() {
  loading.value = true
  try {
    const res = await apiSubstationProductCatalog()
    products.value = Array.isArray(res.data?.list)
      ? res.data.list.map((product) => ({
          ...product,
          describe: String(product.describe || '').trim(),
          substation_describe: String(product.substation_describe || '').trim(),
          tiers: Array.isArray(product.tiers)
            ? product.tiers.map((tier) => ({
                ...tier,
                substation_discount: Number(tier.substation_discount || tier.platform_discount || 0)
              }))
            : []
        }))
      : []
    success.value = true
    message.value = products.value.length ? '商品档位已加载' : '暂无可配置的商品'
  } catch (error) {
    message.value = error?.message || '商品档位加载失败'
    success.value = false
    products.value = []
  } finally {
    loading.value = false
  }
}

async function saveProduct(product) {
  savingProductId.value = Number(product.id || 0)
  try {
    await apiSubstationSaveProductTierPrice(product.id, (product.tiers || []).map((item) => ({
      tier_key: item.tier_key,
      substation_discount: Number(item.substation_discount || 0)
    })), product.substation_describe)
    message.value = `商品 ${product.id} 保存成功`
    success.value = true
  } catch (error) {
    message.value = error?.message || '保存失败'
    success.value = false
  } finally {
    savingProductId.value = 0
  }
}

onMounted(loadCatalog)
</script>

<style scoped>
.substation-product-desc-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.substation-product-desc-field span,
.substation-product-desc-field small {
  color: var(--text-soft, #7b7280);
}

.substation-product-desc-field textarea {
  width: 100%;
  min-height: 88px;
  padding: 12px 14px;
  border: 1px solid var(--border, rgba(148, 163, 184, 0.22));
  border-radius: 14px;
  background: var(--panel, rgba(15, 23, 42, 0.32));
  color: var(--text, #e2e8f0);
  resize: vertical;
}
</style>

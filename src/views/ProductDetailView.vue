<template>
  <section v-if="hasProduct" class="stack-lg product-order-page">
    <div class="product-hero-card compact-product-hero">
      <img class="product-hero-cover" :src="resolveAssetUrl(product.image)" :alt="product.name" />
      <div class="stack-sm">
        <h1>{{ product.name }}</h1>
        <p class="muted">{{ resolvedProductDesc }}</p>
        <div class="chips wrap">
          <span class="pill-tag">最低 {{ minAmount }}</span>
          <span class="pill-tag light">{{ resolvedProductDesc || '优惠中' }}</span>
        </div>
      </div>
    </div>

    <div class="card stack-md">
      <div class="section-head product-order-head">
        <div>
          <h2>下单信息</h2>
        </div>
        <button class="faq-button product-tutorial-faq-btn" type="button" aria-label="下单说明" @click="openTutorial">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" aria-hidden="true">
            <path
              d="M80 160c0-35.3 28.7-64 64-64h32c35.3 0 64 28.7 64 64v3.6c0 21.8-11.1 42.1-29.4 53.8l-42.2 27.1c-25.2 16.2-40.4 44.1-40.4 74V320c0 17.7 14.3 32 32 32s32-14.3 32-32v-1.4c0-8.2 4.2-15.8 11-20.2l42.2-27.1c36.6-23.6 58.8-64.1 58.8-107.7V160c0-70.7-57.3-128-128-128H144C73.3 32 16 89.3 16 160c0 17.7 14.3 32 32 32s32-14.3 32-32zm80 320a40 40 0 1 0 0-80 40 40 0 1 0 0 80z"
            ></path>
          </svg>
          <span class="tooltip">下单说明</span>
        </button>
      </div>

      <div v-if="allowBatch" class="order-mode-strip">
        <button class="seg-btn" :class="{ active: form.batch_type === 0 }" type="button" @click="form.batch_type = 0">单个下单</button>
        <button class="seg-btn" :class="{ active: form.batch_type === 1 }" type="button" @click="form.batch_type = 1">批量下单</button>
      </div>

      <div v-if="form.batch_type === 1 && allowBatch" class="card batch-order-box stack-sm">
        <div>
          <strong>支持批量下单</strong>
          <p class="muted">该商品已按后台设置支持批量下单，点击下方按钮进入批量导入页。</p>
        </div>
        <button class="primary-btn" type="button" @click="goToBatchPage">前往批量导入</button>
      </div>

      <label>
        充值金额
        <input v-model="form.amount_money" type="number" :min="minAmount" placeholder="请输入充值金额" />
      </label>

      <div class="chips wrap">
        <button
          v-for="amount in selectableAmounts"
          :key="amount"
          class="chip button-chip"
          :class="{ active: Number(form.amount_money) === Number(amount) }"
          type="button"
          @click="form.amount_money = amount"
        >
          {{ amount }}
        </button>
      </div>

      <div v-if="form.batch_type === 0" class="stack-sm">
        <label v-for="field in orderFields" :key="field.key" class="stack-xs">
          <span>{{ field.label }}</span>

          <input
            v-if="field.type === 1"
            v-model="dynamicFields[field.key]"
            :inputmode="isPhoneField(field) ? 'numeric' : undefined"
            :maxlength="isPhoneField(field) ? 11 : undefined"
            :placeholder="field.placeholder || `请输入${field.label}`"
            @input="handleFieldInput(field)"
          />

          <div v-else-if="field.type === 2 || field.type === 3" class="region-inline-shell stack-xs">
            <div class="region-inline-grid" :class="{ 'three-level': field.type === 2 }">
              <select v-model="regionSelections[field.key].province" @change="handleCompositeRegionChange(field, 'province')">
                <option value="">请选择省</option>
                <option v-for="option in provinceOptions(field)" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>

              <select
                v-model="regionSelections[field.key].city"
                :disabled="!cityOptions(field).length"
                @change="handleCompositeRegionChange(field, 'city')"
              >
                <option value="">请选择市</option>
                <option v-for="option in cityOptions(field)" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>

              <select
                v-if="field.type === 2"
                class="region-district-select"
                v-model="regionSelections[field.key].district"
                :disabled="!districtOptions(field).length"
                @change="handleCompositeRegionChange(field, 'district')"
              >
                <option value="">请选择区/县</option>
                <option v-for="option in districtOptions(field)" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </div>
          </div>

          <div v-else-if="field.type === 4" class="upload-field-shell stack-xs">
            <input
              :id="fileInputId(field)"
              class="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              @change="handleFieldFileChange(field, $event)"
            />
            <div class="inline-actions mobile-actions upload-field-actions">
              <button class="ghost-btn" type="button" :disabled="uploadingFieldKey === field.key" @click="triggerFieldUpload(field)">
                {{ uploadingFieldKey === field.key ? '上传中...' : `上传${field.label}` }}
              </button>
            </div>
            <img v-if="dynamicFields[field.key]" class="upload-field-preview" :src="resolveAssetUrl(dynamicFields[field.key])" :alt="field.label" />
            <span v-else class="tiny-text muted">请上传{{ field.label }}</span>
          </div>

          <input
            v-else
            v-model="dynamicFields[field.key]"
            :placeholder="field.placeholder || `请输入${field.label}`"
            @input="handleFieldInput(field)"
          />

          <span v-if="fieldErrors[field.key]" class="inline-field-error">{{ fieldErrors[field.key] }}</span>
          <span v-else-if="phoneHints[field.key]" class="tiny-text muted">{{ phoneHints[field.key] }}</span>
        </label>
      </div>

      <div class="result-panel order-preview-grid always-show-pricing no-frame-preview pricing-two-col-grid" style="grid-template-columns: repeat(2, minmax(0, 1fr));">
        <div v-for="card in pricingCards" :key="card.label" class="result-item preview-stat-card compact-preview-card">
          <span class="tiny-text muted">{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
        </div>
      </div>

      <FeedbackToast v-if="message" :type="success ? 'success' : 'error'" :message="message" @close="message = ''" />

      <div class="inline-actions mobile-actions">
        <button class="primary-btn" type="button" :disabled="submittingPay" @click="handlePay">{{ submittingPay ? '提交中...' : '确认支付' }}</button>
      </div>
    </div>

    <div v-if="showTutorialModal" class="tutorial-modal-mask" @click.self="closeTutorial">
      <div class="tutorial-modal-card tutorial-simple-card">
        <h3 class="tutorial-title-center">下单说明</h3>
        <div class="tutorial-modal-content tutorial-centered-copy">
          <p>{{ product.tutorial_content || '请核对信息后再提交。' }}</p>
        </div>
        <div class="tutorial-modal-actions tutorial-double-actions">
          <button class="ghost-btn tutorial-action-btn" type="button" @click="hideTutorialForever">不再显示</button>
          <button class="primary-btn tutorial-action-btn" type="button" @click="closeTutorial">关闭</button>
        </div>
      </div>
    </div>
  </section>

  <section v-else-if="detailLoading" class="card empty-card app-empty">
    <div class="empty-emoji">🧾</div>
    <h3>商品加载中</h3>
    <p class="muted">正在获取商品详情，请稍候。</p>
  </section>

  <section v-else class="card empty-card app-empty">
    <div class="empty-emoji">🧾</div>
    <h3>产品不存在</h3>
    <p class="muted">{{ detailError || '请确认商品存在，或检查商品详情接口是否已正常返回。' }}</p>
    <router-link to="/" class="primary-btn block">返回首页</router-link>
  </section>
</template>

<script setup>
import FeedbackToast from '@/components/FeedbackToast.vue'
defineOptions({ name: 'ProductDetailView' })
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, reactive, ref, watch } from 'vue'
import { getSessionCache, setSessionCache } from '../utils/storage'
import { useRoute, useRouter } from 'vue-router'
import { apiProductConfirmPayment, apiProductDetail, apiProductDiscount } from '../api/product'
import { apiOrderList } from '../api/order'
import { getPhoneMeta } from '../api/phone'
import { fetchHomeBootstrap } from '../api/home'
import { findCachedHomeProductById, getCachedHomeBootstrap, getCachedHomeFirstScreen, mergeProductWithReference, resolveProductDiscountRange } from '../api/home-helpers'
import { useUserStore } from '../stores/user'
import { formatPhoneHint, isLikelyPhoneField, isValidChinaMobile, normalizeChinaMobile } from '../utils/phone'
import { parseLocationParts, buildLocation } from '../utils/format'
import { normalizeOrder, writeOrderDetailCache } from '../utils/orders'
import { uploadImageFile } from '../api/upload'
import { resolveAssetUrl } from '../utils/assets'
import { fetchRegionTree } from '../api/region'
import { findRegionProvince } from '../api/region-helpers'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cachedHomeBootstrap = getCachedHomeBootstrap()
const cachedHomeFirstScreen = getCachedHomeFirstScreen()
const cachedBootstrapRate = cachedHomeBootstrap?.rate || cachedHomeFirstScreen?.rate || '--'
const cachedProductReferences = mergeCachedProductReferences()
const product = reactive({})
const hasProduct = computed(() => Boolean(product.id))
const selectableAmounts = computed(() => [...new Set((Array.isArray(product?.par_value) ? product.par_value : []).map((item) => Number(item)).filter((item) => !Number.isNaN(item)))].sort((a, b) => a - b))
const minAmount = computed(() => Number(product?.mini_recharge_amount || 0))
const form = reactive({ amount_money: minAmount.value || '', batch_type: 0 })
const dynamicFields = reactive({})
const fieldErrors = reactive({})
const phoneHints = reactive({})
const regionSelections = reactive({})
const allowBatch = computed(() => Number(product?.batch_status || 0) === 1)
const preview = ref(createEmptyPreview())
const success = ref(false)
const message = ref('')
const detailLoading = ref(true)
const detailError = ref('')
const showTutorialModal = ref(false)
const submittingPay = ref(false)
const uploadingFieldKey = ref('')
const feedbackClass = computed(() => (success.value ? 'feedback success' : 'feedback error'))
const tutorialStorageKey = computed(() => (product?.id ? `tp8-order-tutorial-hide-${product.id}` : ''))
const previewCacheKey = computed(() => {
  const productId = Number(product?.id || route.params.id || 0)
  return productId > 0 ? `tp8-product-preview-real-v2-${productId}` : ''
})
let previewTimer = null
let previewLiveTimer = null
const phoneLookupTimers = new Map()
const autoFilledCarrierValues = reactive({})
const regionTree = ref([])
let detailRequestId = 0
let previewRequestId = 0
const PREVIEW_CACHE_MAX_AGE = 20 * 60 * 1000
const PREVIEW_LIVE_REFRESH_MS = 15000

const resolvedProductDesc = computed(() => {
  const discountRange = resolveProductDiscountRange(product)
  if (discountRange) return discountRange
  return String(product?.describe || '').trim()
})

function normalizeFieldOption(option) {
  if (typeof option === 'string' || typeof option === 'number') {
    const text = String(option).trim()
    return text ? { label: text, value: text } : null
  }
  if (option && typeof option === 'object') {
    const value = String(option.value ?? option.name ?? option.label ?? option.title ?? '').trim()
    if (!value) return null
    return {
      label: String(option.label ?? option.name ?? option.title ?? value).trim(),
      value
    }
  }
  return null
}

function mergeCachedProductReferences() {
  const list = [
    ...(cachedHomeBootstrap?.featuredProducts || []),
    ...(cachedHomeBootstrap?.allProducts || []),
    ...(cachedHomeFirstScreen?.featuredProducts || []),
    ...(cachedHomeFirstScreen?.allProducts || [])
  ]
  const seen = new Set()
  return list.filter((item) => {
    const id = Number(item?.id || 0)
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function createEmptyPreview() {
  return {
    rate: cachedBootstrapRate,
    discount: '--',
    discountAmount: '',
    cnyAmount: ''
  }
}

function clearPreviewTimer() {
  if (!previewTimer) return
  window.clearTimeout(previewTimer)
  previewTimer = null
}

function clearPreviewLiveTimer() {
  if (!previewLiveTimer) return
  window.clearInterval(previewLiveTimer)
  previewLiveTimer = null
}

function hasRenderablePreview(data = preview.value) {
  const source = data || {}
  return [
    source.discount,
    source.discount_text,
    source.discount_rate,
    source.discount_ratio,
    source.discountAmount,
    source.discount_amount,
    source.preferential_amount,
    source.save_amount,
    source.cut_amount,
    source.amount,
    source.cnyAmount,
    source.cny_amount,
    source.pay_amount,
    source.payment_amount,
    source.real_amount,
    source.discount_money
  ].some((value) => String(value ?? '').trim() !== '')
}

function buildPreviewCachePayload(data = preview.value) {
  return {
    ...(data || {}),
    _amount_money: String(form.amount_money || '').trim(),
    _batch_type: Number(form.batch_type || 0),
    _updated_at: Date.now()
  }
}

function restoreCachedPreview() {
  if (!previewCacheKey.value) return false
  const cached = getSessionCache(previewCacheKey.value, PREVIEW_CACHE_MAX_AGE)
  if (!cached || typeof cached !== 'object') return false
  if (String(cached._amount_money || '').trim() !== String(form.amount_money || '').trim()) return false
  if (Number(cached._batch_type || 0) !== Number(form.batch_type || 0)) return false
  preview.value = { ...createEmptyPreview(), ...cached }
  return hasRenderablePreview(preview.value)
}

function persistPreviewCache(nextPreview = preview.value) {
  if (!previewCacheKey.value || !hasRenderablePreview(nextPreview)) return
  setSessionCache(previewCacheKey.value, buildPreviewCachePayload(nextPreview))
}

function hasValidPreviewRequest() {
  return hasProduct.value
    && userStore.isLoggedIn
    && String(form.amount_money || '').trim() !== ''
    && Number(form.amount_money) >= Number(minAmount.value || 0)
}

function startPreviewLiveRefresh() {
  clearPreviewLiveTimer()
  if (typeof window === 'undefined') return
  previewLiveTimer = window.setInterval(() => {
    if (typeof document !== 'undefined' && document.hidden) return
    if (!hasValidPreviewRequest()) return
    void runPreview({ preserveCurrent: true, silent: true })
  }, PREVIEW_LIVE_REFRESH_MS)
}

function resolveCachedProduct(productId) {
  return findCachedHomeProductById(productId)
    || cachedProductReferences.find((item) => Number(item?.id || 0) === Number(productId))
    || null
}

function normalizeField(field, index = 0) {
  if (typeof field === 'string') {
    const label = field.trim()
    return label ? { key: label, label, type: 1, placeholder: '', options: [], raw: field } : null
  }
  if (!field || typeof field !== 'object') return null
  const label = String(field.label || field.name || field.title || field.field_name || field.field || '').trim()
  if (!label) return null
  return {
    key: String(field.key || field.field || field.name || field.title || field.label || `field_${index}`).trim(),
    label,
    type: Number(field.type ?? field.field_type ?? field.input_type ?? 1) || 1,
    placeholder: String(field.placeholder || '').trim(),
    options: (Array.isArray(field.options) ? field.options : Array.isArray(field.values) ? field.values : []).map(normalizeFieldOption).filter(Boolean),
    raw: field
  }
}

function normalizeFieldList(value = []) {
  const list = Array.isArray(value) ? value : []
  return list.map((field, index) => normalizeField(field, index)).filter(Boolean)
}

const orderFields = computed(() => normalizeFieldList(product?.order_fields || []))

syncFieldMaps(orderFields.value)

const pricingCards = computed(() => {
  const data = preview.value || {}
  const referenceRate = pickValue(data, ['reference_exchange_rate', 'exchange_rate', 'rate', 'ref_rate', 'refer_rate'], cachedHomeBootstrap?.rate || '--')
  const discount = pickValue(data, ['discount', 'discount_text', 'discount_rate', 'discount_ratio'], '--')
  const payAmount = pickValue(data, ['amount', 'cnyAmount', 'cny_amount', 'pay_amount', 'payment_amount', 'real_amount', 'discount_money'], '')
  let discountAmount = pickValue(data, ['discountAmount', 'discount_amount', 'preferential_amount', 'save_amount', 'cut_amount'], '')

  const amountNumber = Number(form.amount_money)
  const hasPayAmount = String(payAmount ?? '').trim() !== ''
  const payNumber = Number(String(payAmount).replace(/,/g, ''))
  if (hasPayAmount && (discountAmount === '-' || discountAmount === '' || discountAmount == null) && !Number.isNaN(amountNumber) && !Number.isNaN(payNumber) && amountNumber >= payNumber) {
    discountAmount = (amountNumber - payNumber).toFixed(2)
  }

  return [
    { label: '参考汇率', value: displayValue(referenceRate, '--') },
    { label: '折扣', value: displayValue(discount, '--') },
    { label: '优惠金额', value: displayValue(discountAmount, '--') },
    { label: '合计 USDT', value: displayValue(payAmount, '--') }
  ]
})

function displayValue(value, fallback = '-') {
  if (value === undefined || value === null || value === '') return fallback
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function pickValue(payload, keys, fallback = '-') {
  for (const key of keys) {
    if (payload?.[key] !== undefined && payload?.[key] !== null && payload?.[key] !== '') return payload[key]
  }
  return fallback
}

function syncFieldMaps(nextFields = [], previousFields = []) {
  const next = Array.isArray(nextFields) ? nextFields : []
  const prev = Array.isArray(previousFields) ? previousFields : []
  for (const field of prev) {
    if (!next.some((item) => item.key === field.key)) {
      delete dynamicFields[field.key]
      delete fieldErrors[field.key]
      delete phoneHints[field.key]
      delete autoFilledCarrierValues[field.key]
      delete regionSelections[field.key]
    }
  }
  for (const field of next) {
    if (!(field.key in dynamicFields)) dynamicFields[field.key] = ''
    if (!(field.key in fieldErrors)) fieldErrors[field.key] = ''
    if (!(field.key in phoneHints)) phoneHints[field.key] = ''
    if ((Number(field.type) === 2 || Number(field.type) === 3) && !(field.key in regionSelections)) {
      syncRegionSelection(field)
    }
  }
}

function resolveProductFromBootstrap(bootstrap) {
  const list = [...(bootstrap?.featuredProducts || []), ...(bootstrap?.allProducts || [])]
  return list.find((item) => Number(item?.id) === Number(route.params.id)) || null
}

function applyResolvedProduct(nextProduct) {
  if (!nextProduct || !nextProduct.id) return
  const previousFields = normalizeFieldList(product.order_fields || [])
  Object.assign(product, { ...product, ...nextProduct })
  syncFieldMaps(normalizeFieldList(product.order_fields || []), previousFields)
  if ((!form.amount_money || Number(form.amount_money) <= 0) && minAmount.value) {
    form.amount_money = minAmount.value
  }
}

function resetResolvedProduct() {
  const previousFields = normalizeFieldList(product.order_fields || [])
  Object.keys(product).forEach((key) => {
    delete product[key]
  })
  syncFieldMaps([], previousFields)
  form.amount_money = ''
  form.batch_type = 0
  preview.value = createEmptyPreview()
}

async function loadProductDetail(productId) {
  if (!productId) {
    resetResolvedProduct()
    return
  }

  const res = await apiProductDetail(productId)
  const detail = res?.data || {}

  if (!detail?.id) {
    throw new Error('商品不存在')
  }

  applyResolvedProduct(mergeProductWithReference(detail, cachedProductReferences))
}

async function bootstrapProductDetail(productId) {
  const requestId = ++detailRequestId
  detailLoading.value = true
  detailError.value = ''
  success.value = false
  message.value = ''
  showTutorialModal.value = false

  const cachedProduct = resolveCachedProduct(productId)
  if (cachedProduct) {
    applyResolvedProduct(mergeProductWithReference(cachedProduct, cachedProductReferences))
    if (!restoreCachedPreview()) {
      preview.value = createEmptyPreview()
    }
  } else {
    resetResolvedProduct()
  }

  if (!productId) {
    detailError.value = '商品参数无效'
    detailLoading.value = false
    return
  }

  try {
    await loadProductDetail(productId)
    if (requestId !== detailRequestId) return
    if (!restoreCachedPreview()) {
      preview.value = createEmptyPreview()
    }
    if (form.amount_money && userStore.isLoggedIn) {
      clearPreviewTimer()
      await runPreview({ preserveCurrent: true, silent: true })
    }
    autoOpenTutorialIfNeeded()
  } catch (error) {
    if (requestId !== detailRequestId) return
    detailError.value = error?.message || '商品详情加载失败'
    if (!cachedProduct) {
      resetResolvedProduct()
    } else {
      message.value = detailError.value
    }
  } finally {
    if (requestId === detailRequestId) {
      detailLoading.value = false
    }
  }
}

function buildOrderInfo() {
  return JSON.stringify(orderFields.value.map((field) => `[${field.label}]${dynamicFields[field.key] || ''}`))
}

function goToBatchPage() {
  if (!ensureLogin()) return
  window.location.href = `/batch?id=${product.id}`
}

function ensureLogin() {
  if (!userStore.isLoggedIn) {
    router.push(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return false
  }
  return true
}

function isPhoneField(field) {
  return isLikelyPhoneField(field?.label || field)
}

function syncRegionSelection(field) {
  const current = parseLocationParts(dynamicFields[field.key] || '')
  regionSelections[field.key] = {
    province: current.province || '',
    city: current.city || '',
    district: current.district || ''
  }
}

function provinceOptions() {
  return regionTree.value.map((item) => ({ label: item.label, value: item.label }))
}

function cityOptions(field) {
  const province = String(regionSelections[field?.key]?.province || '').trim()
  const provinceDoc = findRegionProvince(regionTree.value, province)
  const list = Array.isArray(provinceDoc?.cities) ? provinceDoc.cities : []
  return list.map((item) => ({ label: item.label, value: item.label }))
}

function districtOptions(field) {
  const state = regionSelections[field?.key] || {}
  const province = String(state.province || '').trim()
  const city = String(state.city || '').trim()
  const provinceDoc = findRegionProvince(regionTree.value, province)
  const cityDoc = (provinceDoc?.cities || []).find((item) => item.label === city)
  const list = Array.isArray(cityDoc?.districts) ? cityDoc.districts : []
  return list.map((item, index) => ({ label: item.label || String(item), value: item.value || item.label || String(item), code: item.code || index }))
}

function handleCompositeRegionChange(field, level) {
  if (!regionSelections[field.key]) syncRegionSelection(field)
  const state = regionSelections[field.key]
  if (level === 'province') {
    state.city = ''
    state.district = ''
  } else if (level === 'city' && Number(field.type) === 2) {
    state.district = ''
  }
  dynamicFields[field.key] = buildLocation({
    province: state.province,
    city: state.city,
    district: Number(field.type) === 2 ? state.district : ''
  })
}

async function handleFieldInput(field) {
  fieldErrors[field.key] = ''
  if (!isPhoneField(field)) return
  dynamicFields[field.key] = normalizeChinaMobile(dynamicFields[field.key])
  phoneHints[field.key] = ''
  if (!dynamicFields[field.key]) return
  if (phoneLookupTimers.has(field.key)) {
    window.clearTimeout(phoneLookupTimers.get(field.key))
  }
  phoneLookupTimers.set(field.key, window.setTimeout(async () => {
    const value = dynamicFields[field.key]
    if (!isValidChinaMobile(value)) return
    const meta = await getPhoneMeta(value)
    const hint = formatPhoneHint(meta)
    phoneHints[field.key] = hint ? `识别结果：${hint}` : ''
    const operatorField = orderFields.value.find((item) => /运营商/.test(item.label))
    if (operatorField && meta.carrier) {
      const currentValue = String(dynamicFields[operatorField.key] || '').trim()
      const lastAutoValue = String(autoFilledCarrierValues[operatorField.key] || '').trim()
      if (!currentValue || currentValue === lastAutoValue) {
        dynamicFields[operatorField.key] = meta.carrier
        autoFilledCarrierValues[operatorField.key] = meta.carrier
      }
    }
  }, 320))
}

function fileInputId(field) {
  return `product-field-upload-${product.id || 'new'}-${field.key}`
}

function triggerFieldUpload(field) {
  const el = typeof document !== 'undefined' ? document.getElementById(fileInputId(field)) : null
  el?.click()
}

async function handleFieldFileChange(field, event) {
  const file = event?.target?.files?.[0]
  if (!file) return
  fieldErrors[field.key] = ''
  try {
    uploadingFieldKey.value = field.key
    const uploadRes = await uploadImageFile(file)
    const nextImage = String(uploadRes?.data?.url || '').trim()
    if (!nextImage) throw new Error('上传图片失败')
    dynamicFields[field.key] = nextImage
  } catch (error) {
    fieldErrors[field.key] = error.message || '上传图片失败'
  } finally {
    uploadingFieldKey.value = ''
    if (event?.target) event.target.value = ''
  }
}

function openTutorial() {
  showTutorialModal.value = true
}

function isTutorialHiddenForever() {
  if (!tutorialStorageKey.value) return false
  try {
    return localStorage.getItem(tutorialStorageKey.value) === '1'
  } catch {
    return false
  }
}

function autoOpenTutorialIfNeeded() {
  if (!hasProduct.value || isTutorialHiddenForever()) return
  showTutorialModal.value = true
}

function closeTutorial() {
  showTutorialModal.value = false
}

function hideTutorialForever() {
  if (tutorialStorageKey.value) {
    localStorage.setItem(tutorialStorageKey.value, '1')
  }
  closeTutorial()
}

async function runPreview(options = {}) {
  const { preserveCurrent = false, silent = false } = options
  if (!hasProduct.value || !ensureLogin()) return
  const requestId = ++previewRequestId
  if (!form.amount_money || Number(form.amount_money) < Number(minAmount.value)) {
    preview.value = createEmptyPreview()
    if (!silent) message.value = ''
    return
  }
  try {
    if (!preserveCurrent && !restoreCachedPreview()) {
      preview.value = createEmptyPreview()
    }
    const res = await apiProductDiscount({
      product_id: product.id,
      amount_money: form.amount_money,
      batch_type: form.batch_type
    })
    if (requestId !== previewRequestId) return
    const nextPreview = normalizePreviewData(res) || preview.value
    preview.value = nextPreview
    persistPreviewCache(nextPreview)
    if (!silent) {
      message.value = ''
      success.value = false
    }
  } catch (error) {
    if (requestId !== previewRequestId) return
    if (!preserveCurrent) {
      preview.value = createEmptyPreview()
    }
    if (!silent) {
      success.value = false
      message.value = error.message || '价格试算失败'
    }
  }
}

function queuePreview() {
  if (!userStore.isLoggedIn) return
  clearPreviewTimer()
  previewTimer = window.setTimeout(() => {
    void runPreview({ preserveCurrent: true, silent: true })
  }, 280)
}

function validateBeforePay() {
  let valid = true
  if (form.batch_type === 1 && allowBatch.value) {
    return true
  }
  for (const field of orderFields.value) {
    const value = String(dynamicFields[field.key] || '').trim()
    if (!value) {
      fieldErrors[field.key] = `请输入${field.label}`
      if (Number(field.type) === 2 || Number(field.type) === 3) fieldErrors[field.key] = `请选择${field.label}`
      if (Number(field.type) === 4) fieldErrors[field.key] = `请上传${field.label}`
      valid = false
      continue
    }
    if (isPhoneField(field) && !isValidChinaMobile(value)) {
      fieldErrors[field.key] = '请输入正确手机号'
      valid = false
    }
  }
  if (!form.amount_money || Number(form.amount_money) < Number(minAmount.value)) {
    message.value = `充值金额不能低于 ${minAmount.value}`
    success.value = false
    valid = false
  }
  return valid
}

function extractOrderNumberFromResponse(payload) {
  const candidates = [
    payload?.data?.order_number,
    payload?.data?.orderNumber,
    payload?.order_number,
    payload?.orderNumber,
    payload?.data
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const match = candidate.match(/(\d{8,})/)
      if (match) return match[1]
    }
  }
  return ''
}

async function jumpToNewestOrder() {
  const res = await apiOrderList({ content: '', status: 4, page: 1, page_size: 1 })
  const list = res.data?.list || res.data?.data || res.data?.rows || []
  const latest = list[0] ? normalizeOrder(list[0]) : null
  if (latest?.order_number) {
    writeOrderDetailCache(latest)
    router.push({ name: 'order-detail', params: { orderNumber: latest.order_number } })
    return true
  }
  return false
}

watch(
  () => [form.amount_money, form.batch_type],
  () => {
    if (!hasProduct.value) return
    queuePreview()
  }
)

watch(
  () => route.params.id,
  async (value) => {
    await bootstrapProductDetail(Number(value || 0))
  },
  { immediate: true }
)

function normalizePreviewData(res) {
  const raw = res?.data || res || {}
  const nested = raw?.data || {}
  const rate = pickValue({ ...nested, ...raw }, ['reference_exchange_rate', 'exchange_rate', 'rate', 'ref_rate', 'refer_rate'], cachedHomeBootstrap?.rate || '--')
  return { ...(raw || {}), ...(nested || {}), rate }
}

onMounted(async () => {
  try {
    regionTree.value = await fetchRegionTree()
  } catch (error) {
    success.value = false
    message.value = error?.message || '地区数据加载失败，请检查 /api/region/tree'
    regionTree.value = []
  }

  try {
    const latestHome = await fetchHomeBootstrap()
    if (latestHome?.rate && (!preview.value?.rate || preview.value?.rate === '--')) {
      preview.value = { ...preview.value, rate: latestHome.rate }
    }
  } catch {
    // keep cached rate
  }

  startPreviewLiveRefresh()
})

onActivated(() => {
  startPreviewLiveRefresh()
  if (hasValidPreviewRequest()) {
    void runPreview({ preserveCurrent: true, silent: true })
  }
})

onDeactivated(() => {
  clearPreviewLiveTimer()
})

onBeforeUnmount(() => {
  clearPreviewTimer()
  clearPreviewLiveTimer()
  for (const timer of phoneLookupTimers.values()) {
    window.clearTimeout(timer)
  }
})

async function handlePay() {
  if (submittingPay.value) return
  if (!ensureLogin()) return
  message.value = ''
  success.value = false
  for (const key of Object.keys(fieldErrors)) fieldErrors[key] = ''
  if (!validateBeforePay()) return
  try {
    submittingPay.value = true
    if (form.batch_type === 1 && allowBatch.value) {
      goToBatchPage()
      return
    }
    const res = await apiProductConfirmPayment({ product_id: product.id, amount_money: form.amount_money, batch_type: form.batch_type, order_info: buildOrderInfo() })
    const orderNumber = extractOrderNumberFromResponse(res)
    if (orderNumber) {
      router.push({ name: 'order-detail', params: { orderNumber } })
      return
    }
    const jumped = await jumpToNewestOrder()
    if (!jumped) router.push('/orders')
  } catch (error) {
    message.value = error.message || '支付失败'
  } finally {
    submittingPay.value = false
  }
}
</script>

<style scoped>
.product-order-head {
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
}

.product-tutorial-faq-btn {
  flex: 0 0 auto;
}

.faq-button {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background-color: #ffe53b;
  background-image: linear-gradient(147deg, #ffe53b 0%, #ff2525 74%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0px 6px 8px rgba(0, 0, 0, 0.12);
  position: relative;
}

.faq-button svg {
  height: 0.95em;
  fill: white;
}

.faq-button:hover svg {
  animation: jello-vertical 0.7s both;
}

.tooltip {
  position: absolute;
  top: -20px;
  opacity: 0;
  background-color: #ffe53b;
  background-image: linear-gradient(147deg, #ffe53b 0%, #ff2525 74%);
  color: white;
  padding: 4px 8px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition-duration: 0.2s;
  pointer-events: none;
  letter-spacing: 0.5px;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 700;
  z-index: 3;
}

.tooltip::before {
  position: absolute;
  content: "";
  width: 8px;
  height: 8px;
  background-color: #ff2525;
  background-size: 1000%;
  background-position: center;
  transform: rotate(45deg);
  bottom: -15%;
  transition-duration: 0.3s;
}

.faq-button:hover .tooltip {
  top: -34px;
  opacity: 1;
  transition-duration: 0.3s;
}

@keyframes jello-vertical {
  0% {
    transform: scale3d(1, 1, 1);
  }
  30% {
    transform: scale3d(0.75, 1.25, 1);
  }
  40% {
    transform: scale3d(1.25, 0.75, 1);
  }
  50% {
    transform: scale3d(0.85, 1.15, 1);
  }
  65% {
    transform: scale3d(1.05, 0.95, 1);
  }
  75% {
    transform: scale3d(0.95, 1.05, 1);
  }
  100% {
    transform: scale3d(1, 1, 1);
  }
}

@media (max-width: 640px) {
  .product-order-head {
    align-items: center;
    flex-direction: row;
  }
}
</style>

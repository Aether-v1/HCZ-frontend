<template>
  <section class="stack-lg substation-profile-shell">
    <div v-if="loading" class="card stack-md substation-profile-card-wrap">
      <div class="app-loading-card"><AppLoader size="md" /></div>
    </div>

    <div v-else class="card stack-md substation-profile-card-wrap">
      <div class="section-head"><h2>{{ pageTitle }}</h2></div>

      <p v-if="isOpened" class="substation-edit-hint muted">资料修改将直接生效；仅二级域名前缀修改需要审核。</p>

      <template v-if="isOpened">
        <div class="card stack-sm substation-profile-form-card">
          <div class="section-head substation-sub-head"><h3>二级域名前缀修改</h3></div>

          <p v-if="hasPendingAudit" class="muted tiny-text">当前已有待审核记录，审核完成前不可重复提交域名前缀修改。</p>

          <div v-if="statusData.has_pending_audit || domainRejectReason" class="substation-status-grid profile-status-grid">
            <div v-if="statusData.has_pending_audit" class="substation-stat-card">
              <span>待审核</span>
              <strong>域名前缀修改待审核</strong>
            </div>
            <div v-if="domainRejectReason" class="substation-stat-card reject-card">
              <span>驳回原因</span>
              <strong>{{ domainRejectReason }}</strong>
            </div>
          </div>

          <label>二级域名前缀<input v-model.trim="domainForm.subdomain" placeholder="例如 test1" /></label>
          <p class="muted tiny-text">当前完整域名：{{ domainPreview || '--' }}</p>
          <div class="inline-actions profile-submit-actions">
            <button class="primary-btn" type="button" :disabled="domainSubmitting || hasPendingAudit" @click="submitSubdomain">{{ domainSubmitting ? '提交中...' : '提交域名审核' }}</button>
          </div>
        </div>

        <div class="card stack-sm substation-profile-form-card">
          <div class="section-head substation-sub-head"><h3>分站资料修改</h3></div>
          <label>网站名<input v-model.trim="profileForm.site_name" placeholder="请输入网站名" /></label>
          <label>公告<textarea v-model.trim="profileForm.notice" rows="4" placeholder="请输入公告"></textarea></label>
          <div class="stack-xs">
            <label>Logo 地址</label>
            <div class="substation-logo-row">
              <input v-model.trim="profileForm.logo" placeholder="请输入 logo 地址域名或上传图片" />
              <button class="ghost-btn logo-upload-btn" type="button" :disabled="uploadingLogo" @click="pickLogo">{{ uploadingLogo ? '上传中...' : '上传' }}</button>
            </div>
            <input ref="logoInput" class="hidden-input" type="file" accept="image/png,image/jpeg,image/jpg,image/webp" @change="handleLogoSelected" />
            <img v-if="logoPreview" class="substation-logo-preview" :src="logoPreview" alt="logo预览" />
          </div>
          <div class="inline-actions profile-submit-actions">
            <button class="primary-btn" type="button" :disabled="profileSubmitting" @click="submitProfile">{{ profileSubmitting ? '保存中...' : '保存资料' }}</button>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="card stack-sm substation-profile-form-card">
          <div v-if="hasPendingAudit || reopenRejectReason" class="substation-status-grid profile-status-grid">
            <div v-if="hasPendingAudit" class="substation-stat-card">
              <span>待审核</span>
              <strong>已提交开通资料，请等待审核</strong>
            </div>
            <div v-if="reopenRejectReason" class="substation-stat-card reject-card">
              <span>驳回原因</span>
              <strong>{{ reopenRejectReason }}</strong>
            </div>
          </div>

          <label>二级域名前缀<input v-model.trim="domainForm.subdomain" placeholder="例如 test1" /></label>
          <label>网站名<input v-model.trim="profileForm.site_name" placeholder="请输入网站名" /></label>
          <label>公告<textarea v-model.trim="profileForm.notice" rows="4" placeholder="请输入公告"></textarea></label>
          <div class="stack-xs">
            <label>Logo 地址</label>
            <div class="substation-logo-row">
              <input v-model.trim="profileForm.logo" placeholder="请输入 logo 地址域名或上传图片" />
              <button class="ghost-btn logo-upload-btn" type="button" :disabled="uploadingLogo" @click="pickLogo">{{ uploadingLogo ? '上传中...' : '上传' }}</button>
            </div>
            <input ref="logoInput" class="hidden-input" type="file" accept="image/png,image/jpeg,image/jpg,image/webp" @change="handleLogoSelected" />
            <img v-if="logoPreview" class="substation-logo-preview" :src="logoPreview" alt="logo预览" />
          </div>
          <div class="inline-actions profile-submit-actions">
            <button class="primary-btn" type="button" :disabled="applySubmitting || hasPendingAudit" @click="submitApply">{{ applySubmitting ? '提交中...' : '提交资料' }}</button>
          </div>
        </div>
      </template>
    </div>
  </section>

  <FeedbackToast v-if="message" :type="toastType" :message="message" @close="message = ''" />
</template>

<script setup>
defineOptions({ name: 'SubstationProfileView' })
import { computed, onMounted, ref } from 'vue'
import { apiSubstationApply, apiSubstationMyProfile, apiSubstationMyStatus, apiSubstationSubmitProfileAudit } from '../api/substation'
import { uploadImageFile } from '../api/upload'
import { resolveAssetUrl } from '../utils/assets'
import AppLoader from '../components/AppLoader.vue'
import FeedbackToast from '../components/FeedbackToast.vue'

const status = ref(0)
const statusData = ref({})
const loading = ref(true)
const profileSubmitting = ref(false)
const domainSubmitting = ref(false)
const applySubmitting = ref(false)
const uploadingLogo = ref(false)
const logoInput = ref(null)
const message = ref('')
const success = ref(false)
const originalSubdomain = ref('')
const originalProfile = ref({ site_name: '', notice: '', logo: '' })
const domainForm = ref({ subdomain: '' })
const profileForm = ref({ site_name: '', notice: '', logo: '' })

const isOpened = computed(() => Number(status.value || 0) === 2)
const pageTitle = computed(() => isOpened.value ? '分站资料修改' : '分站资料提交')
const toastType = computed(() => (success.value ? 'success' : 'error'))
const hasPendingAudit = computed(() => Number(statusData.value?.has_pending_audit || 0) === 1)
const logoPreview = computed(() => {
  const raw = String(profileForm.value.logo || '').trim()
  if (!raw) return ''
  return /^https?:\/\//i.test(raw) ? raw : resolveAssetUrl(raw)
})
const domainPreview = computed(() => {
  const sub = String(domainForm.value.subdomain || '').trim()
  const base = String(statusData.value?.base_domain || '').trim()
  if (!sub) return ''
  return base ? `${sub}.${base}` : sub
})
const domainRejectReason = computed(() => String(statusData.value?.domain_reject_reason || '').trim())
const reopenRejectReason = computed(() => String(statusData.value?.reject_reason || '').trim())

function showToast(text, ok = false) {
  success.value = ok
  message.value = text
}

async function init() {
  loading.value = true
  try {
    const [statusRes, profileRes] = await Promise.all([apiSubstationMyStatus(), apiSubstationMyProfile()])
    statusData.value = statusRes.data || {}
    status.value = Number(statusRes.data?.status || 0)
    originalSubdomain.value = profileRes.data?.subdomain || ''
    originalProfile.value = {
      site_name: profileRes.data?.site_name || '',
      notice: profileRes.data?.notice || '',
      logo: profileRes.data?.logo || ''
    }
    domainForm.value = { subdomain: profileRes.data?.subdomain || '' }
    profileForm.value = {
      site_name: profileRes.data?.site_name || '',
      notice: profileRes.data?.notice || '',
      logo: profileRes.data?.logo || ''
    }
  } catch (error) {
    showToast(error?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function pickLogo() {
  logoInput.value?.click()
}

async function handleLogoSelected(event) {
  const file = event?.target?.files?.[0]
  event.target.value = ''
  if (!file) return
  uploadingLogo.value = true
  try {
    const uploadRes = await uploadImageFile(file)
    const data = uploadRes?.data || {}
    const url = data.url || ''
    if (!url) throw new Error('上传返回为空')
    profileForm.value.logo = url
    showToast('Logo 上传成功', true)
  } catch (error) {
    showToast(error?.message || 'Logo 上传失败')
  } finally {
    uploadingLogo.value = false
  }
}

function buildPayload(subdomainValue) {
  return {
    subdomain: String(subdomainValue || '').trim(),
    site_name: String(profileForm.value.site_name || '').trim(),
    notice: String(profileForm.value.notice || '').trim(),
    logo: String(profileForm.value.logo || '').trim(),
  }
}

function buildDomainPayload(subdomainValue) {
  return {
    subdomain: String(subdomainValue || '').trim(),
    site_name: String(originalProfile.value.site_name || '').trim(),
    notice: String(originalProfile.value.notice || '').trim(),
    logo: String(originalProfile.value.logo || '').trim(),
  }
}

function normalizeSubdomainValue(value) {
  return String(value || '').trim().toLowerCase()
}

async function submitApply() {
  if (Number(statusData.value?.paid_open || 0) !== 1) {
    showToast('请先在分站中心完成开通支付')
    return
  }
  if (hasPendingAudit.value) {
    showToast('当前已有待审核记录，请勿重复提交')
    return
  }

  applySubmitting.value = true
  try {
    const res = await apiSubstationApply(buildPayload(domainForm.value.subdomain))
    showToast(res.message || '提交成功', true)
    await init()
  } catch (error) {
    showToast(error?.message || '提交失败')
  } finally {
    applySubmitting.value = false
  }
}

async function submitProfile() {
  profileSubmitting.value = true
  try {
    const res = await apiSubstationSubmitProfileAudit(buildPayload(originalSubdomain.value))
    showToast(res.message || '保存成功', true)
    await init()
  } catch (error) {
    showToast(error?.message || '保存失败')
  } finally {
    profileSubmitting.value = false
  }
}

async function submitSubdomain() {
  if (hasPendingAudit.value) {
    showToast('当前已有待审核记录，请勿重复提交')
    return
  }
  if (normalizeSubdomainValue(domainForm.value.subdomain) === normalizeSubdomainValue(originalSubdomain.value)) {
    showToast('请先修改二级域名前缀后再提交审核')
    return
  }
  domainSubmitting.value = true
  try {
    const res = await apiSubstationSubmitProfileAudit(buildDomainPayload(domainForm.value.subdomain))
    showToast(res.message || '提交成功', true)
    await init()
  } catch (error) {
    showToast(error?.message || '提交失败')
  } finally {
    domainSubmitting.value = false
  }
}

onMounted(init)
</script>

<style scoped>
.profile-status-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.reject-card {
  grid-column: 1 / -1;
}

.reject-card strong {
  white-space: normal;
  word-break: break-word;
}

.substation-profile-card-wrap {
  min-height: 640px;
}

.substation-edit-hint {
  margin: -4px 0 4px;
  font-size: 0.92rem;
}

.substation-profile-form-card {
  background: rgba(255, 255, 255, 0.02);
}

.substation-sub-head h3 {
  margin: 0;
  font-size: 1rem;
}

.app-loading-card {
  min-height: 560px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.substation-logo-row {
  display: flex;
  gap: 10px;
}

.logo-upload-btn {
  white-space: nowrap;
}

.substation-logo-preview {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  object-fit: cover;
  border: 1px solid rgba(148, 163, 184, 0.24);
}

.profile-submit-actions {
  justify-content: center;
}

[data-theme="light"] .substation-profile-form-card {
  background: rgba(255, 255, 255, 0.96);
  border-color: rgba(99, 118, 170, 0.14);
}

[data-theme="light"] .substation-stat-card,
[data-theme="light"] .substation-profile-form-card label,
[data-theme="light"] .reject-card strong {
  color: #0f172a;
}

[data-theme="light"] .substation-stat-card span {
  color: #475569;
}

@media (max-width: 640px) {
  .profile-status-grid {
    grid-template-columns: 1fr;
  }

  .substation-logo-row {
    flex-direction: column;
  }
}
</style>

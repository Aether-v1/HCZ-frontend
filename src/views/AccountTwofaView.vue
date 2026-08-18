<template>
  <section class="stack-lg twofa-page">
    <div class="card stack-lg twofa-shell">
      <div class="section-head compact-title-head twofa-page-head">
        <h1>2FA 安全中心</h1>
        <span class="twofa-head-pill" :class="twofaEnabled ? 'is-online' : 'is-idle'">
          <i></i>
          {{ statusText }}
        </span>
      </div>

      <div class="twofa-console" :class="twofaEnabled ? 'is-enabled' : 'is-disabled'">
        <div class="twofa-console-copy">
          <h2>{{ securityHeadline }}</h2>
          <p>{{ securityDescription }}</p>

          <div class="twofa-console-actions">
            <button
              v-if="!twofaEnabled"
              class="primary-btn"
              type="button"
              :disabled="loading"
              @click="handleInitSetup"
            >
              {{ loading ? '处理中...' : (pendingSetup.secret ? '重新生成绑定信息' : '开始绑定') }}
            </button>
            <template v-else>
              <button class="ghost-btn" type="button" :disabled="loading" @click="handleResetSetup">
                {{ loading ? '处理中...' : '重置设备' }}
              </button>
              <button class="ghost-btn" type="button" :disabled="loading" @click="handleRegenerateRecoveryCodes">
                {{ loading ? '处理中...' : '恢复码' }}
              </button>
            </template>
          </div>
        </div>
      </div>

      <div v-if="pendingSetup.secret" class="twofa-panel twofa-panel--setup">
        <div class="twofa-panel-head twofa-panel-head--split">
          <h2>{{ twofaEnabled ? '重新绑定设备' : '绑定验证器' }}</h2>
          <span>{{ twofaEnabled ? '完成验证后，新密钥会替换旧设备。' : '扫码后输入当前动态码即可完成绑定。' }}</span>
        </div>

        <div class="twofa-setup-grid">
          <div class="twofa-qr-card">
            <div class="twofa-qr-wrap">
              <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" alt="2FA QR Code" class="twofa-qr-image" />
              <div v-else class="twofa-qr-fallback">
                <strong>{{ qrCodeError ? '二维码生成失败' : '二维码生成中' }}</strong>
                <span>{{ qrCodeError || '请稍候，正在根据手动密钥生成本地二维码。' }}</span>
              </div>
            </div>
            <p class="twofa-panel-note">使用任意兼容 TOTP 的验证器扫码导入。</p>
          </div>

          <div class="twofa-setup-side stack-md">
            <div class="twofa-secret-card">
              <div class="twofa-secret-copy">
                <span>手动输入密钥</span>
                <strong>{{ pendingSetup.secret }}</strong>
              </div>
              <button class="ghost-btn" type="button" @click="copyText(pendingSetup.secret, '密钥已复制')">复制密钥</button>
            </div>

            <div class="twofa-confirm-card">
              <label class="twofa-confirm-field">
                <span>输入当前 6 位动态码</span>
                <input
                  :value="verifyCode"
                  inputmode="numeric"
                  maxlength="6"
                  placeholder="请输入验证器当前动态码"
                  @input="handleVerifyCodeInput"
                />
                <small>系统会自动过滤非数字字符，只接受 6 位动态码。</small>
              </label>

              <div class="twofa-action-strip">
                <button class="primary-btn" type="button" :disabled="loading || !verifyCodeReady" @click="handleVerifySetup">
                  {{ loading ? '提交中...' : '确认绑定' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="twofaEnabled" class="twofa-action-grid">
        <article class="twofa-operation-card">
          <span class="twofa-operation-tag">Device Reset</span>
          <h3>重置绑定设备</h3>
          <p>用于更换手机或验证器。验证通过后会重新生成新的密钥与二维码。</p>
          <div class="twofa-operation-meta">
            <span class="twofa-status-pill subtle">登录密码</span>
            <span class="twofa-status-pill subtle">动态码优先</span>
          </div>
          <button class="ghost-btn" type="button" :disabled="loading" @click="handleResetSetup">
            {{ loading ? '处理中...' : '重置设备' }}
          </button>
        </article>

        <article class="twofa-operation-card twofa-operation-card--accent">
          <span class="twofa-operation-tag">Recovery Backup</span>
          <h3>重新生成恢复码</h3>
          <p>{{ hasRecoveryCodes ? `当前还有 ${recoveryCodeCount} 组可用恢复码。` : '当前没有可用恢复码，请立即生成新的恢复码。' }}</p>
          <div class="twofa-operation-meta">
            <span class="twofa-status-pill subtle">旧码立即失效</span>
            <span class="twofa-status-pill subtle">仅显示一次</span>
          </div>
          <button class="ghost-btn" type="button" :disabled="loading" @click="handleRegenerateRecoveryCodes">
            {{ loading ? '处理中...' : '重新生成恢复码' }}
          </button>
        </article>

        <article class="twofa-operation-card twofa-operation-card--danger">
          <span class="twofa-operation-tag">Critical Change</span>
          <h3>关闭 2FA</h3>
          <p>关闭后登录将不再要求动态码，恢复码也会被同时清空。这会明显降低账号保护强度。</p>
          <div class="twofa-operation-meta">
            <span class="twofa-status-pill subtle">高风险操作</span>
            <span class="twofa-status-pill subtle">建议谨慎执行</span>
          </div>
          <button class="ghost-btn danger-outline-btn" type="button" :disabled="loading" @click="handleDisableTwofa">
            {{ loading ? '处理中...' : '关闭 2FA' }}
          </button>
        </article>
      </div>

      <div class="twofa-panel twofa-guide">
        <div class="twofa-panel-head twofa-panel-head--split">
          <h2>操作说明</h2>
          <span>请在本人设备上完成绑定，并及时离线保存恢复码。</span>
        </div>

        <ol class="twofa-guide-list">
          <li>点击“开始绑定”，将二维码添加到验证器。</li>
          <li>输入当前 6 位动态码，验证通过后才会启用 2FA。</li>
          <li>恢复码只展示一次，请立即离线保存。</li>
        </ol>
      </div>
    </div>

    <AppDialog
      :visible="recoveryDialog.visible"
      :title="recoveryDialog.title"
      :message="recoveryDialog.message"
      :closable="false"
      :show-cancel="false"
      :close-on-mask="false"
      confirm-text="我已保存"
      @close="closeRecoveryDialog"
      @confirm="closeRecoveryDialog"
    >
      <div class="stack-sm">
        <div class="twofa-dialog-status">
          <strong>恢复码已生成</strong>
          <span>这些恢复码每个只能使用一次。关闭弹窗后将不会再次显示明文，请立即复制并离线保存。</span>
        </div>
        <div class="twofa-code-grid">
          <code v-for="code in recoveryDialog.codes" :key="code" class="twofa-code-chip">{{ code }}</code>
        </div>
        <button class="ghost-btn twofa-dialog-copy" type="button" @click="copyText(recoveryDialog.codes.join('\n'), '恢复码已复制')">
          复制恢复码
        </button>
      </div>
    </AppDialog>

    <AppDialog
      :visible="verificationDialog.visible"
      :title="verificationDialog.title"
      :message="verificationDialog.message"
      :closable="false"
      :confirm-text="verificationDialog.confirmText"
      :confirm-disabled="loading"
      :confirm-loading="loading"
      :close-on-mask="!loading"
      @close="closeVerificationDialog()"
      @confirm="handleVerificationDialogConfirm"
    >
      <div class="stack-sm">
        <div class="twofa-dialog-status is-totp">
          <strong>动态码验证中</strong>
          <span>请输入当前登录密码和验证器当前显示的 6 位动态码后继续。</span>
        </div>

        <label class="twofa-dialog-field">
          <span>当前登录密码</span>
          <input
            v-model.trim="verificationDialog.password"
            type="password"
            placeholder="请输入当前登录密码"
            :disabled="loading"
          />
        </label>

        <label class="twofa-dialog-field">
          <span>当前 2FA 动态码</span>
          <input
            :value="verificationDialog.twofaCode"
            inputmode="numeric"
            maxlength="6"
            placeholder="请输入验证器当前显示的 6 位动态码"
            :disabled="loading"
            @input="handleVerificationTotpInput"
          />
        </label>

        <p v-if="verificationDialog.error" class="twofa-dialog-error">{{ verificationDialog.error }}</p>
      </div>
    </AppDialog>
  </section>
</template>

<script setup>
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import QRCode from 'qrcode'
import AppDialog from '@/components/AppDialog.vue'
import { showConfirm, showMessage } from '@/utils/ui'
import {
  apiAccountTwofaDisable,
  apiAccountTwofaInit,
  apiAccountTwofaRecoveryCodesRegenerate,
  apiAccountTwofaReset,
  apiAccountTwofaStatus,
  apiAccountTwofaVerify
} from '../api/account'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
const loading = ref(false)
const statusReady = ref(false)
const twofaEnabled = ref(false)
const hasRecoveryCodes = ref(false)
const recoveryCodeCount = ref(0)
const verifyCode = ref('')
const qrCodeDataUrl = ref('')
const qrCodeError = ref('')
const pendingSetup = reactive({
  secret: '',
  qr_code: ''
})
const recoveryDialog = reactive({
  visible: false,
  title: '',
  message: '',
  codes: []
})
const verificationDialog = reactive({
  visible: false,
  title: '',
  message: '',
  confirmText: '确认',
  password: '',
  twofaCode: '',
  error: ''
})
let verificationDialogResolver = null
let qrCodeRenderVersion = 0

const statusText = computed(() => {
  if (!statusReady.value) return '同步中...'
  return twofaEnabled.value ? '已开启' : '未启用'
})

const securityHeadline = computed(() => {
  if (!statusReady.value) return '正在同步 2FA 状态'
  if (pendingSetup.secret) return '绑定信息已生成'
  if (twofaEnabled.value) return '2FA 已开启'
  return '建议尽快开启 2FA'
})

const securityDescription = computed(() => {
  if (!statusReady.value) return '请稍候，正在读取当前状态。'
  if (pendingSetup.secret) return '扫码或手动输入密钥后，填入当前动态码完成绑定。'
  if (twofaEnabled.value) return hasRecoveryCodes.value ? `当前有 ${recoveryCodeCount.value} 组恢复码可用。` : '已开启 2FA，建议尽快生成并保存恢复码。'
  return '开启后，登录和敏感操作将额外要求动态码验证。'
})

const verifyCodeReady = computed(() => /^\d{6}$/.test(String(verifyCode.value || '').trim()))

const twofaIssuer = computed(() => {
  const sessionSiteName = String(
    userStore.session?.siteInfo?.site_name
    || userStore.session?.siteInfo?.name
    || userStore.session?.siteInfo?.title
    || ''
  ).trim()
  if (sessionSiteName) return sessionSiteName
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname
  }
  return 'HCZ'
})

const twofaAccount = computed(() => {
  const account = String(
    userStore.mobile
    || userStore.username
    || userStore.profile?.mobile
    || userStore.profile?.username
    || ''
  ).trim()
  return account || 'user'
})

const otpauthUrl = computed(() => {
  const secret = String(pendingSetup.secret || '').trim()
  if (!secret) return ''
  const issuer = String(twofaIssuer.value || 'HCZ').trim() || 'HCZ'
  const account = String(twofaAccount.value || 'user').trim() || 'user'
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`
  return `otpauth://totp/${label}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}`
})

function syncTwofaBinding(binding = {}) {
  const normalizedBinding = {
    ...binding,
    status_checked: 1,
    is_enabled: Number(binding.is_enabled ?? binding.twofa_enabled ?? binding.enabled ?? 0) || 0,
    has_recovery_codes: Number(binding.has_recovery_codes ?? 0) || 0,
    recovery_code_count: Number(binding.recovery_code_count ?? 0) || 0
  }

  if (typeof userStore.setTwofaBinding === 'function') {
    userStore.setTwofaBinding(normalizedBinding)
    return normalizedBinding
  }

  if (typeof userStore.setSession === 'function') {
    userStore.setSession({
      accountBindings: {
        twofa: normalizedBinding,
        has_twofa: normalizedBinding.is_enabled
      }
    })
  }

  return normalizedBinding
}

function resetPendingSetup() {
  pendingSetup.secret = ''
  pendingSetup.qr_code = ''
  verifyCode.value = ''
  qrCodeDataUrl.value = ''
  qrCodeError.value = ''
}

function applyPendingSetup(payload = {}) {
  pendingSetup.secret = payload.secret || ''
  pendingSetup.qr_code = payload.qr_code || ''
  verifyCode.value = ''
}

async function renderLocalQrCode() {
  const currentOtpauthUrl = String(otpauthUrl.value || '').trim()
  const renderVersion = ++qrCodeRenderVersion

  if (!currentOtpauthUrl) {
    qrCodeDataUrl.value = ''
    qrCodeError.value = ''
    return
  }

  qrCodeError.value = ''

  try {
    const dataUrl = await QRCode.toDataURL(currentOtpauthUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 300
    })

    if (renderVersion !== qrCodeRenderVersion) return

    qrCodeDataUrl.value = dataUrl
  } catch (error) {
    if (renderVersion !== qrCodeRenderVersion) return

    qrCodeDataUrl.value = ''
    qrCodeError.value = '请使用下方手动密钥完成绑定。'
    console.error('AccountTwofaView QR generation failed:', {
      error,
      otpauthUrl: currentOtpauthUrl
    })
  }
}

function openRecoveryDialog(codes = [], title = '请保存恢复码', message = '') {
  recoveryDialog.codes = Array.isArray(codes) ? [...codes] : []
  recoveryDialog.title = title
  recoveryDialog.message = message
  recoveryDialog.visible = recoveryDialog.codes.length > 0
}

function closeRecoveryDialog() {
  recoveryDialog.visible = false
  recoveryDialog.title = ''
  recoveryDialog.message = ''
  recoveryDialog.codes = []
}

function resetVerificationDialogState() {
  verificationDialog.title = ''
  verificationDialog.message = ''
  verificationDialog.confirmText = '确认'
  verificationDialog.password = ''
  verificationDialog.twofaCode = ''
  verificationDialog.error = ''
}

function closeVerificationDialog(result = null) {
  verificationDialog.visible = false
  resetVerificationDialogState()
  if (verificationDialogResolver) {
    const resolver = verificationDialogResolver
    verificationDialogResolver = null
    resolver(result)
  }
}

function sanitizeSixDigitInput(value) {
  return String(value || '').replace(/\D+/g, '').slice(0, 6)
}

function handleVerifyCodeInput(event) {
  verifyCode.value = sanitizeSixDigitInput(event?.target?.value)
}

function handleVerificationTotpInput(event) {
  verificationDialog.twofaCode = sanitizeSixDigitInput(event?.target?.value)
  verificationDialog.error = ''
}

function buildVerificationPayload() {
  const password = String(verificationDialog.password || '').trim()
  if (!password) {
    return { ok: false, message: '请输入当前登录密码' }
  }

  const code = String(verificationDialog.twofaCode || '').trim()
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, message: '请输入当前有效的 6 位动态码' }
  }

  return {
    ok: true,
    payload: {
      password,
      twofa_code: code
    }
  }
}

function handleVerificationDialogConfirm() {
  const result = buildVerificationPayload()
  if (!result.ok) {
    verificationDialog.error = result.message
    return
  }

  closeVerificationDialog(result.payload)
}

function requestStrongVerification(options = {}) {
  resetVerificationDialogState()
  verificationDialog.title = options.title || '验证身份'
  verificationDialog.message = options.message || ''
  verificationDialog.confirmText = options.confirmText || '继续'
  verificationDialog.visible = true

  return new Promise((resolve) => {
    verificationDialogResolver = resolve
  })
}

async function copyText(text, okMessage = '已复制') {
  const value = String(text || '').trim()
  if (!value) return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.setAttribute('readonly', 'readonly')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    showMessage({ type: 'success', message: okMessage })
  } catch (error) {
    showMessage({ type: 'error', message: error.message || '复制失败，请手动复制' })
  }
}

async function loadTwofaStatus() {
  try {
    const res = await apiAccountTwofaStatus()
    twofaEnabled.value = Number(res?.data?.twofa_enabled || 0) === 1
    hasRecoveryCodes.value = Number(res?.data?.has_recovery_codes || 0) === 1
    recoveryCodeCount.value = Number(res?.data?.recovery_code_count || 0)
    syncTwofaBinding({
      twofa_enabled: Number(res?.data?.twofa_enabled || 0),
      has_recovery_codes: Number(res?.data?.has_recovery_codes || 0),
      recovery_code_count: Number(res?.data?.recovery_code_count || 0)
    })
  } catch (error) {
    twofaEnabled.value = false
    hasRecoveryCodes.value = false
    recoveryCodeCount.value = 0
    showMessage({ type: 'error', message: error.message || '获取 2FA 状态失败' })
  } finally {
    statusReady.value = true
  }
}

async function handleInitSetup() {
  loading.value = true
  try {
    const res = await apiAccountTwofaInit()
    applyPendingSetup(res.data || {})
    showMessage({ type: 'success', message: res.message || '2FA 绑定信息已生成' })
  } catch (error) {
    showMessage({ type: 'error', message: error.message || '初始化 2FA 失败' })
  } finally {
    loading.value = false
  }
}

async function handleVerifySetup() {
  loading.value = true
  try {
    const res = await apiAccountTwofaVerify({ code: verifyCode.value })
    const recoveryCodes = Array.isArray(res?.data?.recovery_codes) ? res.data.recovery_codes : []
    twofaEnabled.value = true
    hasRecoveryCodes.value = recoveryCodes.length > 0
    recoveryCodeCount.value = recoveryCodes.length
    syncTwofaBinding({
      twofa_enabled: 1,
      has_recovery_codes: recoveryCodes.length > 0 ? 1 : 0,
      recovery_code_count: recoveryCodes.length
    })
    resetPendingSetup()
    openRecoveryDialog(recoveryCodes, '2FA 已启用，请保存恢复码', '恢复码只会在本次弹窗中显示一次。')
    showMessage({ type: 'success', message: res.message || '2FA 绑定成功' })
    await loadTwofaStatus()
  } catch (error) {
    showMessage({ type: 'error', message: error.message || '验证动态码失败' })
  } finally {
    loading.value = false
  }
}

async function handleDisableTwofa() {
  const confirmed = await showConfirm({
    title: '关闭 2FA',
    message: '关闭后，登录将不再要求动态码验证，恢复码也会被同时清空。请确认这是你本人操作。',
    variant: 'danger',
    confirmText: '继续关闭'
  })
  if (!confirmed) return

  const payload = await requestStrongVerification({
    title: '关闭 2FA 前验证身份',
    message: '请输入当前登录密码和当前有效动态码，验证通过后才会关闭 2FA。',
    confirmText: '验证并关闭'
  })
  if (!payload) return

  loading.value = true
  try {
    const res = await apiAccountTwofaDisable(payload)
    twofaEnabled.value = false
    hasRecoveryCodes.value = false
    recoveryCodeCount.value = 0
    syncTwofaBinding({
      twofa_enabled: 0,
      has_recovery_codes: 0,
      recovery_code_count: 0
    })
    resetPendingSetup()
    closeRecoveryDialog()
    showMessage({ type: 'success', message: res.message || '2FA 已关闭' })
    await loadTwofaStatus()
  } catch (error) {
    showMessage({ type: 'error', message: error.message || '关闭 2FA 失败' })
  } finally {
    loading.value = false
  }
}

async function handleResetSetup() {
  const confirmed = await showConfirm({
    title: '重置绑定设备',
    message: '系统将生成新的密钥和二维码。请先确认你已准备好在新设备上完成重新绑定。',
    confirmText: '继续重置'
  })
  if (!confirmed) return

  const payload = await requestStrongVerification({
    title: '重置绑定设备前验证身份',
    message: '请输入当前登录密码，并通过当前有效动态码完成验证。',
    confirmText: '验证并继续'
  })
  if (!payload) return

  loading.value = true
  try {
    const res = await apiAccountTwofaReset(payload)
    applyPendingSetup(res.data || {})
    closeRecoveryDialog()
    showMessage({ type: 'success', message: res.message || '已生成新的绑定密钥，请继续完成验证' })
  } catch (error) {
    showMessage({ type: 'error', message: error.message || '重置 2FA 失败' })
  } finally {
    loading.value = false
  }
}

async function handleRegenerateRecoveryCodes() {
  const confirmed = await showConfirm({
    title: '重新生成恢复码',
    message: '生成新恢复码后，旧恢复码会立即失效。请确认你已经准备好保存新的一组恢复码。',
    variant: 'danger',
    confirmText: '继续生成'
  })
  if (!confirmed) return

  const payload = await requestStrongVerification({
    title: '重新生成恢复码前验证身份',
    message: '重新生成恢复码属于高敏感操作。请输入当前登录密码和当前有效动态码完成验证。',
    confirmText: '验证并生成'
  })
  if (!payload) return

  loading.value = true
  try {
    const res = await apiAccountTwofaRecoveryCodesRegenerate(payload)
    const recoveryCodes = Array.isArray(res?.data?.recovery_codes) ? res.data.recovery_codes : []
    recoveryCodeCount.value = recoveryCodes.length
    hasRecoveryCodes.value = recoveryCodes.length > 0
    openRecoveryDialog(recoveryCodes, '新的恢复码已生成', '旧恢复码已经失效，新恢复码只会在本次弹窗中显示一次。')
    showMessage({ type: 'success', message: res.message || '恢复码已重新生成' })
    await loadTwofaStatus()
  } catch (error) {
    showMessage({ type: 'error', message: error.message || '重新生成恢复码失败' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadTwofaStatus()
})

onActivated(() => {
  loadTwofaStatus()
})

watch(otpauthUrl, () => {
  void renderLocalQrCode()
}, { immediate: true })
</script>

<style scoped>
.twofa-page {
  padding-bottom: 16px;
  color: var(--text);
}

.twofa-shell {
  position: relative;
  overflow: hidden;
}

.twofa-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.018) 1px, transparent 1px),
    radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 18%, transparent), transparent 30%);
  background-size: 24px 24px, 24px 24px, auto;
  opacity: 0.48;
}

.twofa-page-head,
.twofa-console,
.twofa-panel,
.twofa-action-grid {
  position: relative;
  z-index: 1;
}

.twofa-page-head {
  align-items: flex-start;
}

.twofa-page-title-block {
  gap: 6px;
}

.twofa-page-eyebrow {
  color: color-mix(in srgb, var(--accent) 88%, white 12%);
}

.twofa-page-head h1 {
  font-size: 26px;
}

.twofa-head-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
}

.twofa-head-pill i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--warning);
  box-shadow: 0 0 16px color-mix(in srgb, var(--warning) 70%, transparent);
}

.twofa-head-pill.is-online i {
  background: var(--success);
  box-shadow: 0 0 16px color-mix(in srgb, var(--success) 70%, transparent);
}

.twofa-console,
.twofa-panel {
  padding: 18px;
  border-radius: 22px;
  border: 1px solid color-mix(in srgb, var(--border) 92%, transparent);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--panel-strong) 96%, transparent),
    color-mix(in srgb, var(--panel) 99%, transparent)
  );
  backdrop-filter: blur(18px);
}

.twofa-console {
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 18%, transparent), transparent 30%),
    linear-gradient(135deg, color-mix(in srgb, var(--primary) 22%, var(--panel-strong)), color-mix(in srgb, var(--panel) 98%, transparent));
}

.twofa-console.is-enabled {
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--success) 18%, transparent), transparent 30%),
    linear-gradient(135deg, color-mix(in srgb, var(--success) 22%, var(--panel-strong)), color-mix(in srgb, var(--panel) 98%, transparent));
}

.twofa-console-main {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(220px, 0.8fr);
  gap: 18px;
  align-items: center;
}

.twofa-console-copy {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.twofa-console-tag,
.twofa-operation-tag {
  display: inline-flex;
  align-self: flex-start;
  min-height: 30px;
  padding: 0 12px;
  align-items: center;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: color-mix(in srgb, var(--accent) 88%, white 12%);
  font-size: 12px;
  font-weight: 700;
}

.twofa-console-copy h2,
.twofa-operation-card h3,
.twofa-summary-card h3,
.twofa-guide-card strong,
.twofa-radar-ring strong,
.twofa-metric-card strong,
.twofa-secret-copy strong {
  margin: 0;
  color: var(--text);
}

.twofa-console-copy h2 {
  font-size: 28px;
  line-height: 1.2;
}

.twofa-console-copy p,
.twofa-metric-card p,
.twofa-operation-card p,
.twofa-panel-head span,
.twofa-panel-note,
.twofa-summary-card p,
.twofa-confirm-field small,
.twofa-guide-card p,
.twofa-guide ol,
.twofa-dialog-status span,
.twofa-dialog-field span {
  margin: 0;
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.7;
}

.twofa-console-actions,
.twofa-action-strip,
.twofa-operation-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.twofa-console-actions .primary-btn,
.twofa-console-actions .ghost-btn,
.twofa-action-strip .primary-btn,
.twofa-operation-card .ghost-btn,
.twofa-operation-card .danger-outline-btn {
  min-width: 148px;
}

.twofa-radar-card {
  display: flex;
  justify-content: center;
}

.twofa-radar-ring {
  position: relative;
  width: min(220px, 100%);
  aspect-ratio: 1;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid color-mix(in srgb, var(--accent) 26%, transparent);
  background:
    radial-gradient(circle at center, color-mix(in srgb, var(--panel-strong) 86%, transparent) 0 42%, transparent 43%),
    conic-gradient(from 200deg, color-mix(in srgb, var(--accent) 14%, transparent), color-mix(in srgb, var(--primary) 22%, transparent), color-mix(in srgb, var(--success) 18%, transparent), color-mix(in srgb, var(--accent) 14%, transparent));
  box-shadow:
    inset 0 0 0 12px rgba(6, 17, 31, 0.28),
    0 0 40px color-mix(in srgb, var(--accent) 16%, transparent);
  text-align: center;
}

.twofa-radar-ring::before,
.twofa-radar-ring::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  inset: 18px;
  border: 1px dashed color-mix(in srgb, var(--accent) 22%, transparent);
}

.twofa-radar-ring::after {
  inset: 36px;
  border-style: solid;
  opacity: 0.45;
}

.twofa-radar-ring span,
.twofa-metric-card span,
.twofa-secret-copy span,
.twofa-confirm-field span,
.twofa-guide-card span {
  color: var(--text-dim);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.twofa-radar-ring strong {
  font-size: 30px;
  line-height: 1;
}

.twofa-radar-ring small {
  max-width: 130px;
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.6;
}

.twofa-console-grid,
.twofa-action-grid,
.twofa-guide-grid,
.twofa-setup-grid {
  display: grid;
  gap: 14px;
}

.twofa-console-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.twofa-metric-card,
.twofa-operation-card,
.twofa-qr-card,
.twofa-secret-card,
.twofa-summary-card,
.twofa-confirm-card,
.twofa-guide-card,
.twofa-dialog-status {
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  background: color-mix(in srgb, var(--panel-fade) 86%, transparent);
}

.twofa-metric-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 148px;
}

.twofa-metric-card strong {
  font-size: 20px;
  line-height: 1.35;
}

.twofa-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.twofa-panel--setup {
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--primary) 12%, transparent), transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--panel-strong) 96%, transparent), color-mix(in srgb, var(--panel) 99%, transparent));
}

.twofa-panel-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.twofa-panel-head--split {
  justify-content: space-between;
}

.twofa-panel-head h2 {
  margin: 0;
  font-size: 22px;
}

.twofa-step-strip {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.twofa-step-chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border) 92%, transparent);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
}

.twofa-step-chip.is-done {
  border-color: color-mix(in srgb, var(--success) 32%, transparent);
  background: color-mix(in srgb, var(--success) 14%, transparent);
  color: var(--success);
}

.twofa-step-chip.is-active {
  border-color: color-mix(in srgb, var(--accent) 32%, transparent);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--text);
}

.twofa-setup-grid {
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
}

.twofa-qr-card,
.twofa-secret-card,
.twofa-summary-card,
.twofa-confirm-card {
  padding: 16px;
}

.twofa-qr-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--panel-strong) 94%, transparent), color-mix(in srgb, var(--panel-fade) 88%, transparent));
}

.twofa-qr-wrap {
  display: flex;
  justify-content: center;
  padding: 4px 0;
}

.twofa-qr-fallback {
  display: grid;
  gap: 8px;
  width: min(280px, 100%);
  min-height: 280px;
  align-content: center;
  justify-items: center;
  padding: 24px;
  text-align: center;
  border-radius: 24px;
  background: #fff;
  box-shadow:
    inset 0 0 0 1px rgba(15, 23, 42, 0.08),
    0 18px 40px rgba(0, 0, 0, 0.22);
}

.twofa-qr-fallback strong {
  font-size: 15px;
  color: #0f172a;
}

.twofa-qr-fallback span {
  font-size: 12px;
  line-height: 1.6;
  color: #475569;
}

.twofa-qr-image {
  width: min(280px, 100%);
  aspect-ratio: 1;
  object-fit: contain;
  border-radius: 24px;
  background: #fff;
  padding: 14px;
  box-shadow:
    inset 0 0 0 1px rgba(15, 23, 42, 0.08),
    0 18px 40px rgba(0, 0, 0, 0.22);
}

.twofa-panel-note {
  text-align: center;
}

.twofa-setup-side {
  min-width: 0;
}

.twofa-secret-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.twofa-secret-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.twofa-secret-copy strong {
  font-size: 20px;
  line-height: 1.5;
  word-break: break-all;
}

.twofa-summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.twofa-summary-card h3 {
  font-size: 18px;
}

.twofa-confirm-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.twofa-confirm-field,
.twofa-dialog-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.twofa-confirm-field input,
.twofa-dialog-field input {
  width: 100%;
  min-height: 50px;
  padding: 0 16px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--border) 92%, transparent);
  background: color-mix(in srgb, var(--panel-strong) 92%, white 8%);
  color: var(--text);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.twofa-confirm-field input:focus,
.twofa-dialog-field input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--accent) 44%, transparent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 16%, transparent);
  transform: translateY(-1px);
}

.twofa-confirm-field input::placeholder,
.twofa-dialog-field input::placeholder {
  color: var(--text-dim);
}

.twofa-action-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.twofa-operation-card {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.twofa-operation-card--accent {
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 10%, var(--panel-fade)), color-mix(in srgb, var(--panel-fade) 92%, transparent));
}

.twofa-operation-card--danger {
  background: linear-gradient(180deg, color-mix(in srgb, var(--danger) 8%, var(--panel-fade)), color-mix(in srgb, var(--panel-fade) 92%, transparent));
}

.twofa-operation-card h3 {
  font-size: 20px;
}

.twofa-operation-card .ghost-btn,
.twofa-operation-card .danger-outline-btn {
  margin-top: auto;
}

.twofa-status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--success) 28%, transparent);
  background: color-mix(in srgb, var(--success) 16%, transparent);
  color: var(--success);
  font-size: 12px;
  font-weight: 700;
}

.twofa-status-pill.subtle {
  border-color: color-mix(in srgb, var(--accent) 22%, transparent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--text-soft);
}

.twofa-guide {
  background:
    radial-gradient(circle at bottom right, color-mix(in srgb, var(--primary) 12%, transparent), transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--panel-strong) 92%, transparent), color-mix(in srgb, var(--panel-fade) 95%, transparent));
}

.twofa-guide-grid {
  grid-template-columns: minmax(0, 1.2fr) minmax(240px, 0.8fr);
  align-items: start;
}

.twofa-guide ol {
  padding-left: 20px;
}

.twofa-guide li + li {
  margin-top: 10px;
}

.twofa-guide-side {
  display: grid;
  gap: 12px;
}

.twofa-guide-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.twofa-guide-card strong {
  font-size: 18px;
}

.twofa-dialog-status {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.twofa-dialog-status strong {
  color: var(--text);
  font-size: 15px;
}

.twofa-dialog-status.is-totp {
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 12%, var(--panel-fade)), color-mix(in srgb, var(--panel-fade) 92%, transparent));
}

.twofa-dialog-status.is-recovery {
  background: linear-gradient(180deg, color-mix(in srgb, var(--warning) 10%, var(--panel-fade)), color-mix(in srgb, var(--panel-fade) 92%, transparent));
}

.twofa-code-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.twofa-code-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px dashed color-mix(in srgb, var(--accent) 28%, transparent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
}

.twofa-dialog-copy {
  width: 100%;
}

.twofa-dialog-switch {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--accent);
  text-align: left;
  font-weight: 700;
}

.twofa-dialog-error {
  margin: 0;
  color: var(--danger);
  font-size: 13px;
  line-height: 1.5;
}

@media (max-width: 920px) {
  .twofa-console-main,
  .twofa-setup-grid,
  .twofa-guide-grid,
  .twofa-action-grid,
  .twofa-console-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .twofa-page-head {
    gap: 12px;
  }

  .twofa-page-head h1,
  .twofa-console-copy h2 {
    font-size: 24px;
  }

  .twofa-console,
  .twofa-panel {
    padding: 16px;
  }

  .twofa-secret-card,
  .twofa-code-grid {
    grid-template-columns: 1fr;
  }

  .twofa-console-actions .primary-btn,
  .twofa-console-actions .ghost-btn,
  .twofa-action-strip .primary-btn,
  .twofa-operation-card .ghost-btn,
  .twofa-operation-card .danger-outline-btn {
    width: 100%;
  }
}
</style>

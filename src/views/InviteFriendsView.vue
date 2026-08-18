<template>
  <section class="stack-lg invite-page">
    <div class="card invite-hero-card stack-md">
      <div class="invite-qr-panel">
        <img v-if="qrCode" :src="qrCode" alt="邀请二维码" class="invite-qr-image" />
        <div v-else class="invite-qr-empty">暂无二维码</div>
      </div>
      <div class="invite-action-row invite-action-row-single invite-save-under-qr invite-center-button-row">
        <button class="ghost-btn invite-copy-btn invite-save-btn-full invite-mid-btn invite-center-solid-btn" type="button" @click="saveQrCode">保存二维码</button>
      </div>
    </div>

    <div class="card stack-md invite-center-card">
      <div class="invite-info-row invite-center-row">
        <span>邀请码</span>
        <button class="invite-code-btn" type="button" @click="copy(inviteCode, '邀请码已复制')">{{ inviteCode || '未获取' }}</button>
      </div>
    </div>

    <div class="card stack-md invite-center-card">
      <div class="invite-info-row invite-link-row invite-center-row">
        <span>邀请链接</span>
        <strong>{{ inviteLink || '未获取' }}</strong>
      </div>
      <div class="invite-action-row invite-action-row-single invite-link-action-row invite-center-button-row"><button class="ghost-btn invite-copy-btn invite-copy-btn-center invite-mid-btn invite-center-solid-btn" type="button" @click="copy(inviteLink, '邀请链接已复制')">复制邀请链接</button></div>
    </div>

    <FeedbackToast v-if="message" type="success" :message="message" @close="message = ''" />
  </section>
</template>

<script setup>
import FeedbackToast from '@/components/FeedbackToast.vue'
defineOptions({ name: 'InviteFriendsView' })
import { computed, onMounted, ref } from 'vue'
import { useUserStore } from '../stores/user'
import { apiInviteInfo } from '../api/invite'
import { resolveAssetUrl } from '../utils/assets'

const userStore = useUserStore()
const message = ref('')

const inviteCode = computed(() => userStore.inviteInfo?.invite_code || userStore.inviteCode || '')
const inviteLink = computed(() => userStore.inviteInfo?.invite_link || '')
const qrCode = computed(() => resolveAssetUrl(userStore.inviteInfo?.qr_code || ''))

async function loadInviteInfo(force = false) {
  if (!force && userStore.inviteInfo?.invite_code) return
  try {
    const res = await apiInviteInfo()
    userStore.setInviteInfo(res.data || {})
  } catch {
    await userStore.refreshBootstrap(force).catch(() => null)
  }
}

async function copy(text, successText) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    message.value = successText
    window.setTimeout(() => {
      message.value = ''
    }, 2000)
  } catch {
    message.value = '复制失败'
  }
}

async function saveQrCode() {
  if (!qrCode.value) return
  try {
    const response = await fetch(qrCode.value)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `invite-qrcode-${inviteCode.value || 'share'}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.value = '二维码已保存'
    window.setTimeout(() => {
      message.value = ''
    }, 2000)
  } catch {
    message.value = '保存二维码失败'
  }
}

onMounted(async () => {
  await loadInviteInfo(false)
})
</script>

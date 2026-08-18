<template>
  <Teleport to="body">
    <transition name="feedback-toast-fade">
      <div class="feedback-toast-layer">
        <div class="feedback-toast" :class="`is-${normalizedType}`" role="status" aria-live="polite">
          <div class="feedback-toast__icon" aria-hidden="true">
            <svg v-if="normalizedType === 'success'" xmlns="http://www.w3.org/2000/svg" width="24" viewBox="0 0 24 24" height="24" fill="none">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.707 7.707-5.5 5.5a1 1 0 0 1-1.414 0l-2.5-2.5 1.414-1.414 1.793 1.793 4.793-4.793 1.414 1.414z" fill="currentColor"/>
            </svg>
            <svg v-else-if="normalizedType === 'warning'" xmlns="http://www.w3.org/2000/svg" width="24" viewBox="0 0 24 24" height="24" fill="none">
              <path d="M12 3.5a1.75 1.75 0 0 1 1.515.875l7.055 12.25A1.75 1.75 0 0 1 19.055 19H4.945a1.75 1.75 0 0 1-1.515-2.625l7.055-12.25A1.75 1.75 0 0 1 12 3.5zm-1 4.5v5h2V8h-2zm0 7v2h2v-2h-2z" fill="currentColor"/>
            </svg>
            <svg v-else-if="normalizedType === 'info'" xmlns="http://www.w3.org/2000/svg" width="24" viewBox="0 0 24 24" height="24" fill="none">
              <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z" fill="currentColor"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" viewBox="0 0 24 24" height="24" fill="none">
              <path d="m13 13h-2v-6h2zm0 4h-2v-2h2zm-1-15c-1.3132 0-2.61358.25866-3.82683.7612-1.21326.50255-2.31565 1.23915-3.24424 2.16773-1.87536 1.87537-2.92893 4.41891-2.92893 7.07107 0 2.6522 1.05357 5.1957 2.92893 7.0711.92859.9286 2.03098 1.6651 3.24424 2.1677 1.21325.5025 2.51363.7612 3.82683.7612 2.6522 0 5.1957-1.0536 7.0711-2.9289 1.8753-1.8754 2.9289-4.4189 2.9289-7.0711 0-1.3132-.2587-2.61358-.7612-3.82683-.5026-1.21326-1.2391-2.31565-2.1677-3.24424-.9286-.92858-2.031-1.66518-3.2443-2.16773-1.2132-.50254-2.5136-.7612-3.8268-.7612z" fill="currentColor"/>
            </svg>
          </div>
          <div class="feedback-toast__content">
            <div class="feedback-toast__title">{{ message }}</div>
            <div class="feedback-toast__caption">{{ stateLabel }}</div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'error',
  },
  message: {
    type: String,
    default: '',
  },
  duration: {
    type: Number,
    default: 2600,
  }
})

const emit = defineEmits(['close'])

const normalizedType = computed(() => {
  if (props.type === 'danger') return 'error'
  return ['success', 'warning', 'info', 'error'].includes(props.type) ? props.type : 'error'
})

const stateLabel = computed(() => ({
  success: '操作已完成',
  warning: '请留意当前提示',
  info: '最新状态提醒',
  error: '请检查后重试'
}[normalizedType.value]))

let closeTimer = null

function clearCloseTimer() {
  if (closeTimer) {
    window.clearTimeout(closeTimer)
    closeTimer = null
  }
}

function scheduleClose() {
  clearCloseTimer()
  if (!props.message || props.duration <= 0) return
  closeTimer = window.setTimeout(() => {
    emit('close')
  }, props.duration)
}

watch(() => [props.message, props.type, props.duration], scheduleClose, { immediate: true })

onMounted(scheduleClose)
onBeforeUnmount(clearCloseTimer)
</script>

<style scoped>
.feedback-toast-layer {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 14px);
  right: calc(env(safe-area-inset-right, 0px) + 14px);
  z-index: 9999;
  width: min(calc(100vw - 24px), 420px);
  pointer-events: none;
}

.feedback-toast {
  width: 100%;
  padding: 14px 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border-radius: 16px;
  box-shadow: 0 14px 32px rgba(17, 17, 17, 0.18);
  border: 1px solid transparent;
  pointer-events: none;
}

.feedback-toast__icon {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}

.feedback-toast__icon svg {
  width: 22px;
  height: 22px;
}

.feedback-toast__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feedback-toast__title {
  font-size: 14px;
  line-height: 1.45;
  font-weight: 600;
  word-break: break-word;
}

.feedback-toast__caption {
  font-size: 12px;
  line-height: 1.35;
  opacity: 0.88;
}

.feedback-toast.is-error {
  background: linear-gradient(135deg, #df7b62 0%, #cf6756 100%);
  border-color: rgba(255, 247, 245, 0.16);
  color: #fff7f2;
}

.feedback-toast.is-success {
  background: linear-gradient(135deg, #91ad6a 0%, #7f9c59 100%);
  border-color: rgba(250, 255, 247, 0.14);
  color: #fbfff7;
}

.feedback-toast.is-warning {
  background: linear-gradient(135deg, #e5a85e 0%, #d59448 100%);
  border-color: rgba(255, 249, 242, 0.16);
  color: #fff9f1;
}

.feedback-toast.is-info {
  background: linear-gradient(135deg, #c28a61 0%, #b1764d 100%);
  border-color: rgba(255, 248, 243, 0.14);
  color: #fff8f3;
}

.feedback-toast-fade-enter-active,
.feedback-toast-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.feedback-toast-fade-enter-from,
.feedback-toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 640px) {
  .feedback-toast-layer {
    top: calc(env(safe-area-inset-top, 0px) + 10px);
    width: calc(100vw - 20px);
    right: 10px;
  }
}
</style>

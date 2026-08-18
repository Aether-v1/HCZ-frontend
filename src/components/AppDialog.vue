<template>
  <transition name="dialog-fade">
    <div v-if="visible" class="app-dialog-mask" @click.self="handleMaskClose">
      <div class="app-dialog-card card stack-md" :class="[`app-dialog-card--${variant}`]">
        <div class="section-head app-dialog-head">
          <h3>{{ title }}</h3>
          <button v-if="closable" class="icon-btn app-dialog-close" type="button" aria-label="关闭" @click="$emit('close')">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <div v-if="$slots.default" class="app-dialog-body">
          <slot />
        </div>
        <p v-else-if="message" class="muted app-dialog-message">{{ message }}</p>

        <div v-if="showInput" class="stack-xs">
          <label v-if="inputLabel">{{ inputLabel }}</label>
          <textarea
            v-if="inputType === 'textarea'"
            :value="inputValue"
            :placeholder="inputPlaceholder"
            :disabled="confirmLoading"
            :rows="inputRows"
            @input="$emit('update:inputValue', $event.target.value)"
          ></textarea>
          <input
            v-else
            :value="inputValue"
            :type="inputType"
            :placeholder="inputPlaceholder"
            :disabled="confirmLoading"
            :maxlength="inputMaxlength"
            :min="inputMin"
            :max="inputMax"
            :step="inputStep"
            @input="$emit('update:inputValue', $event.target.value)"
            @keyup.enter="$emit('confirm')"
          />
          <p v-if="inputError" class="app-dialog-input-error">{{ inputError }}</p>
        </div>

        <div class="app-dialog-actions">
          <button v-if="showCancel" class="ghost-btn" type="button" :disabled="confirmLoading" @click="$emit('close')">{{ cancelText }}</button>
          <button class="primary-btn" type="button" :disabled="confirmDisabled || confirmLoading" @click="$emit('confirm')">
            {{ confirmLoading ? loadingText : confirmText }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineOptions({ name: 'AppDialog' })

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '提示' },
  message: { type: String, default: '' },
  variant: { type: String, default: 'default' },
  closable: { type: Boolean, default: true },
  showCancel: { type: Boolean, default: true },
  confirmText: { type: String, default: '确认' },
  cancelText: { type: String, default: '取消' },
  loadingText: { type: String, default: '处理中...' },
  confirmLoading: { type: Boolean, default: false },
  confirmDisabled: { type: Boolean, default: false },
  closeOnMask: { type: Boolean, default: true },
  showInput: { type: Boolean, default: false },
  inputLabel: { type: String, default: '' },
  inputValue: { type: String, default: '' },
  inputPlaceholder: { type: String, default: '' },
  inputType: { type: String, default: 'text' },
  inputRows: { type: Number, default: 4 },
  inputError: { type: String, default: '' },
  inputMaxlength: { type: [Number, String], default: undefined },
  inputMin: { type: [Number, String], default: undefined },
  inputMax: { type: [Number, String], default: undefined },
  inputStep: { type: [Number, String], default: undefined }
})

const emit = defineEmits(['close', 'confirm', 'update:inputValue'])

function handleMaskClose() {
  if (!props.closeOnMask || props.confirmLoading) return
  emit('close')
}
</script>

<style scoped>
.app-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(3, 8, 20, 0.54);
  backdrop-filter: blur(14px);
}

.app-dialog-card {
  width: min(100%, 420px);
  border-radius: 28px;
  box-shadow: var(--shadow);
  background: linear-gradient(180deg, color-mix(in srgb, var(--panel-strong) 96%, transparent), color-mix(in srgb, var(--panel) 98%, transparent));
}

.app-dialog-card--danger {
  border-color: color-mix(in srgb, var(--danger) 36%, var(--border));
}

.app-dialog-head {
  align-items: center;
}

.app-dialog-head h3 {
  font-size: 20px;
}

.app-dialog-close {
  width: 36px;
  height: 36px;
}

.app-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.app-dialog-message {
  margin: 0;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.app-dialog-input-error {
  margin: 0;
  color: var(--danger, #dc2626);
  font-size: 13px;
  line-height: 1.5;
}

.app-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity .18s ease;
}

.dialog-fade-enter-active .app-dialog-card,
.dialog-fade-leave-active .app-dialog-card {
  transition: transform .18s ease, opacity .18s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .app-dialog-card,
.dialog-fade-leave-to .app-dialog-card {
  transform: translateY(10px) scale(.985);
  opacity: 0;
}

[data-theme="light"] .app-dialog-mask {
  background: rgba(148, 163, 184, 0.24);
}

[data-theme="light"] .app-dialog-card {
  background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,250,255,.98));
}
</style>

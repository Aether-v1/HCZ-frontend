<template>
  <FeedbackToast
    v-if="toastState.visible && toastState.message"
    :type="toastState.type"
    :message="toastState.message"
    :duration="toastState.duration"
    @close="closeMessage()"
  />

  <AppDialog
    :visible="dialogState.visible"
    :title="dialogState.title"
    :message="dialogState.message"
    :variant="dialogState.variant"
    :closable="dialogState.closable"
    :show-cancel="dialogState.showCancel"
    :confirm-text="dialogState.confirmText"
    :cancel-text="dialogState.cancelText"
    :loading-text="dialogState.loadingText"
    :confirm-loading="dialogState.confirmLoading"
    :confirm-disabled="dialogState.confirmDisabled"
    :close-on-mask="dialogState.closeOnMask"
    :show-input="dialogState.showInput"
    :input-label="dialogState.inputLabel"
    :input-value="dialogState.inputValue"
    :input-placeholder="dialogState.inputPlaceholder"
    :input-type="dialogState.inputType"
    :input-rows="dialogState.inputRows"
    :input-error="dialogState.inputError"
    :input-maxlength="dialogState.inputMaxlength"
    :input-min="dialogState.inputMin"
    :input-max="dialogState.inputMax"
    :input-step="dialogState.inputStep"
    @close="cancelUiDialog()"
    @confirm="confirmUiDialog()"
    @update:inputValue="updateUiDialogValue"
  />
</template>

<script setup>
import AppDialog from './AppDialog.vue'
import FeedbackToast from './FeedbackToast.vue'
import {
  cancelUiDialog,
  closeMessage,
  confirmUiDialog,
  dialogState,
  toastState,
  updateUiDialogValue
} from '../utils/ui'
</script>

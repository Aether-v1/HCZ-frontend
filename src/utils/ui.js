import { reactive } from 'vue'

export const toastState = reactive({
  visible: false,
  type: 'info',
  message: '',
  duration: 2600
})

export const dialogState = reactive({
  visible: false,
  mode: 'confirm',
  title: '提示',
  message: '',
  variant: 'default',
  closable: true,
  showCancel: true,
  confirmText: '确认',
  cancelText: '取消',
  loadingText: '处理中...',
  confirmLoading: false,
  confirmDisabled: false,
  closeOnMask: true,
  showInput: false,
  inputLabel: '',
  inputValue: '',
  inputPlaceholder: '',
  inputType: 'text',
  inputRows: 4,
  inputError: '',
  inputMaxlength: undefined,
  inputMin: undefined,
  inputMax: undefined,
  inputStep: undefined
})

let resolveDialog = null
let promptValidator = null

function closeDialog(result) {
  dialogState.visible = false
  dialogState.confirmLoading = false
  dialogState.inputError = ''
  promptValidator = null
  if (resolveDialog) {
    const resolver = resolveDialog
    resolveDialog = null
    resolver(result)
  }
}

function normalizeMessage(input) {
  if (typeof input === 'string') {
    return { message: input }
  }
  return input || {}
}

export function showMessage(input) {
  const options = normalizeMessage(input)
  toastState.type = options.type || 'info'
  toastState.message = String(options.message || '').trim()
  toastState.duration = Number(options.duration || 2600)
  toastState.visible = Boolean(toastState.message)
}

export function closeMessage() {
  toastState.visible = false
}

export function showConfirm(input) {
  if (resolveDialog) closeDialog(false)
  const options = normalizeMessage(input)
  dialogState.mode = 'confirm'
  dialogState.title = options.title || '操作确认'
  dialogState.message = options.message || ''
  dialogState.variant = options.variant || 'default'
  dialogState.closable = options.closable !== false
  dialogState.showCancel = options.showCancel !== false
  dialogState.confirmText = options.confirmText || '确认'
  dialogState.cancelText = options.cancelText || '取消'
  dialogState.loadingText = options.loadingText || '处理中...'
  dialogState.confirmLoading = false
  dialogState.confirmDisabled = false
  dialogState.closeOnMask = options.closeOnMask !== false
  dialogState.showInput = false
  dialogState.inputLabel = ''
  dialogState.inputValue = ''
  dialogState.inputPlaceholder = ''
  dialogState.inputType = 'text'
  dialogState.inputRows = 4
  dialogState.inputError = ''
  dialogState.inputMaxlength = undefined
  dialogState.inputMin = undefined
  dialogState.inputMax = undefined
  dialogState.inputStep = undefined
  dialogState.visible = true
  promptValidator = null

  return new Promise((resolve) => {
    resolveDialog = resolve
  })
}

export function showPrompt(input) {
  if (resolveDialog) closeDialog(null)
  const options = normalizeMessage(input)
  dialogState.mode = 'prompt'
  dialogState.title = options.title || '请输入'
  dialogState.message = options.message || ''
  dialogState.variant = options.variant || 'default'
  dialogState.closable = options.closable !== false
  dialogState.showCancel = options.showCancel !== false
  dialogState.confirmText = options.confirmText || '确认'
  dialogState.cancelText = options.cancelText || '取消'
  dialogState.loadingText = options.loadingText || '处理中...'
  dialogState.confirmLoading = false
  dialogState.confirmDisabled = false
  dialogState.closeOnMask = options.closeOnMask !== false
  dialogState.showInput = true
  dialogState.inputLabel = options.inputLabel || ''
  dialogState.inputValue = String(options.defaultValue ?? '')
  dialogState.inputPlaceholder = options.placeholder || ''
  dialogState.inputType = options.inputType || 'text'
  dialogState.inputRows = Number(options.inputRows || 4)
  dialogState.inputError = ''
  dialogState.inputMaxlength = options.maxlength
  dialogState.inputMin = options.min
  dialogState.inputMax = options.max
  dialogState.inputStep = options.step
  dialogState.visible = true
  promptValidator = typeof options.validate === 'function' ? options.validate : null

  return new Promise((resolve) => {
    resolveDialog = resolve
  })
}

export const showInputDialog = showPrompt

export function cancelUiDialog() {
  closeDialog(dialogState.mode === 'prompt' ? null : false)
}

export function updateUiDialogValue(value) {
  dialogState.inputValue = value
  if (dialogState.inputError) dialogState.inputError = ''
}

export async function confirmUiDialog() {
  if (!dialogState.showInput) {
    closeDialog(true)
    return
  }

  const value = String(dialogState.inputValue ?? '')
  if (promptValidator) {
    const result = await promptValidator(value)
    if (result !== true) {
      dialogState.inputError = typeof result === 'string' && result ? result : '输入内容校验失败'
      return
    }
  }

  closeDialog(value)
}

export function installNativeDialogGuards() {
  if (typeof window === 'undefined') return

  window.alert = function guardedAlert(message = '') {
    console.error('[ui-guard] 请使用 showMessage()，不要再调用原生 alert().')
    showMessage({ type: 'warning', message: String(message || '').trim() || '触发了受限制的原生 alert()' })
  }

  window.confirm = function guardedConfirm(message = '') {
    console.error('[ui-guard] 请使用 showConfirm()，不要再调用原生 confirm().')
    showMessage({ type: 'warning', message: String(message || '').trim() || '触发了受限制的原生 confirm()' })
    return false
  }

  window.prompt = function guardedPrompt(message = '') {
    console.error('[ui-guard] 请使用 showPrompt()，不要再调用原生 prompt().')
    showMessage({ type: 'warning', message: String(message || '').trim() || '触发了受限制的原生 prompt()' })
    return null
  }
}

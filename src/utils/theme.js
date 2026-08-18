const THEME_KEY = 'tp8_theme_mode'

export function getStoredThemeMode() {
  if (typeof window === 'undefined') return 'system'
  return window.localStorage.getItem(THEME_KEY) || 'system'
}

export function getSystemTheme() {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function resolveTheme(mode) {
  return mode === 'system' ? getSystemTheme() : mode
}

export function applyTheme(mode = 'system') {
  if (typeof document === 'undefined') return resolveTheme(mode)
  const resolved = resolveTheme(mode)
  document.documentElement.dataset.themeMode = mode
  document.documentElement.dataset.theme = resolved
  return resolved
}

export function persistThemeMode(mode = 'system') {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(THEME_KEY, mode)
}

export function bindSystemThemeListener(callback) {
  if (typeof window === 'undefined') return () => {}
  const media = window.matchMedia('(prefers-color-scheme: light)')
  const handler = () => callback(media.matches ? 'light' : 'dark')
  if (media.addEventListener) {
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }
  media.addListener(handler)
  return () => media.removeListener(handler)
}

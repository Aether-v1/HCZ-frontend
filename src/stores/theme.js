import { defineStore } from 'pinia'
import { applyTheme, bindSystemThemeListener, getStoredThemeMode, persistThemeMode, resolveTheme } from '../utils/theme'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: getStoredThemeMode(),
    activeTheme: resolveTheme(getStoredThemeMode()),
    unbind: null
  }),
  getters: {
    isDark: (state) => state.activeTheme === 'dark'
  },
  actions: {
    init() {
      this.activeTheme = applyTheme(this.mode)
      if (!this.unbind) {
        this.unbind = bindSystemThemeListener(() => {
          if (this.mode === 'system') {
            this.activeTheme = applyTheme(this.mode)
          }
        })
      }
    },
    setMode(mode) {
      this.mode = mode
      persistThemeMode(mode)
      this.activeTheme = applyTheme(mode)
    },
    cycleMode() {
      const order = ['system', 'dark', 'light']
      const next = order[(order.indexOf(this.mode) + 1) % order.length]
      this.setMode(next)
    }
  }
})

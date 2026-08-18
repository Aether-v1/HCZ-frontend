import { defineStore } from 'pinia'
import { apiSiteSubstationContext } from '../api/site'
import { emptySiteContext, getCachedSiteContext, normalizeSiteContext, setCachedSiteContext } from '../utils/siteContext'

export const useSiteStore = defineStore('site', {
  state: () => ({
    ...emptySiteContext(),
    bootstrapChecked: false,
    loading: false
  }),
  getters: {
    displaySiteName: (state) => state.site_name || '汇充站',
    displayNotice: (state) => state.notice || '',
    displayLogo: (state) => state.logo || ''
  },
  actions: {
    applyContext(payload = {}) {
      const normalized = normalizeSiteContext(payload)
      Object.assign(this, normalized)
      return normalized
    },
    hydrateFromCache() {
      return this.applyContext(getCachedSiteContext())
    },
    async bootstrapContext(force = false) {
      if (this.loading) return this
      if (this.bootstrapChecked && !force) return this

      this.hydrateFromCache()
      this.loading = true

      try {
        const res = await apiSiteSubstationContext()
        const payload = res?.data || res || {}
        const normalized = setCachedSiteContext(payload)
        this.applyContext(normalized)
        return normalized
      } catch {
        this.hydrateFromCache()
        return this
      } finally {
        this.loading = false
        this.bootstrapChecked = true
      }
    }
  }
})
import { defineStore } from 'pinia'
import { apiAuthLogin, apiAuthLogout, apiAuthRegister, apiAuthTwofaRecover } from '../api/auth'
import { apiAccountTelegramBindingStatus } from '../api/account'
import { clearStoredCsrfToken, ensureCsrfToken } from '../api/http'
import { getUserBootstrap } from '../api/user'
import { clearSessionStorage, clearUserSession, removeSessionCache, setUserSession } from '../utils/storage'
import { formatMoney } from '../utils/format'

const USER_BOOTSTRAP_CACHE_KEY = 'tp8-user-bootstrap-v2'
let bootstrapSessionPromise = null

function clearFinanceCaches() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem('tp8-user-bootstrap-v2')
  sessionStorage.removeItem('tp8-wallet-address-direct')
  sessionStorage.removeItem('tp8-bank-card-direct')
  sessionStorage.removeItem('tp8-finance-summary-direct-v3')
  sessionStorage.removeItem('wallet-details-summary:v2')
  sessionStorage.removeItem('wallet-details-summary:v3')
  const keys = []
  for (let index = 0; index < sessionStorage.length; index += 1) {
    const key = sessionStorage.key(index)
    if (key) keys.push(key)
  }
  keys.forEach((key) => {
    if (key.startsWith('wallet-detail-list:')) sessionStorage.removeItem(key)
  })
  for (let currentPage = 1; currentPage <= 20; currentPage += 1) {
    sessionStorage.removeItem(`tp8-finance-orders-direct-recharge-${currentPage}`)
    sessionStorage.removeItem(`tp8-finance-orders-direct-withdraw-${currentPage}`)
  }
}

function mergeProfile(current = {}, next = {}) {
  return {
    id: next.id ?? current.id ?? '',
    username: next.username ?? current.username ?? '',
    mobile: next.mobile ?? current.mobile ?? '',
    avatar: next.avatar ?? current.avatar ?? '',
    nickname: next.nickname ?? current.nickname ?? '',
    surname: next.surname ?? current.surname ?? '',
    city: next.city ?? current.city ?? '',
    birthday: next.birthday ?? current.birthday ?? '',
    gender: next.gender ?? current.gender ?? 0,
    trc20: next.trc20 ?? current.trc20 ?? '',
    province: next.province ?? current.province ?? '',
    city_name: next.city_name ?? current.city_name ?? '',
    district: next.district ?? current.district ?? ''
  }
}

function normalizeBootstrapPayload(payload = {}) {
  const financeSummary = payload.financeSummary || payload.accountSummary || {}
  const walletAddress = payload.walletAddress || payload.accountBindings?.wallet_address || {}
  const bankCard = payload.bankCard || payload.accountBindings?.bank_card || {}
  const telegramBinding = payload.accountBindings?.telegram || {}
  const twofaBinding = payload.accountBindings?.twofa || {}
  const profile = payload.profile || {}
  const sessionId = payload.id ?? payload.uid ?? profile.id ?? profile.uid ?? ''
  const sessionUsername = payload.username ?? profile.username ?? profile.mobile ?? ''
  const sessionMobile = payload.mobile ?? profile.mobile ?? ''

  return {
    loggedIn: true,
    id: sessionId,
    uid: sessionId,
    username: sessionUsername,
    mobile: sessionMobile,
    profile,
    inviteInfo: payload.inviteInfo || {},
    siteInfo: payload.siteInfo || {},
    accountSummary: {
      ...(payload.accountSummary || {}),
      available: financeSummary.available ?? payload.accountSummary?.available ?? payload.accountSummary?.balance ?? '0.00',
      balance: financeSummary.balance ?? payload.accountSummary?.balance ?? '0.00',
      frozen_amount: financeSummary.frozen_amount ?? payload.accountSummary?.frozen_amount ?? '0.00'
    },
    financeSummary,
    walletAddress,
    bankCard,
    accountBindings: {
      telegram: telegramBinding,
      twofa: twofaBinding,
      wallet_address: walletAddress,
      bank_card: bankCard,
      has_wallet_address: Number(payload.accountBindings?.has_wallet_address ?? walletAddress.is_bound ?? 0) || 0,
      has_bank_card: Number(payload.accountBindings?.has_bank_card ?? bankCard.is_bound ?? 0) || 0,
      has_telegram: Number(payload.accountBindings?.has_telegram ?? telegramBinding.is_bound ?? 0) || 0,
      has_twofa: Number(payload.accountBindings?.has_twofa ?? twofaBinding.is_enabled ?? 0) || 0
    }
  }
}

export const useUserStore = defineStore('user', {
  state: () => ({
    session: {},
    loading: false,
    bootstrapDone: false
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.session?.loggedIn),
    id: (state) => state.session?.id || state.session?.uid || state.session?.profile?.id || '',
    mobile: (state) => state.session?.mobile || '',
    username: (state) => state.session?.username || state.session?.profile?.username || '',
    inviteCode: (state) => state.session?.inviteInfo?.invite_code || state.session?.inviteCode || '',
    inviteInfo: (state) => state.session?.inviteInfo || {},
    profile: (state) => state.session?.profile || {},
    accountSummary: (state) => state.session?.accountSummary || {},
    financeSummary: (state) => state.session?.financeSummary || {},
    walletAddress: (state) => state.session?.walletAddress || {},
    bankCard: (state) => state.session?.bankCard || {},
    availableBalance: (state) => formatMoney(state.session?.accountSummary?.available),
    frozenBalance: (state) => formatMoney(state.session?.accountSummary?.frozen_amount)
  },
  actions: {
    setSession(payload = {}) {
      this.session = {
        ...this.session,
        ...payload,
        profile: mergeProfile(this.session?.profile, payload.profile || {}),
        inviteInfo: {
          ...(this.session?.inviteInfo || {}),
          ...(payload.inviteInfo || {})
        },
        accountSummary: {
          ...(this.session?.accountSummary || {}),
          ...(payload.accountSummary || {})
        },
        financeSummary: {
          ...(this.session?.financeSummary || {}),
          ...(payload.financeSummary || {})
        },
        walletAddress: {
          ...(this.session?.walletAddress || {}),
          ...(payload.walletAddress || {})
        },
        bankCard: {
          ...(this.session?.bankCard || {}),
          ...(payload.bankCard || {})
        },
        accountBindings: {
          ...(this.session?.accountBindings || {}),
          ...(payload.accountBindings || {})
        }
      }
      setUserSession(this.session)
    },
    setProfile(profile = {}) {
      this.setSession({ profile })
    },
    setInviteInfo(inviteInfo = {}) {
      this.setSession({ inviteInfo })
    },
    setAccountSummary(summary = {}) {
      this.setSession({ accountSummary: summary })
    },
    setFinanceSummary(summary = {}) {
      this.setSession({
        financeSummary: summary,
        accountSummary: {
          ...(this.accountSummary || {}),
          available: summary.available ?? this.accountSummary?.available,
          balance: summary.balance ?? this.accountSummary?.balance,
          frozen_amount: summary.frozen_amount ?? this.accountSummary?.frozen_amount
        }
      })
    },
    setWalletAddress(walletAddress = {}) {
      this.setSession({
        walletAddress,
        profile: {
          trc20: walletAddress.trc20 ?? walletAddress.address ?? this.profile?.trc20 ?? ''
        },
        accountBindings: {
          has_wallet_address: Number(walletAddress.is_bound ?? walletAddress.status ?? 0) || 0,
          wallet_address: walletAddress
        }
      })
    },
    setBankCard(bankCard = {}) {
      this.setSession({
        bankCard,
        accountBindings: {
          has_bank_card: Number(bankCard.is_bound ?? bankCard.status ?? 0) || 0,
          bank_card: bankCard
        }
      })
    },
    setTelegramBinding(telegramBinding = {}) {
      const normalizedBinding = {
        ...telegramBinding,
        is_bound: Number(telegramBinding.is_bound || 0),
        status_checked: 1,
        tg_user_id: telegramBinding.tg_user_id || '',
        tg_chat_id: telegramBinding.tg_chat_id || '',
        tg_username: telegramBinding.tg_username || '',
        bind_code: telegramBinding.bind_code || '',
        expire_time: telegramBinding.expire_time || '',
        remaining_seconds: Number(telegramBinding.remaining_seconds || 0),
        command_text: telegramBinding.command_text || '',
        instruction: telegramBinding.instruction || ''
      }

      this.setSession({
        accountBindings: {
          telegram: normalizedBinding,
          has_telegram: normalizedBinding.is_bound
        }
      })

      removeSessionCache(USER_BOOTSTRAP_CACHE_KEY)
      return normalizedBinding
    },
    setTwofaBinding(twofaBinding = {}) {
      const normalizedBinding = {
        ...twofaBinding,
        status_checked: 1,
        is_enabled: Number(twofaBinding.is_enabled ?? twofaBinding.twofa_enabled ?? twofaBinding.enabled ?? 0) || 0,
        has_recovery_codes: Number(twofaBinding.has_recovery_codes ?? 0) || 0,
        recovery_code_count: Number(twofaBinding.recovery_code_count ?? 0) || 0
      }

      this.setSession({
        accountBindings: {
          twofa: normalizedBinding,
          has_twofa: normalizedBinding.is_enabled
        }
      })

      removeSessionCache(USER_BOOTSTRAP_CACHE_KEY)
      return normalizedBinding
    },
    clearSession() {
      bootstrapSessionPromise = null
      this.session = {}
      this.bootstrapDone = false
      clearStoredCsrfToken()
      clearUserSession()
      clearSessionStorage()
    },
    applyBootstrapPayload(payload = {}) {
      const normalized = normalizeBootstrapPayload(payload)
      this.setSession(normalized)
      return normalized
    },
    async refreshTelegramBinding() {
      const res = await apiAccountTelegramBindingStatus()
      return this.setTelegramBinding(res.data || {})
    },
    hydrateBootstrapFromCache(maxAge = 45 * 1000) {
      void maxAge
      return null
    },
    async refreshBootstrap(force = false) {
      void force
      const res = await getUserBootstrap()
      const payload = res.data || {}
      return this.applyBootstrapPayload(payload)
    },
    async refreshDirectFinance(force = false) {
      const payload = await this.refreshBootstrap(force)
      return payload.financeSummary || payload.accountSummary || {}
    },
    async loadLegacySnapshot(force = false) {
      return this.refreshBootstrap(force)
    },
    async bootstrapSession(force = false) {
      if (bootstrapSessionPromise && !force) return bootstrapSessionPromise
      if (this.bootstrapDone && !force) return this.session

      const runner = async () => {
        try {
          const payload = await this.refreshBootstrap(true)
          await ensureCsrfToken().catch(() => null)
          return payload
        } catch {
          this.clearSession()
          return null
        } finally {
          this.bootstrapDone = true
        }
      }

      bootstrapSessionPromise = runner().finally(() => {
        bootstrapSessionPromise = null
      })

      return bootstrapSessionPromise
    },
    async loginAction(form) {
      this.loading = true
      try {
        const payload = {
          mobile: String(form.mobile || '').trim(),
          password: form.password
        }
        if (form.twofa_code) payload.twofa_code = String(form.twofa_code).trim()
        if (form.recovery_code) payload.recovery_code = String(form.recovery_code).trim()
        const res = payload.recovery_code
          ? await apiAuthTwofaRecover(payload)
          : await apiAuthLogin(payload)
        this.setSession({
          loggedIn: true,
          mobile: payload.mobile
        })
        this.bootstrapDone = false
        await ensureCsrfToken(true).catch(() => null)
        this.loading = false
        return res
      } catch (error) {
        this.loading = false
        throw error
      }
    },
    async registerAction(form) {
      this.loading = true
      try {
        return await apiAuthRegister({
          mobile: String(form.mobile || '').trim(),
          password: form.password,
          invite_code: String(form.invite_code || '').trim()
        })
      } finally {
        this.loading = false
      }
    },
    async logoutAction() {
      try {
        await apiAuthLogout()
      } catch {
        // ignore
      } finally {
        this.clearSession()
      }
    }
  }
})

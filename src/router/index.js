import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import { useUserStore } from '../stores/user'
import { scheduleWarmCoreTabViewChunks, warmCoreTabViewChunk } from '../utils/coreTabWarmup'

const MainLayout = () => import('../layouts/MainLayout.vue')
const HomeView = () => import('../views/HomeView.vue')
const ProductDetailView = () => import('../views/ProductDetailView.vue')
const OrdersView = () => import('../views/OrdersView.vue')
const OrderDetailView = () => import('../views/OrderDetailView.vue')
const WalletView = () => import('../views/WalletView.vue')
const ProfileView = () => import('../views/ProfileView.vue')
const MembershipCenterView = () => import('../views/MembershipCenterView.vue')
const PointsView = () => import('../views/PointsView.vue')
const PointsExchangeView = () => import('../views/PointsExchangeView.vue')
const MarketView = () => import('../views/MarketView.vue')
const AccountSettingsView = () => import('../views/AccountSettingsView.vue')
const AccountTwofaView = () => import('../views/AccountTwofaView.vue')
const TelegramBindView = () => import('../views/TelegramBindView.vue')
const FinanceCenterView = () => import('../views/FinanceCenterView.vue')
const AccountProfileEditView = () => import('../views/AccountProfileEditView.vue')
const AccountPasswordEditView = () => import('../views/AccountPasswordEditView.vue')
const InviteFriendsView = () => import('../views/InviteFriendsView.vue')
const WalletAddressView = () => import('../views/WalletAddressView.vue')
const BankCardView = () => import('../views/BankCardView.vue')
const ContactServiceView = () => import('../views/ContactServiceView.vue')
const AgentCenterView = () => import('../views/AgentCenterView.vue')
const SubstationCenterView = () => import('../views/SubstationCenterView.vue')
const SubstationProfileView = () => import('../views/SubstationProfileView.vue')
const SubstationProductPriceView = () => import('../views/SubstationProductPriceView.vue')
const SubstationIncomeLogView = () => import('../views/SubstationIncomeLogView.vue')
const WalletDetailsView = () => import('../views/WalletDetailsView.vue')
const WalletDetailListView = () => import('../views/WalletDetailListView.vue')
const OfficialInfoView = () => import('../views/OfficialInfoView.vue')
const MessageDetailView = () => import('../views/MessageDetailView.vue')
const HelpCenterView = () => import('../views/HelpCenterView.vue')
const FinanceRechargeDetailView = () => import('../views/FinanceRechargeDetailView.vue')
const FinanceWithdrawalView = () => import('../views/FinanceWithdrawalView.vue')
const TransactionTradeDetailView = () => import('../views/TransactionTradeDetailView.vue')

let siteStorePromise = null

function getSiteStore() {
  if (!siteStorePromise) {
    siteStorePromise = import('../stores/site').then(({ useSiteStore }) => useSiteStore())
  }

  return siteStorePromise
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/order', redirect: '/orders' },
    { path: '/my', redirect: '/profile' },
    {
      path: '/membership-center',
      component: MainLayout,
      children: [
        { path: '', name: 'membership-center', component: MembershipCenterView, meta: { requiresAuth: true, title: '权益中心', showHeader: true, hideTabBar: true, keepAlive: true } },
      ],
    },
    {
      path: '/',
      component: MainLayout,
      children: [
        { path: '', name: 'home', component: HomeView, meta: { requiresAuth: true, title: '首页', tab: 'home', keepAlive: true } },
        { path: 'product/:id', name: 'product-detail', component: ProductDetailView, meta: { requiresAuth: true, title: '商品详情', showHeader: true, hideTabBar: true, keepAlive: true } },
        { path: 'orders', name: 'orders', component: OrdersView, meta: { requiresAuth: true, title: '订单', tab: 'orders', keepAlive: true } },
        { path: 'orders/:orderNumber', name: 'order-detail', component: OrderDetailView, meta: { requiresAuth: true, title: '订单详情', showHeader: true, hideTabBar: true } },
        { path: 'wallet', name: 'wallet', component: WalletView, meta: { requiresAuth: true, title: '钱包', showHeader: true, hideTabBar: true } },
        { path: 'wallet-details', name: 'wallet-details', component: WalletDetailsView, meta: { requiresAuth: true, title: '余额明细', showHeader: true, hideTabBar: true, keepAlive: true } },
        { path: 'wallet-detail-list', name: 'wallet-detail-list', component: WalletDetailListView, meta: { requiresAuth: true, title: '资金明细', showHeader: true, hideTabBar: true, keepAlive: true } },
        { path: 'profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true, title: '我的', tab: 'profile', keepAlive: true } },
        { path: 'account-settings', name: 'account-settings', component: AccountSettingsView, meta: { requiresAuth: true, title: '个人设置', showHeader: true, hideTabBar: true } },
        { path: 'account-telegram', name: 'account-telegram', component: TelegramBindView, meta: { requiresAuth: true, title: 'TG绑定', showHeader: true, hideTabBar: true } },
        { path: 'account-profile', name: 'account-profile', component: AccountProfileEditView, meta: { requiresAuth: true, title: '个人资料', showHeader: true, hideTabBar: true } },
        { path: 'account-password', name: 'account-password', component: AccountPasswordEditView, meta: { requiresAuth: true, title: '修改密码', showHeader: true, hideTabBar: true } },
        { path: 'finance-center', name: 'finance-center', component: FinanceCenterView, meta: { requiresAuth: true, title: '资金中心', showHeader: true, hideTabBar: true, keepAlive: true } },
        { path: 'finance-recharge/:orderNumber', name: 'finance-recharge-detail', component: FinanceRechargeDetailView, meta: { requiresAuth: true, title: '充值提交', showHeader: true, hideTabBar: true, backMode: 'replace', backTarget: { name: 'finance-center', query: { tab: 'recharge' } } } },
        { path: 'finance-withdrawal', name: 'finance-withdrawal', component: FinanceWithdrawalView, meta: { requiresAuth: true, title: '提现确认', showHeader: true, hideTabBar: true } },
        { path: 'wallet-address', name: 'wallet-address', component: WalletAddressView, meta: { requiresAuth: true, title: '钱包地址', showHeader: true, hideTabBar: true, keepAlive: true } },
        { path: 'bank-card', name: 'bank-card', component: BankCardView, meta: { requiresAuth: true, title: '收款信息', showHeader: true, hideTabBar: true, keepAlive: true } },
        { path: 'points', name: 'points', component: PointsView, meta: { requiresAuth: true, title: '积分中心', showHeader: true, hideTabBar: true, keepAlive: true } },
        { path: 'points-exchange', name: 'points-exchange', component: PointsExchangeView, meta: { requiresAuth: true, title: '积分兑换', showHeader: true, hideTabBar: true, keepAlive: true } },
        { path: 'market', name: 'market', component: MarketView, meta: { requiresAuth: true, title: 'USDT交易区', showHeader: true, hideTabBar: true, keepAlive: true } },
        { path: 'transaction-trading-details/:orderNumber', name: 'transaction-trading-details', component: TransactionTradeDetailView, meta: { requiresAuth: true, title: '交易订单详情', showHeader: true, hideTabBar: true } },
        { path: 'invite-friends', name: 'invite-friends', component: InviteFriendsView, meta: { requiresAuth: true, title: '邀请好友', showHeader: true, hideTabBar: true, keepAlive: true } },
        { path: 'contact-service', name: 'contact-service', component: ContactServiceView, meta: { requiresAuth: true, title: '联系客服', showHeader: true, hideTabBar: true } },
        { path: 'official-info', name: 'official-info', component: OfficialInfoView, meta: { requiresAuth: true, title: '消息通知', showHeader: true, hideTabBar: true } },
        { path: 'official-info/detail/:id', name: 'official-info-detail', component: MessageDetailView, meta: { requiresAuth: true, title: '消息详情', showHeader: true, hideTabBar: true } },
        { path: 'help-center', name: 'help-center', component: HelpCenterView, meta: { title: '帮助中心', hideTabBar: true } },
        { path: 'agent-center', name: 'agent-center', component: AgentCenterView, meta: { requiresAuth: true, title: '代理中心', showHeader: true, hideTabBar: true, keepAlive: true } },
        { path: 'substation-center', name: 'substation-center', component: SubstationCenterView, meta: { requiresAuth: true, title: '分站中心', showHeader: true, hideTabBar: true, keepAlive: true } },
        { path: 'substation-profile', name: 'substation-profile', component: SubstationProfileView, meta: { requiresAuth: true, title: '分站资料', showHeader: true, hideTabBar: true } },
        { path: 'substation-product-price', name: 'substation-product-price', component: SubstationProductPriceView, meta: { requiresAuth: true, title: '档位价格设置', showHeader: true, hideTabBar: true } },
        { path: 'substation-income-log', name: 'substation-income-log', component: SubstationIncomeLogView, meta: { requiresAuth: true, title: '分站收益流水', showHeader: true, hideTabBar: true } }
        ,
        { path: 'account-twofa', name: 'account-twofa', component: AccountTwofaView, meta: { requiresAuth: true, title: '2FA绑定', showHeader: true, hideTabBar: true } },
      ]
    },
    { path: '/login', name: 'login', component: LoginView, meta: { title: '登录' } },
    { path: '/register', name: 'register', component: RegisterView, meta: { title: '注册' } }
  ],
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  }
})

function bootstrapSiteInBackground() {
  void getSiteStore()
    .then((siteStore) => {
      if (siteStore.bootstrapChecked) return null
      return siteStore.bootstrapContext().catch(() => null)
    })
    .catch(() => null)
}

async function bootstrapAuthState() {
  const userStore = useUserStore()
  await userStore.bootstrapSession(true).catch(() => null)
  return userStore
}

router.beforeEach(async (to) => {
  const isAuthPage = to.name === 'login' || to.name === 'register'
  const isHomePage = to.name === 'home'
  const targetTab = String(to.meta?.tab || '')

  if (targetTab) {
    void warmCoreTabViewChunk(targetTab).catch(() => null)
  }

  if (!isHomePage && !isAuthPage) {
    bootstrapSiteInBackground()
  }

  if (!to.meta.requiresAuth && !isAuthPage) {
    return true
  }

  const userStore = await bootstrapAuthState()

  if (isAuthPage) {
    return userStore?.isLoggedIn ? { name: 'home' } : true
  }

  if (!userStore?.isLoggedIn) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  return true
})

router.afterEach((to) => {
  const isAuthPage = to.name === 'login' || to.name === 'register'
  const userStore = useUserStore()
  if (isAuthPage || !userStore.session?.loggedIn) return
  scheduleWarmCoreTabViewChunks({ exclude: String(to.meta?.tab || '') })
})

export default router

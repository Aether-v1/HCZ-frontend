<template>
  <section class="stack-lg wallet-page-clean">
    <div class="wallet-hero-card wallet-hero-compact wallet-balance-hero">
      <div class="wallet-title-copy wallet-title-copy-compact wallet-balance-only">
        <strong class="wallet-balance-figure wallet-balance-figure-large">{{ userStore.availableBalance }}<span class="wallet-unit">U</span></strong>
      </div>
      <div class="wallet-tabs wallet-tabs-compact wallet-tabs-large wallet-entry-button-row wallet-entry-button-single">
        <router-link class="seg-btn wallet-tab-btn" :to="{ name: 'finance-center', query: { tab: 'recharge' } }">充值/提现</router-link>
      </div>
    </div>

    <div class="card stack-md wallet-entry-links wallet-entry-links-wide">
      <router-link to="/wallet-details" class="settings-link-row simple-settings-row settings-box-link finance-center-link">
        <strong>余额明细</strong>
        <span class="settings-link-arrow">›</span>
      </router-link>
      <router-link to="/wallet-address" class="settings-link-row simple-settings-row settings-box-link finance-center-link">
        <strong>钱包地址</strong>
        <span class="settings-link-arrow">›</span>
      </router-link>
      <router-link to="/bank-card" class="settings-link-row simple-settings-row settings-box-link finance-center-link">
        <strong>收款信息</strong>
        <span class="settings-link-arrow">›</span>
      </router-link>
    </div>
  </section>
</template>

<script setup>
import { onActivated, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
const userStore = useUserStore()

onMounted(() => {
  userStore.refreshBootstrap(false).catch(() => null)
})

onActivated(() => {
  userStore.refreshBootstrap(true).catch(() => null)
})
</script>

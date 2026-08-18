<template>
  <span class="app-glyph" :class="variantClass" aria-hidden="true">
    <svg v-if="name === 'market'" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M799.92 306.814v-140.32H225.401v140.32h211.807v91.675c-172.175 7.743-301.825 41.683-301.825 82.404 0 40.722 129.649 74.66 301.825 82.404v294.211h150.906v-294.28c171.511-7.86 300.503-41.738 300.503-82.336 0-40.603-128.992-74.492-300.503-82.342v-91.737H799.92z m23.831 165.789c0 26.782-100.251 49.247-235.637 55.484l-8.749 0.371h-0.967l-8.204 0.302h-0.888c-6.102 0.209-12.278 0.388-18.532 0.529h-0.388l-8.389 0.174h-2.371l-6.62 0.089h-41.923l-6.552-0.089h-2.276l-7.827-0.164h-0.86c-9.277-0.207-18.414-0.493-27.416-0.841h-0.118l-8.962-0.388c-136.061-6.142-236.958-28.685-236.958-55.595 0-26.916 100.914-49.392 236.958-55.602v85.107c23.617 1.231 48.74 1.906 74.796 1.906 26.471 0 52.101-0.686 76.116-1.974v-84.786c135.504 6.221 235.767 28.697 235.767 55.477z" fill="currentColor"/>
    </svg>
    <svg v-else-if="name === 'invite'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.4l6.8 4.2M15.4 6.4 8.6 10.6" />
    </svg>

    <svg v-else-if="name === 'telegram-group'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="9" cy="9" r="2.5" />
      <circle cx="16.5" cy="8" r="2" />
      <path d="M4.5 18a4.5 4.5 0 0 1 9 0" />
      <path d="M14 18a3.5 3.5 0 0 1 6 0" />
      <path d="M18.5 13.5 21 12l-2.5-1.5" />
    </svg>
    <svg v-else-if="name === 'telegram-channel'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 14V6.5a1.5 1.5 0 0 1 2.1-1.4l10.8 4.7a1.5 1.5 0 0 1 0 2.8L6.1 17.3A1.5 1.5 0 0 1 4 15.9V14Z" />
      <path d="M8 17.5 9.6 21H13" />
      <path d="M18 8.5a4.5 4.5 0 0 1 0 7" />
      <path d="M19.7 6.3a7 7 0 0 1 0 11.4" />
    </svg>
    <svg v-else-if="name === 'substation'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 10.5 12 5l9 5.5" />
      <path d="M5 10v8.5h14V10" />
      <path d="M9 18.5V13h6v5.5" />
    </svg>
    <svg v-else-if="name === 'substation-price'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 7h16" />
      <path d="M4 12h10" />
      <path d="M4 17h7" />
      <circle cx="17" cy="12" r="3" />
      <path d="M17 9v6" />
    </svg>
    <svg v-else-if="name === 'substation-income'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 19h16" />
      <path d="M7 15l3-3 3 2 4-5" />
      <path d="M17 9h2v2" />
    </svg>
    <svg v-else-if="name === 'help-center'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 4.5h8.5A2.5 2.5 0 0 1 18 7v12l-4-2-4 2-4-2-4 2V7A2.5 2.5 0 0 1 4.5 4.5H7" />
      <path d="M9.3 9.2a2.6 2.6 0 0 1 5 .9c0 1.5-1.6 2.1-2.2 2.8" />
      <circle cx="12" cy="15.5" r=".75" fill="currentColor" stroke="none" />
    </svg>
    <svg v-else-if="name === 'wallet'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19a2 2 0 0 1 2 2v1H5.5A2.5 2.5 0 0 0 3 10.5z" />
      <path d="M3 10.5A2.5 2.5 0 0 1 5.5 8H21v9a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5z" />
      <circle cx="17" cy="13.5" r="1" />
    </svg>
    <svg v-else-if="name === 'agent'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="3.5" />
      <path d="M21 21v-2a3 3 0 0 0-2.2-2.9" />
      <path d="M15.5 4.2a3.5 3.5 0 0 1 0 5.6" />
    </svg>
    <svg v-else-if="name === 'points'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
      <path d="M17 6h2a2 2 0 0 1 0 4h-2" />
      <path d="M7 6H5a2 2 0 1 0 0 4h2" />
      <path d="M12 13v4" />
      <path d="M9 21h6" />
    </svg>
    <svg v-else-if="name === 'official'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 11.5V6.8a1.8 1.8 0 0 1 2.4-1.7l10.7 4.1a1.8 1.8 0 0 1 0 3.4L6.4 16.7A1.8 1.8 0 0 1 4 15z" />
      <path d="M8 16l1.6 4H13" />
      <path d="M18 8.5a4 4 0 0 1 0 7" />
    </svg>
    <svg v-else-if="name === 'service'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 12a8 8 0 0 1 16 0" />
      <path d="M5 13v3a2 2 0 0 0 2 2h2v-6H7a2 2 0 0 0-2 2z" />
      <path d="M19 13v3a2 2 0 0 1-2 2h-2v-6h2a2 2 0 0 1 2 2z" />
      <path d="M12 19v1" />
    </svg>
    <svg v-else-if="name === 'settings'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a1 1 0 0 1-1 1h-1.7a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a1 1 0 0 1-1-1v-1.7a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4L5 5.9a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V5a1 1 0 0 1 1-1h1.7a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0L20 7.1a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z" />
    </svg>
  </span>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  name: { type: String, required: true },
  variant: { type: String, default: 'blue' }
})
const variantClass = computed(() => `variant-${props.variant}`)
</script>

<style scoped>
.app-glyph {
  width: 44px;
  height: 44px;
  border-radius: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #eef4ff;
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 12px 24px rgba(5, 14, 30, 0.2);
}
.app-glyph svg { width: 22px; height: 22px; }
.variant-blue { background: linear-gradient(135deg, rgba(83,130,255,0.92), rgba(66,211,255,0.92)); }
.variant-purple { background: linear-gradient(135deg, rgba(126,111,255,0.92), rgba(171,117,255,0.92)); }
.variant-green { background: linear-gradient(135deg, rgba(34,197,94,0.92), rgba(16,185,129,0.92)); }
.variant-mint {
  color: #ffffff;
  border-color: rgba(102, 187, 106, 0.34);
  background: linear-gradient(135deg, rgba(149, 235, 176, 0.98), rgba(96, 210, 155, 0.96));
  box-shadow: 0 12px 24px rgba(37, 129, 82, 0.2);
}
.variant-orange { background: linear-gradient(135deg, rgba(251,146,60,0.96), rgba(250,204,21,0.92)); }
.variant-red { background: linear-gradient(135deg, rgba(239,68,68,0.92), rgba(244,114,182,0.92)); }
.variant-cyan { background: linear-gradient(135deg, rgba(6,182,212,0.94), rgba(59,130,246,0.9)); }
.variant-indigo { background: linear-gradient(135deg, rgba(99,102,241,0.94), rgba(79,70,229,0.92)); }

</style>

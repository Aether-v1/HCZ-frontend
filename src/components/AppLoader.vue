<template>
  <div class="app-loader" :class="[`app-loader--${size}`]" aria-label="加载中" role="status">
    <div class="app-loader__spinner"></div>
  </div>
</template>

<script setup>
defineOptions({ name: 'AppLoader' })

defineProps({
  size: {
    type: String,
    default: 'md'
  }
})
</script>

<style scoped>
.app-loader {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.app-loader__spinner {
  border: 4px solid rgba(168, 120, 85, 0.16);
  border-left-color: transparent;
  border-radius: 50%;
  animation: app-loader-spin 1s linear infinite;
  box-sizing: border-box;
}

.app-loader--sm .app-loader__spinner {
  width: 20px;
  height: 20px;
  border-width: 3px;
}

.app-loader--md .app-loader__spinner {
  width: 36px;
  height: 36px;
}

.app-loader--lg .app-loader__spinner {
  width: 48px;
  height: 48px;
  border-width: 5px;
}

:global([data-theme="light"]) .app-loader__spinner {
  border-color: rgba(217, 140, 98, 0.22);
  border-left-color: transparent;
}

:global([data-theme="dark"]) .app-loader__spinner {
  border-color: rgba(241, 179, 131, 0.22);
  border-left-color: transparent;
}

@keyframes app-loader-spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>

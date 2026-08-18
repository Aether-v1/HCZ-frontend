<template>
  <img
    ref="imageRef"
    v-bind="attrs"
    :src="resolvedSrc"
    :alt="alt"
    :loading="eager ? 'eager' : 'lazy'"
    decoding="async"
  />
</template>

<script setup>
defineOptions({ inheritAttrs: false })

import { computed, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue'

const props = defineProps({
  src: {
    type: String,
    default: ''
  },
  alt: {
    type: String,
    default: ''
  },
  eager: {
    type: Boolean,
    default: false
  },
  rootMargin: {
    type: String,
    default: '240px 0px'
  },
  placeholderSrc: {
    type: String,
    default: ''
  }
})

const attrs = useAttrs()
const imageRef = ref(null)
const shouldLoad = ref(false)
let observer = null

const resolvedSrc = computed(() => {
  if (shouldLoad.value) return props.src
  return props.placeholderSrc || undefined
})

function cleanupObserver() {
  if (!observer) return
  observer.disconnect()
  observer = null
}

function markReadyToLoad() {
  shouldLoad.value = true
  cleanupObserver()
}

function observeImage() {
  if (shouldLoad.value || !imageRef.value) return

  if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
    markReadyToLoad()
    return
  }

  cleanupObserver()
  observer = new window.IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
        markReadyToLoad()
      }
    },
    {
      root: null,
      rootMargin: props.rootMargin,
      threshold: 0.01,
    }
  )
  observer.observe(imageRef.value)
}

watch(
  () => [props.src, props.eager],
  ([src, eager]) => {
    if (!src) return
    if (eager) {
      markReadyToLoad()
      return
    }
    if (!shouldLoad.value) {
      observeImage()
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (!props.src) return
  if (props.eager) {
    markReadyToLoad()
    return
  }
  observeImage()
})

onBeforeUnmount(() => {
  cleanupObserver()
})
</script>
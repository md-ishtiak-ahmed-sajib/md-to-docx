<template>
  <div class="w-full md:w-1/2 p-2 bg-white">
    <div class="w-full max-w-full h-full p-4 border rounded overflow-auto">
      <div
        id="markdown-preview"
        class="prose prose-sm w-full max-w-full min-h-full p-4"
        :style="previewStyles"
        v-html="htmlContent"
        @click="handlePreviewClick"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from '../composables/useTheme'

const props = defineProps({
  htmlContent: {
    type: String,
    default: ''
  }
})

const { themeConfig } = useTheme()

const handlePreviewClick = (event) => {
  const anchor = event.target instanceof Element ? event.target.closest('a') : null
  if (!anchor?.href) return

  event.preventDefault()
  window.open(anchor.href, '_blank', 'noopener,noreferrer')
}

const previewStyles = computed(() => {
  const theme = themeConfig.value?.theme
  if (!theme) return {}

  return {
    '--theme-heading1': `#${theme.heading1}`,
    '--theme-heading2': `#${theme.heading2}`,
    '--theme-heading3': `#${theme.heading3}`,
    '--theme-heading4': `#${theme.heading4}`,
    '--theme-heading5': `#${theme.heading5}`,
    '--theme-heading6': `#${theme.heading6}`,
    '--theme-link': `#${theme.link}`,
    '--theme-code': `#${theme.code}`,
    '--theme-blockquote': `#${theme.blockquote}`,
    '--theme-del': `#${theme.del}`
  }
})
</script>

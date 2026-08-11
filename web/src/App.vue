<template>
  <div class="flex flex-col h-screen max-w-full">
    <AppHeader
      @upload="handleUpload"
      @download="showExportModal = true"
      @select-template="handleSelectTemplate"
      @syntax-help="showCompatibilityModal = true"
      @about="showAboutModal = true"
    />

    <!-- Local processing notice -->
    <div class="text-center py-2 bg-green-50 text-sm">
      <p>
        <span class="text-green-600 font-medium">🔒 Nothing is uploaded, all processing happens locally.</span>
      </p>
    </div>

    <div
      v-if="compatibilityDiagnostics.length > 0"
      id="compatibility-banner"
      class="flex items-center justify-center gap-3 px-4 py-2 text-center text-sm"
      :class="hasRemainingCompatibilitySyntax ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700'"
      role="status"
    >
      <span>{{ compatibilityBannerText }}</span>
      <button class="font-semibold underline" @click="showCompatibilityModal = true">View details</button>
    </div>

    <!-- Main content - split view -->
    <div class="flex flex-col md:flex-row flex-1 overflow-hidden">
      <MarkdownEditor
        v-model="markdownContent"
        @clear="clearMarkdown"
      />
      <MarkdownPreview :html-content="htmlContent" />
    </div>

    <ExportModal
      v-model="showExportModal"
      @export="handleExport"
    />
    <CompatibilityModal
      v-model="showCompatibilityModal"
      :diagnostics="compatibilityDiagnostics"
    />
    <AboutModal v-model="showAboutModal" />
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import AppHeader from './components/AppHeader.vue'
import MarkdownEditor from './components/MarkdownEditor.vue'
import MarkdownPreview from './components/MarkdownPreview.vue'
import ExportModal from './components/ExportModal.vue'
import CompatibilityModal from './components/CompatibilityModal.vue'
import AboutModal from './components/AboutModal.vue'
import { useMarkdown } from './composables/useMarkdown'
import { useTheme } from './composables/useTheme'
import markdownDocx, { Packer } from 'markdown-docx'
import initMarkdown from './assets/templates/template.md?raw'

const {
  markdownContent,
  renderMarkdown,
  compatibilityDiagnostics,
  compatibilitySummary,
  htmlContent,
  setMarkdown,
  clearMarkdown,
} = useMarkdown()
const { getThemeConfig } = useTheme()
const showExportModal = ref(false)
const showCompatibilityModal = ref(false)
const showAboutModal = ref(false)
const remainingDiagnostics = computed(() => compatibilityDiagnostics.value.filter((diagnostic) => (
  diagnostic.severity === 'warning'
  || ['compatibility', 'dialect', 'fallback', 'malformed'].includes(diagnostic.category)
)))
const hasRemainingCompatibilitySyntax = computed(() => remainingDiagnostics.value.length > 0)
const compatibilityBannerText = computed(() => {
  const summary = compatibilitySummary.value
  const parts = []

  if (summary.citationsRemoved) {
    parts.push(`${summary.citationsRemoved} private AI ${summary.citationsRemoved === 1 ? 'citation' : 'citations'} removed`)
  }
  if (summary.chartsConverted) {
    parts.push(`${summary.chartsConverted} embedded AI ${summary.chartsConverted === 1 ? 'chart' : 'charts'} converted to ${summary.chartsConverted === 1 ? 'a table' : 'tables'}`)
  }
  if (summary.unknownEnvelopesReplaced) {
    parts.push(`${summary.unknownEnvelopesReplaced} unsupported ${summary.unknownEnvelopesReplaced === 1 ? 'embed' : 'embeds'} replaced`)
  }

  const remainingCount = remainingDiagnostics.value.length
  if (remainingCount) parts.push(`${remainingCount} compatibility ${remainingCount === 1 ? 'notice' : 'notices'}`)

  return `${parts.join('; ')}. Editor source is unchanged.`
})

onMounted(() => {
  // Initialize the default content.
  setMarkdown(initMarkdown)
})

const handleUpload = (content) => {
  setMarkdown(content)
}

const handleSelectTemplate = (template) => {
  setMarkdown(template)
}

const handleExport = async (options) => {
  const selectedTheme = getThemeConfig(options.theme)

  const exportOptions = {
    name: options.name,
    document: {
      title: options.title,
      description: options.description,
    },
    ignoreImage: options.ignoreImage,
    ignoreFootnote: options.ignoreFootnote,
    ignoreHtml: options.ignoreHtml,
    theme: {
      ...selectedTheme?.theme,
      ...(options.margin ? { margin: options.margin } : {}),
    },
  }

  try {
    const buffer = await markdownDocx(renderMarkdown.value, exportOptions)
    const blob = await Packer.toBlob(buffer)

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = formatFilename(exportOptions.name)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Export failed:', error)
  }
}

const formatFilename = (name) => {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const dateString = `${month}${day}${hours}${minutes}${seconds}`
  return `${name || 'markdown-docx'}-${dateString}.docx`
}
</script>

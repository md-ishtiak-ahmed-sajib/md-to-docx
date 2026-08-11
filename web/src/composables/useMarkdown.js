import { computed, ref, watch } from 'vue'
import { marked } from 'marked'
import markedKatex from 'marked-katex-extension'
import { debounce } from '../utils/common'
import latexDelimiters from '../extensions/latex-delimiters'
import { processMarkdownCompatibility } from '../utils/markdownCompatibility'

// Configure Marked with KaTeX support.
const katexOptions = {
  throwOnError: false,
  output: 'html'
}

marked.use(markedKatex(katexOptions), latexDelimiters(katexOptions))

export function useMarkdown() {
  const markdownContent = ref('')
  const htmlContent = ref('')
  const compatibilityResult = computed(() => processMarkdownCompatibility(markdownContent.value))
  const renderMarkdown = computed(() => compatibilityResult.value.markdown)
  const compatibilityDiagnostics = computed(() => compatibilityResult.value.diagnostics)
  const compatibilitySummary = computed(() => compatibilityResult.value.summary)

  // Debounce preview updates while typing.
  const updatePreview = debounce(() => {
    htmlContent.value = marked.parse(renderMarkdown.value)
  }, 300)

  // Watch editor content for preview changes.
  watch(markdownContent, () => {
    updatePreview()
  })

  const setMarkdown = (content) => {
    markdownContent.value = content
  }

  const clearMarkdown = () => {
    markdownContent.value = ''
  }

  return {
    markdownContent,
    renderMarkdown,
    compatibilityDiagnostics,
    compatibilitySummary,
    htmlContent,
    setMarkdown,
    clearMarkdown
  }
}

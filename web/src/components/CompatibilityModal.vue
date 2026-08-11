<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      id="syntax-help-modal"
      class="fixed inset-0 z-30 overflow-y-auto"
      aria-labelledby="syntax-help-title"
      role="dialog"
      aria-modal="true"
      @keydown.esc="$emit('update:modelValue', false)"
    >
      <div class="flex min-h-screen items-center justify-center p-4">
        <button
          class="fixed inset-0 bg-gray-700/70"
          aria-label="Close Syntax Help"
          @click="$emit('update:modelValue', false)"
        ></button>

        <section class="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 text-left shadow-xl">
          <header class="flex items-start gap-4 border-b border-gray-200 pb-4">
            <div>
              <h2 id="syntax-help-title" class="text-xl font-semibold text-gray-900">Syntax Help</h2>
              <p class="mt-1 text-sm text-gray-600">
                Preview and DOCX export use the same compatibility result. Your editor source is never rewritten.
              </p>
            </div>
            <button
              id="close-syntax-help"
              class="ml-auto rounded p-1 text-2xl leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Close Syntax Help"
              @click="$emit('update:modelValue', false)"
            >
              &times;
            </button>
          </header>

          <div class="mt-5">
            <h3 class="font-semibold text-gray-900">Detected in this document</h3>
            <p v-if="diagnostics.length === 0" id="no-compatibility-diagnostics" class="mt-2 rounded bg-green-50 p-3 text-sm text-green-800">
              No compatibility issues or automatic normalizations detected.
            </p>
            <ul v-else id="compatibility-diagnostics" class="mt-2 space-y-2">
              <li
                v-for="diagnostic in diagnostics"
                :key="`${diagnostic.code}-${diagnostic.message}`"
                class="rounded border p-3 text-sm"
                :class="diagnostic.severity === 'warning' ? 'border-amber-300 bg-amber-50' : 'border-blue-200 bg-blue-50'"
                :data-diagnostic-code="diagnostic.code"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="rounded px-2 py-0.5 text-xs font-semibold uppercase"
                    :class="diagnostic.severity === 'warning' ? 'bg-amber-200 text-amber-900' : 'bg-blue-200 text-blue-900'"
                  >
                    {{ diagnostic.severity }}
                  </span>
                  <strong class="text-gray-900">{{ diagnostic.message }}</strong>
                  <span class="text-gray-600">Count: {{ diagnostic.count }}</span>
                  <span v-if="diagnostic.lines.length" class="text-gray-600">
                    {{ diagnostic.lines.length === 1 ? 'Line' : 'Lines' }}: {{ diagnostic.lines.join(', ') }}
                  </span>
                </div>
                <p class="mt-1 text-gray-700">{{ diagnostic.outcome }}</p>
              </li>
            </ul>
          </div>

          <div id="compatibility-matrix" class="mt-6 grid gap-4 md:grid-cols-3">
            <section class="rounded border border-green-200 bg-green-50 p-4">
              <h3 class="font-semibold text-green-900">Fully supported</h3>
              <p class="mt-2 text-sm text-green-900">
                CommonMark and GFM text, headings, links, images, lists, tasks, tables, blockquotes, code, autolinks, footnotes, HTML literals, and LaTeX math. Raw HTML receives an output-difference notice.
              </p>
            </section>
            <section class="rounded border border-blue-200 bg-blue-50 p-4">
              <h3 class="font-semibold text-blue-900">Automatically normalized</h3>
              <p class="mt-2 text-sm text-blue-900">
                AI chart widgets become editable tables. Opaque AI citations are removed and reported. Unknown private embeds become neutral placeholders.
              </p>
            </section>
            <section class="rounded border border-amber-200 bg-amber-50 p-4">
              <h3 class="font-semibold text-amber-900">Fallback or unsupported</h3>
              <p class="mt-2 text-sm text-amber-900">
                Diagram fences export as code; GitHub alerts become blockquotes. YAML, definition lists, Pandoc citations, heading attributes, fenced divs, highlights, and caret/tilde super/subscripts remain literal. Raw HTML can differ between preview and DOCX.
              </p>
            </section>
          </div>

          <div class="mt-5 rounded bg-gray-50 p-4 text-sm text-gray-700">
            For usable citations, replace copied <code>turn…search…</code> markers with normal
            <code>[source](https://example.com)</code> links or Markdown footnotes such as <code>[^1]</code>.
          </div>

          <button
            class="mt-5 w-full rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
            @click="$emit('update:modelValue', false)"
          >
            Close
          </button>
        </section>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  diagnostics: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      id="about-modal"
      class="fixed inset-0 z-40 overflow-y-auto"
      aria-labelledby="about-title"
      role="dialog"
      aria-modal="true"
      @keydown.esc="$emit('update:modelValue', false)"
    >
      <div class="flex min-h-screen items-center justify-center p-4">
        <button
          class="fixed inset-0 bg-gray-700/70"
          aria-label="Close About"
          @click="$emit('update:modelValue', false)"
        ></button>

        <section class="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 text-left shadow-xl">
          <header class="flex items-start gap-4 border-b border-gray-200 pb-4">
            <img src="/icon.svg" alt="" class="h-12 w-12" />
            <div>
              <h2 id="about-title" class="text-xl font-semibold text-gray-900">MD to DOCX</h2>
              <p class="mt-1 text-sm text-gray-600">Version {{ appVersion }}</p>
            </div>
            <button
              class="ml-auto rounded p-1 text-2xl leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Close About"
              @click="$emit('update:modelValue', false)"
            >
              &times;
            </button>
          </header>

          <div class="mt-5 space-y-4 text-sm text-gray-700">
            <p>
              MD to DOCX converts Markdown into editable Microsoft Word documents. Conversion runs locally on your device; the app has no accounts, telemetry, advertising, or developer-operated cloud service.
            </p>

            <dl class="grid gap-2 sm:grid-cols-[10rem_1fr]">
              <dt class="font-semibold text-gray-900">Developed by</dt>
              <dd>Md Ishtiak Ahmed Sajib</dd>
              <dt class="font-semibold text-gray-900">Published by</dt>
              <dd>Sajib-Civil-Engineer-BD</dd>
              <dt class="font-semibold text-gray-900">License</dt>
              <dd>MIT License</dd>
              <dt class="font-semibold text-gray-900">Upstream project</dt>
              <dd>markdown-docx by Vace, © 2025</dd>
            </dl>

            <div class="rounded border border-indigo-100 bg-indigo-50 p-4 text-indigo-950">
              This maintained fork preserves the upstream MIT license and clearly attributes the original converter. Modifications and Windows application work are © 2026 Md Ishtiak Ahmed Sajib.
            </div>

            <nav class="grid gap-2 sm:grid-cols-2" aria-label="Legal and support links">
              <a class="legal-link" target="_blank" rel="noopener noreferrer" href="https://github.com/md-ishtiak-ahmed-sajib/md-to-docx">Source code</a>
              <a class="legal-link" target="_blank" rel="noopener noreferrer" href="https://github.com/vace/markdown-docx">Upstream project</a>
              <a class="legal-link" target="_blank" rel="noopener noreferrer" href="https://md-ishtiak-ahmed-sajib.github.io/md-to-docx/privacy.html">Privacy policy</a>
              <a class="legal-link" target="_blank" rel="noopener noreferrer" href="https://md-ishtiak-ahmed-sajib.github.io/md-to-docx/support.html">Support</a>
              <a class="legal-link" target="_blank" rel="noopener noreferrer" href="https://github.com/md-ishtiak-ahmed-sajib/md-to-docx/blob/main/LICENSE">MIT license</a>
              <a class="legal-link" target="_blank" rel="noopener noreferrer" href="/legal/THIRD_PARTY_NOTICES.txt">Third-party notices</a>
            </nav>

            <p>
              Support: <a class="text-indigo-700 underline" href="mailto:ishtiaksajib.duengg@bec.edu.bd">ishtiaksajib.duengg@bec.edu.bd</a>
            </p>
          </div>

          <button
            class="mt-6 w-full rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
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
const appVersion = __APP_VERSION__

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.legal-link {
  border: 1px solid #c7d2fe;
  border-radius: 0.375rem;
  color: #4338ca;
  padding: 0.625rem 0.75rem;
  text-decoration: underline;
}

.legal-link:hover {
  background: #eef2ff;
}
</style>

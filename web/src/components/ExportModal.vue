<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed z-10 inset-0 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          class="fixed inset-0 bg-gray-500/80 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          @click="$emit('update:modelValue', false)"
        ></div>
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div
          class="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6"
        >
          <div>
            <h3 class="text-lg leading-6 font-medium text-gray-900 flex items-center" id="modal-title">
              <span>Export Options</span>
              <span class="text-sm text-gray-500"> (MD to DOCX v{{ appVersion }})</span>
              <button
                class="ml-auto text-gray-400 hover:text-gray-500 focus:outline-none cursor-pointer"
                @click="$emit('update:modelValue', false)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span class="sr-only">Close</span>
              </button>
            </h3>
            <div class="mt-3 text-center sm:mt-5">
              <form class="mt-2">
                <div class="mb-4">
                  <label for="doc-theme" class="block text-sm font-medium text-gray-700 text-left">Theme</label>
                  <select
                    v-model="selectedTheme"
                    id="doc-theme"
                    class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="default">Default</option>
                    <option value="elegant">Elegant</option>
                    <option value="academic">Academic</option>
                    <option value="modern">Modern</option>
                  </select>
                </div>

                <div class="mb-4">
                  <label for="doc-name" class="block text-sm font-medium text-gray-700 text-left">Filename</label>
                  <input
                    v-model="formData.name"
                    type="text"
                    id="doc-name"
                    class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Document Name"
                  />
                </div>

                <div class="mb-4">
                  <label for="doc-title" class="block text-sm font-medium text-gray-700 text-left">Title</label>
                  <input
                    v-model="formData.title"
                    type="text"
                    id="doc-title"
                    class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Document Title"
                  />
                </div>

                <div class="mb-4">
                  <label for="doc-description" class="block text-sm font-medium text-gray-700 text-left">Description</label>
                  <textarea
                    v-model="formData.description"
                    id="doc-description"
                    rows="2"
                    class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Document Description"
                  ></textarea>
                </div>

                <div class="mb-4">
                  <label for="doc-margin" class="block text-sm font-medium text-gray-700 text-left">Page Margin</label>
                  <input
                    v-model="formData.margin"
                    type="text"
                    id="doc-margin"
                    class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g. 2cm or 2cm 1.5cm"
                  />
                </div>

                <div class="mt-4 space-y-2">
                  <div class="flex items-start">
                    <div class="flex items-center h-5">
                      <input
                        v-model="formData.ignoreImage"
                        id="ignore-image"
                        type="checkbox"
                        class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      />
                    </div>
                    <div class="ml-3 text-sm">
                      <label for="ignore-image" class="font-medium text-gray-700">Ignore Images</label>
                    </div>
                  </div>

                  <div class="flex items-start">
                    <div class="flex items-center h-5">
                      <input
                        v-model="formData.ignoreFootnote"
                        id="ignore-footnote"
                        type="checkbox"
                        class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      />
                    </div>
                    <div class="ml-3 text-sm">
                      <label for="ignore-footnote" class="font-medium text-gray-700">Ignore Footnotes</label>
                    </div>
                  </div>

                  <div class="flex items-start">
                    <div class="flex items-center h-5">
                      <input
                        v-model="formData.ignoreHtml"
                        id="ignore-html"
                        type="checkbox"
                        class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      />
                    </div>
                    <div class="ml-3 text-sm">
                      <label for="ignore-html" class="font-medium text-gray-700">Ignore HTML</label>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
          <div class="mt-5 sm:mt-6">
            <button
              type="button"
              @click="handleExport"
              class="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
            >
              Export to DOCX
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useTheme } from '../composables/useTheme'

const appVersion = __APP_VERSION__

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'export'])

const { theme, setTheme } = useTheme()

const selectedTheme = computed({
  get: () => theme.value,
  set: (value) => setTheme(value)
})

const formData = reactive({
  name: '',
  title: '',
  description: '',
  margin: '',
  ignoreImage: false,
  ignoreFootnote: false,
  ignoreHtml: false
})

const handleExport = () => {
  emit('export', { ...formData, theme: theme.value })
  emit('update:modelValue', false)
}
</script>

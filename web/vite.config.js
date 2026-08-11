import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

const rootPackage = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
)

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(rootPackage.version),
  },
  plugins: [
    vue(),
    tailwindcss(),
  ],
})

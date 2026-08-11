import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'

const repositoryDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(repositoryDir, 'pages-dist')
const pages = [
  { source: 'README.md', output: 'index.html', title: 'MD to DOCX' },
  { source: 'PRIVACY.md', output: 'privacy.html', title: 'Privacy Policy - MD to DOCX' },
  { source: 'SUPPORT.md', output: 'support.html', title: 'Support - MD to DOCX' },
  { source: 'LICENSE', output: 'license.html', title: 'MIT License - MD to DOCX' },
]

function layout(title, content) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><meta name="description" content="MD to DOCX project information">
<style>body{font:16px/1.6 system-ui,sans-serif;color:#1f2937;margin:0}main{max-width:920px;margin:auto;padding:32px 20px 64px}a{color:#4338ca}code,pre{background:#f3f4f6}code{padding:.15em .3em}pre{overflow:auto;padding:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #d1d5db;padding:8px;text-align:left}img{max-width:100%}nav{border-bottom:1px solid #e5e7eb;padding:12px 20px}nav a{margin-right:16px}</style></head>
<body><nav><a href="index.html">Home</a><a href="privacy.html">Privacy</a><a href="support.html">Support</a><a href="license.html">License</a></nav><main>${content}</main></body></html>`
}

await rm(outputDir, { force: true, recursive: true })
await mkdir(outputDir, { recursive: true })

for (const page of pages) {
  const source = await readFile(path.join(repositoryDir, page.source), 'utf8')
  const markdown = page.source === 'LICENSE' ? `# MIT License\n\n${source}` : source
  await writeFile(path.join(outputDir, page.output), layout(page.title, marked.parse(markdown)), 'utf8')
}

await Promise.all([
  copyFile(path.join(repositoryDir, 'THIRD_PARTY_NOTICES.txt'), path.join(outputDir, 'THIRD_PARTY_NOTICES.txt')),
  copyFile(path.join(repositoryDir, 'web/public/icon.svg'), path.join(outputDir, 'icon.svg')),
])
await writeFile(path.join(outputDir, '.nojekyll'), '', 'utf8')
console.log(`Built GitHub Pages site in ${outputDir}`)

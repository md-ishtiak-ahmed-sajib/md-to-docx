import { copyFile, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(repositoryDir, 'web/public/legal')
const files = ['LICENSE', 'NOTICE', 'PRIVACY.md', 'SUPPORT.md', 'THIRD_PARTY_NOTICES.txt']

await rm(outputDir, { force: true, recursive: true })
await mkdir(outputDir, { recursive: true })
await Promise.all(files.map((file) => copyFile(path.join(repositoryDir, file), path.join(outputDir, file))))

console.log(`Prepared ${files.length} legal files for the web and desktop bundles.`)

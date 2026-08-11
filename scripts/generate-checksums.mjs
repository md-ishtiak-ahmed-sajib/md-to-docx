import { createHash } from 'node:crypto'
import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const releaseDirectory = path.join(repositoryDirectory, 'release')
const packageVersion = JSON.parse(await readFile(path.join(repositoryDirectory, 'package.json'), 'utf8')).version

const artifacts = [
  path.join(releaseDirectory, 'store', `MD-to-DOCX-${packageVersion}-x64.appx`),
  path.join(releaseDirectory, 'store', `MD-to-DOCX-${packageVersion}-arm64.appx`),
  path.join(releaseDirectory, `MD-to-DOCX-Setup-${packageVersion}-x64.exe`),
]

const lines = []
for (const artifact of artifacts) {
  const artifactStat = await stat(artifact)
  if (!artifactStat.isFile() || artifactStat.size < 1_000_000) {
    throw new Error(`Release artifact is missing or unexpectedly small: ${artifact}`)
  }
  const hash = createHash('sha256').update(await readFile(artifact)).digest('hex')
  lines.push(`${hash}  ${path.relative(releaseDirectory, artifact).replaceAll('\\', '/')}`)
}

const outputPath = path.join(releaseDirectory, 'SHA256SUMS.txt')
await writeFile(outputPath, `${lines.join('\n')}\n`, 'ascii')
console.log(`Generated ${outputPath} for ${artifacts.length} release artifacts.`)

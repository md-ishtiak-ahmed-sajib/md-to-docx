import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadProductionLicenses } from './license-inventory.mjs'

const repositoryDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rootPackage = JSON.parse(await readFile(path.join(repositoryDir, 'package.json'), 'utf8'))
const packages = loadProductionLicenses()
const components = packages.map((item) => {
  const version = item.versions[0]
  return {
    type: 'library',
    name: item.name,
    version,
    licenses: [{ license: { id: item.license } }],
    purl: `pkg:npm/${encodeURIComponent(item.name).replace('%40', '@')}@${version}`,
  }
})
components.push({
  type: 'framework',
  name: 'electron',
  version: '43.3.0',
  licenses: [{ license: { id: 'MIT' } }],
  purl: 'pkg:npm/electron@43.3.0',
})
components.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))

const digest = createHash('sha256').update(JSON.stringify(components)).digest('hex')
const uuid = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`
const bom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  serialNumber: `urn:uuid:${uuid}`,
  version: 1,
  metadata: {
    component: {
      type: 'application',
      name: 'MD to DOCX',
      version: rootPackage.version,
      licenses: [{ license: { id: 'MIT' } }],
    },
  },
  components,
}

const outputDir = path.join(repositoryDir, 'release/metadata')
await mkdir(outputDir, { recursive: true })
await writeFile(path.join(outputDir, 'sbom.cdx.json'), `${JSON.stringify(bom, null, 2)}\n`, 'utf8')
console.log(`Generated CycloneDX SBOM with ${components.length} components.`)

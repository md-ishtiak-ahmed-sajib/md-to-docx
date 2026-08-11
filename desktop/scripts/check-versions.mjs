import { readFile } from 'node:fs/promises'

const rootPackageUrl = new URL('../../package.json', import.meta.url)
const desktopPackageUrl = new URL('../package.json', import.meta.url)

const [rootPackage, desktopPackage] = await Promise.all([
  readFile(rootPackageUrl, 'utf8').then(JSON.parse),
  readFile(desktopPackageUrl, 'utf8').then(JSON.parse),
])

if (rootPackage.version !== desktopPackage.version) {
  throw new Error(
    `Version mismatch: package.json is ${rootPackage.version}, but desktop/package.json is ${desktopPackage.version}.`,
  )
}

console.log(`MD to DOCX package versions match: ${rootPackage.version}`)

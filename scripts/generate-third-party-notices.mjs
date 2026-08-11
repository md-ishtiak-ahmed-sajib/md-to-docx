import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadProductionLicenses } from './license-inventory.mjs'

const repositoryDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = path.join(repositoryDir, 'THIRD_PARTY_NOTICES.txt')
const licenseFilePattern = /^(licen[cs]e|copying|notice)(\..*)?$/i

async function packageLicenseText(packagePath) {
  if (!packagePath) return null
  const entries = await readdir(packagePath, { withFileTypes: true }).catch(() => [])
  const licenseFile = entries
    .filter((entry) => entry.isFile() && licenseFilePattern.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name))[0]
  return licenseFile ? readFile(path.join(packagePath, licenseFile.name), 'utf8') : null
}

function normalizeLicenseText(value) {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim()
}

const packages = loadProductionLicenses()
const sections = [
  'MD to DOCX - Third-Party Notices',
  '================================',
  '',
  'This file is generated from the production dependency graph by',
  '`corepack pnpm run prepare:legal`. Do not edit generated dependency sections by hand.',
  '',
  'The application is based on markdown-docx by Vace. See LICENSE and NOTICE for the',
  'project-level MIT license and copyright attribution.',
  '',
  'The packaged desktop application also contains Electron 43.3.0 and Chromium.',
  'Electron\'s MIT license is installed as LICENSE.electron.txt, and Chromium/component',
  'notices are installed as LICENSES.chromium.html alongside the application executable.',
  '',
]

for (const item of packages) {
  const versions = item.versions.join(', ')
  const licenseText = await packageLicenseText(item.paths?.[0])
  sections.push('-'.repeat(80))
  sections.push(`${item.name}@${versions}`)
  sections.push(`License: ${item.license}`)
  if (item.homepage) sections.push(`Homepage: ${item.homepage}`)
  sections.push('')
  sections.push(licenseText ? normalizeLicenseText(licenseText) : `No license file was found in the installed package. Declared SPDX license: ${item.license}.`)
  sections.push('')
}

await writeFile(outputPath, `${sections.join('\n').trim()}\n`, 'utf8')

console.log(`Generated ${outputPath} for ${packages.length} production packages.`)

import { access, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repositoryDir = path.resolve(desktopDir, '..')
const desktopPackage = JSON.parse(await readFile(path.join(desktopDir, 'package.json'), 'utf8'))
const architectures = process.argv.slice(2)

if (!architectures.length || architectures.some((arch) => !['x64', 'arm64'].includes(arch))) {
  throw new Error('Usage: node smoke-store.mjs <x64|arm64> [x64|arm64]')
}

async function findMakeAppx() {
  const sdkBin = path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Windows Kits/10/bin')
  const entries = await readdir(sdkBin, { withFileTypes: true })
  const versions = entries
    .filter((entry) => entry.isDirectory() && /^\d+\.\d+\.\d+\.\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))

  for (const version of versions) {
    const candidate = path.join(sdkBin, version, 'x64', 'makeappx.exe')
    try {
      await access(candidate)
      return candidate
    } catch {
      // Continue to an older installed SDK.
    }
  }
  throw new Error('makeappx.exe was not found in the Windows SDK.')
}

const makeAppx = await findMakeAppx()

for (const architecture of architectures) {
  const appxPath = path.join(
    repositoryDir,
    'release/store',
    `MD-to-DOCX-${desktopPackage.version}-${architecture}.appx`,
  )
  const packageStat = await stat(appxPath)
  if (packageStat.size < 1_000_000) throw new Error(`${appxPath} is unexpectedly small.`)

  const unpackDir = await mkdtemp(path.join(os.tmpdir(), `md-to-docx-appx-${architecture}-`))
  try {
    const result = spawnSync(makeAppx, ['unpack', '/p', appxPath, '/d', unpackDir, '/o'], {
      encoding: 'utf8',
    })
    if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'MakeAppx unpack failed.')

    const manifest = await readFile(path.join(unpackDir, 'AppxManifest.xml'), 'utf8')
    const expectedValues = [
      'Name="Sajib-Civil-Engineer-BD.md-to-docx"',
      "Publisher='CN=5F94008D-1A8C-4CB5-AB4F-7470ED48FD13'",
      `ProcessorArchitecture="${architecture}"`,
      `Version="${desktopPackage.version}.0"`,
      'Id="MDToDOCX"',
      'Name="Windows.Desktop"',
      'MinVersion="10.0.22000.0"',
      '<Resource Language="en-US"',
      'Name="runFullTrust"',
      '<DisplayName>MD to DOCX</DisplayName>',
      '<PublisherDisplayName>Sajib-Civil-Engineer-BD</PublisherDisplayName>',
    ]
    for (const value of expectedValues) {
      if (!manifest.includes(value)) throw new Error(`AppxManifest.xml is missing ${value}.`)
    }

    await Promise.all([
      access(path.join(unpackDir, 'app', 'MD-to-DOCX.exe')),
      access(path.join(unpackDir, 'app', 'resources', 'app.asar')),
      access(path.join(unpackDir, 'app', 'resources', 'web', 'index.html')),
      access(path.join(unpackDir, 'assets', 'Square44x44Logo.png')),
      access(path.join(unpackDir, 'assets', 'Square150x150Logo.png')),
    ])

    console.log(`Store package smoke check passed: ${appxPath} (${packageStat.size} bytes)`)
  } finally {
    await rm(unpackDir, { force: true, recursive: true })
  }
}

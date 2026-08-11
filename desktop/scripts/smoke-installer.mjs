import { access, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repositoryDir = path.resolve(desktopDir, '..')
const desktopPackage = JSON.parse(await readFile(path.join(desktopDir, 'package.json'), 'utf8'))
const releaseDir = path.join(repositoryDir, 'release')
const installerPath = path.join(
  releaseDir,
  `MD-to-DOCX-Setup-${desktopPackage.version}-x64.exe`,
)
const unpackedDir = path.join(releaseDir, 'win-unpacked')

const requiredPaths = [
  installerPath,
  path.join(releaseDir, '.icon-ico', 'icon.ico'),
  path.join(unpackedDir, 'MD-to-DOCX.exe'),
  path.join(unpackedDir, 'resources', 'app.asar'),
  path.join(unpackedDir, 'resources', 'web', 'index.html'),
]

await Promise.all(requiredPaths.map((requiredPath) => access(requiredPath)))

const installerStat = await stat(installerPath)
if (installerStat.size < 1_000_000) {
  throw new Error(`Installer is unexpectedly small: ${installerStat.size} bytes.`)
}

const executableHeader = await readFile(installerPath).then((buffer) =>
  buffer.subarray(0, 2).toString('ascii'),
)
if (executableHeader !== 'MZ') {
  throw new Error('Installer does not have a valid Windows PE header.')
}

const iconHeader = await readFile(path.join(releaseDir, '.icon-ico', 'icon.ico'))
if (iconHeader.readUInt16LE(0) !== 0 || iconHeader.readUInt16LE(2) !== 1) {
  throw new Error('The existing web app icon was not converted to a valid Windows ICO file.')
}

const indexHtml = await readFile(
  path.join(unpackedDir, 'resources', 'web', 'index.html'),
  'utf8',
)
if (!indexHtml.includes('MD to DOCX')) {
  throw new Error('Packaged web/index.html does not contain the MD to DOCX application title.')
}

console.log(`Installer smoke check passed: ${installerPath} (${installerStat.size} bytes)`)

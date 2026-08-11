const fs = require('node:fs/promises')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { pathToFileURL } = require('node:url')

const SCALE_FACTORS = new Map([
  [100, 1],
  [125, 1.25],
  [150, 1.5],
  [200, 2],
  [400, 4],
])

const ASSETS = [
  { name: 'StoreLogo', width: 50, height: 50 },
  { name: 'Square44x44Logo', width: 44, height: 44 },
  { name: 'Square150x150Logo', width: 150, height: 150 },
  { name: 'Wide310x150Logo', width: 310, height: 150 },
  { name: 'SmallTile', width: 71, height: 71 },
  { name: 'LargeTile', width: 310, height: 310 },
]

async function assetsAreCurrent(outputDir, sourceHash) {
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(outputDir, 'asset-manifest.json'), 'utf8'))
    if (manifest.sourceSha256 !== sourceHash || manifest.generatorVersion !== 1) return false

    for (const asset of ASSETS) {
      const sizes = [[null, 1], ...SCALE_FACTORS]
      for (const [scale, factor] of sizes) {
        const name = scale ? `${asset.name}.scale-${scale}.png` : `${asset.name}.png`
        const png = await fs.readFile(path.join(outputDir, name))
        if (png.readUInt32BE(16) !== Math.round(asset.width * factor)) return false
        if (png.readUInt32BE(20) !== Math.round(asset.height * factor)) return false
      }
    }
    return true
  } catch {
    return false
  }
}

function sourceChildren(svg) {
  const start = svg.indexOf('> ', svg.indexOf('<svg'))
  const normalizedStart = start === -1 ? svg.indexOf('>', svg.indexOf('<svg')) : start + 1
  const end = svg.lastIndexOf('</svg>')
  if (normalizedStart === -1 || end === -1) throw new Error('The source icon is not a valid SVG document.')
  return svg.slice(normalizedStart + (start === -1 ? 1 : 0), end)
}

function composeSvg(children, width, height) {
  const paddedHeight = 1024 / 0.82
  const paddedWidth = paddedHeight * (width / height)
  const viewWidth = Math.max(paddedHeight, paddedWidth)
  const viewHeight = Math.max(paddedHeight, paddedWidth / (width / height))
  const x = (1024 - viewWidth) / 2
  const y = (1024 - viewHeight) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${viewWidth} ${viewHeight}">${children}</svg>`
}

async function findEdge() {
  const candidates = [
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft/Edge/Application/msedge.exe'),
  ]
  for (const candidate of candidates) {
    try {
      await fs.access(candidate)
      return candidate
    } catch {
      // Continue to the next standard installation location.
    }
  }
  throw new Error('Microsoft Edge is required to generate the AppX PNG assets on Windows.')
}

async function writePng(edgePath, userDataDir, outputPath, children, width, height) {
  const renderPath = `${outputPath}.render.svg`
  await fs.writeFile(renderPath, composeSvg(children, width, height), 'utf8')
  const result = spawnSync(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--default-background-color=00000000',
    '--force-device-scale-factor=1',
    `--user-data-dir=${userDataDir}`,
    `--window-size=${width},${height}`,
    `--screenshot=${outputPath}`,
    pathToFileURL(renderPath).href,
  ], { encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(`Edge could not render ${path.basename(outputPath)}: ${result.stderr || result.stdout}`)
  }
  await fs.rm(renderPath, { force: true })

  const png = await fs.readFile(outputPath)
  if (png.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${outputPath} is not a PNG file.`)
  if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== height) {
    throw new Error(`${path.basename(outputPath)} has incorrect dimensions.`)
  }
}

async function generate() {
  const desktopDir = path.resolve(__dirname, '..')
  const repositoryDir = path.resolve(desktopDir, '..')
  const sourceSvg = await fs.readFile(path.join(repositoryDir, 'web/public/icon.svg'), 'utf8')
  const sourceHash = createHash('sha256').update(sourceSvg).digest('hex')
  const children = sourceChildren(sourceSvg)
  const outputDir = path.join(desktopDir, 'build/appx')
  const userDataDir = path.join(outputDir, '.edge-profile')

  await fs.mkdir(outputDir, { recursive: true })
  if (await assetsAreCurrent(outputDir, sourceHash)) {
    console.log(`AppX assets are current in ${outputDir}`)
    return
  }

  const edgePath = await findEdge()

  for (const asset of ASSETS) {
    await writePng(
      edgePath,
      userDataDir,
      path.join(outputDir, `${asset.name}.png`),
      children,
      asset.width,
      asset.height,
    )

    for (const [scale, factor] of SCALE_FACTORS) {
      await writePng(
        edgePath,
        userDataDir,
        path.join(outputDir, `${asset.name}.scale-${scale}.png`),
        children,
        Math.round(asset.width * factor),
        Math.round(asset.height * factor),
      )
    }
  }

  await fs.rm(userDataDir, { force: true, recursive: true })
  await fs.writeFile(
    path.join(outputDir, 'asset-manifest.json'),
    `${JSON.stringify({ generatorVersion: 1, sourceSha256: sourceHash }, null, 2)}\n`,
    'utf8',
  )
  console.log(`Generated ${ASSETS.length * (SCALE_FACTORS.size + 1)} AppX assets in ${outputDir}`)
}

void generate().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

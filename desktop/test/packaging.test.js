import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repositoryDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(repositoryDir, relativePath), 'utf8'))
}

describe('Windows packaging configuration', () => {
  it('pins the supported Electron toolchain and matches the library version', async () => {
    const [rootPackage, desktopPackage] = await Promise.all([
      readJson('package.json'),
      readJson('desktop/package.json'),
    ])

    expect(desktopPackage.version).toBe(rootPackage.version)
    expect(desktopPackage.devDependencies).toMatchObject({
      electron: '43.3.0',
      'electron-builder': '26.15.3',
    })
    expect(rootPackage.scripts['build:installer:win']).toContain('check:versions')
  })

  it('builds a rebranded one-click all-users x64 NSIS installer with standard shortcuts', async () => {
    const desktopPackage = await readJson('desktop/package.json')
    const { build } = desktopPackage

    expect(build.appId).toBe('Sajib-Civil-Engineer-BD.md-to-docx.MDToDOCX')
    expect(build.productName).toBe('MD to DOCX')
    expect(build.executableName).toBe('MD-to-DOCX')
    expect(build.win.target).toEqual([{ target: 'nsis', arch: ['x64'] }])
    expect(build.win.icon).toBe('../web/public/icon.svg')
    expect(build.win.artifactName).toBe('MD-to-DOCX-Setup-${version}-${arch}.${ext}')
    expect(build.nsis).toMatchObject({
      allowElevation: true,
      createDesktopShortcut: 'always',
      createStartMenuShortcut: true,
      oneClick: true,
      perMachine: true,
      runAfterFinish: true,
    })
  })

  it('uses the exact Partner Center identity for x64 and Arm64 Store packages', async () => {
    const desktopPackage = await readJson('desktop/package.json')
    const { appx } = desktopPackage.build

    expect(appx).toMatchObject({
      applicationId: 'MDToDOCX',
      displayName: 'MD to DOCX',
      identityName: 'Sajib-Civil-Engineer-BD.md-to-docx',
      publisher: 'CN=5F94008D-1A8C-4CB5-AB4F-7470ED48FD13',
      publisherDisplayName: 'Sajib-Civil-Engineer-BD',
      minVersion: '10.0.22000.0',
      addAutoLaunchExtension: false,
      capabilities: ['runFullTrust'],
      languages: ['en-US'],
    })
    expect(appx.artifactName).toBe('MD-to-DOCX-${version}-${arch}.${ext}')
    expect(desktopPackage.scripts['dist:store']).toContain('--x64 --arm64')
  })

  it('uses a sandboxed in-app window and quits without a tray process', async () => {
    const mainSource = await readFile(path.join(repositoryDir, 'desktop/src/main.cjs'), 'utf8')

    expect(mainSource).toContain('BrowserWindow')
    expect(mainSource).toContain('nodeIntegration: false')
    expect(mainSource).toContain('contextIsolation: true')
    expect(mainSource).toContain('sandbox: true')
    expect(mainSource).toContain("app.on('window-all-closed', () => app.quit())")
    expect(mainSource).not.toMatch(/\bTray\b/)
    expect(mainSource).not.toContain('openAppInBrowser')
  })

  it('derives the web-visible version from the root package', async () => {
    const [viteConfig, exportModal] = await Promise.all([
      readFile(path.join(repositoryDir, 'web/vite.config.js'), 'utf8'),
      readFile(path.join(repositoryDir, 'web/src/components/ExportModal.vue'), 'utf8'),
    ])

    expect(viteConfig).toContain("new URL('../package.json', import.meta.url)")
    expect(viteConfig).toContain('__APP_VERSION__')
    expect(exportModal).toContain('MD to DOCX v{{ appVersion }}')
    expect(exportModal).not.toContain('MD to DOCX v1.0')
  })

  it('keeps signing secrets out of source and submits through SignPath', async () => {
    const workflow = await readFile(
      path.join(repositoryDir, '.github/workflows/windows-installer-release.yml'),
      'utf8',
    )

    expect(workflow).toContain('signpath/github-action-submit-signing-request@v2')
    expect(workflow).toContain('secrets.SIGNPATH_API_TOKEN')
    expect(workflow).toContain("SignerCertificate.Subject -notmatch 'SignPath Foundation'")
    expect(workflow).toContain("7z x $installer.FullName")
    expect(workflow).toContain("Assert-SignPathSignature -Path $appExecutable.FullName")
    expect(workflow).not.toMatch(/SIGNPATH_API_TOKEN:\s+[^$\s]/)
  })
})

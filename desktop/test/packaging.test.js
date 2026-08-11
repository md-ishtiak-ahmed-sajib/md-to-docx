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

  it('selects the native package architecture for local installation and WACK', async () => {
    const [signingScript, certificationScript] = await Promise.all([
      readFile(path.join(repositoryDir, 'desktop/scripts/test-sign-store.ps1'), 'utf8'),
      readFile(path.join(repositoryDir, 'desktop/scripts/run-wack.ps1'), 'utf8'),
    ])

    for (const script of [signingScript, certificationScript]) {
      expect(script).toContain("[ValidateSet('x64', 'arm64')]")
      expect(script).toContain('$env:PROCESSOR_ARCHITEW6432')
      expect(script).toContain("if ($nativeArchitecture -eq 'ARM64') { return 'arm64' }")
    }

    expect(certificationScript).toContain('$targetArchitecture-local-test.appx')
    expect(certificationScript).toContain('$targetArchitecture.xml')
    expect(certificationScript).not.toContain('-x64-local-test.appx"')
    expect(certificationScript).toContain("[version] '10.0.26100.0'")
    expect(certificationScript).toContain("OVERALL_RESULT -ne 'PASS'")
    expect(certificationScript).toContain("//TEST[@OPTIONAL='TRUE' and RESULT='FAIL']")
    expect(certificationScript).toContain("Get-Date -Format 'yyyyMMdd-HHmmss-fff'")
    expect(certificationScript).toContain('Preserving the existing WACK report.')
  })

  it('uses current Node 24 GitHub Actions runtimes', async () => {
    const workflowNames = [
      'windows-store.yml',
      'windows-installer-release.yml',
      'publish.yml',
      'gh-pages.yml',
    ]
    const workflows = await Promise.all(
      workflowNames.map((name) =>
        readFile(path.join(repositoryDir, '.github/workflows', name), 'utf8'),
      ),
    )
    const workflowSource = workflows.join('\n')

    expect(workflowSource).not.toMatch(/actions\/checkout@v4/)
    expect(workflowSource).not.toMatch(/actions\/setup-node@v4/)
    expect(workflowSource).not.toMatch(/actions\/upload-artifact@v4/)
    expect(workflowSource).not.toMatch(/pnpm\/action-setup@v4/)
    expect(workflowSource).toContain('actions/checkout@v7')
    expect(workflowSource).toContain('actions/setup-node@v7')
    expect(workflowSource).toContain('actions/upload-artifact@v7')
    expect(workflowSource).toContain('pnpm/action-setup@v6')
  })
})

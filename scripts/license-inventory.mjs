import { execFileSync } from 'node:child_process'

export function loadProductionLicenses() {
  const isWindows = process.platform === 'win32'
  const executable = isWindows ? 'cmd.exe' : 'corepack'
  const args = isWindows
    ? ['/d', '/s', '/c', 'corepack pnpm licenses list --prod --json']
    : ['pnpm', 'licenses', 'list', '--prod', '--json']
  const stdout = execFileSync(executable, args, {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  const byLicense = JSON.parse(stdout)

  return Object.entries(byLicense)
    .flatMap(([license, packages]) => packages.map((item) => ({ ...item, license })))
    .sort((a, b) => a.name.localeCompare(b.name) || a.versions.join(',').localeCompare(b.versions.join(',')))
}

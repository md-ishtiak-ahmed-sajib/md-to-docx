import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repositoryDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('public legal and identity files', () => {
  it('preserves upstream MIT attribution and distinguishes fork work', () => {
    const license = readFileSync(path.join(repositoryDir, 'LICENSE'), 'utf8')
    const notice = readFileSync(path.join(repositoryDir, 'NOTICE'), 'utf8')

    expect(license).toContain('Copyright (c) 2025 Vace')
    expect(notice).toContain('Copyright (c) 2025 Vace')
    expect(notice).toContain('Copyright (c) 2026 Md Ishtiak Ahmed Sajib')
    expect(notice).toContain('derived from markdown-docx')
  })

  it('keeps private Partner Center contact details out of public source', () => {
    const publicFiles = [
      'README.md',
      'PRIVACY.md',
      'SUPPORT.md',
      'STORE_SUBMISSION.md',
      'CODE_SIGNING_POLICY.md',
      'desktop/package.json',
      'web/src/components/AboutModal.vue',
    ].map((file) => readFileSync(path.join(repositoryDir, file), 'utf8')).join('\n')

    expect(publicFiles).not.toMatch(/@gmail\.com/i)
    expect(publicFiles).not.toMatch(/\+?880[\s-]?\d{10}/)
    expect(publicFiles).not.toMatch(/(?:seller id|package sid|msa app id)\s*[:=]\s*[a-z0-9-]{8,}/i)
    expect(publicFiles).toContain('ishtiaksajib.duengg@bec.edu.bd')
  })

  it('contains every generated AppX base asset and scale variant', () => {
    const assetDir = path.join(repositoryDir, 'desktop/build/appx')
    const pngs = readdirSync(assetDir).filter((file) => file.endsWith('.png'))

    expect(pngs).toHaveLength(36)
    for (const base of ['StoreLogo', 'Square44x44Logo', 'Square150x150Logo', 'Wide310x150Logo', 'SmallTile', 'LargeTile']) {
      expect(existsSync(path.join(assetDir, `${base}.png`))).toBe(true)
      for (const scale of [100, 125, 150, 200, 400]) {
        expect(existsSync(path.join(assetDir, `${base}.scale-${scale}.png`))).toBe(true)
      }
    }
  })
})

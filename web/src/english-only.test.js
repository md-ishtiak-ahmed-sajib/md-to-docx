import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceRoot = fileURLToPath(new URL('.', import.meta.url))
const webRoot = fileURLToPath(new URL('..', import.meta.url))

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : [path]
  })
}

describe('English-only web application', () => {
  it('contains no bundled Chinese UI or template content', () => {
    const runtimeFiles = sourceFiles(sourceRoot)
      .filter((path) => ['.js', '.vue', '.css', '.md'].includes(extname(path)))
    runtimeFiles.push(join(webRoot, 'index.html'))

    for (const path of runtimeFiles) {
      expect(readFileSync(path, 'utf8'), path).not.toMatch(/\p{Script=Han}/u)
    }

    expect(existsSync(join(sourceRoot, 'composables', 'useI18n.js'))).toBe(false)
    expect(existsSync(join(sourceRoot, 'assets', 'templates', 'zh-template.md'))).toBe(false)
  })

  it('does not retain language switching hooks or bilingual metadata', () => {
    const appSource = sourceFiles(sourceRoot)
      .filter((path) => ['.js', '.vue'].includes(extname(path)) && !path.endsWith('.test.js'))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n')
    const indexHtml = readFileSync(join(webRoot, 'index.html'), 'utf8')

    expect(appSource).not.toMatch(/useI18n|toggleLocale|preferred_language|zh-template/)
    expect(indexHtml).toContain('<html lang="en">')
    expect(indexHtml).not.toContain(' | ')
  })

  it('uses the public fork brand and exposes English legal information', () => {
    const header = readFileSync(join(sourceRoot, 'components', 'AppHeader.vue'), 'utf8')
    const about = readFileSync(join(sourceRoot, 'components', 'AboutModal.vue'), 'utf8')

    expect(header).toContain('MD to DOCX')
    expect(header).toContain('md-ishtiak-ahmed-sajib/md-to-docx')
    expect(about).toContain('Md Ishtiak Ahmed Sajib')
    expect(about).toContain('Sajib-Civil-Engineer-BD')
    expect(about).toContain('THIRD_PARTY_NOTICES.txt')
  })
})

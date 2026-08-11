import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function createStorage() {
  const values = new Map()

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
    removeItem(key) {
      values.delete(key)
    },
  }
}

describe('useTheme', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('localStorage', createStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shares one reactive theme selection and persists it', async () => {
    const { useTheme } = await import('./useTheme.js')
    const headerTheme = useTheme()
    const exportTheme = useTheme()

    headerTheme.setTheme('modern')

    expect(headerTheme.theme.value).toBe('modern')
    expect(exportTheme.theme.value).toBe('modern')
    expect(exportTheme.themeConfig.value.name).toBe('Modern')
    expect(localStorage.getItem('markdown-docx-theme')).toBe('modern')
  })

  it('restores a valid persisted theme after reloading the module', async () => {
    localStorage.setItem('markdown-docx-theme', 'academic')

    const { useTheme } = await import('./useTheme.js')

    expect(useTheme().theme.value).toBe('academic')
    expect(useTheme().themeConfig.value.name).toBe('Academic')
  })

  it('replaces an invalid persisted theme with the default', async () => {
    localStorage.setItem('markdown-docx-theme', 'unknown')

    const { useTheme } = await import('./useTheme.js')

    expect(useTheme().theme.value).toBe('default')
    expect(localStorage.getItem('markdown-docx-theme')).toBe('default')
  })

  it('provides every preview color for each export theme', async () => {
    const { useTheme } = await import('./useTheme.js')
    const { getAllThemes, getThemeConfig } = useTheme()
    const requiredColors = [
      'heading1',
      'heading2',
      'heading3',
      'heading4',
      'heading5',
      'heading6',
      'link',
      'code',
      'blockquote',
      'del',
    ]

    expect(getAllThemes()).toEqual(['default', 'elegant', 'academic', 'modern'])
    for (const themeName of getAllThemes()) {
      expect(getThemeConfig(themeName).theme).toEqual(expect.objectContaining(
        Object.fromEntries(requiredColors.map((key) => [key, expect.stringMatching(/^[0-9A-F]{6}$/)]))
      ))
    }
  })
})

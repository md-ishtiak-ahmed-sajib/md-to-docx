import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GENUI_CLOSE,
  GENUI_OPEN,
  PRIVATE_CLOSE,
  PRIVATE_OPEN,
  PRIVATE_SEPARATOR,
} from '../utils/markdownCompatibility'

afterEach(() => {
  vi.useRealTimers()
})

describe('useMarkdown compatibility flow', () => {
  it('keeps editor source unchanged while previewing the same normalized Markdown used for export', async () => {
    vi.useFakeTimers()
    const { useMarkdown } = await import('./useMarkdown.js')
    const state = useMarkdown()
    const payload = {
      charts_widget_v2: {
        content: {
          meta: { title: 'Language scores' },
          xKey: 'language',
          series: [{ dataKey: 'score', label: 'Score', valueSuffix: '/10' }],
          data: [{ language: 'Python', score: 9.5 }],
        },
      },
    }
    const citation = `${PRIVATE_OPEN}cite${PRIVATE_SEPARATOR}turn1search0${PRIVATE_CLOSE}`
    const source = `Source${citation}\n\n${GENUI_OPEN}${JSON.stringify(payload)}${GENUI_CLOSE}`

    state.setMarkdown(source)

    expect(state.markdownContent.value).toBe(source)
    expect(state.renderMarkdown.value).toContain('| Python | 9.5/10 |')
    expect(state.renderMarkdown.value).not.toContain('charts_widget_v2')
    expect(state.compatibilitySummary.value).toMatchObject({ chartsConverted: 1, citationsRemoved: 1 })
    expect(state.compatibilityDiagnostics.value.map((item) => item.code)).toEqual([
      'private-citation-removed',
      'ai-chart-converted',
    ])

    await vi.advanceTimersByTimeAsync(300)

    expect(state.htmlContent.value).toContain('<table>')
    expect(state.htmlContent.value).toContain('<td>Python</td>')
    expect(state.htmlContent.value).not.toContain('charts_widget_v2')
    expect(state.htmlContent.value).not.toContain('turn1search0')
    expect(state.markdownContent.value).toBe(source)
  })
})

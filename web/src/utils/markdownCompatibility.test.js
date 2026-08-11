import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import markdownToDocx, { Packer } from '../../../src/entry-node'
import {
  GENUI_CLOSE,
  GENUI_OPEN,
  PRIVATE_CLOSE,
  PRIVATE_OPEN,
  PRIVATE_SEPARATOR,
  processMarkdownCompatibility,
} from './markdownCompatibility'

const screenshotChart = {
  charts_widget_v2: {
    content: {
      chartType: 'bar',
      meta: {
        title: 'Best programming languages for structural engineering',
        description: 'Overall weighted score out of 10 for structural calculations and numerical computing.',
        footer: 'Engineering-specific assessment; scores are comparative rather than benchmark measurements.',
      },
      xKey: 'language',
      series: [{ dataKey: 'score', label: 'Overall score', valueSuffix: '/10' }],
      data: [
        { language: 'Python', score: 9.5 },
        { language: 'C++', score: 8.6 },
        { language: 'JavaScript / TypeScript', score: 5.4 },
      ],
    },
  },
}

function envelope(kind, payload) {
  return `${PRIVATE_OPEN}${kind}${PRIVATE_SEPARATOR}${payload}${PRIVATE_CLOSE}`
}

function chartBlock(payload = screenshotChart, spacing = 0) {
  return `${' '.repeat(spacing)}${GENUI_OPEN}${JSON.stringify(payload)}${GENUI_CLOSE}`
}

function diagnostic(result, code) {
  return result.diagnostics.find((item) => item.code === code)
}

describe('Markdown compatibility processing', () => {
  it('removes exact screenshot-style citation sequences and reports original lines', () => {
    const first = envelope('cite', `turn737649search0${PRIVATE_SEPARATOR}turn737649search9${PRIVATE_SEPARATOR}turn737649search13`)
    const second = envelope('cite', `turn737649search11${PRIVATE_SEPARATOR}turn737649search13`)
    const source = `SciPy is relevant to FEM programs.${first}\n\nFor large problems, sparse solvers help.${second}`
    const result = processMarkdownCompatibility(source)

    expect(result.markdown).toBe('SciPy is relevant to FEM programs.\n\nFor large problems, sparse solvers help.')
    expect(result.markdown).not.toMatch(/turn737649|cite|[\uE200-\uE202]/u)
    expect(result.summary.citationsRemoved).toBe(2)
    expect(diagnostic(result, 'private-citation-removed')).toMatchObject({
      severity: 'info',
      count: 2,
      lines: [1, 3],
    })
  })

  it('removes cite and filecite envelopes cleanly in inline and standalone positions', () => {
    const citation = envelope('cite', 'turn1search0')
    const fileCitation = envelope('filecite', 'turn1file0')
    const result = processMarkdownCompatibility(`Alpha ${citation} beta.\n\n${fileCitation}\n\nDone.`)

    expect(result.markdown).toBe('Alpha beta.\n\n\n\nDone.')
    expect(result.summary.citationsRemoved).toBe(2)
    expect(result.diagnostics.filter((item) => item.code === 'private-citation-removed')).toHaveLength(2)
  })

  it('replaces complete unknown envelopes without exposing opaque payloads', () => {
    const source = `Before ${envelope('future-widget', '{"secret":"turn99search1"}')} after.`
    const result = processMarkdownCompatibility(source)

    expect(result.markdown).toBe('Before [Unsupported embedded content: future-widget] after.')
    expect(result.markdown).not.toMatch(/secret|turn99|[\uE200-\uE202]/u)
    expect(result.summary.unknownEnvelopesReplaced).toBe(1)
    expect(diagnostic(result, 'unsupported-private-envelope')).toMatchObject({
      severity: 'warning', count: 1, lines: [1],
    })
  })

  it('preserves malformed and unmatched envelopes with warnings', () => {
    const invalidChart = envelope('genui', '{not-json}')
    const unclosed = `${PRIVATE_OPEN}cite${PRIVATE_SEPARATOR}turn1search0`
    const malformed = `${PRIVATE_OPEN}broken${PRIVATE_CLOSE}`
    const source = `${invalidChart}\n${unclosed}\n${malformed}`
    const result = processMarkdownCompatibility(source)

    expect(result.markdown).toBe(source)
    expect(diagnostic(result, 'malformed-chart-envelope')).toMatchObject({ lines: [1] })
    expect(diagnostic(result, 'malformed-private-envelope')).toMatchObject({ count: 2, lines: [2, 3] })
  })

  it('does not touch escaped markers or markers in inline, fenced, or indented code', () => {
    const citation = envelope('cite', 'turn1search0')
    const source = `\\${citation}\n\n\`${citation}\`\n\n\`\`\`text\n${citation}\n\`\`\`\n\n    ${citation}`
    const result = processMarkdownCompatibility(source)

    expect(result.markdown).toBe(source)
    expect(result.summary.citationsRemoved).toBe(0)
    expect(result.diagnostics).toEqual([])
  })

  it('converts standalone AI charts to editable tables and preserves source order', () => {
    const source = `Intro\n\n${chartBlock()}\n\n## Rankwise comparison`
    const original = `${source}`
    const result = processMarkdownCompatibility(source)

    expect(source).toBe(original)
    expect(result.summary.chartsConverted).toBe(1)
    expect(result.markdown).toContain('### Best programming languages for structural engineering')
    expect(result.markdown).toContain('| Language | Overall score |')
    expect(result.markdown).toContain('| Python | 9.5/10 |')
    expect(result.markdown).toContain('| JavaScript / TypeScript | 5.4/10 |')
    expect(result.markdown).toContain('> Engineering-specific assessment; scores are comparative')
    expect(result.markdown).toContain('## Rankwise comparison')
    expect(result.markdown).not.toMatch(/charts_widget_v2|genui|[\uE200-\uE202]/u)
    expect(diagnostic(result, 'ai-chart-converted')).toMatchObject({ severity: 'info', lines: [3] })
  })

  it('supports multiline JSON, multiple series, missing cells, and Markdown-sensitive values', () => {
    const payload = {
      charts_widget_v2: {
        content: {
          meta: { title: 'Cost < score', description: 'Values are *illustrative*.', footer: 'Review > approve' },
          xKey: 'languageName',
          series: [
            { dataKey: 'cost', label: 'Cost | weighted', valuePrefix: '$', valueSuffix: '/month' },
            { dataKey: 'efficiency', label: 'Efficiency', valueSuffix: '%' },
          ],
          data: [
            { languageName: 'C|C', cost: 12, efficiency: 95 },
            { languageName: 'Rust', cost: 8 },
          ],
        },
      },
    }
    const source = `${GENUI_OPEN}\n${JSON.stringify(payload, null, 2)}\n${GENUI_CLOSE}\n\n${chartBlock(screenshotChart, 3)}`
    const result = processMarkdownCompatibility(source)

    expect(result.summary.chartsConverted).toBe(2)
    expect(result.markdown).toContain('### Cost &lt; score')
    expect(result.markdown).toContain('Values are \\*illustrative\\*.')
    expect(result.markdown).toContain('| Language Name | Cost \\| weighted | Efficiency |')
    expect(result.markdown).toContain('| C\\|C | \\$12/month | 95% |')
    expect(result.markdown).toContain('| Rust | \\$8/month |  |')
    expect(result.markdown).toContain('> Review &gt; approve')
  })

  it('diagnoses known unsupported and degraded dialect features without changing them', () => {
    const source = `---
title: Demo
---

\`\`\`mermaid
graph TD; A-->B
\`\`\`

> [!NOTE]
> Important

Term
: Definition

See [@doe2024].
## Heading {#custom}
::: note
==mark== ^two^ ~low~
<section>HTML</section>`
    const result = processMarkdownCompatibility(source)
    const codes = result.diagnostics.map((item) => item.code)

    expect(result.markdown).toBe(source)
    expect(codes).toEqual(expect.arrayContaining([
      'yaml-front-matter',
      'diagram-fence',
      'github-alert',
      'definition-list',
      'pandoc-citation',
      'heading-attributes',
      'fenced-div',
      'highlight',
      'superscript',
      'subscript',
      'raw-html',
    ]))
    expect(diagnostic(result, 'definition-list').lines).toEqual([13])
    expect(diagnostic(result, 'raw-html')).toMatchObject({ severity: 'warning', lines: [19] })
  })

  it('reports unclosed fences and avoids dialect false positives inside code', () => {
    const protectedSource = `\`\`\`text
---
> [!NOTE]
[@citation] ==mark== ^two^ ~low~ <section>
\`\`\`

    ::: fenced-div`
    expect(processMarkdownCompatibility(protectedSource).diagnostics).toEqual([])

    const unclosed = processMarkdownCompatibility('Before\n\n```mermaid\ngraph TD')
    expect(diagnostic(unclosed, 'diagram-fence')).toMatchObject({ lines: [3] })
    expect(diagnostic(unclosed, 'unclosed-fence')).toMatchObject({ severity: 'warning', lines: [3] })
  })

  it('rejects non-string input', () => {
    expect(() => processMarkdownCompatibility(null)).toThrow(TypeError)
  })

  it('exports normalized content as native DOCX structures without private artifacts', async () => {
    const source = [
      `Context${envelope('cite', `turn1search0${PRIVATE_SEPARATOR}turn1search2`)}`,
      chartBlock(),
      envelope('future-widget', '{"private":"turn2search1"}'),
    ].join('\n\n')
    const transformed = processMarkdownCompatibility(source).markdown
    const doc = await markdownToDocx(transformed)
    const buffer = await Packer.toBuffer(doc)
    const zip = await JSZip.loadAsync(buffer)
    const documentXml = await zip.file('word/document.xml')?.async('string')

    expect(documentXml).toBeDefined()
    expect(documentXml).toContain('<w:tbl>')
    expect(documentXml).toContain('Best programming languages for structural engineering')
    expect(documentXml).toContain('Python')
    expect(documentXml).toContain('9.5/10')
    expect(documentXml).toContain('Unsupported embedded content: future-widget')
    expect(documentXml).not.toMatch(/charts_widget_v2|genui|turn\d+|cite|[\uE200-\uE202]/u)
  })
})

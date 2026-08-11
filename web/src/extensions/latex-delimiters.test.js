import { describe, expect, it } from 'vitest'
import { Marked } from 'marked'
import markedKatex from 'marked-katex-extension'
import latexDelimiters from './latex-delimiters.js'

function render(markdown) {
  const options = { throwOnError: false, output: 'html' }
  const parser = new Marked(markedKatex(options), latexDelimiters(options))
  return parser.parse(markdown)
}

describe('web LaTeX delimiter preview', () => {
  it('renders inline and same-line or multiline display math', () => {
    const html = render(`Density is \\(\\rho_1\\) and flow is \\(Q_1 \\approx Q_2\\).

\\[\\rho_1Q_1=\\rho_2Q_2\\]

\\[
\\boxed{Q_1=Q_2}
\\]`)

    expect(html.match(/class="katex"/g)).toHaveLength(4)
    expect(html.match(/class="katex-display"/g)).toHaveLength(2)
    expect(html).not.toMatch(/\\(?:rho|approx|boxed)|\\\[|\\\]/)
  })

  it('recovers display math with accidental heading prefixes', () => {
    const markdown = Array.from({ length: 6 }, (_, index) => {
      const heading = '#'.repeat(index + 1)
      const equation = `\\boxed{\\text{Total Head ${index + 1} = Height + Depth + Speed}}`
      return index % 2 === 0
        ? `${heading} \\[\n${equation}\n\\]`
        : `${heading} \\[${equation}\\]`
    }).join('\n\n')
    const html = render(markdown)

    expect(html.match(/class="katex-display"/g)).toHaveLength(6)
    expect(html).not.toMatch(/<h[1-6]>/)
    expect(html).not.toMatch(/\\(?:text|boxed)|\\\[|\\\]/)
  })

  it('leaves non-math headings and incomplete prefixed delimiters unchanged', () => {
    const html = render(`# Real heading

## Explanation before \\[

### \\[
\\boxed{x}`)

    expect(html).not.toContain('class="katex"')
    expect(html).toContain('<h1>Real heading</h1>')
    expect(html).toContain('<h2>Explanation before [</h2>')
    expect(html).toContain('<h3>[</h3>')
    expect(html).toContain('\\boxed{x}')
  })

  it('does not render delimiters in code or incomplete and escaped input', () => {
    const html = render(`Inline code: \`\\(\\rho\\)\`

Escaped: \\\\(\\rho\\\\)

Unmatched: \\(\\rho

\`\`\`text
\\[\\boxed{x}\\]
\`\`\`

    \\(indented code\\)`)

    expect(html).not.toContain('class="katex"')
    expect(html).toContain('<code>\\(\\rho\\)</code>')
    expect(html).toContain('\\boxed{x}')
  })
})

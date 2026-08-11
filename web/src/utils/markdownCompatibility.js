export const PRIVATE_OPEN = '\uE200'
export const PRIVATE_SEPARATOR = '\uE202'
export const PRIVATE_CLOSE = '\uE201'
export const GENUI_OPEN = `${PRIVATE_OPEN}genui${PRIVATE_SEPARATOR}`
export const GENUI_CLOSE = PRIVATE_CLOSE

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeWhitespace(value) {
  return String(value).replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim()
}

function escapeMarkdown(value, tableCell = false) {
  let text = normalizeWhitespace(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replace(/([\\`*_\[\]#$])/g, '\\$1')

  if (tableCell) text = text.replaceAll('|', '\\|')
  return text
}

function humanizeKey(key) {
  const text = normalizeWhitespace(key)
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')

  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : ''
}

function stringifyCell(value) {
  if (value === null || value === undefined) return ''
  if (!isRecord(value) && !Array.isArray(value)) return String(value)

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function readChart(payload) {
  if (!isRecord(payload)) return null

  const widget = payload.charts_widget_v2
  const content = isRecord(widget) ? widget.content : null
  if (!isRecord(content)) return null

  const xKey = typeof content.xKey === 'string' ? content.xKey.trim() : ''
  if (!xKey || !Array.isArray(content.series) || !Array.isArray(content.data)) return null
  if (!content.data.every(isRecord)) return null

  const series = content.series.map((item) => {
    if (!isRecord(item) || typeof item.dataKey !== 'string' || !item.dataKey.trim()) return null

    const dataKey = item.dataKey.trim()
    return {
      dataKey,
      label: typeof item.label === 'string' && item.label.trim()
        ? item.label.trim()
        : humanizeKey(dataKey),
      valuePrefix: typeof item.valuePrefix === 'string' ? item.valuePrefix : '',
      valueSuffix: typeof item.valueSuffix === 'string' ? item.valueSuffix : '',
    }
  })

  if (series.length === 0 || series.some((item) => item === null)) return null

  const meta = isRecord(content.meta) ? content.meta : {}
  return {
    data: content.data,
    description: typeof meta.description === 'string' ? meta.description : '',
    footer: typeof meta.footer === 'string' ? meta.footer : '',
    series,
    title: typeof meta.title === 'string' ? meta.title : '',
    xKey,
  }
}

function renderChartTable(chart) {
  const sections = []

  if (chart.title.trim()) sections.push(`### ${escapeMarkdown(chart.title)}`)
  if (chart.description.trim()) sections.push(escapeMarkdown(chart.description))

  const headers = [humanizeKey(chart.xKey), ...chart.series.map((item) => item.label)]
  const rows = [
    `| ${headers.map((item) => escapeMarkdown(item, true)).join(' | ')} |`,
    `| --- | ${chart.series.map(() => '---:').join(' | ')} |`,
    ...chart.data.map((item) => {
      const values = [stringifyCell(item[chart.xKey])]

      for (const series of chart.series) {
        const rawValue = item[series.dataKey]
        values.push(rawValue === null || rawValue === undefined
          ? ''
          : `${series.valuePrefix}${stringifyCell(rawValue)}${series.valueSuffix}`)
      }

      return `| ${values.map((value) => escapeMarkdown(value, true)).join(' | ')} |`
    }),
  ]

  sections.push(rows.join('\n'))
  if (chart.footer.trim()) sections.push(`> ${escapeMarkdown(chart.footer)}`)

  return sections.join('\n\n')
}

function lineStartAt(markdown, index) {
  return markdown.lastIndexOf('\n', Math.max(0, index - 1)) + 1
}

function lineEndAt(markdown, index) {
  const newline = markdown.indexOf('\n', index)
  return newline === -1 ? markdown.length : newline
}

function lineNumberAt(markdown, index) {
  let line = 1
  for (let cursor = markdown.indexOf('\n'); cursor !== -1 && cursor < index; cursor = markdown.indexOf('\n', cursor + 1)) {
    line += 1
  }
  return line
}

function isEscaped(markdown, index) {
  let slashCount = 0
  for (let cursor = index - 1; cursor >= 0 && markdown[cursor] === '\\'; cursor -= 1) slashCount += 1
  return slashCount % 2 === 1
}

function openingFence(line) {
  const match = /^ {0,3}(`{3,}|~{3,})[ \t]*([^ \t`]*)/.exec(line)
  if (!match) return null
  return {
    character: match[1][0],
    language: match[2].toLowerCase(),
    length: match[1].length,
  }
}

function closesFence(line, fence) {
  const marker = fence.character === '`' ? '`' : '~'
  return new RegExp(`^ {0,3}${marker}{${fence.length},}[ \\t]*$`).test(line)
}

function inlineCodeRanges(markdown, start, end) {
  const ranges = []
  let cursor = start

  while (cursor < end) {
    if (markdown[cursor] !== '`' || isEscaped(markdown, cursor)) {
      cursor += 1
      continue
    }

    let runEnd = cursor + 1
    while (runEnd < end && markdown[runEnd] === '`') runEnd += 1
    const marker = '`'.repeat(runEnd - cursor)
    const close = markdown.indexOf(marker, runEnd)

    if (close === -1 || close >= end) {
      ranges.push({ start: cursor, end })
      break
    }

    ranges.push({ start: cursor, end: close + marker.length })
    cursor = close + marker.length
  }

  return ranges
}

function buildProtectedContext(markdown) {
  const protectedRanges = []
  const fences = []
  let fence = null
  let lineStart = 0
  let lineNumber = 1

  while (lineStart < markdown.length) {
    const newline = markdown.indexOf('\n', lineStart)
    const nextLineStart = newline === -1 ? markdown.length : newline + 1
    const rawLine = markdown.slice(lineStart, newline === -1 ? markdown.length : newline)
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine

    if (fence) {
      protectedRanges.push({ start: lineStart, end: nextLineStart })
      if (closesFence(line, fence)) {
        fence.closed = true
        fence = null
      }
    } else {
      const foundFence = openingFence(line)
      if (foundFence) {
        fence = { ...foundFence, closed: false, line: lineNumber }
        fences.push(fence)
        protectedRanges.push({ start: lineStart, end: nextLineStart })
      } else if (/^(?: {4}|\t)/.test(line)) {
        protectedRanges.push({ start: lineStart, end: nextLineStart })
      } else {
        protectedRanges.push(...inlineCodeRanges(markdown, lineStart, lineStart + line.length))
      }
    }

    lineStart = nextLineStart
    lineNumber += 1
  }

  return { fences, protectedRanges }
}

function isProtected(index, ranges) {
  let low = 0
  let high = ranges.length - 1

  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    const range = ranges[middle]
    if (index < range.start) high = middle - 1
    else if (index >= range.end) low = middle + 1
    else return true
  }

  return false
}

function createAnalysisText(markdown, ranges) {
  const characters = markdown.split('')
  for (const range of ranges) {
    for (let index = range.start; index < range.end; index += 1) {
      if (characters[index] !== '\n' && characters[index] !== '\r') characters[index] = ' '
    }
  }
  return characters.join('')
}

function createDiagnosticCollector() {
  const entries = new Map()

  return {
    add({ code, category, severity, line, message, outcome, detail = '' }) {
      const key = `${code}:${detail}`
      let entry = entries.get(key)
      if (!entry) {
        entry = { code, category, severity, count: 0, lines: new Set(), message, outcome }
        entries.set(key, entry)
      }
      entry.count += 1
      if (line) entry.lines.add(line)
    },
    values() {
      return [...entries.values()].map((entry) => ({
        ...entry,
        lines: [...entry.lines].sort((a, b) => a - b),
      }))
    },
  }
}

function addMatches(text, expression, markdown, diagnostics, definition) {
  expression.lastIndex = 0
  for (const match of text.matchAll(expression)) {
    diagnostics.add({
      ...definition,
      line: lineNumberAt(markdown, match.index),
    })
  }
}

function analyzeDialects(markdown, analysisText, context, diagnostics) {
  const frontMatter = /^(?:\uFEFF)?---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?=\r?\n|$)/.exec(analysisText)
  if (frontMatter) {
    diagnostics.add({
      code: 'yaml-front-matter',
      category: 'dialect',
      severity: 'warning',
      line: 1,
      message: 'YAML front matter is not interpreted.',
      outcome: 'It remains in the document and may look like a horizontal rule and heading.',
    })
  }

  const diagramLanguages = new Set(['mermaid', 'plantuml', 'puml', 'dot', 'graphviz'])
  for (const fence of context.fences) {
    if (diagramLanguages.has(fence.language)) {
      diagnostics.add({
        code: 'diagram-fence',
        category: 'fallback',
        severity: 'info',
        line: fence.line,
        message: `${fence.language || 'Diagram'} fenced content is not rendered as a diagram.`,
        outcome: 'It is preserved and exported as a code block.',
        detail: fence.language,
      })
    }
    if (!fence.closed) {
      diagnostics.add({
        code: 'unclosed-fence',
        category: 'malformed',
        severity: 'warning',
        line: fence.line,
        message: 'A fenced code block is not closed.',
        outcome: 'The rest of the document may be treated as code.',
      })
    }
  }

  addMatches(analysisText, /^ {0,3}>[ \t]*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*$/gim, markdown, diagnostics, {
    code: 'github-alert', category: 'fallback', severity: 'info',
    message: 'GitHub alert syntax is not styled as an alert.',
    outcome: 'It is preserved as an ordinary blockquote.',
  })

  const lines = analysisText.split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (/^ {0,3}:[ \t]+\S/.test(line)) {
      const previous = index > 0 ? lines[index - 1].trim() : ''
      if (previous && !/^(?:[#>`~*+\-]|\d+[.)])/.test(previous)) {
        diagnostics.add({
          code: 'definition-list', category: 'dialect', severity: 'info', line: index + 1,
          message: 'Definition-list syntax is not enabled.',
          outcome: 'It remains literal text.',
        })
      }
    }
  }

  addMatches(analysisText, /(?<!\\)\[@[A-Za-z0-9][^\]\n]*\]/g, markdown, diagnostics, {
    code: 'pandoc-citation', category: 'dialect', severity: 'info',
    message: 'Pandoc bibliography citations are not resolved.',
    outcome: 'They remain literal text; use normal Markdown links or footnotes for real sources.',
  })
  addMatches(analysisText, /^ {0,3}#{1,6}[ \t]+.*?[ \t]+\{(?:#[A-Za-z][\w:-]*|\.[A-Za-z][\w:-]*)(?:[ \t]+[^}]*)?\}[ \t]*#?[ \t]*$/gm, markdown, diagnostics, {
    code: 'heading-attributes', category: 'dialect', severity: 'info',
    message: 'Heading attributes are not interpreted.',
    outcome: 'The attribute text remains visible.',
  })
  addMatches(analysisText, /^ {0,3}:{3,}(?:[ \t].*)?$/gm, markdown, diagnostics, {
    code: 'fenced-div', category: 'dialect', severity: 'info',
    message: 'Fenced div syntax is not enabled.',
    outcome: 'Its markers remain literal text.',
  })
  addMatches(analysisText, /(?<!\\)==(?!=)[^=\n]+==(?!=)/g, markdown, diagnostics, {
    code: 'highlight', category: 'dialect', severity: 'info',
    message: 'Highlight extension syntax is not enabled.',
    outcome: 'The == markers remain literal text.',
  })
  addMatches(analysisText, /(?<![\\\w])\^(?!\s|\^)[^\s^\n]+\^(?!\^)/g, markdown, diagnostics, {
    code: 'superscript', category: 'dialect', severity: 'info',
    message: 'Caret-delimited superscript syntax is not enabled.',
    outcome: 'The ^ markers remain literal text; LaTeX superscripts are supported.',
  })
  addMatches(analysisText, /(?<![\\~\w])~(?!~|\s)[^\s~\n]+~(?!~)/g, markdown, diagnostics, {
    code: 'subscript', category: 'dialect', severity: 'info',
    message: 'Tilde-delimited subscript syntax is not enabled.',
    outcome: 'The ~ markers remain literal text; LaTeX subscripts are supported.',
  })
  addMatches(analysisText, /<!--[\s\S]*?-->|<\/?[A-Za-z][A-Za-z0-9-]*(?:[ \t]+[^>\n]*|\s*\/?)>/g, markdown, diagnostics, {
    code: 'raw-html', category: 'compatibility', severity: 'warning',
    message: 'Raw HTML behaves differently between outputs.',
    outcome: 'The browser may render it, while DOCX keeps markup as literal text or ignores it when requested.',
  })
}

function chartAt(markdown, markerStart, payload, closeIndex) {
  const start = lineStartAt(markdown, markerStart)
  const end = lineEndAt(markdown, closeIndex + 1)
  const leading = markdown.slice(start, markerStart)
  const trailing = markdown.slice(closeIndex + 1, end).replace(/\r$/, '')
  if (!/^ {0,3}$/.test(leading) || !/^[ \t]*$/.test(trailing)) return null

  try {
    const chart = readChart(JSON.parse(payload.trim()))
    return chart ? { chart, start, end: closeIndex + 1 } : null
  } catch {
    return null
  }
}

function citationRange(markdown, start, end) {
  let adjustedStart = start
  let adjustedEnd = end
  const before = markdown[start - 1]
  const after = markdown[end]

  if ((before === ' ' || before === '\t') && (after === ' ' || after === '\t')) {
    while (markdown[adjustedEnd] === ' ' || markdown[adjustedEnd] === '\t') adjustedEnd += 1
  } else if ((before === ' ' || before === '\t') && /[.,;:!?\])]/.test(after || '')) {
    while (adjustedStart > 0 && (markdown[adjustedStart - 1] === ' ' || markdown[adjustedStart - 1] === '\t')) adjustedStart -= 1
  }

  return { start: adjustedStart, end: adjustedEnd }
}

function processPrivateEnvelopes(markdown, context, diagnostics) {
  const replacements = []
  const envelopeRanges = []
  let chartsConverted = 0
  let citationsRemoved = 0
  let unknownEnvelopesReplaced = 0
  let cursor = 0

  while (cursor < markdown.length) {
    const start = markdown.indexOf(PRIVATE_OPEN, cursor)
    if (start === -1) break

    if (isProtected(start, context.protectedRanges) || isEscaped(markdown, start)) {
      cursor = start + 1
      continue
    }

    const separator = markdown.indexOf(PRIVATE_SEPARATOR, start + 1)
    const earlyClose = markdown.indexOf(PRIVATE_CLOSE, start + 1)
    if (separator === -1 || (earlyClose !== -1 && earlyClose < separator)) {
      diagnostics.add({
        code: 'malformed-private-envelope', category: 'malformed', severity: 'warning',
        line: lineNumberAt(markdown, start),
        message: 'A private embedded-content marker is malformed.',
        outcome: 'It remains literal because its boundaries cannot be removed safely.',
      })
      cursor = start + 1
      continue
    }

    const kind = markdown.slice(start + 1, separator)
    const close = markdown.indexOf(PRIVATE_CLOSE, separator + 1)
    const nestedOpen = markdown.indexOf(PRIVATE_OPEN, separator + 1)
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(kind)
      || close === -1
      || (nestedOpen !== -1 && nestedOpen < close)) {
      diagnostics.add({
        code: 'malformed-private-envelope', category: 'malformed', severity: 'warning',
        line: lineNumberAt(markdown, start),
        message: 'A private embedded-content marker is incomplete or malformed.',
        outcome: 'It remains literal because its boundaries cannot be removed safely.',
      })
      cursor = start + 1
      continue
    }

    const payload = markdown.slice(separator + 1, close)
    const line = lineNumberAt(markdown, start)
    const normalizedKind = kind.toLowerCase()
    envelopeRanges.push({ start, end: close + 1 })

    if (normalizedKind === 'cite' || normalizedKind === 'filecite') {
      const range = citationRange(markdown, start, close + 1)
      replacements.push({ ...range, value: '' })
      citationsRemoved += 1
      diagnostics.add({
        code: 'private-citation-removed', category: 'private-artifact', severity: 'info', line,
        message: `${normalizedKind === 'filecite' ? 'File citation' : 'Citation'} artifact removed.`,
        outcome: 'Copied turn identifiers cannot resolve to public sources; surrounding text is preserved.',
        detail: normalizedKind,
      })
    } else if (normalizedKind === 'genui') {
      const chart = chartAt(markdown, start, payload, close)
      if (chart) {
        replacements.push({ start: chart.start, end: chart.end, value: renderChartTable(chart.chart) })
        chartsConverted += 1
        diagnostics.add({
          code: 'ai-chart-converted', category: 'private-artifact', severity: 'info', line,
          message: 'Embedded AI chart converted to an editable table.',
          outcome: 'Preview and DOCX use the table; the editor source is unchanged.',
        })
      } else {
        diagnostics.add({
          code: 'malformed-chart-envelope', category: 'malformed', severity: 'warning', line,
          message: 'A chart envelope is invalid or is not a standalone supported chart.',
          outcome: 'It remains literal so damaged source is not silently discarded.',
        })
      }
    } else {
      replacements.push({
        start,
        end: close + 1,
        value: `[Unsupported embedded content: ${escapeMarkdown(normalizedKind)}]`,
      })
      unknownEnvelopesReplaced += 1
      diagnostics.add({
        code: 'unsupported-private-envelope', category: 'private-artifact', severity: 'warning', line,
        message: `Unsupported private embedded content detected: ${normalizedKind}.`,
        outcome: 'Its opaque payload is hidden behind a neutral placeholder.',
        detail: normalizedKind,
      })
    }

    cursor = close + 1
  }

  if (replacements.length === 0) {
    return { markdown, chartsConverted, citationsRemoved, unknownEnvelopesReplaced, envelopeRanges }
  }

  replacements.sort((left, right) => left.start - right.start)
  let output = ''
  let copiedUntil = 0
  for (const replacement of replacements) {
    if (replacement.start < copiedUntil) continue
    output += markdown.slice(copiedUntil, replacement.start)
    output += replacement.value
    copiedUntil = replacement.end
  }
  output += markdown.slice(copiedUntil)

  return { markdown: output, chartsConverted, citationsRemoved, unknownEnvelopesReplaced, envelopeRanges }
}

export function processMarkdownCompatibility(markdown) {
  if (typeof markdown !== 'string') throw new TypeError('markdown must be a string')

  const context = buildProtectedContext(markdown)
  const diagnostics = createDiagnosticCollector()
  const transformed = processPrivateEnvelopes(markdown, context, diagnostics)
  const analysisRanges = [...context.protectedRanges, ...transformed.envelopeRanges]
    .sort((left, right) => left.start - right.start)
  const analysisText = createAnalysisText(markdown, analysisRanges)
  analyzeDialects(markdown, analysisText, context, diagnostics)
  const diagnosticList = diagnostics.values()

  return {
    markdown: transformed.markdown,
    diagnostics: diagnosticList,
    summary: {
      chartsConverted: transformed.chartsConverted,
      citationsRemoved: transformed.citationsRemoved,
      unknownEnvelopesReplaced: transformed.unknownEnvelopesReplaced,
      warningCount: diagnosticList
        .filter((diagnostic) => diagnostic.severity === 'warning')
        .reduce((count, diagnostic) => count + diagnostic.count, 0),
    },
  }
}

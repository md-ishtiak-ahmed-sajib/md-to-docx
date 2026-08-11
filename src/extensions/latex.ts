import { Math, MathRun, Paragraph, ParagraphChild, FileChild, TextRun } from 'docx'
import katex from 'katex'
import { Lexer } from 'marked'

import { mathmlToDocxChildren } from './mathml-to-docx'
import { MarkdownDocx } from '../MarkdownDocx'
import { BlockKatex, IExtension, InlineKatex } from './types'

const inlineRule = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\1(?=[\s?!\.,:;%)\]–—？！。，：-]|$)/;
const inlineRuleNonStandard = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\1/; // Non-standard, even if there are no spaces before and after $ or $$, try to parse

const blockRule = /^(\${1,2})\n((?:\\[^]|[^\\])+?)\n\1(?:\n|$)/;
const inlineParenthesesRule = /^\\\(((?:\\(?!\))|[^\\\n])+?)\\\)/
const blockBracketsRule = /^ {0,3}(?:#{1,6}[ \t]+)?\\\[[ \t]*(?:\r?\n)?([\s\S]*?)(?:\r?\n)?[ \t]*\\\][ \t]*(?:\r?\n|$)/

/**
 * @see https://github.com/UziTech/marked-katex-extension/blob/main/src/index.js
 */


// const kQueueKey = Symbol.for('markdown-docx/latexQueue')

export default function latex(lexer: Lexer): IExtension {
  const nonStandard = false // lexer.options.nonStandard;
  const ruleReg = nonStandard ? inlineRuleNonStandard : inlineRule;

  return {
    name: 'latex',
    startInline: (src) => {
      const dollarIndex = findDollarStart(src, ruleReg, nonStandard)
      const parenthesesIndex = findParenthesesStart(src)

      if (dollarIndex === undefined) return parenthesesIndex
      if (parenthesesIndex === undefined) return dollarIndex
      return dollarIndex < parenthesesIndex ? dollarIndex : parenthesesIndex
    },
    inline: (src, tokens) => {
      const parenthesesMatch = src.match(inlineParenthesesRule)
      if (parenthesesMatch) {
        const inlineKatex: InlineKatex = {
          type: 'inlineKatex',
          raw: parenthesesMatch[0],
          text: parenthesesMatch[1].trim(),
          displayMode: false,
        }
        return inlineKatex
      }

      const match = src.match(ruleReg);
      if (!match) {
        return
      }
      const inlineKatex: InlineKatex = {
        type: 'inlineKatex',
        raw: match[0],
        text: match[2].trim(),
        displayMode: match[1].length === 2,
      }
      return inlineKatex
    },
    block: (src, tokens) => {
      const bracketsMatch = src.match(blockBracketsRule)
      if (bracketsMatch) {
        const blockKatex: BlockKatex = {
          type: 'blockKatex',
          raw: bracketsMatch[0],
          text: bracketsMatch[1].trim(),
          displayMode: true,
        }
        return blockKatex
      }

      const match = src.match(blockRule);
      if (!match) {
        return
      }
      const blockKatex: BlockKatex = {
        type: 'blockKatex',
        raw: match[0],
        text: match[2].trim(),
        displayMode: match[1].length === 2,
      }
      return blockKatex
    },
    init: (render: MarkdownDocx) => {
      render.addInlineRender('inlineKatex', renderInline)
      render.addBlockRender('blockKatex', renderBlock)
    }
  }
}

function findDollarStart(src: string, rule: RegExp, nonStandard: boolean): number | undefined {
  let searchFrom = 0

  while (searchFrom < src.length) {
    const index = src.indexOf('$', searchFrom)
    if (index === -1) return

    const isCandidate = nonStandard || index === 0 || src.charAt(index - 1) !== '$'
    if (isCandidate && rule.test(src.substring(index))) return index

    searchFrom = index + 1
    while (src.charAt(searchFrom) === '$') searchFrom++
  }
}

function findParenthesesStart(src: string): number | undefined {
  let searchFrom = 0

  while (searchFrom < src.length) {
    const index = src.indexOf('\\(', searchFrom)
    if (index === -1) return

    let precedingBackslashes = 0
    for (let position = index - 1; position >= 0 && src.charAt(position) === '\\'; position--) {
      precedingBackslashes++
    }

    if (precedingBackslashes % 2 === 0 && inlineParenthesesRule.test(src.substring(index))) return index
    searchFrom = index + 2
  }
}

const macroMap = new Map<string, string>([
  ['alpha', 'α'],
  ['beta', 'β'],
  ['gamma', 'γ'],
  ['delta', 'δ'],
  ['epsilon', 'ε'],
  ['zeta', 'ζ'],
  ['eta', 'η'],
  ['theta', 'θ'],
  ['iota', 'ι'],
  ['kappa', 'κ'],
  ['lambda', 'λ'],
  ['mu', 'μ'],
  ['nu', 'ν'],
  ['xi', 'ξ'],
  ['omicron', 'ο'],
  ['pi', 'π'],
  ['rho', 'ρ'],
  ['sigma', 'σ'],
  ['tau', 'τ'],
  ['upsilon', 'υ'],
  ['phi', 'φ'],
  ['chi', 'χ'],
  ['psi', 'ψ'],
  ['omega', 'ω'],
  ['textasciitilde', '~'],
  ['textbackslash', '\\'],
  ['textasciicircum', '^'],
  ['textbar', '|'],
  ['textless', '<'],
  ['textgreater', '>'],
  ['textunderscore', '_'],
  ['neq', '≠'],
  ['leq', '≤'],
  ['leqq', '≦'],
  ['geq', '≥'],
  ['geqq', '≧'],
  ['sim', '∼'],
  ['simeq', '≃'],
  ['approx', '≈'],
  ['infty', '∞'],
  ['fallingdotseq', '≒'],
  ['risingdotseq', '≓'],
  ['equiv', '≡'],
  ['ll', '≪'],
  ['gg', '≫'],
  ['times', '×'],
  ['div', '÷'],
  ['pm', '±'],
  ['mp', '∓'],
  ['oplus', '⊕'],
  ['otimes', '⊗'],
  ['ominus', '⊖'],
  ['oslash', '⊘'],
  ['odot', '⊙'],
  ['circ', '∘'],
  ['bullet', '•'],
  ['cdot', '⋅'],
  ['ltimes', '⋉'],
  ['rtimes', '⋊'],
  ['in', '∈'],
  ['notin', '∉'],
  ['ni', '∋'],
  ['notni', '∌'],
]);

/**
 * Parse LaTeX text and convert to simple text representation
 * This is a basic implementation that handles common LaTeX commands
 */
function parseLatexToText(latex: string): string {
  let text = latex

  // Replace common LaTeX commands with Unicode symbols
  for (const [macro, symbol] of macroMap.entries()) {
    const regex = new RegExp(`\\\\${macro}(?![a-zA-Z])`, 'g')
    text = text.replace(regex, symbol)
  }

  // Handle superscripts: x^2 -> x²
  text = text.replace(/\^(\d)/g, (_, digit) => {
    const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹'
    return superscripts[parseInt(digit)]
  })

  // Handle subscripts: x_2 -> x₂
  text = text.replace(/_(\d)/g, (_, digit) => {
    const subscripts = '₀₁₂₃₄₅₆₇₈₉'
    return subscripts[parseInt(digit)]
  })

  // Handle curly braces for grouping: x^{10} -> extract content
  text = text.replace(/\^{([^}]+)}/g, '^$1')
  text = text.replace(/_{([^}]+)}/g, '_$1')

  // Remove remaining backslashes for simple commands
  text = text.replace(/\\([a-zA-Z]+)/g, '$1')

  // Clean up remaining braces
  text = text.replace(/[{}]/g, '')

  return text
}

function renderInline(render: MarkdownDocx, token: InlineKatex): ParagraphChild {
  const text = token.text
  // KaTeX engine path
  if (render.options?.math?.engine === 'katex') {
    try {
      const mml = katex.renderToString(text, { output: 'mathml', throwOnError: false, displayMode: !!token.displayMode, ...(render.options.math?.katexOptions || {}) })
      const children = mathmlToDocxChildren(mml, { libreOfficeCompat: !!render.options.math?.libreOfficeCompat })
      if (children && children.length) {
        return new Math({ children })
      }
    } catch { }
  }

  let parsedText = parseLatexToText(text)
  if (!parsedText) parsedText = text

  // Fallback: if still empty, render as plain text so users see something
  if (!parsedText) return new TextRun(text || '')

  return new Math({ children: [new MathRun(parsedText)] })
}

function renderBlock(render: MarkdownDocx, token: BlockKatex): FileChild {
  const text = token.text
  // KaTeX engine path
  if (render.options?.math?.engine === 'katex') {
    try {
      const mml = katex.renderToString(text, { output: 'mathml', throwOnError: false, displayMode: !!token.displayMode, ...(render.options.math?.katexOptions || {}) })
      const children = mathmlToDocxChildren(mml, { libreOfficeCompat: !!render.options.math?.libreOfficeCompat })
      if (children && children.length) {
        return new Paragraph({ children: [new Math({ children })] })
      }
    } catch { }
  }

  let parsedText = parseLatexToText(text)
  if (!parsedText) parsedText = text

  // Fallback: if still empty, render as plain text paragraph
  if (!parsedText) return new Paragraph({ children: [new TextRun(text || '')] })

  return new Paragraph({ children: [new Math({ children: [new MathRun(parsedText)] })] })
}

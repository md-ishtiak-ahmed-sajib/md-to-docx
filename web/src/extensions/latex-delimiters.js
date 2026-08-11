import katex from 'katex'

const inlineParenthesesRule = /^\\\(((?:\\(?!\))|[^\\\n])+?)\\\)/
const blockBracketsRule = /^ {0,3}(?:#{1,6}[ \t]+)?\\\[[ \t]*(?:\r?\n)?([\s\S]*?)(?:\r?\n)?[ \t]*\\\][ \t]*(?:\r?\n|$)/

export default function latexDelimiters(options = {}) {
  return {
    extensions: [
      {
        name: 'inlineLatexParentheses',
        level: 'inline',
        start: findParenthesesStart,
        tokenizer(src) {
          const match = src.match(inlineParenthesesRule)
          if (!match) return

          return {
            type: 'inlineLatexParentheses',
            raw: match[0],
            text: match[1].trim(),
          }
        },
        renderer(token) {
          return katex.renderToString(token.text, { ...options, displayMode: false })
        },
      },
      {
        name: 'blockLatexBrackets',
        level: 'block',
        tokenizer(src) {
          const match = src.match(blockBracketsRule)
          if (!match) return

          return {
            type: 'blockLatexBrackets',
            raw: match[0],
            text: match[1].trim(),
          }
        },
        renderer(token) {
          return `${katex.renderToString(token.text, { ...options, displayMode: true })}\n`
        },
      },
    ],
  }
}

function findParenthesesStart(src) {
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

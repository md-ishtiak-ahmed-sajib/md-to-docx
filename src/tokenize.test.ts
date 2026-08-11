import { describe, expect, it } from 'vitest'

import { tokenize } from './tokenize'
import { MarkdownDocx } from './MarkdownDocx'

describe('tokenize', () => {
  const render = new MarkdownDocx('')
  const _tokenize = (md: string) => {
    render.markdown = md
    return tokenize(render)
  }

  it('parse heading', () => {
    expect(_tokenize(`# h1 Heading 8-)
## h2 Heading
### h3 Heading
#### h4 Heading
##### h5 Heading
###### h6 Heading`)).toMatchSnapshot()
  })

  it('parse paragraph', () => {
    expect(_tokenize(`Emphasis, aka italics, with *asterisks* or _underscores_.

Strong emphasis, aka bold, with **asterisks** or __underscores__.

Combined emphasis with **asterisks and _underscores_**.

Strikethrough uses two tildes. ~~Scratch this.~~`)).toMatchSnapshot()
  })

  it('parse list', () => {
    expect(_tokenize(`
1. Make my changes
    1. Fix bug
    2. Improve formatting
        - Make the headings bigger
2. Push my commits to GitHub
3. Open a pull request
    * Describe my changes
    * Mention all the members of my team
        * Ask for feedback`)).toMatchSnapshot()
  })

  it('parse list special', () => {
    expect(_tokenize(`1. First ordered list item
2. Another item
⋅⋅* Unordered sub-list.
1. Actual numbers don't matter, just that it's a number
⋅⋅1. Ordered sub-list
4. And another item. `)).toMatchSnapshot()
  })

  it('parse task list', () => {
    expect(_tokenize(`- [x] Finish my changes
- [ ] Push my commits to GitHub
- [ ] Open a pull request
- [x] @mentions, #refs, [links](), **formatting**, and <del>tags</del> supported
- [x] list syntax required (any unordered or ordered list supported)
- [ ] this is a complete item
- [ ] this is an incomplete item`)).toMatchSnapshot()
  })

  it('parse links', () => {
    expect(_tokenize(`[I'm an inline-style link](https://www.google.com)

[I'm an inline-style link with title](https://www.google.com "Google's Homepage")

[I'm a reference-style link][Arbitrary case-insensitive reference text]

[I'm a relative reference to a repository file](../blob/master/LICENSE)

[arbitrary case-insensitive reference text]: https://www.mozilla.org`)).toMatchSnapshot()
  })

  it('parse images', () => {
    expect(_tokenize(`Inline-style:
![alt text](https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png "Logo Title Text 1")

Reference-style:
![alt text][logo]

[logo]: https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png "Logo Title Text 2"`)).toMatchSnapshot()
  })

  it('parse blockquotes', () => {
    expect(_tokenize(`> Blockquotes are very handy in email to emulate reply text.
> This line is part of the same quote.

Quote break.

> This is a very long line that will still be quoted properly when it wraps. Oh boy let's keep writing to make sure this is long enough to actually wrap for everyone. Oh, you can *put* **Markdown** into a blockquote.

> Blockquotes can also be nested...
>> ...by using additional greater-than signs right next to each other...
> > > ...or with spaces between arrows.`)).toMatchSnapshot()
  })

  it('parse tables', () => {
    expect(_tokenize(`| Tables        | Are           | Cool  |
| ------------- |:-------------:| -----:|
| col 3 is      | right-aligned | $1600 |
| col 2 is      | centered      |   $12 |
| zebra stripes | are neat      |    $1 |`)).toMatchSnapshot()
  })

  it('parse tables special', () => {
    expect(_tokenize(`Markdown | Less | Pretty
--- | --- | ---
*Still* | \`renders\` | **nicely**
1 | 2 | 3`)).toMatchSnapshot()
  })


  it('parse code blocks', () => {
    expect(_tokenize("```javascript\nfunction test() {\n  console.log('test');\n}\n```")).toMatchSnapshot()
  })

  it('parse horizontal rules', () => {
    expect(_tokenize(`Three or more...

---

Hyphens

***

Asterisks

___

Underscores`)).toMatchSnapshot()
  })

  it('parse footnotes', () => {
    expect(_tokenize(`# [Footnotes](https://github.com/markdown-it/markdown-it-footnote)

Footnote 1 link[^first].

Footnote 2 link[^second].

Inline footnote^[Text of inline footnote] definition.

Duplicated footnote reference[^second].

[^first]: Footnote **can have markup**

    and multiple paragraphs.

[^second]: Footnote text.`)).toMatchSnapshot()
  })

  it('parse escape', () => {
    expect(_tokenize(`\\*literal asterisks\\*`)).toMatchSnapshot()
  })

  // parse math

  it('parse katex', () => {
    expect(_tokenize(`# Math Equation Test

## Inline Math

Here is an inline equation: $E=mc^2$ which is Einstein's famous formula.

Another example: $a^2 + b^2 = c^2$ is the Pythagorean theorem.

Greek letters: $\\alpha + \\beta = \\gamma$

## Block Math

Here is a block equation:

$$
E=mc^2
$$

Another block equation:

$$
x^2 + y^2 = z^2
$$

With Greek letters:

$$
\\alpha + \\beta + \\gamma = \\pi
$$

## End of Test

This document tests basic LaTeX math rendering.`)).toMatchSnapshot()
  })

  it('parse math', () => {
    expect(_tokenize(`** Inline math: ** $E=mc^2$

** Block math: **

$$
E=mc^2
$$

** End Math **`)).toMatchSnapshot()
  })

  it('parses LaTeX parentheses and bracket delimiters', () => {
    const tokens = _tokenize(`Density is \\(\\rho_1\\) and the values are \\(Q_1 \\approx Q_2\\).

\\[\\rho_1Q_1=\\rho_2Q_2\\]

\\[
\\boxed{Q_1=Q_2}
\\]`) as any[]
    const serialized = JSON.stringify(tokens)

    expect(serialized.match(/"type":"inlineKatex"/g)).toHaveLength(2)
    expect(serialized.match(/"type":"blockKatex"/g)).toHaveLength(2)
    expect(serialized).toContain('\\\\rho_1')
    expect(serialized).toContain('\\\\approx')
    expect(serialized).toContain('\\\\boxed')
  })

  it('recovers display math with accidental heading prefixes', () => {
    const markdown = Array.from({ length: 6 }, (_, index) => {
      const heading = '#'.repeat(index + 1)
      const equation = `\\boxed{\\text{Total Head ${index + 1} = Height + Depth + Speed}}`
      return index % 2 === 0
        ? `${heading} \\[\n${equation}\n\\]`
        : `${heading} \\[${equation}\\]`
    }).join('\n\n')
    const serialized = JSON.stringify(_tokenize(markdown))

    expect(serialized.match(/"type":"blockKatex"/g)).toHaveLength(6)
    expect(serialized).not.toContain('"type":"heading"')
    expect(serialized).toContain('\\\\boxed{\\\\text{Total Head 1 = Height + Depth + Speed}}')
  })

  it('does not recover non-math headings or incomplete prefixed delimiters', () => {
    const serialized = JSON.stringify(_tokenize(`# Real heading

## Explanation before \\[

### \\[
\\boxed{x}`))

    expect(serialized).not.toContain('blockKatex')
    expect(serialized.match(/"type":"heading"/g)).toHaveLength(3)
  })

  it('leaves protected and incomplete LaTeX delimiters literal', () => {
    const tokens = _tokenize(`Inline code: \`\\(\\rho\\)\`

Escaped: \\\\(\\rho\\\\)

Unmatched: \\(\\rho

\`\`\`text
\\[\\boxed{x}\\]
\`\`\`

    \\(indented code\\)`) as any[]
    const serialized = JSON.stringify(tokens)

    expect(serialized).not.toContain('inlineKatex')
    expect(serialized).not.toContain('blockKatex')
    expect(serialized).toContain('\\\\rho')
    expect(serialized).toContain('\\\\boxed')
  })


  // image size: ![Alt text](image.png "600x400") or ![Alt text](image.png "50%x50%")
  it('render image size', async () => {
    expect(_tokenize(`![Alt text](image.png "600x400")`)).toMatchSnapshot()
    expect(_tokenize(`![Alt text](image.png "50%x50%")`)).toMatchSnapshot()
  })
})

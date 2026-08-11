import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip'
import markdownToDocx, { Packer } from '../src/entry-node'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

describe('Math Rendering', () => {
  it('render comprehensive math example', async () => {
    const doc = await markdownToDocx(getDefaultMathExample());
    const buffer = await Packer.toBuffer(doc);
    expect(buffer).toBeInstanceOf(Buffer);
    // Optionally, write to file for manual inspection
    const outputPath = path.join(__dirname, 'test-math-comprehensive.docx');
    await fs.writeFile(outputPath, buffer);
    console.log('✅ Successfully created test-math-comprehensive.docx');
    // check file exists
    const stat = await fs.stat(outputPath);
    expect(stat.isFile()).toBe(true);
  })

  // read file
  it('render math example from file', async () => {
    const markdown = await fs.readFile(path.join(__dirname, 'math-example.md'), 'utf-8');
    const doc = await markdownToDocx(markdown);
    const buffer = await Packer.toBuffer(doc);
    expect(buffer).toBeInstanceOf(Buffer);
    // Optionally, write to file for manual inspection
    const outputPath = path.join(__dirname, 'math-example-from-file.docx');
    await fs.writeFile(outputPath, buffer);
    console.log('✅ Successfully created math-example-from-file.docx');
    // check file exists
    const stat = await fs.stat(outputPath);
    expect(stat.isFile()).toBe(true);
  })

  it('writes native Word math for standard LaTeX delimiters and boxed equations', async () => {
    const markdown = `Density is \\(\\rho_1\\) and flow is \\(Q_1 \\approx Q_2\\).

\\[
\\rho_1Q_1=\\rho_2Q_2
\\]

\\[\\boxed{Q_1=Q_2}\\]`
    const doc = await markdownToDocx(markdown)
    const buffer = await Packer.toBuffer(doc)
    const zip = await JSZip.loadAsync(buffer)
    const documentXml = await zip.file('word/document.xml')?.async('string')

    expect(documentXml).toBeDefined()
    expect(documentXml).toContain('<m:oMath>')
    expect(documentXml).toContain('<m:borderBox>')
    expect(documentXml).not.toMatch(/\\(?:rho|approx|boxed)|\\\[|\\\]/)
  })

  it('writes heading-prefixed display math as native Word math without heading styling', async () => {
    const markdown = `# \\[
\\boxed{\\text{Total Head = Height + Depth + Speed}}
\\]`
    const doc = await markdownToDocx(markdown)
    const buffer = await Packer.toBuffer(doc)
    const zip = await JSZip.loadAsync(buffer)
    const documentXml = await zip.file('word/document.xml')?.async('string')

    expect(documentXml).toBeDefined()
    expect(documentXml).toContain('<m:oMath>')
    expect(documentXml).toContain('<m:borderBox>')
    expect(documentXml).not.toContain('w:val="MdHeading1"')
    expect(documentXml).not.toMatch(/\\(?:text|boxed)|\\\[|\\\]/)
  })
})


function getDefaultMathExample() {
  const markdown = `# Math Equation Test

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

This document tests basic LaTeX math rendering.
`;
  return markdown;
}

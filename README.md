# MD to DOCX

MD to DOCX is a local-first Windows and web application for converting Markdown into editable Microsoft Word `.docx` files. It includes live preview, four synchronized themes, LaTeX equations, compatibility diagnostics, and safe normalization of copied AI artifacts.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

- Microsoft Store: <https://apps.microsoft.com/detail/9PHJ30FS06QH>
- Website: <https://md-ishtiak-ahmed-sajib.github.io/md-to-docx/>
- Privacy: [PRIVACY.md](./PRIVACY.md)
- Support: [SUPPORT.md](./SUPPORT.md)

## Project Provenance

This maintained fork is derived from [Vace's markdown-docx](https://github.com/vace/markdown-docx), an MIT-licensed TypeScript library for browser and Node.js Markdown-to-DOCX conversion.

- Original markdown-docx work: © 2025 Vace.
- Fork modifications, web compatibility features, Windows packaging, and documentation: © 2026 Md Ishtiak Ahmed Sajib.

The original MIT notice is preserved in [LICENSE](./LICENSE). Ownership and third-party attribution are detailed in [NOTICE](./NOTICE) and `THIRD_PARTY_NOTICES.txt`. The fork does not claim that upstream code was authored by its maintainer.

## Application Features

- Local Markdown editing, upload, preview, and DOCX export
- CommonMark and GitHub-Flavored Markdown, tables, tasks, footnotes, images, and links
- Inline `$...$` / `\(...\)` and display `$$...$$` / `\[...\]` LaTeX
- Native Word math, including boxed equations
- Default, Elegant, Academic, and Modern themes shared by preview and export
- AI chart metadata converted to editable tables
- Opaque AI citation artifacts removed and reported
- Syntax Help diagnostics for unsupported Markdown dialects
- English-only interface; user-authored documents can use any language
- No account, telemetry, ads, database, driver, or developer-operated backend

The Windows application bundles Electron, opens in its own sandboxed window, and serves static assets only on `127.0.0.1`. Closing the window quits the local server.

## Install on Windows 11

The recommended customer channel is Microsoft Store. Store packages support x64 and Arm64 and are signed by Microsoft after certification. No Node.js, IDE, driver, or administrator installer is required.

Current Microsoft Store release evidence and outstanding external gates are listed
in [RELEASE_STATUS.md](./RELEASE_STATUS.md).

The optional x64 GitHub installer is trusted only when Windows reports a valid, timestamped `SignPath Foundation` Authenticode signature. See [Share and Run](./share_%26_run.md).

## Repository Development

Requirements:

- Node.js 24.18.0
- Corepack
- Windows 11 for AppX/NSIS packaging

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm dev:web
```

Open <http://localhost:5173>. The pnpm workspace links `web/` to this repository's local `markdown-docx` package.

Verification and production builds:

```powershell
corepack pnpm ts-check
corepack pnpm exec vitest run --reporter=verbose
corepack pnpm build:web
corepack pnpm check:store
corepack pnpm build:store
corepack pnpm build:installer:win
```

Outputs:

```text
release/store/MD-to-DOCX-1.7.0-x64.appx
release/store/MD-to-DOCX-1.7.0-arm64.appx
release/MD-to-DOCX-Setup-1.7.0-x64.exe
```

Unsigned AppX files are private Partner Center submission inputs. Do not present them as customer downloads. See [STORE_SUBMISSION.md](./STORE_SUBMISSION.md) and [RELEASE.md](./RELEASE.md).

## Markdown Compatibility

Preview and DOCX export use the same derived Markdown while leaving editor/upload source unchanged.

Fully supported syntax includes headings, paragraphs, emphasis, strikethrough, lists, tasks, tables, blockquotes, code, autolinks, images, links, footnotes, and LaTeX. Delimiters inside escaped input, inline code, fenced code, and indented code remain literal.

The web application additionally handles private copied-AI envelopes:

- Valid `charts_widget_v2` data becomes an editable table.
- Unresolvable `cite` and `filecite` markers are removed and reported.
- Complete unknown envelopes become neutral placeholders.
- Malformed envelopes remain visible with line-numbered warnings.

Mermaid, PlantUML, and Graphviz fences remain code; GitHub alerts become normal blockquotes. YAML front matter, definition lists, Pandoc citations, heading attributes, fenced divs, highlights, and third-party super/subscript extensions remain literal and are diagnosed. Replace private citation IDs with normal Markdown links or footnotes.

## Library Package

The root package remains API-compatible with the upstream `markdown-docx` library. This fork does not introduce new public options or types for its application-only compatibility pipeline.

```bash
pnpm add markdown-docx
```

```js
import fs from 'node:fs/promises'
import markdownDocx, { Packer } from 'markdown-docx'

const markdown = await fs.readFile('input.md', 'utf8')
const document = await markdownDocx(markdown)
const buffer = await Packer.toBuffer(document)
await fs.writeFile('output.docx', buffer)
```

Browser export:

```js
import markdownDocx, { Packer } from 'markdown-docx'

const document = await markdownDocx('# Hello')
const blob = await Packer.toBlob(document)
```

Common options include `imageAdapter`, `ignoreImage`, `ignoreFootnote`, `ignoreHtml`, Marked options such as `gfm`, `math`, and `theme`. See [examples/sample-config.json](./examples/sample-config.json) for a complete theme example.

### Equations

```markdown
Inline: \(\rho_1 \approx \rho_2\) or $E=mc^2$

\[
\boxed{Q_1=Q_2}
\]
```

KaTeX is the default math engine and converts supported expressions to native Word math. Fenced `math`, `latex`, and `katex` blocks are also supported. `libreOfficeCompat: true` uses simpler structures where LibreOffice has incomplete OMML support.

### Theme Example

```js
const document = await markdownDocx(markdown, {
  theme: {
    heading1: '5B21B6',
    link: '0563C1',
    bodySize: 12,
    lineSpacing: 1.15,
    margin: '2cm 2.5cm',
    collapseEmptyLines: false,
  },
})
```

## Command-Line Interface

```bash
markdown-docx --input input.md --output output.docx
markdown-docx -i input.md -c examples/sample-config.json
markdown-docx help theme
markdown-docx help config
```

## Open-Source Maintenance

- Contributions: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Security: [SECURITY.md](./SECURITY.md)
- Privacy: [PRIVACY.md](./PRIVACY.md)
- Code signing: [CODE_SIGNING_POLICY.md](./CODE_SIGNING_POLICY.md)
- Release process: [RELEASE.md](./RELEASE.md)
- Direct signing setup: [SIGNPATH_SETUP.md](./SIGNPATH_SETUP.md)

MD to DOCX is distributed under the MIT License without warranty. Microsoft, Windows, Microsoft Store, Word, and DOCX are trademarks of the Microsoft group of companies. This project is not affiliated with or endorsed by Microsoft.

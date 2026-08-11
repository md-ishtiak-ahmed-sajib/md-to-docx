# Microsoft Store Submission Guide — MD to DOCX 1.7.0

This is the source-of-truth checklist for Partner Center Submission 1.

## Immutable Product Identity

| Field | Exact value |
| --- | --- |
| Package/Identity/Name | `Sajib-Civil-Engineer-BD.md-to-docx` |
| Package/Identity/Publisher | `CN=5F94008D-1A8C-4CB5-AB4F-7470ED48FD13` |
| Publisher display name | `Sajib-Civil-Engineer-BD` |
| Application ID | `MDToDOCX` |
| Store ID | `9PHJ30FS06QH` |
| Store URL | <https://apps.microsoft.com/detail/9PHJ30FS06QH> |
| Store package version | `1.7.0.0` |

Do not substitute account Seller IDs, package SIDs, MSA application IDs, email addresses, or postal information in the package manifest.

## Before Building

1. In **Manage app names**, reserve `MD to DOCX`. Do not submit until the reservation succeeds.
2. Install the locked workspace with Node.js 24.18.0 and pnpm 10.6.5.
3. Run `corepack pnpm check:store`, TypeScript checks, and all Vitest tests.
4. Build with `corepack pnpm build:store`.
5. Confirm the smoke scripts validate both AppX manifests and resources.
6. Do not sign Partner Center upload copies. Microsoft signs packages after certification.

Local package commands:

```powershell
corepack pnpm store:inspect
corepack pnpm store:sign:test
corepack pnpm store:install:test
corepack pnpm store:certify
corepack pnpm store:remove:test
```

`store:sign:test` creates separate copies in `release/store/local-test`, places the public certificate in the current user's Trusted People store for inspection, and removes the temporary private key. Never upload a `local-test` package to Partner Center. Windows requires an elevated terminal to place a test certificate in the local-machine Trusted People store, so run `store:install:test`, `store:certify`, and the final `store:remove:test` from **PowerShell opened with Run as administrator**. This elevation applies only to developer sideload/WACK testing; customers installing through Microsoft Store do not receive an administrator prompt. `store:certify` writes its report under `release/certification`.

## Pricing and Properties

- Price: Free
- Markets: All available markets
- Visibility: Public after the restricted-flight check
- Category: Productivity
- Language: English (`en-US`)
- Device family: Windows 10/11 Desktop only
- Minimum supported OS: Windows 11 build 22000
- Architectures: x64 and Arm64
- Accounts/login: None
- Ads, in-app purchases, subscriptions: None
- Drivers, NT services, background startup: None
- Existing IARC rating: retain only after confirming answers remain accurate

Leave Mobile, Xbox, Team, Mixed Reality, and unrelated future-device boxes unchecked.

## Store Listing Copy

### Short description

Convert Markdown into editable Word documents locally with live preview, themes, tables, equations, and compatibility diagnostics.

### Description

MD to DOCX is a local-first Markdown editor and Microsoft Word document converter. Type, paste, or open Markdown, inspect the live preview, select a document theme, and export an editable DOCX file.

The app supports CommonMark and GitHub-Flavored Markdown, headings, lists, task lists, tables, code, links, images, footnotes, and LaTeX equations. Its compatibility diagnostics identify unsupported Markdown dialects and safely normalize copied AI chart metadata and unusable private citation markers without rewriting your original editor text.

Your documents are processed on your device. No account, telemetry, advertising, subscription, cloud storage, database, driver, or separate server is required. Remote images or links are contacted only when they are present in content you provide or when you choose to open them.

MD to DOCX is open-source software derived from Vace's markdown-docx project and distributed under the MIT License.

### Features

- Local Markdown editing and DOCX export
- Matching live preview and export pipeline
- Four synchronized document themes
- Tables, tasks, footnotes, images, and links
- Inline and display LaTeX equations
- AI artifact cleanup and compatibility diagnostics
- English-only interface with no account or telemetry
- Offline operation for documents without remote resources

### Keywords

`Markdown`, `DOCX`, `Word converter`, `document export`, `Markdown editor`, `LaTeX`, `offline`

### Additional information

- Developed by: `Md Ishtiak Ahmed Sajib`
- Published by: `Sajib-Civil-Engineer-BD` (automatic)
- Copyright: `© 2026 Md Ishtiak Ahmed Sajib. Based on markdown-docx © 2025 Vace; licensed under MIT.`
- License terms: <https://github.com/md-ishtiak-ahmed-sajib/md-to-docx/blob/main/LICENSE>
- Website: <https://md-ishtiak-ahmed-sajib.github.io/md-to-docx/>
- Privacy: <https://md-ishtiak-ahmed-sajib.github.io/md-to-docx/privacy.html>
- Support: <https://md-ishtiak-ahmed-sajib.github.io/md-to-docx/support.html>
- Support email: `ishtiaksajib.duengg@bec.edu.bd`

Do not enter a phone number or postal address in public listing text.

## Screenshot Set

Upload at least these four clean English screenshots without private documents or account information:

1. Default template with editor and live preview.
2. A themed document with headings and a table.
3. Inline/display LaTeX, including a boxed equation.
4. Compatibility banner and Syntax Help diagnostics, followed by successful DOCX export.

## Notes for Certification

MD to DOCX is an Electron full-trust desktop application, which is why the package declares `runFullTrust`. It starts an ephemeral static server bound only to `127.0.0.1` on ports 48173–48182 and displays it in a sandboxed Electron window. The server has no upload API and terminates when the window closes.

No credentials are required. To test:

1. Launch the app and confirm the default Markdown preview appears.
2. Select each theme and confirm preview colors change.
3. Open Syntax Help and close it.
4. Paste `\[\boxed{Q_1=Q_2}\]` and confirm rendered math.
5. Select Download DOCX, export with the active theme, and open the resulting file.
6. Launch the app a second time and confirm the existing window is focused.
7. Close the window and confirm the process and loopback listener stop.

The app has no login, backend, telemetry, updater, driver, service, or automatic startup. It can request remote images only when supplied in user Markdown and opens user-activated web/email links in the default system handler.

## Upload and Rollout

Upload both unsigned files to the same submission:

- `release/store/MD-to-DOCX-1.7.0-x64.appx`
- `release/store/MD-to-DOCX-1.7.0-arm64.appx`

Complete all listing and privacy fields, use a restricted flight for the exact final packages, review certification results, and then make the unchanged certified submission public worldwide. Any corrected package must use a higher four-part Store version and pass the full release checklist again.

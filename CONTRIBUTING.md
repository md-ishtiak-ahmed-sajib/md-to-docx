# Contributing to MD to DOCX

Thank you for improving this maintained fork.

## Before Opening a Change

1. Search existing issues and upstream `vace/markdown-docx` work to avoid duplication.
2. Open an issue for a large behavioral change or public API proposal.
3. Keep upstream attribution and MIT notices intact.
4. Do not commit private documents, credentials, signing certificates, Partner Center account data, generated installers, or secrets.

## Development

Use Node.js 24.18.0 and the repository-pinned pnpm 10.6.5:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm ts-check
corepack pnpm exec vitest run --reporter=verbose
corepack pnpm build:web
```

Store or installer changes must also pass `corepack pnpm check:store` and the relevant Windows package build.

## Pull Requests

- Explain the problem and observable behavior.
- Add focused tests for new behavior and regressions.
- Avoid unrelated formatting or generated-output changes.
- State whether the change affects the library, web app, Store package, privacy behavior, or licenses.
- Confirm that submitted code can be distributed under this repository's MIT License.

The maintainer reviews non-committer contributions. Security reports follow [SECURITY.md](./SECURITY.md), not public pull requests.

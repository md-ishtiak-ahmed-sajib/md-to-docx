# MD to DOCX Release Process

## Versioning

The root, web, and desktop package versions must match. Version `1.7.0` maps to Microsoft Store version `1.7.0.0`. Increment the semantic version before each release; never reuse a Store package version.

## Preflight

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm check:store
corepack pnpm ts-check
corepack pnpm exec vitest run --reporter=verbose
corepack pnpm build:web
corepack pnpm release:metadata
```

## Microsoft Store

1. Build `corepack pnpm build:store` on Windows.
2. Confirm both AppX smoke checks pass.
3. Locally self-sign test copies only; never alter the Partner Center submission files after validation.
   Use `corepack pnpm store:sign:test` so the temporary private key is removed automatically. Developer sideload installation and WACK require an elevated, active PowerShell session; run `store:install:test`, `store:certify`, then `store:remove:test` there. These commands select the native x64 or Arm64 package automatically. Store customers do not need elevation.
4. Install and test on clean Windows 11 x64 and Arm64 environments.
5. Run Windows App Certification Kit from Windows SDK 10.0.26100 or newer and retain the HTML/XML report with an overall `PASS` result.
6. Upload both unsigned AppX files to the same Partner Center submission.
7. Use a restricted flight before public availability.
8. Microsoft signs and distributes packages that pass certification.

Run `corepack pnpm store:inspect` before signing and `corepack pnpm store:certify` against the signed test copy on each native architecture. Retain both architecture-labeled WACK XML reports with the release evidence.

Unsigned AppX workflow artifacts are submission inputs, not public downloads.

## Direct Installer

1. Build `corepack pnpm build:installer:win`.
2. Confirm the local artifact is explicitly labeled unsigned.
3. Create and push a protected `v<version>` tag only after all checks pass.
4. Approve the SignPath request after confirming tag and workflow provenance.
5. CI verifies the returned signature and publishes the installer plus SHA-256 checksum.

If SignPath has not approved the project, do not publish a direct installer as trusted. Microsoft Store remains the trusted distribution channel.

## Rollback

Stop a Store rollout or remove a compromised GitHub release immediately. Publish a fixed build with a higher version; never replace an already submitted binary at the same URL or version.

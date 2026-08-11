# Complete the MD to DOCX Store Release

Last verified: 2026-08-11  
Release: MD to DOCX 1.7.0  
Microsoft Store package version: 1.7.0.0  
Store ID: 9PHJ30FS06QH

This document records release evidence separately from the reusable procedures in
[RELEASE.md](./RELEASE.md) and [STORE_SUBMISSION.md](./STORE_SUBMISSION.md).

## Completed and Verified

- [x] The public provenance-preserving fork is available at
  <https://github.com/md-ishtiak-ahmed-sajib/md-to-docx>.
- [x] GitHub MFA is enabled for the maintainer account.
- [x] GitHub Pages is public over HTTPS at
  <https://md-ishtiak-ahmed-sajib.github.io/md-to-docx/>.
- [x] The active `refs/tags/v*` repository ruleset prevents release-tag updates
  and deletion without a bypass.
- [x] `MD to DOCX` is reserved and used as the Partner Center dashboard name.
- [x] Package identity `Sajib-Civil-Engineer-BD.md-to-docx`, publisher
  `CN=5F94008D-1A8C-4CB5-AB4F-7470ED48FD13`, and version `1.7.0.0` pass the
  repository validation scripts.
- [x] The x64 and Arm64 AppX files pass manifest, architecture, resource, and
  package smoke inspection.
- [x] The unsigned x64 NSIS installer passes its smoke test.
- [x] The Store workflow passed on commit `17bce389d9ba509439ba8fe2b0b1e7772c88875c`:
  <https://github.com/md-ishtiak-ahmed-sajib/md-to-docx/actions/runs/31494839159>.
- [x] The current Windows App Certification Kit completed a full native x64 run:
  WACK `10.0.28000.2526`, `PARTIAL_RUN=FALSE`, `OVERALL_RESULT=PASS`.
- [x] The current x64 WACK report is retained locally at
  `release/certification/WACK-1.7.0-x64-sdk-10.0.28000.2526-20260811-191655-199.xml`
  with SHA-256
  `C0D968ABFD615D0DC3AE303322F5CA5AE4342330EA2E717569296C500FD9BC3D`.
- [x] The x64 sideload test package and temporary test certificates were removed
  after certification.
- [x] Privacy, support, licensing, upstream attribution, third-party notices,
  release procedures, Store copy, certification notes, and four Store screenshots
  are present.

The x64 WACK report contains an optional Electron/Chromium blocked-executable
diagnostic. The authoritative report result is `PASS`, and there are no required
test failures. Retain the complete report for Microsoft certification review.

## In Progress

- [ ] Upload the original unsigned x64 and Arm64 AppX files to Partner Center
  Submission 1 and wait for package validation.
- [ ] Select Windows 10/11 Desktop only and disable automatic future-device-family
  selection.
- [ ] Complete the English Store listing and upload the four prepared screenshots.
- [ ] Add the supplied certification notes and save the draft submission.

Do not upload anything under `release/store/local-test`.

## External Release Gates

- [ ] Test installation, launch, editing, preview, themes, upload, equations,
  compatibility diagnostics, DOCX export, second-instance focus, close/quit,
  upgrade, and uninstall on a clean Windows 11 x64 machine without Node.js.
- [ ] Repeat sideload, functional, loopback-listener, cleanup, and WACK testing on
  a native Windows 11 Arm64 machine or VM. An x64 host cannot certify Arm64 runtime
  behavior.
- [ ] Submit the exact final packages to a restricted Partner Center flight and
  resolve any certification feedback using a higher four-part version.
- [ ] After the restricted flight passes, publish the unchanged certified
  submission worldwide and verify the public Store listing for ID `9PHJ30FS06QH`.
- [ ] Complete SignPath Foundation enrollment and approval for the public fork,
  configure the five repository secrets, and require manual signing approval.
- [ ] Only after SignPath approval, create the protected `v1.7.0` tag, verify the
  timestamped `SignPath Foundation` signatures, and publish the GitHub installer.

The Store release does not depend on SignPath. Until SignPath approval is complete,
the NSIS file remains an explicitly unsigned developer build and must not be
presented as a trusted public installer.

## Local Housekeeping

Five generated `.docx` fixtures may appear modified after the test suite. They are
not Store release inputs and must be reviewed separately before a source commit:

- `tests/list-complex.docx`
- `tests/list-number-restart.docx`
- `tests/markdown.docx`
- `tests/math-example-from-file.docx`
- `tests/test-math-comprehensive.docx`

## Release Completion Definition

Version 1.7.0 is complete only when both architectures pass clean-machine testing,
Partner Center accepts the packages, the restricted flight and Microsoft
certification pass, and the public Store page is available. The optional GitHub
installer is complete only after its separate SignPath signature gate passes.

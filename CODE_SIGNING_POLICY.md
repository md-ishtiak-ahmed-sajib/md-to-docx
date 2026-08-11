# MD to DOCX Code-Signing Policy

MD to DOCX has two independent distribution and signing channels.

## Microsoft Store AppX

- Identity name: `Sajib-Civil-Engineer-BD.md-to-docx`
- Publisher subject: `CN=5F94008D-1A8C-4CB5-AB4F-7470ED48FD13`
- Application ID: `MDToDOCX`
- Architectures: x64 and Arm64

CI creates unsigned AppX submission artifacts from public source. Microsoft verifies and re-signs successful Store submissions. No production Store private key is owned or stored by this project.

A temporary self-signed certificate may be created for local sideload and certification testing. Its subject must exactly equal the publisher subject above. Test private keys and passwords must never be committed, uploaded as public artifacts, or reused for releases.

## Direct NSIS Installer

Free trusted direct-installer signing is requested through SignPath.io using a certificate issued to SignPath Foundation.

- Product: `MD to DOCX`
- Executable: `MD-to-DOCX.exe`
- Installer: `MD-to-DOCX-Setup-<version>-x64.exe`
- Source: <https://github.com/md-ishtiak-ahmed-sajib/md-to-docx>
- License: MIT

Only artifacts built by the tag-triggered GitHub-hosted Windows workflow are eligible. Pull-request builds, local builds, and modified downloads are never release-signing inputs.

## Maintainer Roles

- Maintainer and committer: Md Ishtiak Ahmed Sajib (`md-ishtiak-ahmed-sajib`)
- Reviewer: Md Ishtiak Ahmed Sajib (`md-ishtiak-ahmed-sajib`)
- Signing approver: Md Ishtiak Ahmed Sajib (`md-ishtiak-ahmed-sajib`)

Additional people must be named here before receiving repository or signing permissions. Every participant must use MFA for GitHub and SignPath. Contributions from non-committers require maintainer review before merge.

## Release Controls

- Signed artifacts originate from a protected public release tag.
- GitHub-hosted runners install the locked dependency graph and run all tests.
- The unsigned artifact is uploaded before SignPath receives the request, preserving origin verification.
- SignPath signing requires manual approval.
- Service identifiers and credentials exist only as GitHub Actions secrets.
- CI verifies publisher, signature status, timestamp, product version, nested executable, and SHA-256 before publishing.
- A release is removed and, where possible, revoked when source or build provenance cannot be verified.

SignPath Foundation approval is external and is not represented as complete until a release actually passes signature verification.

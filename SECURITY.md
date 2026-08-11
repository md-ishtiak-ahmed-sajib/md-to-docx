# Security Policy

## Supported Releases

Security fixes are provided for the latest Microsoft Store release and latest tagged direct-installer release of MD to DOCX.

## Reporting a Vulnerability

Do not disclose an unpatched vulnerability in a public issue. Use **Security → Report a vulnerability** in the public GitHub repository:

<https://github.com/md-ishtiak-ahmed-sajib/md-to-docx/security/advisories/new>

If private vulnerability reporting is temporarily unavailable, email [ishtiaksajib.duengg@bec.edu.bd](mailto:ishtiaksajib.duengg@bec.edu.bd) with the subject `MD to DOCX security report`. Do not attach private Markdown documents unless they are essential and have been redacted.

Include the affected version, Windows architecture, reproduction steps, impact, and any proposed mitigation. The maintainer will acknowledge the report, investigate it, coordinate disclosure, and release the smallest safe fix.

## Security Architecture

- The desktop interface is served only on `127.0.0.1` and never on a LAN address.
- The server accepts only `GET` and `HEAD`, blocks traversal, supplies restrictive security headers, and has no document-upload endpoint.
- Electron renderers have Node integration disabled, context isolation and sandboxing enabled, and unused permissions denied.
- External navigation is restricted to user-activated `http`, `https`, and `mailto` destinations.
- The application downloads no executable code and has no updater outside Microsoft Store.

## Release Integrity

Microsoft signs and distributes the Store AppX packages after certification. Store packages offered elsewhere are not official end-user releases.

The optional direct NSIS installer is trusted only when it has a valid timestamped Authenticode signature from `SignPath Foundation`, a matching public source tag and GitHub Actions provenance, and a published SHA-256 checksum. Local unsigned builds are development artifacts.

# SignPath Foundation Setup for Direct Releases

SignPath applies only to the optional GitHub-hosted NSIS installer. Microsoft signs the Store AppX packages separately after certification.

## Eligibility Preparation

1. Create a visible GitHub fork at <https://github.com/md-ishtiak-ahmed-sajib/md-to-docx> rather than uploading a detached copy.
2. Keep the MIT license, upstream history/provenance, complete source, build scripts, privacy policy, security policy, notices, and [code-signing policy](./CODE_SIGNING_POLICY.md) public.
3. Enable MFA, private vulnerability reporting, branch protection, and protected release tags.
4. Publish an honestly labeled unsigned release candidate in the same NSIS format requested for signing.
5. Keep the project actively maintained and document its function and releases.

Review the current [SignPath Foundation conditions](https://signpath.org/terms.html) before applying. Approval is external and is not guaranteed. A free Foundation certificate displays `SignPath Foundation` as publisher.

## Project Configuration

After approval:

1. Install the SignPath GitHub App for the fork.
2. Register GitHub Actions as the trusted build system with origin verification.
3. Create a release policy requiring manual approval.
4. Require one `MD-to-DOCX-Setup-<version>-x64.exe` at the artifact root.
5. Sign the packaged `MD-to-DOCX.exe`, applicable Electron/NSIS helpers, and the outer installer from inside out.
6. Enforce product name `MD to DOCX` and source-version matching.
7. Create a least-privilege API token that can only submit this project's requests.

## GitHub Secrets

| Secret | Purpose |
| --- | --- |
| `SIGNPATH_API_TOKEN` | Restricted signing-request token |
| `SIGNPATH_ORGANIZATION_ID` | Approved SignPath organization |
| `SIGNPATH_PROJECT_SLUG` | Approved project |
| `SIGNPATH_SIGNING_POLICY_SLUG` | Manual-approval release policy |
| `SIGNPATH_ARTIFACT_CONFIGURATION_SLUG` | NSIS artifact configuration |

Never commit these values.

## Release and Verification

Push a protected tag matching the source version, such as `v1.7.0`. The Windows workflow tests and builds the unsigned installer, submits it, waits for approval, and verifies the returned installer before publishing.

```powershell
$installer = 'MD-to-DOCX-Setup-1.7.0-x64.exe'
Get-AuthenticodeSignature -LiteralPath $installer | Format-List Status,StatusMessage,SignerCertificate,TimeStamperCertificate
Get-FileHash -LiteralPath $installer -Algorithm SHA256
```

The status must be `Valid`, the signer subject must contain `SignPath Foundation`, and the signature must have a timestamp. If SignPath does not approve the fork, the free trusted distribution path is Microsoft Store; local NSIS builds remain unsigned development artifacts.

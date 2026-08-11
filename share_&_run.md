# Share and Run MD to DOCX

## Recommended: Microsoft Store

Once publication is complete, send your friend this Store page:

<https://apps.microsoft.com/detail/9PHJ30FS06QH>

Select **Install**, then launch **MD to DOCX** from Start. Microsoft Store installs the correct x64 or Arm64 package, verifies the signature, and supplies updates. Store installation is per user and does not require a separate administrator installer.

The installed application includes Electron and all web assets. Your friend does not need Node.js, pnpm, PowerShell commands, an IDE, Git, Python, a database, a driver, or a separate server. Microsoft Word or another DOCX reader is needed only to open exported files.

The app runs in its own window. Closing that window quits the loopback server. It listens only on `127.0.0.1`, not the internet or local network.

## Optional: Signed Direct Installer

For a Windows 11 x64 computer, share both release files:

```text
MD-to-DOCX-Setup-1.7.0-x64.exe
MD-to-DOCX-Setup-1.7.0-x64.exe.sha256
```

Use only the matching GitHub Release. Before describing it as trusted, verify that Windows reports a valid, timestamped `SignPath Foundation` signature. Developer-built installers are unsigned and may show a SmartScreen warning.

The direct installer is one-click, requests UAC because it installs for all users, creates Start/Desktop shortcuts, and opens MD to DOCX after installation. Uninstall it through **Settings → Apps → Installed apps → MD to DOCX**.

## Developer: Build Packages

On Windows with Node.js 24.18.0 and Corepack:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm build:store
corepack pnpm build:installer:win
```

Outputs:

```text
release\store\MD-to-DOCX-1.7.0-x64.appx
release\store\MD-to-DOCX-1.7.0-arm64.appx
release\MD-to-DOCX-Setup-1.7.0-x64.exe
```

Store AppX files are unsigned Partner Center inputs, not friend-facing sideload downloads. See [STORE_SUBMISSION.md](./STORE_SUBMISSION.md), [RELEASE.md](./RELEASE.md), and [SIGNPATH_SETUP.md](./SIGNPATH_SETUP.md).

## Developer Fallback: Run from Source

Share a ZIP of the repository excluding `node_modules`, `dist`, `web/dist`, `release`, `pages-dist`, `.git`, and `coverage`. On the receiving computer:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm build:web
corepack pnpm --filter web run preview --host 127.0.0.1 --port 5173
```

Open <http://localhost:5173>. Keep the terminal open while using the app and press `Ctrl+C` to stop it.

If PowerShell script policy blocks a command, use `corepack.cmd` instead of `corepack`. If port 5173 is occupied, replace it with 5174 in both the command and browser address.

Source users need Node.js 24.18.0, Corepack, internet access for the first dependency installation, and a modern browser. An IDE is not required.

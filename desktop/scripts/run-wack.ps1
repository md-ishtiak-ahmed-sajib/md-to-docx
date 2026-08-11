[CmdletBinding()]
param(
    [string] $PackagePath,
    [string] $ReportPath
)

$ErrorActionPreference = 'Stop'

$repositoryDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$desktopPackage = Get-Content (Join-Path $repositoryDirectory 'desktop\package.json') -Raw | ConvertFrom-Json

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Windows App Certification Kit must run from an elevated command window in an active user session. Reopen PowerShell with 'Run as administrator' and run 'corepack pnpm store:certify'."
}

if (-not $PackagePath) {
    $PackagePath = Join-Path $repositoryDirectory "release\store\local-test\MD-to-DOCX-$($desktopPackage.version)-x64-local-test.appx"
}
if (-not $ReportPath) {
    $ReportPath = Join-Path $repositoryDirectory "release\certification\WACK-$($desktopPackage.version)-x64.xml"
}

if (-not (Test-Path -LiteralPath $PackagePath -PathType Leaf)) {
    throw "Signed test package not found: $PackagePath. Run 'corepack pnpm store:sign:test' first."
}

$publisher = 'CN=5F94008D-1A8C-4CB5-AB4F-7470ED48FD13'
$signature = Get-AuthenticodeSignature -LiteralPath $PackagePath
if (-not $signature.SignerCertificate -or $signature.SignerCertificate.Subject -ne $publisher -or $signature.Status -in @('NotSigned', 'HashMismatch')) {
    throw "WACK requires a signed test package with the Store publisher identity. Signature status: $($signature.Status)."
}

$appCert = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\App Certification Kit\appcert.exe'
if (-not (Test-Path -LiteralPath $appCert -PathType Leaf)) {
    throw 'Windows App Certification Kit was not found. Install the current Windows SDK with App Certification Kit.'
}

New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($ReportPath)) -Force | Out-Null

Write-Host 'Resetting Windows App Certification Kit state...'
& $appCert reset
if ($LASTEXITCODE -ne 0) {
    throw "WACK reset failed with exit code $LASTEXITCODE."
}

Write-Host "Testing $PackagePath"
& $appCert test -appxpackagepath $PackagePath -reportoutputpath $ReportPath
if ($LASTEXITCODE -ne 0) {
    throw "WACK failed with exit code $LASTEXITCODE. Review $ReportPath."
}

if (-not (Test-Path -LiteralPath $ReportPath -PathType Leaf)) {
    throw "WACK completed without producing the expected report: $ReportPath"
}

Write-Host "WACK report: $ReportPath"

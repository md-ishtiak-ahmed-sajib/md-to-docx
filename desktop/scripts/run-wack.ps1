[CmdletBinding()]
param(
    [string] $PackagePath,
    [string] $ReportPath,
    [ValidateSet('x64', 'arm64')]
    [string] $Architecture
)

$ErrorActionPreference = 'Stop'

$repositoryDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$desktopPackage = Get-Content (Join-Path $repositoryDirectory 'desktop\package.json') -Raw | ConvertFrom-Json

function Get-NativePackageArchitecture {
    if ($Architecture) {
        return $Architecture
    }

    if ($PackagePath -and ([IO.Path]::GetFileName($PackagePath) -match '(?i)-(x64|arm64)(?:-local-test)?\.appx$')) {
        return $Matches[1].ToLowerInvariant()
    }

    # PROCESSOR_ARCHITEW6432 reports the native architecture when this script
    # runs from an emulated x64 PowerShell process on Windows Arm64.
    $nativeArchitecture = if ($env:PROCESSOR_ARCHITEW6432) {
        $env:PROCESSOR_ARCHITEW6432
    }
    else {
        $env:PROCESSOR_ARCHITECTURE
    }

    if ($nativeArchitecture -eq 'ARM64') { return 'arm64' }
    return 'x64'
}

$targetArchitecture = Get-NativePackageArchitecture

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Windows App Certification Kit must run from an elevated command window in an active user session. Reopen PowerShell with 'Run as administrator' and run 'corepack pnpm store:certify'."
}

if (-not $PackagePath) {
    $PackagePath = Join-Path $repositoryDirectory "release\store\local-test\MD-to-DOCX-$($desktopPackage.version)-$targetArchitecture-local-test.appx"
}
if (-not $ReportPath) {
    $ReportPath = Join-Path $repositoryDirectory "release\certification\WACK-$($desktopPackage.version)-$targetArchitecture.xml"
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

$minimumWackVersion = [version] '10.0.26100.0'
$wackVersionInfo = [Diagnostics.FileVersionInfo]::GetVersionInfo($appCert)
$wackVersion = [version]::new(
    $wackVersionInfo.FileMajorPart,
    $wackVersionInfo.FileMinorPart,
    $wackVersionInfo.FileBuildPart,
    $wackVersionInfo.FilePrivatePart
)
if ($wackVersion -lt $minimumWackVersion) {
    throw "Windows App Certification Kit $wackVersion is outdated. Install the current Windows SDK (10.0.26100 or newer) and rerun 'corepack pnpm store:certify'."
}
Write-Host "Windows App Certification Kit version: $wackVersion"

New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($ReportPath)) -Force | Out-Null

Write-Host 'Resetting Windows App Certification Kit state...'
& $appCert reset
if ($LASTEXITCODE -ne 0) {
    throw "WACK reset failed with exit code $LASTEXITCODE."
}

Write-Host "Testing $targetArchitecture package: $PackagePath"
& $appCert test -appxpackagepath $PackagePath -reportoutputpath $ReportPath
if ($LASTEXITCODE -ne 0) {
    throw "WACK failed with exit code $LASTEXITCODE. Review $ReportPath."
}

if (-not (Test-Path -LiteralPath $ReportPath -PathType Leaf)) {
    throw "WACK completed without producing the expected report: $ReportPath"
}

[xml] $wackReport = Get-Content -LiteralPath $ReportPath -Raw
if ($wackReport.REPORT.OVERALL_RESULT -ne 'PASS') {
    throw "WACK did not pass. Overall result: $($wackReport.REPORT.OVERALL_RESULT). Review $ReportPath."
}

$optionalFailures = @($wackReport.SelectNodes("//TEST[@OPTIONAL='TRUE' and RESULT='FAIL']"))
foreach ($optionalFailure in $optionalFailures) {
    Write-Warning "Optional WACK test reported a failure: $($optionalFailure.NAME). The overall result remains PASS; retain the complete report for certification review."
}

Write-Host 'WACK overall result: PASS'
Write-Host "WACK report: $ReportPath"

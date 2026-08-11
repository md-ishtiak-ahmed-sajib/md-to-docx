[CmdletBinding()]
param(
    [string[]] $PackagePath,
    [switch] $Install
)

$ErrorActionPreference = 'Stop'

$publisher = 'CN=5F94008D-1A8C-4CB5-AB4F-7470ED48FD13'
$repositoryDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$desktopPackage = Get-Content (Join-Path $repositoryDirectory 'desktop\package.json') -Raw | ConvertFrom-Json
$sourceDirectory = Join-Path $repositoryDirectory 'release\store'
$outputDirectory = Join-Path $sourceDirectory 'local-test'
$thumbprintPath = Join-Path $outputDirectory 'certificate-thumbprint.txt'

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Find-WindowsSdkTool([string] $Name) {
    $sdkRoot = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'
    $candidate = Get-ChildItem -LiteralPath $sdkRoot -Directory |
        Where-Object Name -Match '^\d+\.\d+\.\d+\.\d+$' |
        Sort-Object Name -Descending |
        ForEach-Object { Join-Path $_.FullName "x64\$Name" } |
        Where-Object { Test-Path -LiteralPath $_ } |
        Select-Object -First 1

    if (-not $candidate) {
        throw "$Name was not found. Install the current Windows SDK."
    }
    return $candidate
}

if (-not $PackagePath -or $PackagePath.Count -eq 0) {
    if ($Install) {
        $localArchitecture = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
        $PackagePath = @((Join-Path $sourceDirectory "MD-to-DOCX-$($desktopPackage.version)-$localArchitecture.appx"))
    }
    else {
        $PackagePath = @(
            (Join-Path $sourceDirectory "MD-to-DOCX-$($desktopPackage.version)-x64.appx"),
            (Join-Path $sourceDirectory "MD-to-DOCX-$($desktopPackage.version)-arm64.appx")
        )
    }
}

foreach ($package in $PackagePath) {
    if (-not (Test-Path -LiteralPath $package -PathType Leaf)) {
        throw "Store package not found: $package"
    }
}

$signTool = Find-WindowsSdkTool 'signtool.exe'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

if ($Install -and -not (Test-IsAdministrator)) {
    throw "Local AppX installation requires an elevated PowerShell session because Windows requires the test certificate in LocalMachine\TrustedPeople. Reopen PowerShell with 'Run as administrator' and run 'corepack pnpm store:install:test'. Microsoft Store installation does not require this developer-only step."
}

if (Test-Path -LiteralPath $thumbprintPath -PathType Leaf) {
    $previousThumbprint = (Get-Content -LiteralPath $thumbprintPath -Raw).Trim()
    if ($previousThumbprint -match '^[A-Fa-f0-9]{40}$') {
        foreach ($store in @('TrustedPeople')) {
            $previousCertificatePath = "Cert:\CurrentUser\$store\$previousThumbprint"
            if (Test-Path -LiteralPath $previousCertificatePath) {
                Remove-Item -LiteralPath $previousCertificatePath -Force
            }
        }
    }
}

$certificate = New-SelfSignedCertificate `
    -Type Custom `
    -Subject $publisher `
    -CertStoreLocation 'Cert:\CurrentUser\My' `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -HashAlgorithm SHA256 `
    -KeyUsage DigitalSignature `
    -TextExtension @('2.5.29.37={text}1.3.6.1.5.5.7.3.3') `
    -NotAfter (Get-Date).AddDays(2) `
    -FriendlyName 'MD to DOCX temporary local test certificate'

$publicCertificatePath = Join-Path $outputDirectory 'MD-to-DOCX-local-test.cer'

try {
    Export-Certificate -Cert $certificate -FilePath $publicCertificatePath -Force | Out-Null
    Import-Certificate -FilePath $publicCertificatePath -CertStoreLocation 'Cert:\CurrentUser\TrustedPeople' | Out-Null
    if ($Install) {
        & certutil.exe -addstore -f TrustedPeople $publicCertificatePath | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw 'CertUtil could not add the public test certificate to LocalMachine\TrustedPeople.'
        }
    }
    Set-Content -LiteralPath $thumbprintPath -Value $certificate.Thumbprint -Encoding ascii

    foreach ($package in $PackagePath) {
        $source = (Resolve-Path -LiteralPath $package).Path
        $destinationName = "{0}-local-test{1}" -f [IO.Path]::GetFileNameWithoutExtension($source), [IO.Path]::GetExtension($source)
        $destination = Join-Path $outputDirectory $destinationName
        Copy-Item -LiteralPath $source -Destination $destination -Force

        & $signTool sign /fd SHA256 /sha1 $certificate.Thumbprint /s My $destination
        if ($LASTEXITCODE -ne 0) {
            throw "SignTool failed for $destination with exit code $LASTEXITCODE."
        }

        $signature = Get-AuthenticodeSignature -LiteralPath $destination
        if (-not $signature.SignerCertificate -or $signature.SignerCertificate.Subject -ne $publisher -or $signature.Status -in @('NotSigned', 'HashMismatch')) {
            throw "The local test signature is invalid for $destination."
        }

        Write-Host "Created locally trusted test package: $destination"
        if ($Install) {
            Add-AppxPackage -Path $destination -ForceApplicationShutdown
            Write-Host "Installed test package for the current Windows user: $destination"
        }
    }
}
finally {
    $privateCertificatePath = "Cert:\CurrentUser\My\$($certificate.Thumbprint)"
    if (Test-Path -LiteralPath $privateCertificatePath) {
        Remove-Item -LiteralPath $privateCertificatePath -Force
    }
}

Write-Host 'The temporary private key was removed. The public test certificate remains in CurrentUser\TrustedPeople for signature inspection.'
if ($Install) {
    Write-Host 'The public test certificate also remains in LocalMachine\TrustedPeople so Windows can run the sideloaded package.'
}
Write-Host "Run 'corepack pnpm store:remove:test' after testing to uninstall the test package and remove that public certificate."
Write-Host 'Never upload local-test packages to Partner Center; upload the original unsigned packages in release\store.'

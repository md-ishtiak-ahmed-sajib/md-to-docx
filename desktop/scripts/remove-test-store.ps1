[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repositoryDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$thumbprintPath = Join-Path $repositoryDirectory 'release\store\local-test\certificate-thumbprint.txt'

Get-AppxPackage -Name 'Sajib-Civil-Engineer-BD.md-to-docx' -ErrorAction SilentlyContinue |
    Remove-AppxPackage -ErrorAction Stop

if (Test-Path -LiteralPath $thumbprintPath -PathType Leaf) {
    $thumbprint = (Get-Content -LiteralPath $thumbprintPath -Raw).Trim()
    if ($thumbprint -notmatch '^[A-Fa-f0-9]{40}$') {
        throw "Refusing to remove a certificate because $thumbprintPath does not contain one SHA-1 thumbprint."
    }

    foreach ($store in @('TrustedPeople', 'Root', 'My')) {
        $certificatePath = "Cert:\CurrentUser\$store\$thumbprint"
        if (Test-Path -LiteralPath $certificatePath) {
            Remove-Item -LiteralPath $certificatePath -Force
        }
    }
    Remove-Item -LiteralPath $thumbprintPath -Force
}

# Also remove interrupted-run certificates created by this script family. They
# are self-issued with the exact Store publisher and live for only two days.
$publisher = 'CN=5F94008D-1A8C-4CB5-AB4F-7470ED48FD13'
$recentCutoff = (Get-Date).AddDays(-1)
$shortExpiry = (Get-Date).AddDays(7)
foreach ($store in @('TrustedPeople', 'My')) {
    Get-ChildItem "Cert:\CurrentUser\$store" |
        Where-Object {
            $_.Subject -eq $publisher -and
            $_.Issuer -eq $publisher -and
            $_.NotBefore -ge $recentCutoff -and
            $_.NotAfter -le $shortExpiry
        } |
        Remove-Item -Force
}

$rootStore = [Security.Cryptography.X509Certificates.X509Store]::new(
    [Security.Cryptography.X509Certificates.StoreName]::Root,
    [Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser
)
$rootStore.Open([Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
try {
    @($rootStore.Certificates) |
        Where-Object {
            $_.Subject -eq $publisher -and
            $_.Issuer -eq $publisher -and
            $_.NotBefore -ge $recentCutoff -and
            $_.NotAfter -le $shortExpiry
        } |
        ForEach-Object { $rootStore.Remove($_) }
}
finally {
    $rootStore.Close()
}

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Get-ChildItem 'Cert:\LocalMachine\TrustedPeople' |
        Where-Object {
            $_.Subject -eq $publisher -and
            $_.Issuer -eq $publisher -and
            $_.NotBefore -ge $recentCutoff -and
            $_.NotAfter -le $shortExpiry
        } |
        Remove-Item -Force
}
elseif (Get-ChildItem 'Cert:\LocalMachine\TrustedPeople' | Where-Object Subject -eq $publisher) {
    Write-Warning "A machine-wide MD to DOCX test certificate remains. Run this command from an elevated PowerShell session to remove it."
}

Write-Host 'Removed the MD to DOCX sideload test package and its recorded temporary certificate.'

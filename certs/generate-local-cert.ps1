$ErrorActionPreference = 'Stop'

# This script must be run from an elevated PowerShell prompt.
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
  Write-Error 'Please run this script from an elevated PowerShell prompt.'
  exit 1
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$rootSubject = 'CN=Local Dev Root CA'
$rootCert = Get-ChildItem Cert:\LocalMachine\My | Where-Object { $_.Subject -eq $rootSubject } | Select-Object -First 1
if (-not $rootCert) {
  Write-Host 'Creating new root CA...'
  $rootCert = New-SelfSignedCertificate -Type Custom -Subject $rootSubject -KeyAlgorithm RSA -KeyLength 2048 -KeyExportPolicy Exportable -HashAlgorithm SHA256 -CertStoreLocation Cert:\LocalMachine\My -NotAfter (Get-Date).AddYears(10)
  Export-Certificate -Cert $rootCert -FilePath (Join-Path $scriptDir 'rootCA.cer') | Out-Null
  certutil -addstore Root (Join-Path $scriptDir 'rootCA.cer') | Out-Null
  Write-Host 'Root CA created and installed in Local Machine Trusted Root store.'
} else {
  Write-Host 'Root CA already exists.'
  if (-not (Get-ChildItem Cert:\LocalMachine\Root | Where-Object { $_.Subject -eq $rootSubject })) {
    Export-Certificate -Cert $rootCert -FilePath (Join-Path $scriptDir 'rootCA.cer') | Out-Null
    certutil -addstore Root (Join-Path $scriptDir 'rootCA.cer') | Out-Null
    Write-Host 'Root CA installed in trusted store.'
  } else {
    Write-Host 'Root CA already installed in trusted store.'
  }
}

$serverSubject = 'CN=192.168.1.29'
$existingServer = Get-ChildItem Cert:\LocalMachine\My | Where-Object { $_.Subject -eq $serverSubject } | Select-Object -First 1
if ($existingServer) {
  Write-Host 'Removing old server cert...'
  Remove-Item -Path $existingServer.PSPath -Force
}

Write-Host 'Creating server certificate for 192.168.1.29...'
$serverCert = New-SelfSignedCertificate -Type Custom -Subject $serverSubject -DnsName '192.168.1.29' -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 -KeyExportPolicy Exportable -CertStoreLocation Cert:\LocalMachine\My -Signer $rootCert -NotAfter (Get-Date).AddYears(2)

$pfxPath = Join-Path $scriptDir 'localcert.pfx'
$pwd = ConvertTo-SecureString -String 'localhttps' -Force -AsPlainText
Export-PfxCertificate -Cert $serverCert -FilePath $pfxPath -Password $pwd | Out-Null

Write-Host 'Created LAN certificate:' $pfxPath

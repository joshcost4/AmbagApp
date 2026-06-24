Write-Host 'Inspecting certificate store and PFX contents'

Write-Host '=== LocalMachine Root store ==='
Get-ChildItem Cert:\LocalMachine\Root | Where-Object { .Subject -eq 'CN=Local Dev Root CA' } | Select-Object Subject, Thumbprint | Format-List

Write-Host '=== LocalMachine My store ==='
Get-ChildItem Cert:\LocalMachine\My | Where-Object { .Subject -eq 'CN=192.168.1.29' } | Select-Object Subject, Thumbprint | Format-List

Write-Host '=== PFX file contents ==='
 = Get-PfxData -FilePath '.\localcert.pfx' -Password (ConvertTo-SecureString 'localhttps' -AsPlainText -Force)
 | Format-List

Write-Host '=== End-entity cert extensions ==='
 = .EndEntityCertificates[0]
Write-Host 'Subject:' .Subject
Write-Host 'Issuer:' .Issuer
Write-Host 'Thumbprint:' .Thumbprint
foreach ( in .Extensions) {
  Write-Host 'OID=' + .Oid.Value + ' ' + .Oid.FriendlyName
  Write-Host .Format(True)
  Write-Host '----'
}

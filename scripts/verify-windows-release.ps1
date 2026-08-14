$ErrorActionPreference = 'Stop'
$releaseDirectory = if ($args.Count -gt 0) { Resolve-Path $args[0] } else { Resolve-Path 'release' }
$installers = Get-ChildItem -Path $releaseDirectory -Filter '*.exe' -File
if ($installers.Count -eq 0) { throw 'No Windows EXE release asset was found.' }

foreach ($installer in $installers) {
  $signature = Get-AuthenticodeSignature -FilePath $installer.FullName
  if ($signature.Status -ne 'Valid') { throw "$($installer.Name) Authenticode status is $($signature.Status)." }
  if ($null -eq $signature.SignerCertificate) { throw "$($installer.Name) has no signer certificate." }
  if ($null -eq $signature.TimeStamperCertificate) { throw "$($installer.Name) has no trusted timestamp." }
}

Write-Output "Verified Authenticode signature and timestamp for $($installers.Count) Windows installer(s)."

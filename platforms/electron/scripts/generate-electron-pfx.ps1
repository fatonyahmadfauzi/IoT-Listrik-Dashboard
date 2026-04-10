param(
  [string]$Subject = "CN=Fatony Ahmad Fauzi",
  [string]$OutPfx = "signing/certificate.pfx",
  [string]$SignEnv = "signing/signing.env",
  # If provided, it will be used as the PFX password (free self-signed).
  [string]$Password
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$pfxPath = Join-Path $repoRoot $OutPfx
$signEnvPath = Join-Path $repoRoot $SignEnv

$pfxDir = Split-Path $pfxPath -Parent
if (-not (Test-Path $pfxDir)) {
  New-Item -ItemType Directory -Force -Path $pfxDir | Out-Null
}

$psCert = New-SelfSignedCertificate -Type CodeSigningCert -Subject $Subject -CertStoreLocation "cert:\CurrentUser\My" -KeyExportPolicy Exportable -FriendlyName "IoT Listrik Dashboard SelfSigned Code Signing"

$pfxPasswordSecure = if ([string]::IsNullOrWhiteSpace($Password)) {
  Read-Host "PFX password" -AsSecureString
} else {
  ConvertTo-SecureString -String $Password -AsPlainText -Force
}

function ConvertTo-PlainText([securestring]$secure) {
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

$pfxPassword = ConvertTo-PlainText $pfxPasswordSecure

Export-PfxCertificate -Cert $psCert -FilePath $pfxPath -Password $pfxPasswordSecure -Force | Out-Null

"CSC_LINK=$pfxPath`nCSC_KEY_PASSWORD=$pfxPassword`n" | Set-Content -Path $signEnvPath -Encoding ascii

Write-Host ""
Write-Host "Selesai."
Write-Host "PFX: $pfxPath"
Write-Host "Signing env: $signEnvPath"
Write-Host "Jangan commit signing.env/certificate.pfx ke git (sudah di-ignore)."


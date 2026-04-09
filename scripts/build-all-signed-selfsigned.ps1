param(
  [string]$Password
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Password)) {
  $Password = Read-Host "Signing password (same for Android keystore + Windows PFX)"
}

Write-Host "== Android signing =="
powershell -ExecutionPolicy Bypass -File "scripts\\generate-android-keystore.ps1" -Password $Password
powershell -ExecutionPolicy Bypass -File "scripts\\build-android-release.ps1"

Write-Host ""
Write-Host "== Windows signing =="
powershell -ExecutionPolicy Bypass -File "electron-app\\scripts\\generate-electron-pfx.ps1" -Password $Password
powershell -ExecutionPolicy Bypass -File "electron-app\\scripts\\build-win-setup-x64-sign.ps1"

Write-Host ""
Write-Host "Selesai menjalankan build Android + Windows (self-signed)."


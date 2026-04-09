param(
  [Alias("Password")]
  [string]$Secret,
  [switch]$SkipAndroid,
  [switch]$SkipWindows
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Secret)) {
  $Secret = Read-Host "Signing password (same for Android keystore + Windows PFX)"
}

if (-not $SkipAndroid) {
  Write-Host "== Android =="
  powershell -ExecutionPolicy Bypass -File "scripts\generate-android-keystore.ps1" -Password $Secret
  powershell -ExecutionPolicy Bypass -File "scripts\build-android-release.ps1"
}

if (-not $SkipWindows) {
  Write-Host ""
  Write-Host "== Windows =="
  powershell -ExecutionPolicy Bypass -File "electron-app\scripts\generate-electron-pfx.ps1" -Password $Secret
  powershell -ExecutionPolicy Bypass -File "electron-app\scripts\build-win-sign.ps1" -Arch "x64" -Target "msi"
  powershell -ExecutionPolicy Bypass -File "electron-app\scripts\build-win-sign.ps1" -Arch "x64" -Target "setup"
  powershell -ExecutionPolicy Bypass -File "electron-app\scripts\build-win-sign.ps1" -Arch "x64" -Target "portable"
}

Write-Host ""
Write-Host "Selesai. File download web tersedia di:"
Write-Host "- public/downloads/android/iot-listrik-dashboard-release.apk"
Write-Host "- public/downloads/windows/iot-listrik-dashboard-x64.msi"
Write-Host "- public/downloads/windows/iot-listrik-dashboard-setup-x64.exe"
Write-Host "- public/downloads/windows/iot-listrik-dashboard-portable-x64.exe"


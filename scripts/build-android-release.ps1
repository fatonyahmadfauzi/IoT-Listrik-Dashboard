$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$androidDir = Join-Path $repoRoot "android-app"
$propsPath = Join-Path $androidDir "keystore/keystore.properties"

if (-not (Test-Path $propsPath)) {
  throw "keystore.properties tidak ditemukan. Jalankan generate-android-keystore.ps1 dulu."
}

Push-Location $androidDir

# Build Android release signed APK (uses keystore.properties via build.gradle.kts)
& .\gradlew.bat :app:assembleRelease

Pop-Location

$apkPath = Join-Path $androidDir "app/build/outputs/apk/release/app-release.apk"
if (-not (Test-Path $apkPath)) {
  throw "APK release tidak ditemukan di: $apkPath"
}

$webDownloadsDir = Join-Path $repoRoot "public/downloads/android"
New-Item -ItemType Directory -Force -Path $webDownloadsDir | Out-Null

$targetPath = Join-Path $webDownloadsDir "iot-listrik-dashboard-release.apk"
Copy-Item $apkPath $targetPath -Force

Write-Host ""
Write-Host "APK siap untuk web download:"
Write-Host $targetPath


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

# Find the renamed APK (IoT Listrik Dashboard 1.0.0.apk)
$apkDir = Join-Path $androidDir "app/build/outputs/apk/release"
$apkFiles = Get-ChildItem -Path $apkDir -Filter "*.apk" | Sort-Object LastWriteTime -Descending
if ($apkFiles.Count -eq 0) {
  throw "APK release tidak ditemukan di: $apkDir"
}

$apkPath = $apkFiles[0].FullName

$webDownloadsDir = Join-Path $repoRoot "public/downloads/android"
New-Item -ItemType Directory -Force -Path $webDownloadsDir | Out-Null

# Clean old APK files
Get-ChildItem -Path $webDownloadsDir -Filter "*.apk" | Remove-Item -Force

# Copy new APK
Copy-Item $apkPath (Join-Path $webDownloadsDir $apkFiles[0].Name) -Force

Write-Host ""
Write-Host "APK siap untuk web download:"
Write-Host (Join-Path $webDownloadsDir $apkFiles[0].Name)


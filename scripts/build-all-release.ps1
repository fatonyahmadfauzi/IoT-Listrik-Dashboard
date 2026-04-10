# Build all platforms (Android + Windows) and deploy to public/downloads
param(
    [Parameter(Mandatory=$true)]
    [string]$NewVersion,
    [switch]$SkipAndroid,
    [switch]$SkipWindows
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "=== IoT Listrik Dashboard Release Build ===" -ForegroundColor Cyan
Write-Host "Repository: $repoRoot" -ForegroundColor Gray
Write-Host "New Version: $NewVersion" -ForegroundColor Yellow
Write-Host ""

# Update version
Write-Host "Updating version to $NewVersion..." -ForegroundColor Yellow
Push-Location $repoRoot
try {
    & "node" "scripts\update-version.js" $NewVersion
    Write-Host "  ✓ Version updated successfully" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Failed to update version: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Pop-Location
Write-Host ""

# Clean old downloads
Write-Host "Cleaning old release files..." -ForegroundColor Yellow
$androidDir = Join-Path $repoRoot "public\downloads\android"
$windowsDir = Join-Path $repoRoot "public\downloads\windows"

if (Test-Path $androidDir) {
    Get-ChildItem -Path $androidDir -Filter "*.apk" | Remove-Item -Force
    Write-Host "  - Cleaned Android downloads"
}

if (Test-Path $windowsDir) {
    Get-ChildItem -Path $windowsDir -Filter "*.exe" | Remove-Item -Force
    Write-Host "  - Cleaned Windows downloads"
}

Write-Host ""

# Build Android
if (-not $SkipAndroid) {
    Write-Host "=== Building Android Release ===" -ForegroundColor Green
    & "$PSScriptRoot\build-android-release.ps1"
    Write-Host ""
}

# Build Windows
if (-not $SkipWindows) {
    Write-Host "=== Building Windows Release ===" -ForegroundColor Green
    Push-Location (Join-Path $repoRoot "platforms\electron")
    & "powershell" "-ExecutionPolicy" "Bypass" "-File" "scripts\build-win-all-preserve.ps1"
    Pop-Location
    Write-Host ""
}

# Final inventory
Write-Host "=== Release Build Complete ===" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $androidDir) {
    Write-Host "ANDROID RELEASE:" -ForegroundColor Green
    Get-ChildItem -Path $androidDir -Filter "*.apk" | Select-Object Name, @{Name='SizeMB';Expression={[math]::Round($_.Length/1MB,2)}} | Format-Table -AutoSize
}

if (Test-Path $windowsDir) {
    Write-Host "WINDOWS RELEASE:" -ForegroundColor Green
    Get-ChildItem -Path $windowsDir -Filter "*.exe" | Select-Object Name, @{Name='SizeMB';Expression={[math]::Round($_.Length/1MB,2)}} | Format-Table -AutoSize
}

Write-Host "All release files are ready in public/downloads/" -ForegroundColor Green
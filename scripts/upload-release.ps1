# Script to replace all assets on an existing GitHub Release and upload fresh binaries
# Requires GitHub CLI (gh) to be installed and authenticated
param(
    [string]$Version = "v1.0.0",
    [string]$Repo = "fatonyahmadfauzi/IoT-Listrik-Dashboard"
)

$ErrorActionPreference = "Stop"

Write-Host "Refreshing GitHub Release $Version..." -ForegroundColor Cyan
Write-Host "Make sure you have committed and pushed your latest code." -ForegroundColor Yellow
Write-Host ""

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "GitHub CLI (gh) is not installed." -ForegroundColor Red
    Write-Host "Please install it from https://cli.github.com/ and authenticate via 'gh auth login' before running this script." -ForegroundColor Yellow
    exit 1
}

$FilePaths = @(
    "public\downloads\android\IoT-Listrik-Dashboard-1.0.0.apk",
    "public\downloads\windows\IoT-Listrik-Dashboard-Setup-1.0.0.exe",
    "public\downloads\windows\IoT-Listrik-Dashboard-Portable-1.0.0.exe",
    "public\downloads\windows\IoT-Listrik-Dashboard-1.0.0.msi",
    "public\downloads\cli\iot-listrik-cli-node.exe",
    "public\downloads\cli\iot-listrik-cli-python.exe",
    "public\downloads\cli\iot-listrik-dashboard-cli-linux",
    "public\downloads\cli\install.sh"
)

$missing = @()
foreach ($file in $FilePaths) {
    if (-not (Test-Path $file)) {
        $missing += $file
    }
}

if ($missing.Count -gt 0) {
    Write-Host "Beberapa file release belum tersedia:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
    exit 1
}

$assetsJson = gh release view $Version --repo $Repo --json assets
if ($LASTEXITCODE -ne 0) {
    Write-Host "Release $Version tidak ditemukan atau tidak bisa diakses." -ForegroundColor Red
    exit 1
}

$assets = (($assetsJson | ConvertFrom-Json).assets | Select-Object -ExpandProperty name)
if ($assets) {
    Write-Host "Deleting existing assets..." -ForegroundColor Yellow
    foreach ($asset in $assets) {
        gh release delete-asset $Version $asset --repo $Repo --yes
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Gagal menghapus asset: $asset" -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host "Uploading fresh assets..." -ForegroundColor Cyan
gh release upload $Version $FilePaths --repo $Repo

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Berhasil mengganti seluruh asset release $Version." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Gagal upload asset release $Version." -ForegroundColor Red
    exit 1
}

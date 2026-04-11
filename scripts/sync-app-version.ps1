<#
.SYNOPSIS
    Sync app-version.json dari root ke public/ agar website dapat membacanya.
    Jalankan script ini setiap kali memperbarui versi aplikasi.

.USAGE
    .\scripts\sync-app-version.ps1
#>

$Root   = Resolve-Path "$PSScriptRoot\.."
$Source = Join-Path $Root "app-version.json"
$Dest   = Join-Path $Root "public\app-version.json"

if (-not (Test-Path $Source)) {
    Write-Error "app-version.json tidak ditemukan di root project!"
    exit 1
}

Copy-Item $Source $Dest -Force

$version = (Get-Content $Source | ConvertFrom-Json).version
Write-Host "[sync-app-version] app-version.json v$version berhasil disinkronkan ke public/" -ForegroundColor Green

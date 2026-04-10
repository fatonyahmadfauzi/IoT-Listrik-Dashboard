param(
  [ValidateSet('ia32', 'x64', 'arm64')]
  [string]$Arch = "x64",

  [bool]$Portable = $false,

  [ValidateSet('setup', 'portable', 'msi')]
  [string]$Target = "setup"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $repoRoot "signing/signing.env"

if (-not (Test-Path $envFile)) {
  throw "signing.env tidak ditemukan di: $envFile. Jalankan generate-electron-pfx.ps1 dulu."
}

Get-Content $envFile | ForEach-Object {
  if ($_ -match '=') {
    $parts = $_.Split('=', 2)
    $k = $parts[0].Trim()
    $v = $parts[1].Trim()
    if ($k) {
      [Environment]::SetEnvironmentVariable($k, $v, "Process") | Out-Null
      Set-Item -Path "env:$k" -Value $v
    }
  }
}

Push-Location $repoRoot

# Backward compatibility: old wrappers use -Portable $true
if ($Portable) {
  $Target = "portable"
}

if ($Target -eq "portable") {
  switch ($Arch) {
    "ia32"  { npm run build:win:portable:ia32 }
    "x64"   { npm run build:win:portable:x64 }
    "arm64" { npm run build:win:portable:arm64 }
  }
} elseif ($Target -eq "msi") {
  switch ($Arch) {
    "x64"   { npm run build:win:msi:x64 }
    default { throw "Target msi saat ini disiapkan untuk x64 saja." }
  }
} else {
  switch ($Arch) {
    "ia32"  { npm run build:win:setup:ia32 }
    "x64"   { npm run build:win:setup:x64 }
    "arm64" { npm run build:win:setup:arm64 }
  }
}

Pop-Location

if ($Target -eq "msi") {
  $releaseDir = Join-Path $repoRoot "release-build"
  $msi = Get-ChildItem $releaseDir -File -Filter "*.msi" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $msi) {
    throw "MSI tidak ditemukan di $releaseDir"
  }

  $webDownloadsDir = Join-Path (Resolve-Path (Join-Path $repoRoot "..")) "public/downloads/windows"
  New-Item -ItemType Directory -Force -Path $webDownloadsDir | Out-Null

  $targetName = "iot-listrik-dashboard-x64.msi"
  $targetPath = Join-Path $webDownloadsDir $targetName
  Copy-Item $msi.FullName $targetPath -Force

  Write-Host ""
  Write-Host "MSI siap untuk web download:"
  Write-Host $targetPath
}

if ($Target -eq "setup") {
  $releaseDir = Join-Path $repoRoot "release-build"
  $setup = Get-ChildItem $releaseDir -File -Filter "*Setup*.exe" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $setup) {
    throw "Setup EXE tidak ditemukan di $releaseDir"
  }

  $webDownloadsDir = Join-Path (Resolve-Path (Join-Path $repoRoot "..")) "public/downloads/windows"
  New-Item -ItemType Directory -Force -Path $webDownloadsDir | Out-Null

  $targetName = "iot-listrik-dashboard-setup-$Arch.exe"
  $targetPath = Join-Path $webDownloadsDir $targetName
  Copy-Item $setup.FullName $targetPath -Force

  Write-Host ""
  Write-Host "Setup EXE siap untuk web download:"
  Write-Host $targetPath
}

if ($Target -eq "portable") {
  $releaseDir = Join-Path $repoRoot "release-build"
  $portableExe = Get-ChildItem $releaseDir -File -Filter "*.exe" |
    Where-Object { $_.Name -notmatch "Setup" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $portableExe) {
    throw "Portable EXE tidak ditemukan di $releaseDir"
  }

  $webDownloadsDir = Join-Path (Resolve-Path (Join-Path $repoRoot "..")) "public/downloads/windows"
  New-Item -ItemType Directory -Force -Path $webDownloadsDir | Out-Null

  $targetName = "iot-listrik-dashboard-portable-$Arch.exe"
  $targetPath = Join-Path $webDownloadsDir $targetName
  Copy-Item $portableExe.FullName $targetPath -Force

  Write-Host ""
  Write-Host "Portable EXE siap untuk web download:"
  Write-Host $targetPath
}


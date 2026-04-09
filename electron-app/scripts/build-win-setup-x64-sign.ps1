param(
  [string]$Arch = "x64"
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

# Jalankan electron-builder untuk Windows setup (NSIS).
# Signing akan otomatis aktif jika CSC_LINK dan CSC_KEY_PASSWORD tersedia.
npm run build:win:setup:x64

Pop-Location


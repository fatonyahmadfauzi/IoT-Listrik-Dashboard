param(
    [switch]$SkipNodeWindows,
    [switch]$SkipNodeLinux,
    [switch]$SkipPython
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$nodeSourceDir = Join-Path $repoRoot "public\downloads\cli\node-source"
$cliDownloadsDir = Join-Path $repoRoot "public\downloads\cli"
$pythonDir = Join-Path $repoRoot "platforms\cli-python"

New-Item -ItemType Directory -Force -Path $nodeSourceDir | Out-Null
New-Item -ItemType Directory -Force -Path $cliDownloadsDir | Out-Null

Write-Host "Syncing latest Node CLI source..." -ForegroundColor Cyan
Copy-Item (Join-Path $repoRoot "platforms\cli-node\index.js") (Join-Path $nodeSourceDir "index.js") -Force
Copy-Item (Join-Path $repoRoot "platforms\cli-node\download-cli.js") (Join-Path $nodeSourceDir "download-cli.js") -Force

if (-not $SkipNodeWindows) {
    Write-Host "Building Node CLI (Windows x64)..." -ForegroundColor Green
    Push-Location $nodeSourceDir
    try {
        & npx -y pkg@5.8.1 index.js --targets node18-win-x64 --output iot-listrik-dashboard-cli-win.exe
    } finally {
        Pop-Location
    }

    Copy-Item (Join-Path $nodeSourceDir "iot-listrik-dashboard-cli-win.exe") (Join-Path $cliDownloadsDir "iot-listrik-cli-node.exe") -Force
}

if (-not $SkipNodeLinux) {
    Write-Host "Building Node CLI (Linux x64)..." -ForegroundColor Green
    Push-Location $nodeSourceDir
    try {
        & npx -y pkg@5.8.1 index.js --targets node18-linux-x64 --output iot-listrik-dashboard-cli-linux
    } finally {
        Pop-Location
    }

    Copy-Item (Join-Path $nodeSourceDir "iot-listrik-dashboard-cli-linux") (Join-Path $cliDownloadsDir "iot-listrik-dashboard-cli-linux") -Force
}

if (-not $SkipPython) {
    Write-Host "Building Python CLI (Windows x64)..." -ForegroundColor Green
    Push-Location $pythonDir
    try {
        & pyinstaller --noconfirm --clean iot-listrik-cli-python.spec
    } finally {
        Pop-Location
    }

    Copy-Item (Join-Path $pythonDir "dist\iot-listrik-cli-python.exe") (Join-Path $cliDownloadsDir "iot-listrik-cli-python.exe") -Force
}

Write-Host ""
Write-Host "CLI release files are ready in public/downloads/cli:" -ForegroundColor Green
Get-ChildItem -Path $cliDownloadsDir -File | Select-Object Name, @{Name='SizeMB';Expression={[math]::Round($_.Length/1MB,2)}} | Format-Table -AutoSize

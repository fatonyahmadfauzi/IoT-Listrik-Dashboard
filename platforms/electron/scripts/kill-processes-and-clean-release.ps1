# This script kills Electron/Node processes and deletes the locked release folders
$processNames = @('electron', 'node', 'IoT Listrik Dashboard')
$releaseDirs = @(
    "E:\Application\laragon\www\IoT Listrik Dashboard\electron-app\release\win-ia32-unpacked",
    "E:\Application\laragon\www\IoT Listrik Dashboard\electron-app\release\win-arm64-unpacked"
)

Write-Host "Stopping Electron/Node processes..."
foreach ($name in $processNames) {
    Get-Process -Name $name -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

foreach ($dir in $releaseDirs) {
    if (Test-Path $dir) {
        Write-Host "Removing $dir ..."
        Remove-Item -Recurse -Force $dir
    }
}

Write-Host "Done."

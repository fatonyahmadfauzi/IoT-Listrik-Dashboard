# Hentikan proses yang memakai file di release/*-unpacked, lalu hapus folder unpacked
# agar electron-builder bisa mengosongkan direktori (mengatasi "file is being used by another process").
$ErrorActionPreference = 'SilentlyContinue'
$appRoot = Split-Path $PSScriptRoot -Parent
$release = Join-Path $appRoot 'release'

function Stop-ProcessesUnderRelease {
  param([string]$Root)
  # Nama produk (installer)
  & taskkill /F /IM 'IoT Listrik Dashboard.exe' /T 2>$null | Out-Null
  # Proses apa pun yang exe-nya di dalam folder release (mis. unpacked masih jalan)
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.ExecutablePath -and ($_.ExecutablePath -like "$Root\*") } |
    ForEach-Object {
      Write-Host "Stopping locked process: $($_.Name) (PID $($_.ProcessId))"
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

if (-not (Test-Path $release)) {
  Write-Host 'No release folder yet.'
  exit 0
}

Write-Host 'Stopping processes using files under release/ ...'
Stop-ProcessesUnderRelease -Root $release
Start-Sleep -Seconds 2
Stop-ProcessesUnderRelease -Root $release
Start-Sleep -Seconds 1

Get-ChildItem -Path $release -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like 'win-*' -and $_.Name -like '*unpacked*' } |
  ForEach-Object {
    $dir = $_.FullName
    Write-Host "Removing $dir ..."
    $ok = $false
    for ($i = 0; $i -lt 4; $i++) {
      try {
        Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction Stop
        $ok = $true
        break
      } catch {
        if ($i -lt 3) {
          Write-Host "Retry $($i + 1)/3 after lock..."
          Stop-ProcessesUnderRelease -Root $release
          Start-Sleep -Seconds 2
        } else {
          Write-Host 'ERROR: Could not delete unpacked folder. Tutup aplikasi dari folder release/, tutup Explorer di folder itu, lalu jalankan lagi.'
          Write-Host $_.Exception.Message
          exit 1
        }
      }
    }
  }

Write-Host 'Unpacked folders cleared.'

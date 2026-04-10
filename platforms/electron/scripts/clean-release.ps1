# PowerShell script to force delete the Electron release folder before build
$releasePath = "E:\Application\laragon\www\IoT Listrik Dashboard\electron-app\release"

if (Test-Path $releasePath) {
    try {
        Remove-Item -Path $releasePath -Recurse -Force -ErrorAction Stop
        Write-Host "Release folder deleted successfully."
    } catch {
        Write-Host "Failed to delete release folder. Trying to find locking processes..."
        # Try to find and kill processes locking files in the release folder
        $handleExe = "handle.exe"
        $handleUrl = "https://download.sysinternals.com/files/Handle.zip"
        $handleZip = "$env:TEMP\Handle.zip"
        $handleDir = "$env:TEMP\Handle"
        if (-not (Test-Path $handleExe)) {
            Invoke-WebRequest -Uri $handleUrl -OutFile $handleZip
            Expand-Archive -Path $handleZip -DestinationPath $handleDir -Force
            Copy-Item "$handleDir\handle.exe" .
        }
        $locked = .\handle.exe "$releasePath" | Select-String ": pid"
        foreach ($line in $locked) {
            if ($line -match ": pid (\d+)") {
                $pid = $matches[1]
                try {
                    Stop-Process -Id $pid -Force
                    Write-Host "Killed process with PID $pid"
                } catch {
                    Write-Host "Failed to kill process with PID $pid"
                }
            }
        }
        # Try delete again
        Remove-Item -Path $releasePath -Recurse -Force
        Write-Host "Release folder deleted after killing locking processes."
    }
} else {
    Write-Host "Release folder does not exist."
}

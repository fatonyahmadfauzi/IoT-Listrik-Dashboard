param()

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$entry = Join-Path $scriptDir "build-win-sign.ps1"

powershell -NoProfile -ExecutionPolicy Bypass -File $entry -Arch x64 -Target msi


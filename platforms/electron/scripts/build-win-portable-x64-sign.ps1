$ErrorActionPreference = "Stop"

& "$PSScriptRoot\\build-win-sign.ps1" -Arch "x64" -Portable:$true


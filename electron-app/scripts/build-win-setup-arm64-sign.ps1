$ErrorActionPreference = "Stop"

& "$PSScriptRoot\\build-win-sign.ps1" -Arch "arm64" -Portable:$false


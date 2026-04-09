$ErrorActionPreference = "Stop"

& "$PSScriptRoot\\build-win-sign.ps1" -Arch "ia32" -Portable:$false


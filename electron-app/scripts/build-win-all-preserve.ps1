# Build Windows releases for all architectures and deploy to public/downloads
param(
    [string]$OutputDir = "release-build-all"
)

$releaseDir = "$PSScriptRoot\..\release-build"
$preserveDir = "$PSScriptRoot\..\..\..\public\downloads\windows"
$tempDir = "$PSScriptRoot\..\release-build-temp"

# Create downloads directory
if (-not (Test-Path $preserveDir)) {
    New-Item -ItemType Directory -Path $preserveDir | Out-Null
}

# Clean existing downloads
Write-Host "Cleaning old Windows downloads..." -ForegroundColor Yellow
Get-ChildItem -Path $preserveDir -Filter "*.exe" | Remove-Item -Force

# Clean temp directory
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

$builds = @(
    "build:win:setup:ia32",
    "build:win:setup:x64",
    "build:win:setup:arm64",
    "build:win:portable:ia32",
    "build:win:portable:x64",
    "build:win:portable:arm64",
    "build:win:msi:x64"
)

foreach ($build in $builds) {
    Write-Host "Building: $build" -ForegroundColor Green
    npm run $build

    if ($LASTEXITCODE -eq 0) {
        # Copy all .exe files to temp
        Get-ChildItem -Path "$releaseDir\*.exe" -File | ForEach-Object {
            Copy-Item -Path $_.FullName -Destination $tempDir -Force
        }
        Write-Host "Build completed, files preserved"
    }
    else {
        Write-Host "Build failed: $build" -ForegroundColor Red
        exit 1
    }
}

# Copy all preserved files to public downloads
Write-Host "Copying all builds to public/downloads/windows..." -ForegroundColor Cyan
Get-ChildItem -Path "$tempDir\*.exe" -File | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $preserveDir -Force
    $sizeMB = [math]::Round($_.Length/1MB, 2)
    Write-Host "  - $($_.Name) ($sizeMB MB)"
}

# Clean temp directory
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "All Windows builds completed and deployed!" -ForegroundColor Green
Write-Host "Download directory: $preserveDir"
Get-ChildItem -Path "$preserveDir\*.exe" -File | Select-Object Name, @{Name='SizeMB';Expression={[math]::Round($_.Length/1MB,2)}} | Format-Table -AutoSize

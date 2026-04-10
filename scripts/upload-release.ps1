# Script to create a GitHub Release and upload binaries
# Requires GitHub CLI (gh) to be installed and authenticated

$Version = "v1.0.0"

Write-Host "Creating GitHub Release $Version..." -ForegroundColor Cyan
Write-Host "Make sure you have committed and pushed your latest code." -ForegroundColor Yellow
Write-Host ""

# Check if GitHub CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "GitHub CLI (gh) is not installed." -ForegroundColor Red
    Write-Host "Please install it from https://cli.github.com/ and authenticate via 'gh auth login' before running this script." -ForegroundColor Yellow
    exit 1
}

# Define the paths of the binaries to upload
$FilePaths = @(
    "public\downloads\windows\IoT-Listrik-Dashboard-Setup-1.0.0.exe",
    "public\downloads\windows\IoT-Listrik-Dashboard-Portable-1.0.0.exe",
    "public\downloads\windows\IoT-Listrik-Dashboard-1.0.0.msi",
    "public\downloads\android\IoT-Listrik-Dashboard-1.0.0.apk"
)

# Check if files exist
$AllFilesExist = $true
foreach ($file in $FilePaths) {
    if (-not (Test-Path $file)) {
        Write-Host "Error: File not found: $file" -ForegroundColor Red
        $AllFilesExist = $false
    }
}

if (-not $AllFilesExist) {
    Write-Host ""
    Write-Host "Beberapa file binary belum dibuat atau tidak ditemukan." -ForegroundColor Yellow
    Write-Host "Harap jalankan proses build terlebih dahulu." -ForegroundColor Yellow
    exit 1
}

Write-Host "Uploading binaries to GitHub Releases..." -ForegroundColor Cyan

# Create the release and upload the files
gh release create $Version $FilePaths --title "IoT Listrik Dashboard $Version" --notes "Release version $Version"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Berhasil! Release $Version telah dibuat di GitHub." -ForegroundColor Green
    Write-Host "Link download di website (via app-version.json) kini akan mengarah langsung ke GitHub Releases." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Failed to create release. Please check if you are authenticated (gh auth login) and have correct permissions." -ForegroundColor Red
    exit 1
}

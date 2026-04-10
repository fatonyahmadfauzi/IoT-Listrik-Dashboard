# Version Management Guide

## Overview

The IoT Listrik Dashboard uses a centralized version management system (`app-version.json`) that automatically synchronizes download links across the website, CLI, and documentation.

## Files

- **`app-version.json`** - Central version and download configuration file (root directory)
- **`public/version-manager.js`** - JavaScript utility for version management (website)
- **`electron-app/package.json`** - Electron app version (must match app-version.json)
- **`android-app/app/build.gradle.kts`** - Android app version (must match app-version.json)

## How to Update Version

When releasing a new version:

### 1. Update Version Numbers

Update these files with the new version (e.g., `1.0.1`):

```bash
# Root app-version.json
code app-version.json
# Update: "version": "1.0.1"

# Electron app
code electron-app/package.json
# Update: "version": "1.0.1"

# Android app
code android-app/app/build.gradle.kts
# Update: versionName = "1.0.1"
```

### 2. Rebuild Applications

**Automated (Recommended):**

```bash
# Build all platforms and deploy to public/downloads/
./scripts/build-all-release.ps1
```

**Manual:**

```bash
# Android release
cd android-app
./gradlew clean assembleRelease
# Result: app-release.apk → renamed to "IoT Listrik Dashboard 1.0.1.apk"

# Windows release
cd ../electron-app
npm run build:win:unified
# Results:
#   - IoT Listrik Dashboard Setup 1.0.1.exe (Setup with all architectures)
#   - IoT Listrik Dashboard 1.0.1.exe (Portable with all architectures)

cd ../
```

### 3. Update app-version.json with Build Outputs

After building, update `app-version.json` with:

- New version number
- Build date
- Updated filenames and sizes

Example update for version 1.0.1:

```json
{
  "version": "1.0.1",
  "buildDate": "2026-04-10",
  "downloads": {
    "android": {
      "filename": "IoT Listrik Dashboard 1.0.1.apk",
      "size": "6.85 MB"
    },
    "windows": {
      "setup": {
        "filename": "IoT Listrik Dashboard Setup 1.0.1.exe",
        "size": "263.50 MB"
      }
      // ... etc
    }
  }
}
```

## Website Integration

### HTML Example

Add download buttons to your website:

```html
<script src="/version-manager.js"></script>

<!-- Download buttons -->
<a id="downloadAndroid" href="/downloads/android/"> Download APK </a>

<a id="downloadWindowsSetup" href="/downloads/windows/">
  Download Windows Setup
</a>

<a id="downloadWindowsPortable" href="/downloads/windows/">
  Download Windows Portable
</a>

<script>
  // Auto-update links when version changes
  window.addEventListener("DOMContentLoaded", async () => {
    const vm = window.versionManager;

    // Update multiple links at once
    await vm.updateAllDownloadLinks([
      { elementId: "downloadAndroid", platform: "android" },
      { elementId: "downloadWindowsSetup", platform: "windows", type: "setup" },
      {
        elementId: "downloadWindowsPortable",
        platform: "windows",
        type: "portable",
      },
    ]);

    // Display version
    console.log("Current version:", vm.getVersion());
  });
</script>
```

## CLI/Script Integration

### Node.js Example

```javascript
const VersionManager = require("./public/version-manager.js");

async function getDownloads() {
  const vm = new VersionManager("./app-version.json");
  await vm.loadVersion();

  console.log("Version:", vm.getVersion());
  console.log("Android APK:", vm.getDownloadUrl("android"));
  console.log("Windows Setup:", vm.getDownloadUrl("windows", "setup"));
  console.log("Windows Portable:", vm.getDownloadUrl("windows", "portable"));
}
```

### PowerShell Example

```powershell
# Read version from app-version.json
$versionData = Get-Content app-version.json | ConvertFrom-Json
$currentVersion = $versionData.version

# Use in scripts
Write-Host "Current app version: $currentVersion"
$androidUrl = $versionData.downloads.android.url
$windowsUrl = $versionData.downloads.windows.setup.url
```

## Build Automation

### Automated Version Update Script

Create `scripts/update-version.ps1`:

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$NewVersion
)

# Update app-version.json
$versionFile = "app-version.json"
$json = Get-Content $versionFile | ConvertFrom-Json
$json.version = $NewVersion
$json.buildDate = (Get-Date).ToString("yyyy-MM-dd")
$json | ConvertTo-Json | Set-Content $versionFile

# Update electron-app/package.json
$electronPackage = "electron-app/package.json"
$packageJson = Get-Content $electronPackage | ConvertFrom-Json
$packageJson.version = $NewVersion
$packageJson | ConvertTo-Json -Depth 10 | Set-Content $electronPackage

Write-Host "Updated version to $NewVersion"
```

Usage:

```bash
./scripts/update-version.ps1 -NewVersion "1.0.1"
```

## Download Links

All download links are automatically generated from `app-version.json`:

```
/downloads/android/IoT Listrik Dashboard 1.0.0.apk
/downloads/windows/IoT Listrik Dashboard Setup 1.0.0.exe
/downloads/windows/IoT Listrik Dashboard 1.0.0.exe (portable)
```

## Troubleshooting

### Links Not Updating

1. Clear browser cache: `Ctrl+Shift+Delete`
2. Verify `app-version.json` exists and is valid JSON
3. Check browser console for errors: `F12` → Console tab
4. Verify file paths in `app-version.json` are correct

### Version Mismatch

If versions don't match:

```bash
# Quick check
grep "version" app-version.json
grep "version" electron-app/package.json
# gradle version in android-app/app/build.gradle.kts
```

## File Structure

```
IoT Listrik Dashboard/
├── app-version.json                 # Central version config
├── public/
│   └── version-manager.js           # Website version manager
├── electron-app/
│   └── package.json                 # Electron version
├── android-app/
│   └── app/build.gradle.kts         # Android version
└── public/downloads/
    ├── android/
    │   └── IoT Listrik Dashboard 1.0.0.apk
    └── windows/
        ├── IoT Listrik Dashboard Setup 1.0.0.exe
        └── IoT Listrik Dashboard 1.0.0.exe
```

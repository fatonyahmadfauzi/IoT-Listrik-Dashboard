#!/usr/bin/env node
const { readFileSync, writeFileSync } = require("fs");
const { join } = require("path");

const args = process.argv.slice(2);

if (args.length < 1) {
  console.log(`
Usage: node update-version.js <new-version> [options]

Arguments:
  <new-version>    New version number (e.g., 1.0.1)

Options:
  --build-date <date>    Build date (default: current date YYYY-MM-DD)
  --android-size <size>  Android APK size (default: auto-detect)
  --windows-size <size>  Windows executable size (default: auto-detect)

Examples:
  node update-version.js 1.0.1
  node update-version.js 1.0.1 --build-date 2026-04-10
`);
  process.exit(1);
}

const newVersion = args[0];
let buildDate = new Date().toISOString().split("T")[0];
let androidSize = null;
let windowsSize = null;

// Parse options
for (let i = 1; i < args.length; i++) {
  switch (args[i]) {
    case "--build-date":
      buildDate = args[++i];
      break;
    case "--android-size":
      androidSize = args[++i];
      break;
    case "--windows-size":
      windowsSize = args[++i];
      break;
  }
}

try {
  // Read current version file
  const versionFile = join(process.cwd(), "app-version.json");
  const versionData = JSON.parse(readFileSync(versionFile, "utf8"));

  // Update version and build date
  versionData.version = newVersion;
  versionData.buildDate = buildDate;

  // Update filenames and URLs
  const baseName = `IoT Listrik Dashboard ${newVersion}`;

  // Android
  versionData.downloads.android.filename = `${baseName}.apk`;
  versionData.downloads.android.url = `/downloads/android/${baseName}.apk`;

  // Windows Setup
  versionData.downloads.windows.setup.filename = `${baseName} Setup.exe`;
  versionData.downloads.windows.setup.url = `/downloads/windows/${baseName} Setup.exe`;

  // Windows Portable
  versionData.downloads.windows.portable.filename = `${baseName}.exe`;
  versionData.downloads.windows.portable.url = `/downloads/windows/${baseName}.exe`;

  // Update sizes if provided
  if (androidSize) {
    versionData.downloads.android.size = androidSize;
  }
  if (windowsSize) {
    versionData.downloads.windows.setup.size = windowsSize;
    versionData.downloads.windows.portable.size = windowsSize;
  }

  // Write updated version file
  writeFileSync(versionFile, JSON.stringify(versionData, null, 2));

  console.log(`✓ Version updated to ${newVersion}`);
  console.log(`✓ Build date: ${buildDate}`);
  console.log(`✓ Updated app-version.json`);
} catch (error) {
  console.error("Error updating version:", error.message);
  process.exit(1);
}

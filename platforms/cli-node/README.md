# IoT Listrik Dashboard - Auto Download CLI

CLI tool untuk download aplikasi IoT Listrik Dashboard secara otomatis dengan versi terbaru.

## Fitur

- ✅ Auto-detect platform dan arsitektur
- ✅ Download versi terbaru otomatis
- ✅ Support Windows (Setup/Portable/MSI) dan Android
- ✅ Progress bar download
- ✅ CLI commands untuk PowerShell/CMD

## Instalasi

```bash
# Install dependencies
npm install

# Link binary (opsional, untuk development)
npm link
```

## Penggunaan

### Download untuk platform saat ini

```bash
# Download versi terbaru untuk platform yang terdeteksi
node download-cli.js

# Atau jika sudah di-link
iot-listrik-download
```

### Download spesifik platform

```bash
# Windows Setup
node download-cli.js --platform windows --type setup

# Windows Portable
node download-cli.js --platform windows --type portable

# Windows MSI
node download-cli.js --platform windows --type msi

# Android APK
node download-cli.js --platform android
```

### Opsi lengkap

```bash
node download-cli.js [options]

Options:
  --platform <platform>    Platform: windows, android (default: auto-detect)
  --type <type>           Type: setup, portable, msi (Windows only, default: setup)
  --arch <arch>           Architecture: x64, ia32, arm64 (default: auto-detect)
  --output <path>         Output file path (default: auto-generated)
  --latest               Download latest version (default: true)
  --list                 List available downloads
  --help, -h             Show this help
```

### Lihat versi tersedia

```bash
node download-cli.js --list
```

Output:

```
Latest Version: 1.0.0

Available Downloads:

ANDROID:
  IoT-Listrik-Dashboard.apk (3.27 MB)

WINDOWS:
  Setup: IoT-Listrik-Dashboard-Setup.exe (334.40 MB)
  Portable: IoT-Listrik-Dashboard-Portable.exe (334.13 MB)
  MSI: IoT-Listrik-Dashboard.msi (124.86 MB)
  Node CLI: iot-listrik-cli-node.exe (189.28 MB)
  Linux CLI: iot-listrik-dashboard-cli-linux (197.35 MB)
```

## Contoh CLI Commands

### PowerShell (Windows)

```powershell
# Download setup
Invoke-WebRequest -Uri "https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/download/v1.0.0/IoT-Listrik-Dashboard-Setup.exe" -OutFile "iot-listrik-dashboard-setup.exe"

# Download portable
Invoke-WebRequest -Uri "https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/download/v1.0.0/IoT-Listrik-Dashboard-Portable.exe" -OutFile "iot-listrik-dashboard.exe"
```

### cURL (Linux/macOS/Windows)

```bash
# Download Android APK
curl -L "https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/download/v1.0.0/IoT-Listrik-Dashboard.apk" -o "iot-listrik-dashboard.apk"

# Download Windows setup
curl -L "https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/download/v1.0.0/IoT-Listrik-Dashboard-Setup.exe" -o "iot-listrik-dashboard-setup.exe"
```

## Cara Kerja

1. **Version Management**: CLI membaca `app-version.json` dari server untuk mendapatkan versi terbaru
2. **Auto-Detection**: Mendeteksi platform (Windows/Android) dan arsitektur sistem
3. **Download**: Mengunduh file dari URL yang sesuai dengan versi terbaru
4. **Progress**: Menampilkan progress bar selama download

## File Konfigurasi

### app-version.json

File ini berisi informasi versi dan URL download untuk semua platform:

```json
{
  "version": "1.0.0",
  "buildDate": "2026-04-27",
  "downloads": {
    "android": {
      "filename": "IoT-Listrik-Dashboard.apk",
      "url": "https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/download/v1.0.0/IoT-Listrik-Dashboard.apk",
      "size": "3.27 MB"
    },
    "windows": {
      "setup": {
        "filename": "IoT-Listrik-Dashboard-Setup.exe",
        "url": "https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/download/v1.0.0/IoT-Listrik-Dashboard-Setup.exe",
        "size": "334.40 MB"
      },
      "portable": {
        "filename": "IoT-Listrik-Dashboard-Portable.exe",
        "url": "https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/download/v1.0.0/IoT-Listrik-Dashboard-Portable.exe",
        "size": "334.13 MB"
      },
      "msi": {
        "filename": "IoT-Listrik-Dashboard.msi",
        "url": "https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/download/v1.0.0/IoT-Listrik-Dashboard.msi",
        "size": "124.86 MB"
      }
    }
  }
}
```

## Development

### Update Version

Untuk release versi baru:

```bash
# Update versi di app-version.json
node scripts/update-version.js 1.0.0

# Build semua platform
.\scripts\build-all-release.ps1 -NewVersion 1.0.0
```

### Test CLI

```bash
# Test list downloads
node platforms/cli-node/download-cli.js --list

# Test download (dry run)
node platforms/cli-node/download-cli.js --platform windows --type setup --output test.exe
```

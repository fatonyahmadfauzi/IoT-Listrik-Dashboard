# IoT Listrik Dashboard - Auto Download CLI

CLI tool untuk download aplikasi IoT Listrik Dashboard secara otomatis dengan versi terbaru.

## Fitur

- ✅ Auto-detect platform dan arsitektur
- ✅ Download versi terbaru otomatis
- ✅ Support Windows (Setup/Portable) dan Android
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

# Android APK
node download-cli.js --platform android
```

### Opsi lengkap

```bash
node download-cli.js [options]

Options:
  --platform <platform>    Platform: windows, android (default: auto-detect)
  --type <type>           Type: setup, portable (Windows only, default: setup)
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
Latest Version: 1.0.1

Available Downloads:

ANDROID:
  IoT Listrik Dashboard 1.0.1.apk (6.80 MB)

WINDOWS:
  Setup: IoT Listrik Dashboard Setup 1.0.1.exe (263.35 MB)
  Portable: IoT Listrik Dashboard 1.0.1.exe (263.08 MB)
```

## Contoh CLI Commands

### PowerShell (Windows)

```powershell
# Download setup
Invoke-WebRequest -Uri "https://iot-listrik-dashboard.vercel.app/downloads/windows/IoT Listrik Dashboard Setup 1.0.1.exe" -OutFile "iot-listrik-dashboard-setup.exe"

# Download portable
Invoke-WebRequest -Uri "https://iot-listrik-dashboard.vercel.app/downloads/windows/IoT Listrik Dashboard 1.0.1.exe" -OutFile "iot-listrik-dashboard.exe"
```

### cURL (Linux/macOS/Windows)

```bash
# Download Android APK
curl -L "https://iot-listrik-dashboard.vercel.app/downloads/android/IoT Listrik Dashboard 1.0.1.apk" -o "iot-listrik-dashboard.apk"

# Download Windows setup
curl -L "https://iot-listrik-dashboard.vercel.app/downloads/windows/IoT Listrik Dashboard Setup 1.0.1.exe" -o "iot-listrik-dashboard-setup.exe"
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
  "version": "1.0.1",
  "buildDate": "2026-04-10",
  "downloads": {
    "android": {
      "filename": "IoT Listrik Dashboard 1.0.1.apk",
      "url": "/downloads/android/IoT Listrik Dashboard 1.0.1.apk",
      "size": "6.80 MB"
    },
    "windows": {
      "setup": {
        "filename": "IoT Listrik Dashboard Setup 1.0.1.exe",
        "url": "/downloads/windows/IoT Listrik Dashboard Setup 1.0.1.exe",
        "size": "263.35 MB"
      },
      "portable": {
        "filename": "IoT Listrik Dashboard 1.0.1.exe",
        "url": "/downloads/windows/IoT Listrik Dashboard 1.0.1.exe",
        "size": "263.08 MB"
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
node scripts/update-version.js 1.0.2

# Build semua platform
.\scripts\build-all-release.ps1 -NewVersion 1.0.2
```

### Test CLI

```bash
# Test list downloads
node cli-app/download-cli.js --list

# Test download (dry run)
node cli-app/download-cli.js --platform windows --type setup --output test.exe
```

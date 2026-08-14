# Version Management Guide

## Overview

IoT Listrik Dashboard memakai `app-version.json` di root repository sebagai sumber utama informasi versi dan URL download. File ini disalin ke `public/app-version.json` agar website, halaman download, dan CLI membaca data yang sama.

Saat ini file installer utama didistribusikan lewat **GitHub Releases**. Folder `public/downloads/` dipakai sebagai cache/build output lokal dan tidak ikut dideploy ke Vercel.

## File Penting

| File | Fungsi |
|------|--------|
| `app-version.json` | Source of truth versi, tanggal build, URL download, dan catatan release |
| `public/app-version.json` | Salinan untuk browser, disinkronkan dari root |
| `public/js/version-manager.js` | Utility website untuk membaca versi dan mengisi link download |
| `platforms/electron/package.json` | Versi aplikasi Windows Desktop |
| `platforms/android/app/build.gradle.kts` | `versionName` dan `versionCode` aplikasi Android |
| `platforms/cli-node/download-cli.js` | CLI auto-download berbasis data `app-version.json` |

## Update Versi

### 1. Update `app-version.json`

```powershell
node scripts\update-version.js 1.0.0
```

Jika versi distribusi tetap sama tetapi asset release diganti, perbarui `buildDate`, `size`, dan `notes` sesuai asset terbaru.

### 2. Sinkronisasi ke `public/`

```powershell
.\scripts\sync-app-version.ps1
```

### 3. Build Artifact

Build semua platform utama:

```powershell
.\scripts\build-all-release.ps1 -NewVersion 1.0.0
```

Build Android dan Windows untuk web download:

```powershell
.\scripts\build-release-for-web.ps1 -Secret "<SECRET>"
```

Build CLI binaries:

```powershell
.\scripts\build-cli-release.ps1
```

Output lokal dibuat di:

```text
public/downloads/android/
public/downloads/windows/
public/downloads/cli/
```

### 4. Upload ke GitHub Release

```powershell
.\scripts\upload-release.ps1 -Version v1.1.0
```

Script ini mengganti asset pada release yang sama. Pastikan nama file di `app-version.json` dan `scripts/upload-release.ps1` konsisten dengan file yang ada di `public/downloads/`.

### 5. Deploy Web

```powershell
npx vercel deploy --prod --yes
```

Catatan: `.vercelignore` harus tetap mengecualikan binary besar, file revisi skripsi, dokumen personal, service account, `.env`, keystore, dan signing certificate.

## Integrasi Website

Halaman `/downloads` membaca `public/app-version.json` melalui `public/js/version-manager.js`. Contoh pola penggunaan:

```html
<script src="/js/version-manager.js"></script>
```

Download button akan diarahkan ke URL dalam `app-version.json`, misalnya:

```text
https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/download/v1.1.0/IoT-Listrik-Dashboard.apk
```

## Integrasi CLI

CLI Node membaca informasi versi dari endpoint website:

```powershell
node platforms\cli-node\download-cli.js --list
node platforms\cli-node\download-cli.js --platform windows --type setup
node platforms\cli-node\download-cli.js --platform windows --type portable
node platforms\cli-node\download-cli.js --platform windows --type msi
node platforms\cli-node\download-cli.js --platform android
```

## Checklist Release

- `app-version.json` dan `public/app-version.json` sinkron.
- Versi Android di `platforms/android/app/build.gradle.kts` sesuai.
- Versi Electron di `platforms/electron/package.json` sesuai.
- Asset APK, MSI, Setup EXE, Portable EXE, dan CLI binaries tersedia.
- `scripts/upload-release.ps1` menunjuk nama file yang benar.
- GitHub Release berisi asset terbaru.
- `/downloads` menampilkan link versi terbaru.
- File binary dan dokumen pribadi tidak ikut deploy ke Vercel.

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Link download belum berubah | Jalankan `sync-app-version.ps1`, deploy ulang Vercel, lalu clear cache browser |
| CLI menampilkan versi lama | Pastikan `public/app-version.json` sudah ikut deploy |
| Asset GitHub Release 404 | Periksa nama file di `app-version.json` dan asset release GitHub |
| Vercel deploy terlalu besar | Pastikan `.vercelignore` mengecualikan `public/downloads/`, `.apk`, `.exe`, `.msi`, `.docx`, `.pdf` |
| Versi platform tidak sama | Cek `platforms/electron/package.json` dan `platforms/android/app/build.gradle.kts` |

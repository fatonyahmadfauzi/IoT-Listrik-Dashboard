# Signing (Gratis Self-Signed)

Dokumen ini menyiapkan *gratis* untuk signing Android (APK release) dan Windows (Electron installer) memakai *self-signed* certificate.

Catatan:
- Ini gratis, tapi pengguna Windows/Android mungkin tetap melihat peringatan “not trusted” karena sertifikatnya self-signed.
- Jangan commit file yang berisi password: `android-app/keystore/keystore.properties` dan `signing/signing.env` / `signing/certificate.pfx`.

---

## Android (APK Release)

### 1) Generate keystore + `keystore.properties`
Jalankan:
```powershell
powershell -ExecutionPolicy Bypass -File "scripts\\generate-android-keystore.ps1"
```

Script akan membuat:
- `android-app/keystore/release-keystore.jks`
- `android-app/keystore/keystore.properties`

### 2) Build Android release (APK sudah tersigned)
```powershell
powershell -ExecutionPolicy Bypass -File "scripts\\build-android-release.ps1"
```

Output ada di folder build Gradle (biasanya `android-app/app/build/outputs/apk/release/`).

---

## Windows (Electron)

### 1) Generate PFX + `signing.env`
Jalankan:
```powershell
powershell -ExecutionPolicy Bypass -File "electron-app\\scripts\\generate-electron-pfx.ps1"
```

Script akan membuat:
- `signing/certificate.pfx`
- `signing/signing.env`

### 2) Build Windows installer (signed)
Build signed untuk semua arch:

`setup` (NSIS installer)
```powershell
# x64
powershell -ExecutionPolicy Bypass -File "electron-app\\scripts\\build-win-setup-x64-sign.ps1"

# ia32
powershell -ExecutionPolicy Bypass -File "electron-app\\scripts\\build-win-setup-ia32-sign.ps1"

# arm64
powershell -ExecutionPolicy Bypass -File "electron-app\\scripts\\build-win-setup-arm64-sign.ps1"
```

`portable` (portable build)
```powershell
# x64
powershell -ExecutionPolicy Bypass -File "electron-app\\scripts\\build-win-portable-x64-sign.ps1"

# ia32
powershell -ExecutionPolicy Bypass -File "electron-app\\scripts\\build-win-portable-ia32-sign.ps1"

# arm64
powershell -ExecutionPolicy Bypass -File "electron-app\\scripts\\build-win-portable-arm64-sign.ps1"
```

`msi` (Windows Installer package)
```powershell
# x64
powershell -ExecutionPolicy Bypass -File "electron-app\\scripts\\build-win-msi-x64-sign.ps1"
```

Output akan dibuat oleh electron-builder di salah satu folder berikut (tergantung konfigurasi):
- `electron-app/release/`
- `electron-app/release-build/`

---

## (Opsional) Skrip generik
Ada juga skrip generik:
```powershell
powershell -ExecutionPolicy Bypass -File "electron-app\\scripts\\build-win-sign.ps1" -Arch "x64" -Portable:$false
# atau target spesifik:
powershell -ExecutionPolicy Bypass -File "electron-app\\scripts\\build-win-sign.ps1" -Arch "x64" -Target "msi"
```

## (Opsional) Sekali jalan: Android + Windows
Kalau kamu ingin 1x jalankan untuk:
- Generate keystore Android + build release
- Generate PFX Windows + build `setup` (yang otomatis termasuk ia32/x64/arm64)

Jalankan:
```powershell
powershell -ExecutionPolicy Bypass -File "scripts\\build-all-signed-selfsigned.ps1"
```

## Sekali jalan + siap untuk web download
Script ini akan:
- build Android release APK lalu copy ke `public/downloads/android/`
- build Windows `msi`, `setup`, `portable` (x64) lalu copy ke `public/downloads/windows/`

Jalankan:
```powershell
powershell -ExecutionPolicy Bypass -File "scripts\\build-release-for-web.ps1"
```

Opsional:
```powershell
# hanya Windows
powershell -ExecutionPolicy Bypass -File "scripts\\build-release-for-web.ps1" -SkipAndroid

# hanya Android
powershell -ExecutionPolicy Bypass -File "scripts\\build-release-for-web.ps1" -SkipWindows
```


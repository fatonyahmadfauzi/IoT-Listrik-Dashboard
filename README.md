# IoT Listrik Dashboard

Sistem deteksi dini kebocoran arus listrik dan monitoring kondisi kelistrikan secara terintegrasi.
Platform yang didukung: Web (PWA), Android, dan Windows desktop.

## Ringkasan Fitur

- Monitoring realtime arus, tegangan, daya semu, status, dan relay.
- Role-based access: aksi kritikal (relay/settings) hanya untuk admin.
- Histori kejadian dan notifikasi cepat (web + Telegram).
- Auto-cutoff relay saat kondisi berbahaya.
- Build pipeline untuk Android APK dan Windows installer.

## Arsitektur Singkat

```text
ESP32 + sensor (SCT-013, ZMPT101B)
  -> Firebase Realtime Database (/listrik, /logs, /settings, /users)
  -> Client apps:
     - Web dashboard (public/*.html, JS modules, PWA)
     - Android native app (Kotlin)
     - Windows desktop app (Electron)
```

## Struktur Project

```text
.
|- android-app/                # Android native app (Kotlin)
|- electron-app/               # Windows desktop app (Electron/React/TS)
|- esp32/                      # Firmware ESP32
|- functions/                  # Firebase Cloud Functions (Node.js)
|- public/                     # Web app + landing + downloads page
|- scripts/                    # Root automation scripts (build/release)
|- database.rules.json         # RTDB security rules
|- firebase.json               # Firebase config (database + functions)
|- vercel.json                 # Vercel routing/headers config
|- .vercelignore               # Exclude heavy/binary files on Vercel deploy
|- SIGNING.md                  # Detail signing Android/Windows
`- README.md
```

## Tech Stack

- Firmware: Arduino C++ (ESP32), WiFiManager, Firebase ESP Client.
- Backend data/auth: Firebase Realtime Database + Firebase Authentication.
- Web: HTML/CSS/Vanilla JS + PWA.
- Android: Kotlin + Android Studio/Gradle.
- Desktop: Electron + React/TypeScript + electron-builder.
- Deployment web: Vercel.

## Setup Awal

### 1) Prasyarat

- Node.js 18+ (disarankan LTS 20/22).
- Android Studio (untuk build Android).
- Arduino IDE (untuk upload ESP32).
- Akun Firebase project aktif.

### 2) Setup Firebase CLI dan project

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use <PROJECT_ID>
```

### 3) Aktifkan layanan Firebase

- Authentication: Email/Password.
- Realtime Database: aktifkan instance.
- (Opsional) Functions jika dipakai.

### 4) Deploy rules database

```bash
npx -y firebase-tools@latest deploy --only database
```

### 5) Isi data awal Realtime Database

```json
{
  "listrik": {
    "arus": 0,
    "tegangan": 220,
    "relay": 1,
    "status": "NORMAL",
    "updated_at": "0"
  },
  "settings": {
    "thresholdArus": 10,
    "buzzerEnabled": true,
    "autoCutoffEnabled": true,
    "arusCalibration": 1.0,
    "teganganCalibration": 1.0,
    "sendIntervalMs": 2000,
    "telegramBotToken": "",
    "telegramChatId": ""
  }
}
```

### 6) Buat akun admin pertama

- Daftar user dari halaman login.
- Set role di RTDB:

```text
/users/{UID}/role = "admin"
```

## Setup ESP32

- SSID AP awal: `IoT-Listrik-Setup`
- Password AP awal: `listrik123`
- Konfigurasi bootstrap (WiFi + kredensial Firebase device) diisi via captive portal.
- Runtime settings (`/settings`) diubah dari web admin tanpa reflashing.

Library penting:
- Firebase ESP Client
- ArduinoJson
- WiFiManager (tzapu)

## Build dan Signing

Dokumentasi lengkap ada di `SIGNING.md`.

### Android (APK)

Contoh:

```powershell
powershell -ExecutionPolicy Bypass -File "scripts\generate-android-keystore.ps1" -Secret "<SECRET>"
powershell -ExecutionPolicy Bypass -File "scripts\build-android-release.ps1"
```

Output APK:
- `public/downloads/android/iot-listrik-dashboard-release.apk`

### Windows (MSI/Setup/Portable)

Contoh:

```powershell
powershell -ExecutionPolicy Bypass -File "electron-app\scripts\generate-electron-pfx.ps1" -Secret "<SECRET>"
powershell -ExecutionPolicy Bypass -File "electron-app\scripts\build-win-sign.ps1" -Arch "x64" -Target "msi"
powershell -ExecutionPolicy Bypass -File "electron-app\scripts\build-win-sign.ps1" -Arch "x64" -Target "setup"
powershell -ExecutionPolicy Bypass -File "electron-app\scripts\build-win-sign.ps1" -Arch "x64" -Target "portable"
```

Output Windows:
- `public/downloads/windows/iot-listrik-dashboard-x64.msi`
- `public/downloads/windows/iot-listrik-dashboard-setup-x64.exe`
- `public/downloads/windows/iot-listrik-dashboard-portable-x64.exe`

### Build all-in-one

```powershell
powershell -ExecutionPolicy Bypass -File "scripts\build-release-for-web.ps1" -Secret "<SECRET>"
```

## Deploy Web (Vercel)

Project web sekarang diarahkan ke Vercel.

```bash
npx -y vercel login
npx -y vercel link
npx -y vercel --prod
```

Catatan:
- Konfigurasi route dan header ada di `vercel.json`.
- File biner (`.exe/.msi/.apk/.aab`) di-ignore lewat `.vercelignore`.
- Untuk distribusi file installer, gunakan GitHub Releases atau storage eksternal.

## Firebase Scope Saat Ini

- `firebase.json` hanya menyimpan config:
  - `database.rules.json`
  - `functions` source
- Hosting Firebase tidak dipakai sebagai target deploy web utama.

## Security Notes

- Rules membatasi aksi admin untuk relay/settings.
- Role escalation pada path user dibatasi oleh rules.
- Credential sensitif (keystore/pfx/env) di-ignore dari git.
- Jangan commit file `.jks`, `.pfx`, `.env`, private key, dan artifacts build.

## Troubleshooting

- Gagal deploy Firebase Hosting karena executable: gunakan Vercel untuk web dan taruh binary di GitHub Releases.
- Build Electron gagal file lock: tutup proses yang mengunci file, bersihkan folder output, jalankan build ulang.
- APK unsigned: pastikan `keystore.properties` dan path signing Android benar.

## Catatan Pengembangan

- Halaman landing dan download ada di `public/index.html` dan `public/downloads.html`.
- Download page sudah mendukung pilihan arsitektur dan validasi ketersediaan file.
- Untuk fitur baru, jaga konsistensi style di `public/style.css`.

# Alat Deteksi Kebocoran Arus Listrik Berbasis IoT dengan Notifikasi Real-Time

> **Skripsi S1 — Program Studi Teknik Informatika**  
> Universitas Bina Insani, Bekasi — 2026

| Info | Detail |
|------|--------|
| **Mahasiswa** | Fatony Ahmad Fauzi |
| **NPM** | 2021310132 |
| **Kelas** | TI21C |
| **Dosen Pembimbing** | Dr. Ir. Saludin Muis, M.Kom. |
| **Ketua Program Studi** | Rully Pramudita, S.T., M.Kom. |
| **Institusi** | Fakultas Informatika, Universitas Bina Insani |

---

Sistem deteksi dini kebocoran arus listrik dan monitoring kondisi kelistrikan secara terintegrasi.  
Platform yang didukung: **Web (PWA)**, **Android**, **Windows (Desktop)**, dan **Terminal (CLI)**.



## Ringkasan Fitur

- Monitoring realtime arus, tegangan, daya semu, status, dan relay.
- Role-based access: aksi kritikal (relay/settings) hanya untuk admin.
- Histori kejadian dan notifikasi cepat (web + Telegram).
- Auto-cutoff relay saat kondisi berbahaya.
- Terminal UI (Hacker Mode) portabel untuk eksekusi tanpa GUI (Mendukung CLI Node.js & Python).
- Build pipeline untuk Android APK dan Windows installer.

## Arsitektur Singkat

```text
ESP32 + Sensor Arus & Relay
  -> Firebase Realtime Database (/listrik, /logs, /settings, /users)
  -> Client apps:
     - Web dashboard (public/js/*.js, public/css/*.css, PWA)
     - Android native app (Kotlin)   → platforms/android/
     - Windows desktop app (Electron) → platforms/electron/
     - Terminal OS (Bash/CMD)         → platforms/cli-node/ & cli-python/
```

## Struktur Project

```text
.
├── docs/                          # Dokumentasi teknis
│   ├── SIGNING.md                 # Detail signing Android & Windows
│   └── VERSION_MANAGEMENT.md     # Manajemen versi & release flow
│
├── hardware/                      # Firmware ESP32
│
├── platforms/                     # Aplikasi per-platform
│   ├── android/                   # Android native (Kotlin/Gradle)
│   ├── electron/                  # Windows desktop (Electron + React/TS)
│   ├── cli-node/                  # Terminal UI & download utility (Node.js)
│   └── cli-python/                # Terminal UI varian (Python)
│
├── public/                        # Web app (Vercel deploy)
│   ├── assets/icons/              # App icons (PWA)
│   ├── css/                       # Stylesheets
│   │   ├── style.css
│   │   └── downloads.css
│   ├── downloads/                 # Binary installer cache (di-ignore Vercel)
│   │   ├── android/
│   │   ├── cli/
│   │   └── windows/
│   ├── js/                        # JavaScript modules
│   │   ├── firebase-config.js
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── charts.js
│   │   ├── history.js
│   │   ├── hybrid-listrik.js
│   │   ├── notifications.js
│   │   ├── settings.js
│   │   ├── simulator.js
│   │   ├── client-config.js
│   │   └── version-manager.js
│   ├── app-version.json           # Salinan versi untuk browser (sync via script)
│   ├── index.html                 # Landing page
│   ├── dashboard.html
│   ├── history.html
│   ├── login.html
│   ├── settings.html
│   ├── downloads.html
│   ├── pwa-simulator.html
│   ├── manifest.json              # PWA manifest
│   └── service-worker.js          # PWA service worker
│
├── backend-local/                 # Local REST API (opsional/offline)
├── firebase-redirect/             # Firebase Hosting fallback
├── functions/                     # Firebase Cloud Functions (Node.js)
├── scripts/                       # Automation scripts (build/release/deploy)
│   ├── sync-app-version.ps1       # Sinkronisasi app-version.json ke public/
│   ├── build-all-release.ps1
│   ├── build-android-release.ps1
│   ├── build-release-for-web.ps1
│   └── upload-release.ps1
│
├── app-version.json               # Source of truth versi & URL download
├── database.rules.json            # RTDB security rules
├── firebase.json                  # Firebase config
├── vercel.json                    # Vercel routing/headers config
└── .vercelignore
```

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Firmware | Arduino C++ (ESP32), WiFiManager, Firebase ESP Client |
| Backend | Firebase Realtime Database + Firebase Authentication |
| Web | HTML / CSS / Vanilla JS + PWA |
| Android | Kotlin + Android Studio / Gradle |
| Desktop | Electron + React / TypeScript + electron-builder |
| Terminal | Node.js (Inquirer+Chalk) / Python (Questionary+Rich) |
| Deploy Web | Vercel |

## Auto-Update System

Sistem otomatis untuk mendeteksi dan download versi terbaru aplikasi.

### Web Dashboard

Tombol download di `/downloads` otomatis mengarah ke versi terbaru berdasarkan `app-version.json`.

### CLI Auto-Download (Versi Distribusi Lama)

```bash
# Download untuk platform saat ini
npx iot-listrik-dashboard download

# Atau manual dengan Node.js
node platforms/cli-node/download-cli.js

# Download spesifik
node platforms/cli-node/download-cli.js --platform windows --type setup
node platforms/cli-node/download-cli.js --platform windows --type portable
node platforms/cli-node/download-cli.js --platform windows --type msi

# Lihat versi tersedia
node platforms/cli-node/download-cli.js --list
```

### CLI Terminal Dashboard (Hacker Mode)

Instalasi sebaris cepat khusus untuk pengguna **Linux, WSL, OS X, dan Termux Android**:
```bash
curl -sL "https://iot-listrik-dashboard.vercel.app/downloads/cli/install.sh" | bash
```
Atau Anda dapat mengunduh langsung eksekusinya yang terkompilasi penuh via `pkg` (Node.js) atau `pyinstaller` (Python) khusus untuk `.exe` Windows pada halaman `/downloads`.

### Release Management

Untuk membuat release versi baru:

```powershell
# 1. Update versi di app-version.json (root)
# 2. Sinkronisasi ke public/ agar website terbaca:
.\scripts\sync-app-version.ps1

# 3. Build semua platform dengan versi baru
.\scripts\build-all-release.ps1 -NewVersion 1.0.2

# Atau build terpisah
.\scripts\build-android-release.ps1
.\scripts\build-release-for-web.ps1 -Secret <SECRET>

# 4. Upload ke GitHub Releases
.\scripts\upload-release.ps1 -Version 1.0.2
```

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

Firmware ada di `hardware/`.

## Build dan Signing

Dokumentasi lengkap ada di `docs/SIGNING.md`.

### Android (APK)

```powershell
powershell -ExecutionPolicy Bypass -File "scripts\generate-android-keystore.ps1" -Secret "<SECRET>"
powershell -ExecutionPolicy Bypass -File "scripts\build-android-release.ps1"
```

Output APK:

- `public/downloads/android/iot-listrik-dashboard-release.apk`

### Windows (MSI/Setup/Portable)

```powershell
powershell -ExecutionPolicy Bypass -File "platforms\electron\scripts\generate-electron-pfx.ps1" -Secret "<SECRET>"
powershell -ExecutionPolicy Bypass -File "platforms\electron\scripts\build-win-sign.ps1" -Arch "x64" -Target "msi"
powershell -ExecutionPolicy Bypass -File "platforms\electron\scripts\build-win-sign.ps1" -Arch "x64" -Target "setup"
powershell -ExecutionPolicy Bypass -File "platforms\electron\scripts\build-win-sign.ps1" -Arch "x64" -Target "portable"
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

```bash
npx -y vercel login
npx -y vercel link
npx -y vercel --prod
```

Catatan:

- Konfigurasi route dan header ada di `vercel.json`.
- Subfolder `public/js/` dan `public/css/` sudah dikonfigurasi cache header di `vercel.json`.
- File biner (`.exe/.msi/.apk/.aab`) di-ignore lewat `.vercelignore`.
- Untuk distribusi file installer, gunakan GitHub Releases (via `scripts/upload-release.ps1`).

## Firebase Scope Saat Ini

- `firebase.json` hanya menyimpan config:
  - `database.rules.json`
  - `functions` source
- Hosting Firebase tidak dipakai sebagai target deploy web utama (Vercel).

## Security Notes

- Rules membatasi aksi admin untuk relay/settings.
- Role escalation pada path user dibatasi oleh rules.
- Credential sensitif (keystore/pfx/env) di-ignore dari git.
- Jangan commit file `.jks`, `.pfx`, `.env`, private key, dan artifacts build.
- `backend-local/serviceAccountKey.json` ada di `.gitignore` — **jangan pernah di-commit**.

## Troubleshooting

- **Gagal deploy Vercel karena file besar**: gunakan `.vercelignore` dan simpan binary di GitHub Releases.
- **Build Electron gagal file lock**: tutup proses yang mengunci file, bersihkan `platforms/electron/dist/`, jalankan build ulang.
- **APK unsigned**: pastikan `keystore.properties` ada di `platforms/android/keystore/` dan path signing benar.
- **PWA tidak load offline**: pastikan `service-worker.js` tetap di `public/` root (bukan di subfolder).

## Catatan Pengembangan

- Halaman landing dan download ada di `public/index.html` dan `public/downloads.html`.
- Semua logic JS ada di `public/js/` — import antar modul menggunakan relative path (`./`).
- Semua style ada di `public/css/style.css` — jaga konsistensi CSS variable yang sudah ada.
- Untuk versi info baru, update `app-version.json` lalu jalankan `scripts/upload-release.ps1`.

## Lisensi

MIT © 2026 Fatony Ahmad Fauzi

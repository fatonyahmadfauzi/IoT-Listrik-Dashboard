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

Sistem monitoring kondisi kelistrikan terintegrasi dengan deteksi dini **indikasi arus bocor** atau **arus abnormal** berbasis IoT.
Platform yang didukung: **Web (PWA)**, **Android**, **Windows (Desktop)**, dan **Terminal (CLI)**.



## Ringkasan Fitur

- Monitoring realtime arus, tegangan, daya semu, status `NORMAL / WARNING / DANGER`, dan relay.
- **PWA Simulator Mode**: Platform simulasi virtual (*multi-akun*) yang terisolasi dari basis data utama, digunakan untuk pengujian atau presentasi tanpa memerlukan *hardware* fisik ESP32.
- **Premium UI & Dark Mode**: Tampilan dasbor modern *(Glassmorphism)* yang responsif serta mendukung integrasi *Global Dark Mode* bawaan sistem operasi.
- **Device Presence Detection (Watchdog)**: Deteksi otomatis status koneksi perangkat (**Online/Offline**) ketika aliran data terputus, bekerja secara *real-time* di seluruh platform tanpa modifikasi firmware ESP32.
- Role-based access: aksi kritikal (relay/settings) hanya untuk admin.
- Histori kejadian dan notifikasi multi-channel (Web push + Telegram + **Discord Webhook**).
- Auto-cutoff relay saat arus melewati ambang bahaya yang ditentukan.
- Terminal UI (Hacker Mode) portabel untuk eksekusi tanpa GUI (Mendukung CLI Node.js & Python).
- Build pipeline untuk Android APK dan Windows installer.
- **Discord Webhook**: notifikasi real-time ke 4 channel Discord berbeda (alerts, relay, monitoring, logs) — dikonfigurasi via admin UI tanpa Firebase Billing.

## Catatan Logika Deteksi

- Sistem membaca arus beban menggunakan **SCT-013** dan tegangan menggunakan **ZMPT101B**.
- Dashboard menampilkan **indikasi arus bocor** atau **arus abnormal** sebagai peringatan dini, bukan pengukuran residual current presisi seperti **RCD/ELCB**.
- **Beban tinggi normal** tidak otomatis dianggap kebocoran selama nilai arus masih sesuai kapasitas beban uji dan belum melewati ambang yang ditentukan.
- **Short circuit / gangguan ekstrem** diperlakukan sebagai kondisi bahaya dengan lonjakan arus sangat besar dan cepat.
- **MCB / ELCB** tetap menjadi proteksi utama instalasi listrik, sedangkan sistem ini berfungsi sebagai monitoring, notifikasi, dan auto-cutoff tambahan.

## Arsitektur Singkat

```text
ESP32 + SCT-013 + ZMPT101B + Relay/Kontaktor
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
├── .github/
│   ├── workflows/
│   │   └── ci.yml                 # GitHub Actions CI (validate assets)
│   └── copilot-instructions.md    # Panduan AI coding assistant
│
├── docs/                          # Dokumentasi teknis
│   ├── DISCORD_SETUP.md           # Panduan setup Discord Webhook
│   ├── SIGNING.md                 # Detail signing Android & Windows
│   └── VERSION_MANAGEMENT.md     # Manajemen versi & release flow
│
├── hardware/                      # Firmware ESP32 (C++ Arduino)
│   ├── config.example.h           # Template konfigurasi (commit-safe)
│   ├── config.h                   # Konfigurasi aktif (di-ignore git)
│   └── main/                      # Sketch utama
│
├── platforms/                     # Aplikasi per-platform
│   ├── android/                   # Android native (Kotlin/Gradle)
│   ├── electron/                  # Windows desktop (Electron + React/TS)
│   ├── cli-node/                  # Terminal UI & download utility (Node.js)
│   └── cli-python/                # Terminal UI varian (Python)
│
├── public/                        # Web — Landing page & halaman publik (Vercel)
│   ├── app/                       # PWA shell — halaman auth-required
│   │   │                          # (scope terpisah agar tidak bentrok dengan web publik)
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── history.html
│   │   ├── settings.html
│   │   ├── manifest.json          # PWA manifest untuk /app/ scope
│   │   └── sw.js                  # Service worker scope /app/
│   ├── assets/icons/              # App icons (PWA & favicon)
│   ├── css/
│   │   ├── style.css              # Design system & semua halaman
│   │   ├── downloads.css          # Halaman download
│   │   └── features.css           # Halaman features
│   ├── js/                        # JavaScript modules (shared)
│   │   ├── components/            # Web components (navbar, footer)
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
│   │   ├── pwa-guard.js
│   │   └── version-manager.js
│   ├── downloads/                 # Binary installer cache (di-ignore Vercel & git)
│   ├── app-version.json           # Salinan versi untuk browser (sync via script)
│   ├── index.html                 # Landing page
│   ├── features.html
│   ├── downloads.html
│   ├── pwa-simulator.html
│   ├── manifest.json              # PWA manifest untuk scope /
│   └── service-worker.js          # Service worker scope /
│
├── backend-local/                 # Local Node.js Notifier (discord-notifier.js & sim-notifier.js) & REST API
├── firebase-redirect/             # Firebase Hosting fallback → redirect ke Vercel
├── functions/                     # Firebase Cloud Functions (Node.js)
├── scripts/                       # Automation scripts (lihat scripts/README.md)
│
├── CHANGELOG.md                   # Riwayat perubahan per-versi
├── CONTRIBUTING.md                # Panduan kontribusi
├── app-version.json               # Source of truth versi & URL download
├── database.rules.json            # RTDB security rules
├── firebase.json                  # Firebase CLI config
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
| Notifikasi | Telegram Bot API + **Discord Webhook** (4 channel) |

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
    "telegramChatId": "",
    "discord": {
      "enabled": false,
      "webhookAlerts": "",
      "webhookRelay": "",
      "webhookMonitoring": "",
      "webhookLogs": ""
    }
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

## Integrasi Discord Webhook

Notifikasi real-time dikirim ke 4 channel Discord terpisah. **Tidak memerlukan Firebase Billing.**

> 🔗 **Discord Server**: [discord.gg/WszeM4FVH6](https://discord.gg/WszeM4FVH6) — Join untuk mendapatkan channel monitoring siap pakai.

| Channel | Trigger |
|---------|---------|
| `#alerts` | Status BAHAYA / WARNING / pulih NORMAL, beserta notifikasi perangkat terputus (**OFFLINE 🔴**) / pulih (**ONLINE 🟢**) |
| `#relay` | Relay ON↔OFF berubah |
| `#monitoring` | Snapshot data listrik (max 1x / 5 menit) |
| `#logs` | Entry log aktivitas baru `/logs` |

### Cara Setup

**1. Set webhook via Admin UI** (disimpan ke `/settings/discord/` di RTDB):
```
https://iot-listrik-dashboard.vercel.app/settings
→ Scroll ke "Integrasi Discord Webhook"
→ Isi URL webhook per channel → Simpan
```

**2. Jalankan local notifier:**
```bash
cd backend-local
npm install
# Untuk Hardware Utama ESP32
npm run discord
# ATAU manual: node discord-notifier.js

# Untuk Simulator Virtual PWA
npm run sim-notify
# ATAU manual: node sim-notifier.js
```

Notifier membaca webhook URL dari RTDB secara real-time — ganti URL kapanpun dari admin UI tanpa restart.

Panduan lengkap: [`docs/DISCORD_SETUP.md`](docs/DISCORD_SETUP.md)

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
- Dokumen revisi skripsi, file `.docx/.pdf`, dan file personal di root repo di-ignore lewat `.gitignore` dan `.vercelignore`.
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

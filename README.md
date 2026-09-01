# Alat Deteksi Kebocoran Arus Listrik Berbasis IoT dengan Notifikasi Real-Time

![Version](https://img.shields.io/badge/versi-1.1.6-blue) ![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Android%20%7C%20Windows%20%7C%20CLI-brightgreen) ![License](https://img.shields.io/badge/lisensi-MIT-green) ![Firebase](https://img.shields.io/badge/Firebase-RTDB-orange)

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

## Status Release Saat Ini

Per 1 September 2026, seluruh artefak project yang dipublikasikan menggunakan release v1.1.6:

| Platform | Release yang digunakan | Keterangan |
|---|---|---|
| Web/PWA | `v1.1.6` | Perbaikan alarm offline dan cache PWA |
| Android | `v1.1.6` | Perbaikan penghentian alarm offline |
| Windows Setup, Portable, MSI | `v1.1.6` | Perbaikan penghentian alarm offline |
| CLI Node.js, Python, Linux | `v1.1.6` | Build terbaru |

Release terbaru secara keseluruhan adalah `v1.1.6`. Seluruh tautan unduhan diarahkan ke aset GitHub Release v1.1.6.



## Ringkasan Fitur

- Monitoring realtime arus, tegangan, daya aktif, daya semu, energi, frekuensi, power factor, status `NORMAL / WARNING / DANGER`, dan relay dari PZEM-004T.
- **PWA Simulator Mode**: Platform simulasi virtual (*multi-akun*) yang terisolasi dari basis data utama, digunakan untuk pengujian atau presentasi tanpa memerlukan *hardware* fisik ESP32.
- **Premium UI & Dark Mode**: Tampilan dasbor modern *(Glassmorphism)* yang responsif serta mendukung integrasi *Global Dark Mode* bawaan sistem operasi.
- **Device Presence Detection (Watchdog)**: Deteksi otomatis status koneksi perangkat (**Online/Offline**) ketika aliran data terputus, bekerja secara *real-time* di seluruh platform tanpa modifikasi firmware ESP32.
- Role-based access: aksi kritikal (relay/settings) hanya untuk admin.
- Histori kejadian, export CSV, dan notifikasi multi-channel (Web push + Telegram + **Discord Webhook** + Discord Bot tools).
- Auto-cutoff relay saat arus melewati ambang bahaya yang ditentukan.
- Kontrol stream realtime perangkat: admin dapat pause/resume pengiriman data IoT dan mengatur delay stream.
- Auto Learning Beban Normal: admin dapat mempelajari arus maksimum beban normal selama durasi tertentu, lalu sistem menghitung threshold aman dengan margin agar beban tinggi normal tidak salah dibaca sebagai kondisi bahaya.
- Bootstrap device dari dashboard: WiFi, Firebase API key, dan RTDB URL perangkat dapat dikelola tanpa upload ulang firmware.
- Reset realtime `/listrik`, hapus seluruh data monitoring (`/listrik` + `/logs`) dengan OTP email, serta backup database Firebase + rules ke email admin.
- Laporan harian Excel otomatis: data monitoring 24 jam dikirim ke Telegram dan Discord jika ada data baru pada hari tersebut.
- Terminal UI (Hacker Mode) portabel untuk eksekusi tanpa GUI (Mendukung CLI Node.js & Python).
- Build pipeline untuk Android APK, Windows MSI/Setup/Portable, dan CLI binaries.
- **Telegram Admin Tools**: multi Chat ID/Group ID, jumlah penerima aktif, test pesan, hubungkan bot, serta command `/pause` dan `/resume` per chat.
- **Discord Admin Tools**: 5 tujuan webhook (alerts, relay, monitoring, daily report, logs), status bot, ringkasan server, jumlah member/online/ban, ban/unban user.
- **Halaman Analytics**: ringkasan statistik histori log — min/max/rata-rata arus, tegangan, daya, tren sensor dalam grafik, distribusi status (NORMAL/WARNING/DANGER), dan snapshot parameter listrik terkini. Tersedia di Web PWA (/app/analytics) dan Windows Desktop.
- **Filter Tanggal Log**: kalender interaktif di halaman Riwayat dan Analytics — tanggal tanpa data dinonaktifkan otomatis, semua filter (grafik, tabel ringkas, tabel detail, export CSV) diperbarui serentak.
- **Mode Koneksi LOCAL / CLOUD / AUTO**: sumber data realtime dapat dikonfigurasi dari Settings. Mode AUTO menggunakan Firebase langsung dan fallback otomatis ke local REST backend (backend-local/server.js) jika Firebase tidak terjangkau.
- **LCD 1602 I2C opsional** pada firmware ESP32: tampilkan arus, tegangan, status, dan relay langsung di layar fisik. Aktifkan dengan #define USE_LCD di config.h.
- Ring buffer log 4 slot di firmware ESP32 — event log tidak lagi saling menimpa saat beberapa trigger terjadi bersamaan (status change + periodic + auto-cutoff + web_command).
- Kolom **Sumber Meter** (contoh: `PZEM-004T`) dan **Uptime** (`5521 s`) kini konsisten di seluruh platform: Web, Android, Windows Desktop, dan Terminal CLI.
- Export CSV halaman Riwayat mencakup kolom Sumber Meter dan Uptime.

## Catatan Logika Deteksi

- Sistem membaca parameter listrik utama menggunakan **PZEM-004T**. Rangkaian sensor analog tambahan tidak lagi dipakai pada firmware utama.
- Dashboard menampilkan **indikasi arus bocor** atau **arus abnormal** sebagai peringatan dini, bukan pengukuran residual current presisi seperti **RCD/ELCB**.
- **Beban tinggi normal** tidak otomatis dianggap kebocoran selama nilai arus masih sesuai kapasitas beban uji dan belum melewati ambang yang ditentukan.
- **Short circuit / gangguan ekstrem** diperlakukan sebagai kondisi bahaya dengan lonjakan arus sangat besar dan cepat.
- **MCB / ELCB** tetap menjadi proteksi utama instalasi listrik, sedangkan sistem ini berfungsi sebagai monitoring, notifikasi, dan auto-cutoff tambahan.

## Arsitektur Singkat

```text
ESP32 + PZEM-004T + Relay/Kontaktor
  -> Firebase Realtime Database
     (/listrik, /logs, /settings, /settings/discord, /settings/telegramRecipients, /users)
  -> Client apps:
     - Web dashboard (public/js/*.js, public/css/*.css, PWA)
       • Dashboard, Riwayat Log, Analytics, Settings, Telegram, Discord, Users
     - Android native app (Kotlin)    → platforms/android/
     - Windows desktop app (Electron) → platforms/electron/
       • Dashboard, Riwayat Log, Analytics, Settings (Telegram, Discord)
     - Terminal CLI (Bash/CMD)        → platforms/cli-node/ & cli-python/
  -> Backend/API:
     - Vercel Serverless Functions (/api/*.js)
       • OTP email, backup DB, Discord bot, Telegram action
     - Local REST backend (backend-local/server.js) — fallback mode LOCAL/AUTO
     - Local notifier  (backend-local/discord-notifier.js & sim-notifier.js)
```

## Struktur Project

```text
.
├── .github/
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
│   ├── sensors.h                  # Pembacaan PZEM-004T & logika status
│   ├── firebase_handler.h         # HTTPS REST ke Firebase RTDB
│   ├── telegram_handler.h         # Notifikasi Telegram Bot
│   ├── discord_handler.h          # Notifikasi Discord Webhook
│   └── main/                      # Sketch utama (loop, FreeRTOS dual-core)
│
├── platforms/                     # Aplikasi per-platform
│   ├── android/                   # Android native (Kotlin/Gradle)
│   ├── electron/                  # Windows desktop (Electron + React/TS)
│   │   └── src/components/        # Dashboard, History, Analytics, Settings, Login
│   ├── cli-node/                  # Terminal CLI + download utility (Node.js/pkg)
│   │   ├── index.js               # CLI utama (live stream, log, relay, settings)
│   │   ├── download-cli.js        # Download binary CLI untuk semua platform
│   │   └── node-source/           # Source untuk install.sh Linux/Mac/Termux
│   └── cli-python/                # Terminal CLI varian (Python/PyInstaller)
│
├── public/                        # Web — Landing page & halaman publik (Vercel)
│   ├── app/                       # PWA shell — halaman auth-required
│   │   │                          # (scope terpisah agar tidak bentrok dengan web publik)
│   │   ├── login.html
│   │   ├── dashboard.html         # Monitoring realtime + mini log
│   │   ├── history.html           # Riwayat log + filter tanggal + export CSV
│   │   ├── analytics.html         # Statistik, tren, distribusi status
│   │   ├── settings.html          # Sensor, kalibrasi, stream, auto-learning, bootstrap
│   │   ├── telegram.html          # Multi Chat ID, pause/resume, test pesan
│   │   ├── discord.html           # Webhook per channel, bot tools
│   │   ├── users.html             # Manajemen pengguna dan role
│   │   ├── manifest.json          # PWA manifest untuk /app/ scope
│   │   └── sw.js                  # Service worker scope /app/
│   ├── assets/icons/              # App icons (PWA & favicon)
│   ├── css/
│   │   ├── style.css              # Design system & semua halaman
│   │   ├── downloads.css          # Halaman download
│   │   └── features.css           # Halaman features
│   ├── js/                        # JavaScript modules (shared)
│   │   ├── components/            # Web components (navbar.js, footer.js)
│   │   ├── firebase-config.js     # Inisialisasi Firebase SDK
│   │   ├── app.js                 # Dashboard: realtime + mini log
│   │   ├── auth.js                # Auth, role, getDbPrefix, isTempAccount
│   │   ├── analytics.js           # Halaman Analytics: statistik & grafik histori
│   │   ├── charts.js              # Chart.js helpers (realtime & histori)
│   │   ├── date-filter.js         # Filter tanggal interaktif untuk log & analytics
│   │   ├── history.js             # Halaman Riwayat: tabel log + filter + CSV
│   │   ├── hybrid-listrik.js      # Mode koneksi LOCAL/CLOUD/AUTO + failover
│   │   ├── notifications.js       # Web Push, toast, audio alarm
│   │   ├── settings.js            # Halaman Settings admin
│   │   ├── simulator.js           # PWA Simulator: kontrol virtual ESP32
│   │   ├── simulator-control.js   # Panel kontrol simulator
│   │   ├── simulator-landing.js   # Landing page simulator
│   │   ├── client-config.js       # Konfigurasi mode LOCAL/CLOUD/AUTO (localStorage)
│   │   ├── pwa-guard.js           # Guard redirect halaman app/
│   │   ├── app-header.js          # Header bar realtime (status + waktu)
│   │   ├── version-manager.js     # Deteksi & notifikasi versi baru
│   │   ├── scroll-reveal.js       # Animasi scroll reveal landing page
│   │   ├── cinematic-parallax.js  # Efek parallax landing page
│   │   └── speed-insights.js      # Vercel Speed Insights
│   ├── downloads/                 # Binary installer cache (di-ignore Vercel & git)
│   │   ├── cli/                   # CLI binaries + install.sh + node-source/
│   │   └── windows/               # Windows EXE/MSI cache
│   ├── app-version.json           # Salinan versi untuk browser (sync via script)
│   ├── index.html                 # Landing page
│   ├── features.html              # Halaman fitur produk
│   ├── downloads.html             # Halaman unduhan semua platform
│   ├── pwa-simulator.html         # Landing PWA Simulator virtual
│   ├── 404.html                   # Halaman 404 custom
│   ├── manifest.json              # PWA manifest untuk scope /
│   └── service-worker.js          # Service worker scope /
│
├── api/                           # Vercel Serverless Functions
│   ├── ban-discord-user.js        # Ban user Discord via Bot
│   ├── unban-discord-user.js      # Unban user Discord
│   ├── get-discord-bot-status.js  # Status & info server Discord Bot
│   ├── save-discord-bot-config.js # Simpan konfigurasi Discord Bot ke RTDB
│   ├── confirm-live-reset.js      # Konfirmasi reset /listrik (validasi nama)
│   ├── confirm-monitoring-wipe.js # Konfirmasi hapus /listrik + /logs (OTP)
│   ├── request-live-reset-otp.js  # Kirim OTP email untuk reset realtime
│   ├── request-monitoring-wipe-otp.js # Kirim OTP email untuk hapus monitoring
│   ├── send-database-backup-email.js  # Backup RTDB + rules ke email admin
│   ├── telegram-admin-action.js   # Telegram admin: profile, test, multi-chat
│   ├── create-temp-account.js     # Buat akun demo sementara (PWA Simulator)
│   └── cleanup.js                 # Pembersihan data kedaluwarsa (cron)
├── backend-local/                 # Local Node.js backend (mode LOCAL/AUTO)
│   ├── server.js                  # REST API /api/listrik & /api/logs + FCM push
│   ├── discord-notifier.js        # Notifier Discord & Telegram (hardware)
│   └── sim-notifier.js            # Notifier Discord & Telegram (simulator)
├── firebase-redirect/             # Firebase Hosting fallback → redirect ke Vercel
├── functions/                     # Firebase Cloud Functions (Node.js)
│   └── index.js                   # Trigger Cloud Functions
├── scripts/                       # Automation scripts PowerShell
│   ├── build-all-release.ps1      # Build semua platform sekaligus
│   ├── build-android-release.ps1  # Build APK release Android
│   ├── build-cli-release.ps1      # Build CLI Node.js + Python executable
│   ├── build-release-for-web.ps1  # Build + signing semua aset untuk Vercel
│   ├── build-all-signed-selfsigned.ps1 # Build dengan self-signed certificate
│   ├── generate-android-keystore.ps1   # Generate keystore APK
│   ├── sync-app-version.ps1       # Sinkronisasi app-version.json root → public/
│   └── upload-release.ps1         # Upload semua aset ke GitHub Releases
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
| Notifikasi | Telegram Bot API + **Discord Webhook** + Discord Bot REST |

## Auto-Update System

Sistem otomatis untuk mendeteksi dan download versi terbaru aplikasi.

### Web Dashboard

Tombol download di `/downloads` otomatis mengarah ke versi terbaru berdasarkan `app-version.json`.

### CLI Auto-Download

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
.\scripts\build-all-release.ps1 -NewVersion 1.0.0

# Atau build terpisah
.\scripts\build-android-release.ps1
.\scripts\build-release-for-web.ps1 -Secret <SECRET>

# 4. Upload ke GitHub Releases
.\scripts\upload-release.ps1 -Version v1.1.0
```

## Kompatibilitas Platform

| Platform | Download | Status |
|----------|----------|--------|
| Web PWA | [iot-listrik-dashboard.vercel.app](https://iot-listrik-dashboard.vercel.app) | ✅ Live |
| Android APK | [GitHub Releases v1.1.0](https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/tag/v1.1.0) | ✅ v1.1.0 |
| Windows Setup/Portable/MSI | [GitHub Releases v1.1.0](https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/tag/v1.1.0) | ✅ v1.1.0 |
| CLI Node.js (Win x64) | [GitHub Releases v1.1.0](https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/tag/v1.1.0) | ✅ v1.1.0 |
| CLI Python (Win x64) | [GitHub Releases v1.1.0](https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/tag/v1.1.0) | ✅ v1.1.0 |
| CLI Linux/Mac/Termux | `curl -sL https://iot-listrik-dashboard.vercel.app/downloads/cli/install.sh \| bash` | ✅ v1.1.0 |

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
    "realtimeStreamEnabled": true,
    "autoLearning": {
      "active": false,
      "status": "idle",
      "durationMs": 120000,
      "marginPercent": 25,
      "applyToThreshold": true
    },
    "telegramBotToken": "",
    "telegramNotifyEnabled": true,
    "telegramRecipients": [],
    "discord": {
      "enabled": false,
      "webhookAlerts": "",
      "webhookRelay": "",
      "webhookMonitoring": "",
      "webhookDailyReport": "",
      "webhookLogs": ""
    },
    "discordBot": {
      "guildId": "",
      "tokenConfigured": false
    },
    "deviceBootstrap": {
      "wifiSsid": "",
      "wifiPassword": "",
      "firebaseApiKey": "",
      "databaseUrl": ""
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
- PZEM004Tv30

Firmware ada di `hardware/`.

## Admin UI dan Operasional

Halaman admin dipisah agar pengaturan tidak menumpuk di satu halaman:

- `/settings` dan `/app/settings`: umum, sensor, auto learning beban normal, kalibrasi, bootstrap device, reset realtime, backup database, hapus monitoring, backend web.
- `/telegram` dan `/app/telegram`: bot token, daftar Chat ID/Group ID, jumlah penerima, test pesan, hubungkan bot, serta `/pause` dan `/resume` per chat.
- `/discord` dan `/app/discord`: webhook per channel, master switch, test pesan, status bot, ringkasan server, daftar ban, ban/unban user.
- `/users` dan `/app/users`: manajemen pengguna dan role.

### Reset, Hapus, dan Backup Database

- **Reset Data Realtime IoT** mengosongkan node `/listrik` saja. Histori `/logs` tetap ada. Validasi dilakukan dengan mengetik nama project.
- **Hapus Semua Data Monitoring** mengosongkan `/listrik` dan `/logs`. Aksi ini memakai OTP email admin.
- **Backup Database Firebase** mengirim file JSON snapshot RTDB dan `database.rules.json` ke email admin.

### Laporan Harian Excel

Backend notifier dapat membuat laporan Excel harian berdasarkan data monitoring 24 jam. File dikirim ke Telegram dan webhook Discord laporan harian hanya jika ada data baru pada tanggal tersebut.

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

## Validasi Lokal Gratis

GitHub Actions CI dihapus supaya tidak terkena blokir billing GitHub. Sebagai pengganti, validasi project dijalankan lokal dan tetap gratis.

```powershell
npm run validate
```

Validasi ini mengecek:

- struktur dasar HTML di `public/`;
- referensi JS/CSS/link lokal yang hilang;
- pasangan halaman admin root dan `/app`;
- `vercel.json`, `database.rules.json`, `firebase.json`, `app-version.json`, dan manifest PWA;
- destination rewrite Vercel;
- syntax `functions/index.js` dan file API serverless di `api/`.

Untuk deploy aman:

```powershell
npm run deploy:safe
```

Command tersebut menjalankan validasi lebih dulu, lalu deploy ke Vercel hanya jika validasi lolos.

## Integrasi Telegram dan Discord

Notifikasi real-time dikirim ke Telegram dan Discord. Konfigurasi disimpan di Realtime Database sehingga bot token, penerima Telegram, webhook Discord, dan pengaturan channel dapat diubah dari admin UI.

> 🔗 **Discord Server**: [discord.gg/WszeM4FVH6](https://discord.gg/WszeM4FVH6) — Join untuk mendapatkan channel monitoring siap pakai.

| Channel | Trigger |
|---------|---------|
| `#alerts` | Status BAHAYA / WARNING / pulih NORMAL, beserta notifikasi perangkat terputus (**OFFLINE 🔴**) / pulih (**ONLINE 🟢**) |
| `#relay` | Relay ON↔OFF berubah |
| `#monitoring` | Snapshot data listrik (max 1x / 5 menit) |
| `#daily-report` | File Excel laporan monitoring harian ketika ada data baru |
| `#logs` | Entry log aktivitas baru `/logs` |

### Cara Setup

**1. Set webhook via Admin UI** (disimpan ke `/settings/discord/` di RTDB):
```
https://iot-listrik-dashboard.vercel.app/discord
→ Isi URL webhook per channel → Simpan
→ Gunakan Test Kirim Pesan untuk verifikasi
```

**2. Set Telegram via Admin UI**:
```
https://iot-listrik-dashboard.vercel.app/telegram
→ Isi Bot Token
→ Tambahkan Chat ID / Group ID
→ Gunakan Hubungkan Bot atau Test Kirim Pesan
```

Setiap Chat ID dapat melakukan `/pause` dan `/resume` untuk menghentikan atau mengaktifkan notifikasi miliknya sendiri.

**3. Jalankan local notifier:**
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

Notifier membaca konfigurasi Telegram dan Discord dari RTDB secara real-time. Discord Bot untuk status server dan ban/unban user memakai endpoint Vercel API di folder `api/`.

Panduan lengkap: [`docs/DISCORD_SETUP.md`](docs/DISCORD_SETUP.md)

## Deploy Web (Vercel)

```bash
npx -y vercel login
npx -y vercel link
npm run deploy:safe
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

- Rules membatasi aksi admin untuk relay/settings dan menolak akses client ke `/admin_secure` serta `/rate_limits`.
- Endpoint admin Vercel memakai Firebase ID token, role admin dari RTDB, CORS allowlist, dan response `no-store`.
- Header Vercel memakai CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, dan HSTS dari platform.
- Route cleanup hanya menerima secret lewat header `Authorization: Bearer ...` atau `x-cron-secret`; jangan kirim secret melalui query URL.
- Credential sensitif (keystore/pfx/env/private key) di-ignore dari git dan `.vercelignore`.
- Jangan commit file `.jks`, `.pfx`, `.env`, private key, service account, atau artifacts build.
- `backend-local/serviceAccountKey.json` ada di `.gitignore` — **jangan pernah di-commit**.
- Batasi Firebase Web API key di Google Cloud Console berdasarkan domain web, dan batasi Android key berdasarkan package name + SHA certificate.

## Troubleshooting

- **Gagal deploy Vercel karena file besar**: gunakan `.vercelignore` dan simpan binary di GitHub Releases.
- **Build Electron gagal file lock**: tutup proses yang mengunci file, bersihkan `platforms/electron/dist/`, jalankan build ulang.
- **APK unsigned**: pastikan `keystore.properties` ada di `platforms/android/keystore/` dan path signing benar.
- **PWA tidak load offline**: pastikan `service-worker.js` tetap di `public/` root (bukan di subfolder).
- **Log tabel kosong di dashboard/APK**: Pastikan firmware ESP32 sudah diflash versi terbaru. Penyebab utama: `$other` validator Firebase rules sebelumnya menolak field `timestamp` (number) dari ESP32. Sudah diperbaiki di `database.rules.json` v1.1.0.
- **Waktu tampil `-` di CLI**: Update CLI ke v1.1.0. Versi lama membaca field `timestamp` yang tidak ada di `/listrik` — seharusnya `updated_at`.

## Catatan Pengembangan

- Halaman landing dan download ada di `public/index.html` dan `public/downloads.html`.
- Semua logic JS ada di `public/js/` — import antar modul menggunakan relative path (`./`).
- Semua style ada di `public/css/style.css` — jaga konsistensi CSS variable yang sudah ada.
- Untuk versi info baru, update `app-version.json` lalu jalankan `scripts/upload-release.ps1`.

## Lisensi

MIT © 2026 Fatony Ahmad Fauzi

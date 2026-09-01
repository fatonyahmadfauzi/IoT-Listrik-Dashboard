# Changelog

Semua perubahan penting pada proyek ini didokumentasikan di sini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/),
dan proyek ini mengikuti [Semantic Versioning](https://semver.org/lang/id/).

---

## [1.1.6] — 2026-09-01

### Fixed
- Encoding label Telegram dibuat aman tanpa emoji mojibake pada snapshot metrik.
- Alarm Web/PWA, Windows, dan Android berhenti saat telemetry berhenti atau perangkat offline.
- Alarm Android disatukan pada foreground service agar perintah `STOP_ALARM` menghentikan suara, getaran, notifikasi, dan layar alarm.
- Backend mengirim `STOP_ALARM` ketika event `device_offline` diterima.

### Changed
- Cache Service Worker PWA dibump agar perbaikan alarm terbaru tidak tertahan cache lama.

## [1.1.5] — 2026-08-29

### Fixed
- CLI Node.js, CLI Python, dan CLI Linux diperbarui agar countdown akun demo tetap berjalan pada menu dan mode monitoring.
- Penanganan login dengan kredensial salah pada seluruh CLI diperjelas tanpa menampilkan stack trace yang membingungkan pengguna.

### Changed
- Release ini hanya memperbarui artefak CLI. Android APK serta Windows Setup, Portable, dan MSI tetap menggunakan paket GUI stabil dari release sebelumnya.

## [1.1.4] — 2026-08-28

### Fixed
- Sinkronisasi countdown demo pada CLI dan mode Live Monitoring.
- Penyelarasan metadata release dan tautan unduhan dengan artefak yang tersedia.

## [1.1.0] — 2026-08-14

### Added
- Kolom **Sumber Meter** (contoh: `PZEM-004T`) dan **Uptime** (contoh: `5521 s`) kini tampil di tabel log ringkas dan detail pada seluruh platform: Web dashboard (mini log & halaman riwayat), Android APK, Windows Desktop (Electron), CLI Node.js, dan CLI Python.
- Export CSV halaman Riwayat di Web dan Windows Desktop kini menyertakan kolom Sumber Meter dan Uptime.
- Serial log `[LogBuf]` di firmware ESP32 dengan informasi cause, status, jumlah buffer tersisa, dan pesan error untuk memudahkan debug log yang gagal terkirim.

### Fixed
- **Bug kritis — log tabel kosong**: Field `timestamp` yang dikirim ESP32 (`{".sv":"timestamp"}`) di-expand Firebase menjadi Number, tapi validator `$other` di `database.rules.json` hanya menerima String — menyebabkan **seluruh write log ditolak Firebase secara diam-diam**. Diperbaiki dengan menambahkan rule eksplisit untuk field `timestamp` dan memperluas `$other` agar menerima Number dan Boolean.
- **Firmware ESP32 — single-slot `pendingLog` diganti ring buffer 4 slot**: Event log tidak lagi saling menimpa saat beberapa trigger terjadi bersamaan (status change + auto-cutoff + periodic + initial_snapshot). Buffer overwrite slot terlama jika penuh.
- **Firmware ESP32 — retry log memblokir slot baru**: Logika consume di Step 5 dipisah — `retryLog` diproses hanya saat cooldown habis, tidak memblokir `logBuf` baru. Ditambah pressure valve: kirim slot terlama jika buffer ≥ 3/4 penuh.
- **Firmware ESP32 — periodic log bisa di-skip**: Guard `if (!pendingLog.active)` dihapus dari periodic log — sekarang periodic push selalu masuk ke ring buffer tanpa syarat.
- **Firmware ESP32 — mutex timeout terlalu pendek**: Timeout `xSemaphoreTake` dinaikkan dari 10ms ke 50ms (Core 0) dan 30ms (Core 1) untuk mencegah race condition pada `initial_snapshot` yang menyebabkan log pertama tidak pernah terkirim.
- **Web dashboard — error handler hilang di listener `/logs`**: `onValue` di `app.js` tidak punya error callback — PERMISSION_DENIED ditelan diam-diam, tabel kosong tanpa pesan. Sekarang menampilkan pesan error di tabel.
- **Android — `onCancelled` kosong di 3 Firebase listener**: Connection, dashboard, dan history listener tidak melaporkan error Firebase. Sekarang menampilkan `Log.e` + Toast dengan pesan yang informatif.
- **CLI — Waktu tampil `-` di live stream**: `renderLiveMonitoring` membaca `data.timestamp` yang tidak ada di path `/listrik` Firebase. Diperbaiki ke `data.updated_at` dengan fallback `timestamp` dan `waktu`, diformat ke locale `id-ID`.
- **CLI Linux/Mac/Termux — log tampil `undefined`**: File `node-source/index.js` yang dipakai `install.sh` adalah versi lama yang membaca `item.message` dan `item.type` — field yang tidak ada di data Firebase. Disync dengan versi terbaru yang menampilkan 6 kolom lengkap.
- **Halaman download — semua tombol mengarah ke v1.0.0**: File `app-version.json` yang di-fetch JS untuk override URL tombol masih berisi v1.0.0 meskipun HTML sudah diupdate. Diperbaiki ke v1.1.0.

### Changed
- `app-version.json` diperbarui ke v1.1.0 dengan URL download semua aset mengarah ke GitHub Releases v1.1.0.
- Label menu `[2]` di CLI Node.js dan Python diperbarui dari `"Catatan Log Terakhir"` ke `"Riwayat Log (20 entri)"`.
- Limit tampil log CLI dinaikkan dari 5 entri ke 20 entri.
- `store.ts` Electron mengekstrak `sensor_source` dan `uptime_s` dari raw Firebase data untuk ditampilkan di tabel.

---

## [Unreleased]

### Added
- Halaman admin dipisah menjadi Settings, Telegram, Discord, dan Pengguna agar konfigurasi tidak menumpuk pada satu halaman.
- Konfigurasi Telegram mendukung banyak Chat ID/Group ID, jumlah penerima aktif, test kirim pesan, hubungkan bot, serta command `/pause` dan `/resume` per chat.
- Konfigurasi Discord mendukung webhook alerts, relay, monitoring, daily report, logs, status bot, ringkasan server, jumlah member/online/ban, daftar ban, serta ban/unban user.
- Backup database Firebase mengirim snapshot RTDB dan `database.rules.json` ke email admin.
- Reset realtime `/listrik` dan hapus seluruh data monitoring (`/listrik` + `/logs`) dengan validasi terpisah.
- Laporan harian Excel otomatis dikirim ke Telegram dan Discord jika ada data monitoring baru dalam 24 jam.
- Device bootstrap dan kontrol stream realtime perangkat, termasuk pause/resume stream dan pengaturan delay kirim data.
- Penyamaan fitur Web/PWA dan Windows Desktop untuk halaman Telegram, Discord, Pengguna, Settings, dan notifikasi admin.
- Validator lokal gratis `npm run validate` sebagai pengganti GitHub Actions CI.

### Changed
- Notifikasi backend diseragamkan agar event yang dikirim ke Discord juga dapat dikirim ke Telegram.
- Halaman public dirapikan konsistensi padding, card, tombol, dan font.
- Manifest PWA dan rewrite simulator diperbaiki.

### Removed
- GitHub Actions CI dihapus karena akun GitHub yang terkunci billing.

---

## [1.0.0] — 2026-04-09

### Added
- Monitoring realtime arus, tegangan, daya semu, status, dan relay via ESP32 + Firebase RTDB.
- Role-based access control: aksi kritikal (relay/settings) hanya untuk admin.
- Histori kejadian dengan export CSV dan filter status.
- Notifikasi multi-channel: Web Push, Telegram Bot API, Discord Webhook, dan Discord Bot tools.
- Auto-cutoff relay otomatis saat kondisi berbahaya terdeteksi.
- PWA (Progressive Web App) dengan Service Worker dan install prompt cross-platform.
- Android native app (Kotlin) dengan tema glassmorphism dark mode.
- Windows Desktop app (Electron + React/TypeScript) dengan system tray dan auto-start.
- Terminal UI "Hacker Mode" portabel: Node.js (Inquirer+Chalk) dan Python (Questionary+Rich).
- CLI auto-download binary untuk semua platform.
- Discord Webhook integration dengan channel terpisah: `#alerts`, `#relay`, `#monitoring`, `#daily-report`, `#logs`.
- GitHub Releases pipeline untuk distribusi binary (APK, MSI, Setup EXE, Portable EXE).
- Auto-update system berbasis `app-version.json` untuk deteksi versi terbaru.
- Landing page, halaman features, downloads, dan PWA simulator.
- Firmware ESP32 dengan WiFiManager captive portal dan 2-layer config (Bootstrap + Runtime).
- Security rules RTDB yang membatasi write per-role.

### Security
- `serviceAccountKey.json`, keystore `.jks`, signing `.pfx`, dan `.env` di-exclude dari git.
- Hardware `config.h` di-exclude dari git; `config.example.h` disediakan sebagai template.

---

[1.1.0]: https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/tag/v1.0.0
[Unreleased]: https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/compare/v1.1.5...HEAD

[1.1.5]: https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/compare/v1.1.3...v1.1.4

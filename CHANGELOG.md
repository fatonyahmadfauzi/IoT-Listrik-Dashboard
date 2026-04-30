# Changelog

Semua perubahan penting pada proyek ini didokumentasikan di sini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/),
dan proyek ini mengikuti [Semantic Versioning](https://semver.org/lang/id/).

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
- Validator lokal gratis `npm run validate` sebagai pengganti GitHub Actions CI, termasuk pengecekan HTML, asset, manifest, rewrite Vercel, JSON config, Cloud Functions, dan API serverless.

### Changed
- Notifikasi backend diseragamkan agar event yang dikirim ke Discord juga dapat dikirim ke Telegram dan notifikasi UI sesuai konfigurasi.
- Halaman public `/`, `/features`, dan `/downloads` dirapikan agar padding, card, tombol, dan font lebih konsisten di desktop maupun mobile.
- Manifest PWA dan rewrite simulator diperbaiki agar seluruh referensi lokal valid.

### Removed
- GitHub Actions CI dihapus karena akun GitHub yang terkunci billing membuat job tidak bisa berjalan. Validasi diganti dengan script lokal `npm run validate`.

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

[1.0.0]: https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/tag/v1.0.0
[Unreleased]: https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/compare/v1.0.0...HEAD

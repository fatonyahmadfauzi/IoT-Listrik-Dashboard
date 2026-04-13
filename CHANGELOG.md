# Changelog

Semua perubahan penting pada proyek ini didokumentasikan di sini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/),
dan proyek ini mengikuti [Semantic Versioning](https://semver.org/lang/id/).

---

## [1.0.0] — 2026-04-09

### Added
- Monitoring realtime arus, tegangan, daya semu, status, dan relay via ESP32 + Firebase RTDB.
- Role-based access control: aksi kritikal (relay/settings) hanya untuk admin.
- Histori kejadian dengan export CSV dan filter status.
- Notifikasi multi-channel: Web Push, Telegram Bot API, Discord Webhook (4 channel).
- Auto-cutoff relay otomatis saat kondisi berbahaya terdeteksi.
- PWA (Progressive Web App) dengan Service Worker dan install prompt cross-platform.
- Android native app (Kotlin) dengan tema glassmorphism dark mode.
- Windows Desktop app (Electron + React/TypeScript) dengan system tray dan auto-start.
- Terminal UI "Hacker Mode" portabel: Node.js (Inquirer+Chalk) dan Python (Questionary+Rich).
- CLI auto-download binary untuk semua platform.
- Discord Webhook integration dengan 4 channel terpisah: `#alerts`, `#relay`, `#monitoring`, `#logs`.
- GitHub Releases pipeline untuk distribusi binary (APK, MSI, Setup EXE, Portable EXE).
- Auto-update system berbasis `app-version.json` untuk deteksi versi terbaru.
- Landing page, halaman features, downloads, dan PWA simulator.
- Firmware ESP32 dengan WiFiManager captive portal dan 2-layer config (Bootstrap + Runtime).
- Security rules RTDB yang membatasi write per-role.

### Security
- `serviceAccountKey.json`, keystore `.jks`, signing `.pfx`, dan `.env` di-exclude dari git.
- Hardware `config.h` di-exclude dari git; `config.example.h` disediakan sebagai template.

---

## [Unreleased]

### Planned
- iOS native app (SwiftUI).
- Unit test untuk Firebase Cloud Functions.
- GitHub Actions CI untuk lint dan build otomatis.

---

[1.0.0]: https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/tag/v1.0.0
[Unreleased]: https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard/compare/v1.0.0...HEAD

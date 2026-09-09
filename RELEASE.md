# Release IoT Listrik Dashboard

## Status Release — 9 September 2026

| Platform | Release | Status |
|---|---|---|
| Web/PWA | `v1.1.9` | Diagnostik sistem, konfigurasi Discord diagnostik, dan cache PWA terbaru |
| Android APK | `v1.1.9` | Panel admin native, test webhook aman, dan diagnostik lengkap |
| Windows Setup | `v1.1.9` | Diagnostik, Serial Monitor USB, dan konfigurasi Discord terbaru |
| Windows Portable | `v1.1.9` | Fitur sama dengan Windows Setup tanpa instalasi |
| Windows MSI | `v1.1.9` | Installer x64 dengan fitur Windows terbaru |
| CLI Node.js | `v1.1.9` | Diagnostik sistem dan pemeriksaan firmware |
| CLI Python | `v1.1.9` | Diagnostik sistem dan pemeriksaan firmware |
| CLI Linux/macOS/Termux | `v1.1.9` | Installer online menggunakan source CLI terbaru |

## Perubahan Utama v1.1.9

- Menambahkan menu Diagnostik Sistem pada Web/PWA, Android, Windows, dan CLI.
- Menambahkan Serial Monitor USB dan reset ESP32 pada desktop yang mendukung Web Serial/port USB.
- Menambahkan command Telegram `/diagnostik`, `/system_update`, dan `/firmware`.
- Menambahkan webhook Discord `webhookDiagnostics` untuk channel `#diagnostik-sistem`.
- Pesan diagnostik Discord mencakup sensor, heartbeat, Wi-Fi, heap, LCD, relay, Firebase, pemetaan GPIO, dan firmware.
- Deduplikasi notifikasi diagnostik dan firmware disimpan di Firebase RTDB agar pesan tidak terkirim ganda.
- Memperbaiki Android force close saat test webhook. `responseCode` dan response body sekarang dibaca pada background thread, bukan UI thread.
- Memperbarui Android APK, Windows Setup/Portable/MSI, dan paket CLI pada GitHub Release `v1.1.9`.

## Distribusi

Unduhan resmi tersedia pada halaman Downloads dan GitHub Release `v1.1.9`. Asset firmware ESP32 `.bin` belum tersedia; file APK/EXE/MSI/CLI bukan firmware ESP32.

# IoT Listrik Dashboard v1.1.9

Tanggal rilis: 8 September 2026

Pembaruan terakhir: 9 September 2026

## Ringkasan

Release ini menyatukan fitur diagnostik, monitoring, notifikasi, dan distribusi aplikasi pada Web/PWA, Android, Windows, dan CLI.

## Web/PWA
- Menu Diagnostik Sistem dan pemeriksaan firmware.
- Serial Monitor USB khusus browser desktop yang mendukung Web Serial.
- Konfigurasi webhook `#diagnostik-sistem` dengan test diagnostik lengkap.
- Service worker diperbarui agar perubahan UI tidak tertahan cache lama.

## Android APK
- Panel admin dibuat native Kotlin, bukan mengambil halaman PWA melalui WebView.
- Konfigurasi Discord mencakup Alerts, Relay, Monitoring, Diagnostik, Daily Report, dan Logs.
- Test webhook diagnostik mengirim status sensor, perangkat, LCD, relay, Firebase, GPIO, dan firmware.
- Memperbaiki force close saat test webhook: pembacaan HTTP `responseCode` dan response body dilakukan pada background thread.

## Windows
- Menu Diagnostik Sistem disamakan dengan Web/PWA.
- Serial Monitor USB ESP32, filter, auto-scroll, reset ESP32, dan pemeriksaan firmware.
- Paket tersedia sebagai Setup, Portable, dan MSI x64.

## CLI
- Diagnostik sistem read-only pada Node.js, Python, dan installer Linux/macOS/Termux.
- Pemeriksaan status cloud, perangkat, PZEM, LCD, relay, Wi-Fi, heap, GPIO, dan firmware.

## Telegram dan Discord
- Telegram: `/diagnostik`, `/system_update`, `/firmware`, `/status`, `/pause`, `/resume`, dan `/help`.
- Discord: webhook khusus `#diagnostik-sistem` dan notifikasi firmware dengan pencegahan pesan ganda melalui Firebase Transaction.
- Notifikasi firmware hanya aktif jika release lebih baru dan asset firmware ESP32 `.bin` benar-benar tersedia.

## Asset Release
- `IoT-Listrik-Dashboard.apk`
- `IoT-Listrik-Dashboard-Setup.exe`
- `IoT-Listrik-Dashboard-Portable.exe`
- `IoT-Listrik-Dashboard.msi`
- `iot-listrik-cli-node.exe`
- `iot-listrik-cli-python.exe`
- `iot-listrik-dashboard-cli-linux`
- `install.sh`

> Catatan: asset APK, EXE, MSI, dan CLI bukan firmware ESP32. Firmware ESP32 harus berupa file `.bin` yang sesuai target board.

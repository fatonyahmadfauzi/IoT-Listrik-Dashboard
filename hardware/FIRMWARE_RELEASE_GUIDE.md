# Firmware ESP32 Release Guide

Fitur dashboard hanya akan mengenali paket firmware yang aman jika GitHub Release memuat dua asset berikut:

1. `firmware-manifest.json`
2. `iot-listrik-esp32-vX.Y.Z.bin`

Sebelum OTA dapat digunakan, upload satu kali melalui USB dengan partition scheme ESP32 yang menyediakan dua slot OTA. Nilai `FIRMWARE_OTA_CAPABLE` di `hardware/config.h` baru boleh diubah menjadi `1` setelah partition scheme tersebut digunakan.

## Membuat checksum SHA-256 di PowerShell

```powershell
Get-FileHash -Algorithm SHA256 .\iot-listrik-esp32-v1.0.1.bin
```

Salin hash 64 karakter ke `firmware-manifest.json`. Nama file, board, ukuran, versi, dan checksum harus sesuai dengan file `.bin` yang diunggah. Jangan mengunggah credential Firebase, password Wi-Fi, token Telegram, atau webhook Discord ke GitHub Release.

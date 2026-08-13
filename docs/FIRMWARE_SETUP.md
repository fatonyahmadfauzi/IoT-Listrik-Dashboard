# Panduan Setup Firmware ESP32

Panduan lengkap untuk mengkonfigurasi, mengupload, dan mengelola firmware ESP32 pada sistem deteksi kebocoran arus listrik berbasis IoT.

---

## Prasyarat

**Hardware:**
- ESP32 Dev Module (disarankan: ESP32-WROOM-32 atau ESP32-DevKit-V1)
- PZEM-004T v3.0 (sensor arus dan tegangan AC)
- Relay modul atau Kontaktor AC (sesuai kapasitas beban)
- (Opsional) LCD 1602 dengan I2C adapter (modul PCF8574)

**Software:**
- Arduino IDE 2.x (disarankan) atau Arduino IDE 1.8.x
- Board manager: ESP32 by Espressif Systems (versi 2.x atau 3.x)

**Library (install via Library Manager):**

| Library | Author | Fungsi |
|---------|--------|--------|
| Firebase ESP Client | Mobizt | Komunikasi Firebase RTDB via HTTPS |
| ArduinoJson | Benoit Blanchon | Parsing JSON (dependensi Firebase) |
| WiFiManager | tzapu | Captive portal konfigurasi WiFi |
| PZEM004Tv30 | Mandulaj | Baca sensor PZEM-004T v3.0 |
| URLEncode | Masoud K | Encoding URL untuk Telegram |
| (Opsional) LiquidCrystal I2C | Frank de Brabander | Display LCD 1602 I2C |

---

## Konfigurasi Board Arduino IDE

```
Board          : ESP32 Dev Module
Partition Scheme: Huge APP (3MB No OTA/1MB SPIFFS)
Upload Speed   : 921600
CPU Frequency  : 240 MHz
Flash Size     : 4MB
```

---

## Konfigurasi Firmware

### Layer 1 — Bootstrap (NVS)

Bootstrap tersimpan di NVS (Non-Volatile Storage) ESP32. Diisi pertama kali via captive portal WiFiManager.

**Konfigurasi Bootstrap:**
- WiFi SSID dan password
- Firebase API Key
- Firebase Database URL
- Email dan password akun IoT device (`listrik.iot.device@gmail.com`)

**Cara mengisi:**
1. Nyalakan ESP32 pertama kali — muncul AP dengan SSID `IoT-Listrik-Setup`
2. Hubungkan ke AP tersebut (password: `listrik123`)
3. Browser akan redirect ke captive portal (jika tidak, buka `192.168.4.1`)
4. Isi semua field konfigurasi dan simpan
5. ESP32 restart otomatis dan terhubung ke WiFi

### Layer 2 — Runtime Settings (Firebase `/settings`)

Pengaturan runtime disimpan di Firebase RTDB `/settings` dan dapat diubah dari halaman admin web tanpa reflashing firmware.

| Setting | Default | Keterangan |
|---------|---------|-----------|
| `thresholdArus` | 10.0 A | Batas arus DANGER |
| `warningPercent` | 80 | Persen threshold untuk WARNING |
| `autoCutoffEnabled` | true | Auto-cutoff relay saat DANGER/WARNING |
| `buzzerEnabled` | true | Buzzer aktif saat status berubah |
| `sendIntervalMs` | 2000 | Interval kirim data ke Firebase (min: 5000ms) |
| `realtimeStreamEnabled` | true | Aktif/nonaktif stream data ke /listrik |
| `arusCalibration` | 1.0 | Faktor kalibrasi arus PZEM |
| `teganganCalibration` | 1.0 | Faktor kalibrasi tegangan PZEM |
| `telegramBotToken` | "" | Token bot Telegram |
| `telegramNotifyEnabled` | true | Aktifkan notifikasi Telegram |

---

## Koneksi Hardware

### PZEM-004T v3.0

```
PZEM-004T TX  →  ESP32 GPIO 16 (RX2)
PZEM-004T RX  →  ESP32 GPIO 17 (TX2)
PZEM-004T VCC →  5V
PZEM-004T GND →  GND
```

> ⚠️ PZEM-004T mengukur tegangan dan arus AC langsung. Pastikan instalasi dilakukan oleh teknisi listrik yang berkompeten.

### Relay

```
Relay IN  →  ESP32 GPIO (sesuai config.h, default: GPIO 26)
Relay VCC →  5V atau 3.3V (sesuai modul relay)
Relay GND →  GND
```

### LCD 1602 I2C (Opsional)

```
LCD SDA  →  ESP32 GPIO 21 (SDA)
LCD SCL  →  ESP32 GPIO 22 (SCL)
LCD VCC  →  5V
LCD GND  →  GND
```

Aktifkan di `config.h`:
```cpp
#define USE_LCD
#define LCD_ADDR  0x27  // atau 0x3F, tergantung modul I2C
#define LCD_COLS  16
#define LCD_ROWS  2
```

---

## Membuat `config.h`

Salin `hardware/config.example.h` menjadi `hardware/config.h`. File `config.h` di-ignore git — **jangan commit file ini**.

```bash
cp hardware/config.example.h hardware/config.h
```

Isi field yang diperlukan:

```cpp
// Default SSID dan password captive portal
#define DEFAULT_AP_SSID     "IoT-Listrik-Setup"
#define DEFAULT_AP_PASSWORD "listrik123"

// Pin GPIO
#define RELAY_PIN    26
#define PZEM_RX_PIN  16
#define PZEM_TX_PIN  17
```

---

## Upload Firmware

1. Buka `hardware/main/main.ino` di Arduino IDE
2. Pilih board dan port yang sesuai
3. Klik **Upload** (Ctrl+U)

Saat upload pertama kali, pastikan ESP32 dalam mode download (tahan tombol BOOT saat upload dimulai jika diperlukan).

---

## Struktur Firmware

```text
hardware/
├── main/
│   └── main.ino           # Sketch utama — setup(), loop(), FreeRTOS tasks
├── config.example.h       # Template konfigurasi (commit-safe)
├── config.h               # Konfigurasi aktif (di-ignore git)
├── sensors.h              # Pembacaan PZEM-004T & logika determineStatus()
├── firebase_handler.h     # HTTPS REST ke Firebase: writeMonitorData(), writeLog()
├── telegram_handler.h     # Notifikasi Telegram Bot
└── discord_handler.h      # Notifikasi Discord Webhook
```

### Arsitektur FreeRTOS Dual-Core

```
Core 1 (loop())         Core 0 (firebaseTaskCore0())
─────────────────       ──────────────────────────────
Baca PZEM-004T          writeMonitorData() → /listrik
Hitung status           writeLog()         → /logs
Set pendingLog          readRelayCommand() → /commands/relay
Buzzer / LCD            updateRelayState()
                        readAllSettings()  → /settings
                        Telegram / Discord notify
                        Auto Learning
```

Semua operasi SSL/HTTPS dijalankan **hanya di Core 0** karena BearSSL tidak thread-safe lintas core.

---

## Log Tipe

Firmware menulis ke `/logs` dengan field `source` yang menunjukkan penyebab:

| Source | Penyebab |
|--------|---------|
| `initial_snapshot` | Snapshot pertama setelah boot dan koneksi Firebase berhasil |
| `esp32` | Perubahan status (NORMAL → WARNING → DANGER atau sebaliknya) |
| `periodic` | Log rutin setiap 60 detik |
| `auto_cutoff` | Relay dimatikan otomatis karena kondisi DANGER/WARNING |
| `web_command` | Perintah relay ON/OFF dari dashboard web |

---

## Monitoring via Serial

Hubungkan ESP32 ke komputer dan buka Serial Monitor (115200 baud). Log penting:

```
[Firebase] Settings synced -> thr=10.0A warn%=80 ...
[Firebase] Monitor OK: status=NORMAL relay=1
[Monitor] src=PZEM-004T I=0.20A V=234.0V ...
[LogBuf] Log terkirim: cause=periodic status=NORMAL ...
[Heap] Free: 180000  MinFree: 145000  MaxBlock: 110000
```

---

## Troubleshooting Firmware

| Masalah | Solusi |
|---------|--------|
| ESP32 crash / restart loop | Cek heap di Serial Monitor. Jika MaxBlock < 20KB, kemungkinan memory fragmentation — reflash firmware |
| PZEM tidak terbaca (SENSOR_ERROR) | Cek koneksi TX/RX, pastikan PZEM sudah terhubung ke beban AC |
| WiFi tidak konek setelah konfigurasi | Reset NVS: tahan tombol BOOT 10 detik saat startup, atau flash ulang dengan erase flash |
| Log tidak masuk ke Firebase | Cek Serial Monitor untuk `[LogBuf]` — pastikan `realtimeStreamEnabled = true` di Settings |
| Waktu `updated_at` tidak akurat | Firebase server timestamp `{".sv":"timestamp"}` memerlukan koneksi internet aktif |
| Relay tidak merespons perintah | Pastikan akun yang login adalah admin dan status koneksi `Connected` di dashboard |

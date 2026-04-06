# ⚡ ALAT DETEKSI KEBOCORAN ARUS LISTRIK BERBASIS IoT
## Dengan Notifikasi Real-Time — v2.0

> Thesis Project — Sistem monitoring dan deteksi kebocoran arus listrik berbasis
> ESP32 + Firebase + Web Dashboard + PWA + WiFiManager

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────┐    ┌──────────────────────────────────────────────┐
│  SCT-013        │───▶│            ESP32 DevKitC V4                  │
│  ZMPT101B       │    │                                              │
│  Relay Module   │◀───│  Layer 1 Bootstrap (NVS + WiFiManager)       │
│  Buzzer         │    │   WiFi SSID/password                         │
└─────────────────┘    │   Firebase API Key / DB URL                  │
                       │   IoT device email / password               │
         ┌─────────────│                                              │
         │             │  Layer 2 Runtime (Firebase /settings)        │
         │             │   thresholdArus, Telegram token/chatId       │
         │             │   calibration, buzzer, autoCutoff, interval  │
         │             └───────────────────┬──────────────────────────┘
         │                                 │
         ▼                                 ▼
┌─────────────────┐         ┌─────────────────────────────┐
│  Telegram Bot   │         │     Firebase Realtime DB     │
│  Notifications  │         │  /listrik  /logs  /settings  │
└─────────────────┘         │  /users                     │
                            └──────────────┬──────────────┘
                                           │
                            ┌──────────────▼──────────────┐
                            │   Firebase Functions (v2)    │
                            │   Admin SDK — User CRUD      │
                            └──────────────┬──────────────┘
                                           │
                            ┌──────────────▼──────────────┐
                            │   Web Dashboard (PWA)        │
                            │   login.html / dashboard.html│
                            │   history.html               │
                            │   settings.html  (Admin)     │
                            └─────────────────────────────┘
```

---

## 📁 Struktur File

```
/project-root/
├── index.html              ← Entry redirect (auth-aware)
├── login.html              ← Login & register
├── dashboard.html          ← Monitoring realtime + relay control
├── history.html            ← Log history + chart + export CSV
├── settings.html           ← Admin: system settings + user CRUD
├── style.css               ← Global dark glassmorphism design system
├── firebase-config.js      ← Firebase app init
├── auth.js                 ← Auth state, role guard, sidebar
├── app.js                  ← Dashboard logic
├── history.js              ← History page logic
├── settings.js             ← Settings + user CRUD via Functions
├── charts.js               ← Chart.js dual-axis + zoom/pan
├── notifications.js        ← Browser notifications + toast
├── manifest.json           ← PWA manifest
├── service-worker.js       ← PWA cache-first strategy
├── database.rules.json     ← Firebase RTDB security rules
├── firebase.json           ← Firebase hosting + functions config
├── icons/                  ← PWA icons (72–512px)
├── functions/
│   ├── package.json        ← Node 18 + firebase-admin + firebase-functions
│   └── index.js            ← listUsers, createUser, deleteUser, setUserRole, resetPassword
└── esp32/
    ├── config.h            ← TWO-LAYER config: BootstrapConfig + RuntimeSettings
    ├── sensors.h           ← Runtime calibration params
    ├── firebase_handler.h  ← Firebase RTDB R/W + readAllSettings()
    ├── telegram_handler.h  ← Runtime token/chatId params
    └── main.ino            ← WiFiManager + NVS + runtime settings loop
```

---

## 🔧 ESP32 Configuration Architecture

### Layer 1 — Bootstrap Config (local, NVS + WiFiManager)

Stored in ESP32 Non-Volatile Storage (NVS). Set via captive portal.

| Field | Changed by |
|-------|-----------|
| WiFi SSID / Password | WiFiManager captive portal |
| Firebase API Key | WiFiManager captive portal |
| Firebase DB URL | WiFiManager captive portal |
| IoT device email | WiFiManager captive portal |
| IoT device password | WiFiManager captive portal |

### Layer 2 — Runtime Settings (Firebase /settings, web admin)

Fetched from Firebase every ~10 seconds. No reflashing required.

| Field | Default | Changed by |
|-------|---------|-----------|
| thresholdArus | 10.0 A | Web Settings page |
| buzzerEnabled | true | Web Settings page |
| autoCutoffEnabled | true | Web Settings page |
| telegramBotToken | "" | Web Settings page |
| telegramChatId | "" | Web Settings page |
| arusCalibration | 1.000 | Web Settings page |
| teganganCalibration | 1.0 | Web Settings page |
| sendIntervalMs | 2000 ms | Web Settings page |

---

## 🌐 WiFiManager Captive Portal

### How it works

1. **First boot** (or after factory reset): ESP32 cannot connect to WiFi.
2. ESP32 starts soft-AP: **`IoT-Listrik-Setup`** (password: `listrik123`).
3. Connect your phone to this network.
4. Captive portal opens automatically (or go to `192.168.4.1`).
5. Form shows:
   - **WiFi SSID / Password** — select your network
   - **Firebase API Key** — paste from Firebase Console
   - **Firebase DB URL** — paste RTDB URL
   - **IoT Device Email / Password** — enter dedicated IoT account credentials
6. Click Save → credentials written to NVS → ESP32 restarts and connects.
7. On subsequent boots: auto-connects in < 5 seconds.

### Factory Reset

Hold the **BOOT button (GPIO0)** while powering on → erases NVS + WiFiManager settings → captive portal starts again.

### Tradeoff

Custom params sent via captive portal use **plain HTTP over local AP** (no TLS). On a local network this is acceptable. For production, use HTTPS or QR-code provisioning.

---

## 🚀 Setup Steps

### 1. Prerequisites

```bash
# Requires Node.js 18+
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use monitoring-listrik-719b1
```

### 2. Firebase Console

- **Authentication** → Sign-in method → Email/Password ✅
- **Realtime Database** → Create database
- **Functions** → Blaze plan required ✅
- **Hosting** → Get started

### 3. Fill Firebase Config

Edit `firebase-config.js`:
```javascript
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "monitoring-listrik-719b1.firebaseapp.com",
  databaseURL:       "https://monitoring-listrik-719b1-default-rtdb.firebaseio.com/",
  projectId:         "monitoring-listrik-719b1",
  storageBucket:     "monitoring-listrik-719b1.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

### 4. Deploy Database Rules

Edit `database.rules.json` — replace `iot-device@yourproject.com` with your IoT
device account email. Remove all `/* */` comments, then:

```bash
npx -y firebase-tools@latest deploy --only database
```

### 5. Deploy Functions

```bash
cd functions && npm install && cd ..
npx -y firebase-tools@latest deploy --only functions
```

### 6. Deploy Hosting

```bash
npx -y firebase-tools@latest deploy --only hosting
```

### 7. Bootstrap Database

In Firebase Console → Realtime Database → set initial data:
```json
{
  "listrik": { "arus": 0, "tegangan": 220, "relay": 1, "status": "NORMAL", "updated_at": "0" },
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

### 8. Create First Admin Account

Register at `/login.html`, then in Firebase Console → Realtime Database:
```
/users/{YOUR_UID}/role = "admin"
```

### 9. Create IoT Device Account

Firebase Console → Authentication → Add user:
- Email: `iot-device@yourproject.com`
- Password: strong password (≥ 16 chars)

Then update `database.rules.json` with this email.

---

## 🔴 ESP32 Setup

### Required Libraries (Arduino Library Manager)

| Library | Author | Search term |
|---------|--------|-------------|
| Firebase ESP Client | Mobizt | `Firebase ESP Client` |
| ArduinoJson | Benoit Blanchon | `ArduinoJson` |
| **WiFiManager** | **tzapu** | **`WiFiManager`** |
| URLEncode | Masoud K | `URLEncode` |
| LiquidCrystal I2C | Frank de Brabander | `LiquidCrystal I2C` (optional) |

> WiFiManager by tzapu — this is the **captive portal library**. Install via:
> Arduino IDE → Tools → Manage Libraries → search "WiFiManager" → install by tzapu.

### Board Configuration

- Board: **ESP32 Dev Module**
- Partition Scheme: **Default 4MB with spiffs**
- Upload Speed: **921600**
- CPU Frequency: **240 MHz**

### First Upload

On first upload, you only need compile-time defaults in `config.h`.
After upload, use the captive portal to configure real credentials.

**OR** fill in your real values in `config.h` #defines before uploading.
The captive portal can always override them later.

### Factory Reset

1. Power off ESP32
2. Hold BOOT button (GPIO0)
3. Power on while holding
4. Release after 2 s
5. Serial monitor shows: `[RESET] NVS erased → captive portal`

### Wiring

```
Component      ESP32 Pin    Notes
─────────────────────────────────────────────────────────
SCT-013        GPIO36 (VP)  via 22Ω burden + voltage divider to Vcc/2
ZMPT101B       GPIO39 (VN)  module output biased to Vcc/2
Relay 1        GPIO26       active-LOW (HIGH = OFF, LOW = ON)
Relay 2        GPIO27       optional
Buzzer (+)     GPIO25       passive buzzer, GND to GND
BOOT button    GPIO0        factory reset (built-in on DevKit)
LCD SDA        GPIO21       optional (enable #define USE_LCD)
LCD SCL        GPIO22       optional
```

### Sensor Calibration

**Arus (SCT-013):**
1. Connect a known load (e.g. 100W lamp = ~0.45A @ 220V)
2. Note raw reading in Serial Monitor before calibration
3. `arusCalibration = true_amps / raw_amps`
4. Enter in web Settings → Kalibrasi Arus

**Tegangan (ZMPT101B):**
1. Measure with reference voltmeter (e.g. 220V)
2. Note raw ADC RMS value from Serial Monitor (e.g. 0.336 V)
3. `teganganCalibration = 220.0 / 0.336 ≈ 654.8`
4. Enter in web Settings → Kalibrasi Tegangan

---

## 📱 PWA Installation

Android Chrome: tap ⋮ → Add to Home Screen → Install
Desktop Chrome: click install icon in address bar

---

## 🔔 Telegram Bot Setup

1. Chat `@BotFather` → `/newbot` → follow steps → copy **Bot Token**
2. Send `/start` to your new bot
3. Open: `https://api.telegram.org/bot{TOKEN}/getUpdates` → find `chat_id`
4. Enter token and chat ID in **Settings page** (no firmware reflash needed!)

---

## 📊 Database Structure

```
/listrik/          → ESP32 writes; admin reads/controls relay
  arus             float   Current (A)
  tegangan         float   Voltage (V)
  relay            int     0=OFF 1=ON (web command ↔ device confirmation)
  status           string  NORMAL|WARNING|LEAKAGE|DANGER
  updated_at       string  millis() timestamp

/logs/{push_id}/   → event history
  arus, tegangan, relay, status, waktu, source

/settings/         → admin writes; ESP32 reads periodically
  thresholdArus        float   (A)
  buzzerEnabled        bool
  autoCutoffEnabled    bool
  telegramBotToken     string  ← protected by admin-only write rules
  telegramChatId       string  ← protected by admin-only write rules
  arusCalibration      float
  teganganCalibration  float
  sendIntervalMs       int     (ms)

/users/{uid}/       → managed by Firebase Functions only
  email, displayName, role, createdAt
```

---

## 🔐 Security Notes

| Concern | Approach |
|---------|---------|
| ESP32 write scope | Restricted to `/listrik/arus,tegangan,status,updated_at` and `/logs` by email rule |
| Relay control | Admin-only write to `/listrik/relay` |
| Settings modification | Admin-only write to `/settings` |
| Telegram credentials | Stored in `/settings` (admin-write only, not in firmware) |
| User CRUD | Via Firebase Functions Admin SDK only (no client-side write) |
| WiFi/Firebase bootstrap | Stored in NVS, set via local captive portal (HTTP, local AP only) |

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Hardware | ESP32 DevKitC V4, SCT-013, ZMPT101B, Relay |
| Firmware | Arduino C++ + Firebase ESP Client + **WiFiManager** |
| Provisioning | **WiFiManager Captive Portal + ESP32 NVS/Preferences** |
| Database | Firebase Realtime Database |
| Auth | Firebase Authentication (Email/Password) |
| Backend | Firebase Functions v2 (Node 18) + Admin SDK |
| Hosting | Firebase Hosting |
| Frontend | Vanilla HTML/CSS/JS (ES Modules) |
| Charts | Chart.js 4 + chartjs-plugin-zoom |
| Push Alerts | Web Notifications API + Telegram Bot API |
| PWA | Web App Manifest + Service Worker |

---

*ALAT DETEKSI KEBOCORAN ARUS LISTRIK BERBASIS IoT — Thesis Project v2.0*

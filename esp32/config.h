/**
 * config.h — ESP32 Configuration Architecture
 * ═══════════════════════════════════════════════════════════════
 *
 * This file defines TWO completely separate config layers:
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  LAYER 1 — BOOTSTRAP CONFIG (local, NVS/WiFiManager)       │
 * │                                                             │
 * │  Stored in ESP32 Non-Volatile Storage (NVS/Preferences).   │
 * │  Set once via the WiFiManager captive portal AP on device.  │
 * │  The #define values below are compile-time FALLBACKS only   │
 * │  — they are only used if NVS is empty (first boot/erase).  │
 * │                                                             │
 * │  Includes: WiFi SSID/password, Firebase API key, DB URL,   │
 * │  IoT device email/password.                                 │
 * │                                                             │
 * │  Changed by: reconnecting ESP32 to the captive portal AP   │
 * │  (hold factory reset button or erase flash).               │
 * ├─────────────────────────────────────────────────────────────┤
 * │  LAYER 2 — RUNTIME SETTINGS (Firebase /settings node)      │
 * │                                                             │
 * │  Fetched from Firebase RTDB periodically at runtime.        │
 * │  Editable by admin from the web Settings page.             │
 * │  Applied immediately — NO firmware re-upload required.     │
 * │                                                             │
 * │  Includes: threshold, buzzer, auto-cutoff, Telegram token  │
 * │  & chat ID, calibration factors, send interval.            │
 * │                                                             │
 * │  Changed by: admin editing the web Settings page.          │
 * └─────────────────────────────────────────────────────────────┘
 */

#ifndef CONFIG_H
#define CONFIG_H

// ═══════════════════════════════════════════════════════════════
// LAYER 1A — BOOTSTRAP COMPILE-TIME FALLBACK DEFAULTS
// These #define values are ONLY written to NVS on first boot.
// After the captive portal saves credentials, these are ignored.
// Change these if you want different factory defaults.
// ═══════════════════════════════════════════════════════════════

// Wi-Fi (fallback — overridden by captive portal)
#define DEFAULT_WIFI_SSID         "NAMA_WIFI"
#define DEFAULT_WIFI_PASSWORD     "PASSWORD_WIFI"

// Firebase (fallback — overridden by captive portal)
#define DEFAULT_API_KEY           "API_KEY_FIREBASE"
#define DEFAULT_DATABASE_URL      "https://PROJECT-ID-default-rtdb.firebaseio.com/"

// IoT device account (dedicated Firebase Auth account — NOT user/admin)
// This account can only write to /listrik and /logs per database rules.
// (fallback — overridden by captive portal)
#define DEFAULT_IOT_EMAIL         "listrik.iot.device@gmail.com"
#define DEFAULT_IOT_PASSWORD      "Esp32@Listrik2024!"

// ═══════════════════════════════════════════════════════════════
// LAYER 1B — HARDWARE CONFIG (fixed in firmware)
// These reflect the physical wiring and hardware constants.
// Only change if you rewire the hardware.
// ═══════════════════════════════════════════════════════════════

// ADC pin assignments (must be ADC1 pins — NOT ADC2 when using WiFi)
#define PIN_ARUS              36    // GPIO36 (VP) — SCT-013 current sensor
#define PIN_TEGANGAN          39    // GPIO39 (VN) — ZMPT101B voltage sensor

// Output pins
#define PIN_RELAY1            26    // Relay channel 1 — main load / contactor
#define PIN_RELAY2            27    // Relay channel 2 — optional
#define PIN_BUZZER            25    // Passive buzzer

// Factory reset button (hold on boot to erase NVS and re-enter portal)
#define PIN_FACTORY_RESET     0     // GPIO0 = BOOT button on most ESP32 boards

// ADC constants
#define ADC_RESOLUTION        4096  // 12-bit: values 0..4095
#define ADC_VREF              3.3f  // Volts
#define ADC_MIDPOINT          2048  // Vcc/2 — bias point for AC signals
#define ADC_SAMPLES           1000  // RMS sample count per reading

// SCT-013 sensor hardware constants (depends on physical sensor model)
// SCT-013-000 (0–100A, 50mA output): burden = 22Ω, ratio = 2000
// SCT-013-030 (0–30A, built-in burden): burden set in module, ratio = 1000
#define SCT_BURDEN_R          22.0f
#define SCT_RATIO             2000.0f

// ═══════════════════════════════════════════════════════════════
// LAYER 1C — CAPTIVE PORTAL (WiFiManager) SETTINGS
// ═══════════════════════════════════════════════════════════════

#define AP_SSID               "IoT-Listrik-Setup"  // AP name shown to phone
#define AP_PASSWORD           "listrik123"          // Portal password (min 8 chars)
#define AP_TIMEOUT_SECONDS    180                   // Auto-restart if no action
#define NVS_NAMESPACE         "iot_cfg"             // Preferences NVS namespace

// ═══════════════════════════════════════════════════════════════
// LAYER 1D — BOOTSTRAP CONFIG STRUCT
// Loaded from NVS at startup. Populated by the captive portal.
// Only populated from compile-time defaults on first boot (NVS empty).
// ═══════════════════════════════════════════════════════════════

struct BootstrapConfig {
  char wifiSsid[64]        = DEFAULT_WIFI_SSID;
  char wifiPassword[64]    = DEFAULT_WIFI_PASSWORD;
  char firebaseApiKey[128] = DEFAULT_API_KEY;
  char firebaseDbUrl[128]  = DEFAULT_DATABASE_URL;
  char iotEmail[64]        = DEFAULT_IOT_EMAIL;
  char iotPassword[64]     = DEFAULT_IOT_PASSWORD;
};

// ═══════════════════════════════════════════════════════════════
// LAYER 2 — RUNTIME SETTINGS STRUCT
// Populated at runtime by reading /settings from Firebase RTDB.
// Defaults shown here are used if Firebase read fails.
// Updated every settingsSyncMs milliseconds without restart.
// ═══════════════════════════════════════════════════════════════

struct RuntimeSettings {

  // ── Sensor / System ──────────────────────────────────────────
  float         thresholdArus       = 10.0f;   // Max safe current (A)
  float         warningPercent      = 80.0f;   // WARNING band: arus ≥ threshold × (this/100), < threshold
  bool          buzzerEnabled       = true;
  bool          autoCutoffEnabled   = true;

  // ── Electrical (display / energy estimate — not true PF measurement) ──
  float         powerFactorEstimate = 0.85f;   // Used for estimated real power & kWh
  float         frequencyHz         = 50.0f;   // Nominal grid frequency (display)

  // ── Calibration (applied per-reading at runtime) ─────────────
  // These multiply the raw RMS result.
  // Tune via web settings based on reference meter comparison.
  float         arusCalibration     = 1.0f;    // e.g. 1.0 = no correction
  float         teganganCalibration = 1.0f;    // e.g. 1.05 = +5% correction

  // ── Telegram (loaded from Firebase — never hardcoded) ────────
  // IMPORTANT: Telegram credentials are stored in Firebase /settings,
  // not in firmware. This means they can be changed without reflashing.
  // They are protected by admin-only write rules in database.rules.json.
  String        telegramBotToken    = "";      // "1234567890:ABCDEF..."
  String        telegramChatId      = "";      // "123456789" or "-100123456789"
  bool          telegramNotifyEnabled = true;  // Master switch for Telegram alerts

  // ── Timing ───────────────────────────────────────────────────
  unsigned long sendIntervalMs      = 2000;    // Firebase write interval (ms)
  unsigned long settingsSyncMs      = 10000;   // Settings refresh interval (ms)
  unsigned long telegramCooldownMs  = 30000;   // Min time between Telegram msgs
};

// ═══════════════════════════════════════════════════════════════
// Optional LCD feature flag
// ═══════════════════════════════════════════════════════════════
// Uncomment to enable LCD 1602 I2C output:
// #define USE_LCD
// #define LCD_ADDR  0x27
// #define LCD_COLS  16
// #define LCD_ROWS  2

#endif // CONFIG_H

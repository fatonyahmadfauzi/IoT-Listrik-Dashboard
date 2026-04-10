/**
 * main.ino — IoT Alat Deteksi Kebocoran Arus Listrik (ESP32)
 * ═══════════════════════════════════════════════════════════════
 * Project: ALAT DETEKSI KEBOCORAN ARUS LISTRIK BERBASIS IoT
 *          DENGAN NOTIFIKASI REAL-TIME
 *
 * Configuration Architecture (see config.h for full details):
 * ┌──────────────────────────────────────────────────────────┐
 * │ LAYER 1 — Bootstrap (NVS + WiFiManager captive portal)  │
 * │   WiFi SSID/password, Firebase API key, DB URL,         │
 * │   IoT device email/password                             │
 * │   → Changed via captive portal (no reflashing)         │
 * ├──────────────────────────────────────────────────────────┤
 * │ LAYER 2 — Runtime (Firebase /settings, admin web page)  │
 * │   Threshold, buzzer, auto-cutoff, Telegram token/chatId,│
 * │   calibration factors, send interval                    │
 * │   → Changed from web Settings page (no reflashing)     │
 * └──────────────────────────────────────────────────────────┘
 *
 * Required libraries (install via Arduino Library Manager):
 *   ✅ Firebase ESP Client   by Mobizt
 *   ✅ ArduinoJson           by Benoit Blanchon  (Firebase dependency)
 *   ✅ WiFiManager           by tzapu            (captive portal)
 *   ✅ URLEncode             by Masoud K         (Telegram URL encoding)
 *   ✅ HTTPClient            built-in ESP32 core
 *   ✅ Preferences           built-in ESP32 core (NVS)
 *   (Optional) LiquidCrystal I2C by Frank de Brabander
 *
 * Arduino IDE Board Settings:
 *   Board          : ESP32 Dev Module
 *   Partition Scheme: Default 4MB with spiffs
 *   Upload Speed   : 921600
 *   CPU Frequency  : 240 MHz
 * ═══════════════════════════════════════════════════════════════
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h>     // tzapu WiFiManager — captive portal
#include <Preferences.h>     // NVS — non-volatile bootstrap storage
#include "config.h"
#include "sensors.h"
#include "firebase_handler.h"
#include "telegram_handler.h"

#ifdef USE_LCD
  #include <LiquidCrystal_I2C.h>
  LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);
#endif

// ═══════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════

Preferences     prefs;          // NVS interface
BootstrapConfig bootstrap;      // Layer 1: loaded from NVS
RuntimeSettings rt;             // Layer 2: loaded from Firebase /settings

// Current measurement state
struct DeviceState {
  float  arus      = 0.0f;
  float  tegangan  = 0.0f;
  float  daya      = 0.0f;
  String status    = "NORMAL";
  int    relay     = 1;         // physical relay state
};
DeviceState state;
String lastStatus = "NORMAL";  // previous iteration status for change detection

// Accumulated energy (kWh) — persisted in NVS namespace "iot_energy"
static float         g_energiKwh       = 0.0f;
static unsigned long g_lastEnergyMs    = 0;
static unsigned long g_lastKwhSaveMs = 0;

void loadEnergyKwhFromNvs() {
  prefs.begin("iot_energy", true);
  g_energiKwh = prefs.getFloat("kwh", 0.0f);
  prefs.end();
}

void saveEnergyKwhToNvs() {
  prefs.begin("iot_energy", false);
  prefs.putFloat("kwh", g_energiKwh);
  prefs.end();
}

// Timers
unsigned long lastSendMs         = 0;
unsigned long lastSettingsSyncMs = 0;
unsigned long lastRelayCheckMs   = 0;
unsigned long lastLogMs          = 0;

// ═══════════════════════════════════════════════════════════════
// LAYER 1 — NVS BOOTSTRAP CONFIG HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Load bootstrap config from NVS.
 * If a key is not found (first boot), the BootstrapConfig default
 * value (from config.h #defines) is used and saved to NVS.
 */
void loadBootstrap() {
  prefs.begin(NVS_NAMESPACE, false);  // false = read/write

  // WiFi
  strlcpy(bootstrap.wifiSsid,     prefs.getString("wifi_ssid",  DEFAULT_WIFI_SSID).c_str(),     64);
  strlcpy(bootstrap.wifiPassword, prefs.getString("wifi_pass",  DEFAULT_WIFI_PASSWORD).c_str(), 64);

  // Firebase
  strlcpy(bootstrap.firebaseApiKey, prefs.getString("fb_api",  DEFAULT_API_KEY).c_str(),       128);
  strlcpy(bootstrap.firebaseDbUrl,  prefs.getString("fb_url",  DEFAULT_DATABASE_URL).c_str(),  128);

  // IoT device account
  strlcpy(bootstrap.iotEmail,    prefs.getString("iot_email", DEFAULT_IOT_EMAIL).c_str(),    64);
  strlcpy(bootstrap.iotPassword, prefs.getString("iot_pass",  DEFAULT_IOT_PASSWORD).c_str(), 64);

  prefs.end();
  Serial.printf("[NVS] Bootstrap loaded: SSID=%s, DB=%s\n",
                bootstrap.wifiSsid, bootstrap.firebaseDbUrl);
}

/**
 * Save bootstrap config to NVS (called from WiFiManager save callback).
 */
void saveBootstrap() {
  prefs.begin(NVS_NAMESPACE, false);
  prefs.putString("wifi_ssid",  bootstrap.wifiSsid);
  prefs.putString("wifi_pass",  bootstrap.wifiPassword);
  prefs.putString("fb_api",     bootstrap.firebaseApiKey);
  prefs.putString("fb_url",     bootstrap.firebaseDbUrl);
  prefs.putString("iot_email",  bootstrap.iotEmail);
  prefs.putString("iot_pass",   bootstrap.iotPassword);
  prefs.end();
  Serial.println("[NVS] Bootstrap config saved to NVS.");
}

/**
 * Erase all NVS keys (factory reset).
 * Call this when the factory reset button is held at boot.
 */
void eraseBootstrap() {
  prefs.begin(NVS_NAMESPACE, false);
  prefs.clear();
  prefs.end();
  Serial.println("[NVS] Bootstrap erased! Akan masuk ke captive portal.");
}

// ═══════════════════════════════════════════════════════════════
// LAYER 1 — WIFIMANAGER CAPTIVE PORTAL
// ═══════════════════════════════════════════════════════════════
/**
 * How the captive portal works:
 * ─────────────────────────────────────────────────────────────
 * 1. On first boot (or after factory reset), the ESP32 cannot
 *    find a known WiFi network.
 * 2. It starts a soft-AP named "IoT-Listrik-Setup" with password
 *    "listrik123".
 * 3. The user connects their phone to this AP.
 * 4. A captive portal page opens automatically (or navigate to
 *    192.168.4.1 in browser).
 * 5. The page shows fields for:
 *    - WiFi SSID / password (WiFiManager built-in)
 *    - Firebase API Key / DB URL (custom parameters)
 *    - IoT device Email / Password (custom parameters)
 * 6. After saving, credentials are written to NVS and the
 *    ESP32 restarts and connects to the specified WiFi.
 * 7. On subsequent boots, WiFiManager auto-connects in <5 s.
 * ─────────────────────────────────────────────────────────────
 * TRADEOFF: Custom parameter values sent through the portal
 * are NOT encrypted in transit (plain HTTP over local AP).
 * For a thesis/educational project this is acceptable.
 * For production, add HTTPS or use QR-code provisioning.
 * ─────────────────────────────────────────────────────────────
 */

// Custom parameter objects (shown on captive portal form)
WiFiManagerParameter* param_fb_api  = nullptr;
WiFiManagerParameter* param_fb_url  = nullptr;
WiFiManagerParameter* param_iot_email = nullptr;
WiFiManagerParameter* param_iot_pass  = nullptr;

/**
 * Connect to WiFi using WiFiManager.
 * Falls back to captive portal if connection fails.
 * Blocks until connected or portal times out (then restarts).
 */
void connectWithPortal() {
  // Create custom param objects with current NVS values as defaults
  param_fb_api   = new WiFiManagerParameter("fb_api",   "Firebase API Key",   bootstrap.firebaseApiKey, 128);
  param_fb_url   = new WiFiManagerParameter("fb_url",   "Firebase RTDB URL",  bootstrap.firebaseDbUrl,  128);
  param_iot_email= new WiFiManagerParameter("iot_email","IoT Device Email",    bootstrap.iotEmail,        64);
  param_iot_pass = new WiFiManagerParameter("iot_pass", "IoT Device Password", bootstrap.iotPassword,     64);

  WiFiManager wm;
  wm.setTimeout(AP_TIMEOUT_SECONDS);
  wm.setTitle("IoT Listrik — Setup");
  wm.setDarkMode(true);

  // Add custom params to portal form
  wm.addParameter(param_fb_api);
  wm.addParameter(param_fb_url);
  wm.addParameter(param_iot_email);
  wm.addParameter(param_iot_pass);

  // Callback: save custom params to NVS when form is submitted
  wm.setSaveParamsCallback([&]() {
    strlcpy(bootstrap.firebaseApiKey, param_fb_api->getValue(),   128);
    strlcpy(bootstrap.firebaseDbUrl,  param_fb_url->getValue(),   128);
    strlcpy(bootstrap.iotEmail,       param_iot_email->getValue(), 64);
    strlcpy(bootstrap.iotPassword,    param_iot_pass->getValue(),  64);
    saveBootstrap();
  });

  Serial.println("[WiFi] Menghubungkan...");
  bool connected = wm.autoConnect(AP_SSID, AP_PASSWORD);

  // Free heap
  delete param_fb_api; delete param_fb_url;
  delete param_iot_email; delete param_iot_pass;

  if (!connected) {
    Serial.println("[WiFi] Gagal terhubung atau portal timeout → restart");
    ESP.restart();
  }

  Serial.printf("[WiFi] Terhubung! IP: %s\n", WiFi.localIP().toString().c_str());
}

// ═══════════════════════════════════════════════════════════════
// HARDWARE HELPERS
// ═══════════════════════════════════════════════════════════════

void setRelay(int val) {
  // Relay module is active-LOW: val=1(ON)→pin LOW, val=0(OFF)→pin HIGH
  digitalWrite(PIN_RELAY1, val == 1 ? LOW : HIGH);
  state.relay = val;
  Serial.printf("[Relay] → %s\n", val == 1 ? "ON" : "OFF");
}

void buzzerBeep(int times = 3, int onMs = 200, int offMs = 100) {
  if (!rt.buzzerEnabled) return;
  for (int i = 0; i < times; i++) {
    digitalWrite(PIN_BUZZER, HIGH); delay(onMs);
    digitalWrite(PIN_BUZZER, LOW);  delay(offMs);
  }
}

void buzzerLong() {
  if (!rt.buzzerEnabled) return;
  digitalWrite(PIN_BUZZER, HIGH); delay(1500);
  digitalWrite(PIN_BUZZER, LOW);
}

#ifdef USE_LCD
void updateLCD() {
  lcd.setCursor(0, 0);
  lcd.printf("I:%.2fA V:%.0fV  ", state.arus, state.tegangan);
  lcd.setCursor(0, 1);
  lcd.printf("%-8s R:%s", state.status.c_str(), state.relay ? "ON " : "OFF");
}
#endif

// ═══════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(400);
  Serial.println(F("\n════════════════════════════════════════"));
  Serial.println(F("  IoT Deteksi Kebocoran Arus Listrik"));
  Serial.println(F("════════════════════════════════════════"));

  // ── GPIO init ───────────────────────────────────────────────
  pinMode(PIN_RELAY1,       OUTPUT);
  pinMode(PIN_RELAY2,       OUTPUT);
  pinMode(PIN_BUZZER,       OUTPUT);
  pinMode(PIN_FACTORY_RESET,INPUT_PULLUP);
  digitalWrite(PIN_BUZZER, LOW);
  setRelay(1);  // default: relay ON (load connected)

  // ── Factory reset check ─────────────────────────────────────
  // Hold BOOT button (GPIO0) during power-on → erase NVS → portal
  if (digitalRead(PIN_FACTORY_RESET) == LOW) {
    Serial.println("[RESET] Tombol factory reset terdeteksi!");
    eraseBootstrap();
    WiFiManager wm;
    wm.resetSettings();  // erase WiFiManager saved WiFi too
    Serial.println("[RESET] Selesai. Restart...");
    delay(500);
    ESP.restart();
  }

  // ── ADC / sensor init ────────────────────────────────────────
  initSensors();

  // ── LCD init (optional) ──────────────────────────────────────
  #ifdef USE_LCD
    lcd.init(); lcd.backlight();
    lcd.print(" Inisialisasi...");
  #endif

  // ── Load bootstrap config from NVS ──────────────────────────
  loadBootstrap();
  loadEnergyKwhFromNvs();

  // ── Connect WiFi (with captive portal fallback) ──────────────
  connectWithPortal();

  // ── Initialize Firebase with bootstrap credentials ───────────
  initFirebase(
    bootstrap.firebaseApiKey,
    bootstrap.firebaseDbUrl,
    bootstrap.iotEmail,
    bootstrap.iotPassword
  );

  // ── Wait for Firebase auth token (max 15 s) ──────────────────
  Serial.print("[Firebase] Menunggu auth token");
  for (int i = 0; i < 15 && !isFirebaseReady(); i++) {
    Serial.print('.'); delay(1000);
  }
  Serial.println(isFirebaseReady() ? " ✓" : " TIMEOUT (lanjut)");

  // ── Load initial runtime settings from Firebase ──────────────
  if (isFirebaseReady()) {
    readAllSettings(rt);
    lastSettingsSyncMs = millis();
  }

  // ── Boot Telegram notification ───────────────────────────────
  if (!rt.telegramBotToken.isEmpty()) {
    String bootMsg =
      "🟢 <b>ESP32 Online</b>\n"
      "Perangkat IoT Deteksi Arus aktif.\n"
      "Threshold: <code>" + String(rt.thresholdArus, 1) + " A</code>\n"
      "IP: <code>" + WiFi.localIP().toString() + "</code>";
    sendTelegram(bootMsg, rt.telegramBotToken, rt.telegramChatId,
                 rt.telegramCooldownMs, true);
  }

  Serial.println(F("[Setup] Selesai! Mulai monitoring...\n"));
  buzzerBeep(2, 150, 80);
}

// ═══════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════

void loop() {
  unsigned long now = millis();

  // ── WiFi watchdog ────────────────────────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Terputus — reconnecting...");
    WiFi.reconnect();
    delay(3000);
    return;
  }

  // ── Read sensors using RUNTIME calibration ───────────────────
  // calibration factors are from rt struct updated from Firebase
  state.arus     = readArus(rt.arusCalibration);
  state.tegangan = readTegangan(rt.teganganCalibration);
  state.daya     = computeDaya(state.arus, state.tegangan);

  // ── Energy integration (estimated real power using PF from settings) ──
  {
    unsigned long prev = g_lastEnergyMs;
    if (prev == 0) prev = now;
    if (now >= prev) {
      float dt_h = (now - prev) / 3600000.0f;
      if (dt_h > 0.0f && dt_h < 1.0f) {
        float pKw = (state.arus * state.tegangan * rt.powerFactorEstimate) / 1000.0f;
        if (pKw > 0.0f) g_energiKwh += pKw * dt_h;
      }
    }
    g_lastEnergyMs = now;
  }
  if (now - g_lastKwhSaveMs >= 60000UL) {
    g_lastKwhSaveMs = now;
    saveEnergyKwhToNvs();
  }

  // ── Determine status using RUNTIME threshold ─────────────────
  String newStatus = determineStatus(state.arus, rt.thresholdArus,
                                      rt.warningPercent);
  bool statusChanged = (newStatus != lastStatus);

  // ── Auto-cutoff (uses rt.autoCutoffEnabled) ──────────────────
  if (rt.autoCutoffEnabled && newStatus == "DANGER" && state.relay == 1) {

    Serial.println("[Auto-Cutoff] Kondisi berbahaya! Relay OFF.");
    setRelay(0);
    updateRelayState(0);
    buzzerLong();
    writeLog(state.arus, state.tegangan, newStatus, 0, "auto_cutoff");
  }
  state.status = newStatus;

  // ── Buzzer feedback (status change only) ─────────────────────
  if (statusChanged) {
    if (newStatus == "WARNING") buzzerBeep(2, 100, 100);
    if (newStatus == "DANGER") buzzerBeep(5, 200, 100);
  }

  // ── Firebase write (rt.sendIntervalMs controls rate) ─────────
  if (now - lastSendMs >= rt.sendIntervalMs) {
    lastSendMs = now;
    writeMonitorData(state.arus, state.tegangan, state.daya, g_energiKwh,
                       rt.frequencyHz, rt.powerFactorEstimate,
                       state.status, state.relay);
    Serial.printf("[Monitor] I=%.2fA V=%.1fV S=%s R=%d\n",
                  state.arus, state.tegangan,
                  state.status.c_str(), state.relay);
    #ifdef USE_LCD
      updateLCD();
    #endif
  }

  // ── Log on status change ──────────────────────────────────────
  if (statusChanged && (now - lastLogMs > 2000)) {
    lastLogMs = now;
    writeLog(state.arus, state.tegangan, newStatus, state.relay, "esp32");
  }

  // ── Read relay command from web (every ~2.5 s) ───────────────
  if (now - lastRelayCheckMs >= 2500) {
    lastRelayCheckMs = now;
    int cmdRelay = state.relay;
    if (readRelayCommand(cmdRelay) && cmdRelay != state.relay) {
      Serial.printf("[Relay] Command dari web: %s\n", cmdRelay ? "ON" : "OFF");

      // Reject ON command when auto-cutoff is active and still dangerous
      if (cmdRelay == 1 && rt.autoCutoffEnabled && state.status == "DANGER") {
        Serial.println("[Relay] Ditolak: kondisi masih berbahaya.");
        updateRelayState(0);
      } else {
        setRelay(cmdRelay);
        writeLog(state.arus, state.tegangan,
                 state.status, cmdRelay, "web_command");
        buzzerBeep(1, 80, 0);
      }
    }
  }

  // ── Telegram alert (uses RUNTIME token + chatId) ─────────────
  if (rt.telegramNotifyEnabled) {
    sendAlertIfNeeded(
      newStatus, lastStatus,
      state.arus, state.tegangan, state.relay,
      rt.telegramBotToken, rt.telegramChatId,
      rt.telegramCooldownMs
    );
  }

  // ── Sync Runtime Settings from Firebase ──────────────────────
  // This is how changes made on the web Settings page take effect.
  if (now - lastSettingsSyncMs >= rt.settingsSyncMs) {
    lastSettingsSyncMs = now;
    readAllSettings(rt);
  }

  lastStatus = newStatus;
  delay(10);  // small yield to keep watchdog happy
}

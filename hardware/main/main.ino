/**
 * main.ino — IoT Alat Deteksi Kebocoran Arus Listrik (ESP32)
 * ═══════════════════════════════════════════════════════════════
 * Project: ALAT DETEKSI KEBOCORAN ARUS LISTRIK BERBASIS IoT
 *          DENGAN NOTIFIKASI REAL-TIME
 *
 * Configuration Architecture (see config.h for full details):
 * ┌──────────────────────────────────────────────────────────┐
 * │ LAYER 1 — Bootstrap (NVS + WiFiManager + admin push)    │
 * │   WiFi SSID/password, Firebase API key, DB URL,         │
 * │   IoT device email/password                             │
 * │   → Changed via captive portal atau admin bootstrap    │
 * ├──────────────────────────────────────────────────────────┤
 * │ LAYER 2 — Runtime (Firebase /settings, admin web page)  │
 * │   Threshold, buzzer, auto-cutoff, Telegram token/chatId,│
 * │   calibration factors, send interval, stream pause      │
 * │   → Changed from web Settings page (no reflashing)     │
 * └──────────────────────────────────────────────────────────┘
 *
 * Required libraries (install via Arduino Library Manager):
 *   ✅ Firebase ESP Client   by Mobizt
 *   ✅ ArduinoJson           by Benoit Blanchon  (Firebase dependency)
 *   ✅ WiFiManager           by tzapu            (captive portal)
 *   ✅ URLEncode             by Masoud K         (Telegram URL encoding)
 *   ✅ PZEM004Tv30           by Mandulaj         (PZEM-004T v3 meter)
 *   ✅ HTTPClient            built-in ESP32 core
 *   ✅ Preferences           built-in ESP32 core (NVS)
 *   (Optional) LiquidCrystal I2C by Frank de Brabander
 *
 * Arduino IDE Board Settings:
 *   Board          : ESP32 Dev Module
 *   Partition Scheme: Huge APP (3MB No OTA/1MB SPIFFS)
 *   Upload Speed   : 921600
 *   CPU Frequency  : 240 MHz
 * ═══════════════════════════════════════════════════════════════
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h>     // tzapu WiFiManager — captive portal
#include <Preferences.h>     // NVS — non-volatile bootstrap storage
#include "../config.h"
#include "../sensors.h"
#include "../firebase_handler.h"
#include "../telegram_handler.h"

#ifdef USE_LCD
  #include <Wire.h>
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
  float  arus            = 0.0f;
  float  tegangan        = 0.0f;
  float  dayaW           = 0.0f;
  float  apparentPowerVa = 0.0f;
  float  energiKwh       = 0.0f;
  float  frekuensi       = 50.0f;
  float  powerFactor     = 0.85f;
  String sensorSource    = "PZEM-004T";
  String status          = "NORMAL";
  int    relay           = 1;         // physical relay state
};
DeviceState state;
String lastStatus = "NORMAL";  // previous iteration status for change detection

struct AutoLearningState {
  bool running = false;
  String requestId = "";
  unsigned long startedMs = 0;
  unsigned long lastSampleMs = 0;
  unsigned long sampleCount = 0;
  float minCurrent = 999999.0f;
  float maxCurrent = 0.0f;
  float sumCurrent = 0.0f;
  float maxPowerW = 0.0f;
  float sumPowerW = 0.0f;
};
AutoLearningState autoLearning;

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
unsigned long lastSendMs           = 0;
unsigned long lastSettingsSyncMs   = 0;
unsigned long lastRelayCheckMs     = 0;
unsigned long lastLogMs            = 0;
unsigned long lastPeriodicLogMs    = 0;  // Periodic log timer (independent of status change)
unsigned long lastBootstrapCheckMs = 0;

// Interval log periodik — log ke /logs setiap 5 menit meski kondisi stabil
static const unsigned long PERIODIC_LOG_INTERVAL_MS = 300000UL;  // 5 menit
bool firstLoopTrace = true;

// FreeRTOS
TaskHandle_t TaskFirebase;
SemaphoreHandle_t dataMutex = NULL;

// Variables for cross-task communication
struct PendingLog {
  bool active = false;
  float arus = 0;
  float tegangan = 0;
  String status = "";
  int relay = 0;
  String cause = "";
  float dayaW = 0;
  float apparentPowerVa = 0;
  float energiKwh = 0;
  float frekuensi = 0;
  float powerFactor = 0;
  String sensorSource = "";
} pendingLog;

struct PendingAlert {
  bool active = false;
  String newStatus = "";
  String lastStatus = "";
  float arus = 0;
  float tegangan = 0;
  int relay = 0;
} pendingAlert;

static const unsigned long WIFI_CONNECT_TIMEOUT_MS = 15000UL;
static const unsigned long REMOTE_BOOTSTRAP_POLL_MS = 5000UL;
static const unsigned long AUTO_LEARNING_SAMPLE_MS = 500UL;
static const unsigned long RELAY_COMMAND_POLL_MS = 1000UL;

String readBootstrapMeta(const char* key) {
  prefs.begin(NVS_NAMESPACE, true);
  String value = prefs.getString(key, "");
  prefs.end();
  return value;
}

void writeBootstrapMeta(const char* key, const String& value) {
  prefs.begin(NVS_NAMESPACE, false);
  prefs.putString(key, value);
  prefs.end();
}

void clearBootstrapMeta(const char* key) {
  prefs.begin(NVS_NAMESPACE, false);
  prefs.remove(key);
  prefs.end();
}

void rememberHandledBootstrapRequest(const String& requestId) {
  writeBootstrapMeta("last_req", requestId);
}

String getLastHandledBootstrapRequest() {
  return readBootstrapMeta("last_req");
}

void setPendingBootstrapConfirmation(const String& requestId,
                                     const String& action) {
  writeBootstrapMeta("pending_req", requestId);
  writeBootstrapMeta("pending_act", action);
}

String getPendingBootstrapConfirmationRequest() {
  return readBootstrapMeta("pending_req");
}

String getPendingBootstrapConfirmationAction() {
  return readBootstrapMeta("pending_act");
}

void clearPendingBootstrapConfirmation() {
  clearBootstrapMeta("pending_req");
  clearBootstrapMeta("pending_act");
}

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

bool connectStoredWiFi(unsigned long timeoutMs = WIFI_CONNECT_TIMEOUT_MS) {
  if (strlen(bootstrap.wifiSsid) == 0) {
    Serial.println("[WiFi] SSID bootstrap kosong.");
    return false;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(bootstrap.wifiSsid, bootstrap.wifiPassword);
  Serial.printf("[WiFi] Coba SSID bootstrap: %s\n", bootstrap.wifiSsid);

  unsigned long startMs = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startMs) < timeoutMs) {
    delay(300);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] Bootstrap connect sukses. IP: %s\n",
                  WiFi.localIP().toString().c_str());
    return true;
  }

  Serial.println("[WiFi] Bootstrap connect gagal, lanjut captive portal.");
  WiFi.disconnect(true, true);
  delay(250);
  return false;
}

bool writeBootstrapStatusString(const char* child, const String& value) {
  #ifdef SKIP_FIREBASE
  return false;
  #else
  if (!isFirebaseReady()) return false;
  return Firebase.RTDB.setString(
    &fbBootstrapData,
    String("/settings/deviceBootstrap/") + child,
    value
  );
  #endif
}

bool writeBootstrapStatusBool(const char* child, bool value) {
  #ifdef SKIP_FIREBASE
  return false;
  #else
  if (!isFirebaseReady()) return false;
  return Firebase.RTDB.setBool(
    &fbBootstrapData,
    String("/settings/deviceBootstrap/") + child,
    value
  );
  #endif
}

bool isMissingFirebasePathError(const String& reason) {
  return reason.indexOf("path not exist") != -1 ||
         reason.indexOf("Path not exist") != -1 ||
         reason.indexOf("path is not exist") != -1;
}

String bootstrapChildPath(const char* child) {
  return String("/settings/deviceBootstrap/") + child;
}

bool readBootstrapBoolChild(const char* child, bool& out) {
  #ifdef SKIP_FIREBASE
  return false;
  #else
  const String path = bootstrapChildPath(child);
  if (Firebase.RTDB.getBool(&fbBootstrapData, path)) {
    out = fbBootstrapData.boolData();
    return true;
  }

  String reason = fbBootstrapData.errorReason();
  if (Firebase.RTDB.getString(&fbBootstrapData, path)) {
    String value = fbBootstrapData.stringData();
    value.toLowerCase();
    out = (value == "true" || value == "1");
    return true;
  }

  reason = fbBootstrapData.errorReason();
  if (!isMissingFirebasePathError(reason)) {
    Serial.println(String("[Firebase] read deviceBootstrap/") + child + " gagal: " + reason);
  }
  return false;
  #endif
}

bool readBootstrapStringChild(const char* child, String& out) {
  #ifdef SKIP_FIREBASE
  return false;
  #else
  const String path = bootstrapChildPath(child);
  if (Firebase.RTDB.getString(&fbBootstrapData, path)) {
    out = fbBootstrapData.stringData();
    return true;
  }

  const String reason = fbBootstrapData.errorReason();
  if (!isMissingFirebasePathError(reason)) {
    Serial.println(String("[Firebase] read deviceBootstrap/") + child + " gagal: " + reason);
  }
  return false;
  #endif
}

void updateRemoteBootstrapStatus(const String& status,
                                 const String& message,
                                 bool pending,
                                 const String& lastError = "",
                                 bool restartRequired = false) {
  if (!isFirebaseReady()) return;
  writeBootstrapStatusString("status", status);
  writeBootstrapStatusString("statusMessage", message);
  writeBootstrapStatusBool("pending", pending);
  writeBootstrapStatusString("lastSeenAt", String(millis()));
  writeBootstrapStatusString("lastError", lastError);
  writeBootstrapStatusBool("restartRequired", restartRequired);
  if (WiFi.status() == WL_CONNECTED) {
    writeBootstrapStatusString("activeSsid", WiFi.SSID());
    writeBootstrapStatusString("deviceIp", WiFi.localIP().toString());
  }
}

void confirmPendingBootstrapIfNeeded() {
  const String requestId = getPendingBootstrapConfirmationRequest();
  const String action = getPendingBootstrapConfirmationAction();
  if (requestId.isEmpty() || !isFirebaseReady()) return;

  clearPendingBootstrapConfirmation();
  writeBootstrapStatusString("lastAppliedRequestId", requestId);
  writeBootstrapStatusString("lastConfirmedAt", String(millis()));
  writeBootstrapStatusString("lastAction", action);
  updateRemoteBootstrapStatus(
    "connected",
    "ESP32 online dengan konfigurasi bootstrap terbaru.",
    false,
    "",
    false
  );
}

bool readRemoteBootstrapRequest(RemoteBootstrapRequest& out) {
  if (!isFirebaseReady()) return false;

  bool pending = false;
  if (!readBootstrapBoolChild("pending", pending) || !pending) {
    return false;
  }

  out.pending = true;
  readBootstrapStringChild("action", out.action);
  readBootstrapStringChild("requestId", out.requestId);
  readBootstrapStringChild("wifiSsid", out.wifiSsid);
  readBootstrapStringChild("wifiPassword", out.wifiPassword);
  readBootstrapStringChild("firebaseApiKey", out.firebaseApiKey);
  readBootstrapStringChild("firebaseDbUrl", out.firebaseDbUrl);
  readBootstrapStringChild("iotEmail", out.iotEmail);
  readBootstrapStringChild("iotPassword", out.iotPassword);

  if (out.requestId.isEmpty()) {
    Serial.println("[Firebase] deviceBootstrap pending tanpa requestId, diabaikan.");
  }
  return out.pending && !out.requestId.isEmpty();
}

void applyRemoteBootstrapRequest(const RemoteBootstrapRequest& cmd) {
  if (!cmd.pending || cmd.requestId.isEmpty()) return;
  if (cmd.requestId == getLastHandledBootstrapRequest()) return;

  writeBootstrapStatusString("lastAppliedRequestId", cmd.requestId);
  writeBootstrapStatusString("lastAction", cmd.action);

  if (cmd.action == "clear") {
    rememberHandledBootstrapRequest(cmd.requestId);
    updateRemoteBootstrapStatus(
      "portal",
      "Konfigurasi bootstrap dihapus. ESP32 akan membuka captive portal.",
      false,
      "",
      true
    );
    delay(250);
    eraseBootstrap();
    WiFiManager wm;
    wm.resetSettings();
    delay(500);
    ESP.restart();
    return;
  }

  const bool missingRequired =
    cmd.wifiSsid.isEmpty() ||
    cmd.firebaseApiKey.isEmpty() ||
    cmd.firebaseDbUrl.isEmpty() ||
    cmd.iotEmail.isEmpty() ||
    cmd.iotPassword.isEmpty();

  if (missingRequired) {
    rememberHandledBootstrapRequest(cmd.requestId);
    updateRemoteBootstrapStatus(
      "error",
      "Payload bootstrap tidak lengkap. Periksa SSID, Firebase, dan akun IoT.",
      false,
      "required_fields_missing",
      false
    );
    return;
  }

  updateRemoteBootstrapStatus(
    "applying",
    "Konfigurasi bootstrap diterima. Menyimpan ke NVS...",
    true,
    "",
    true
  );

  strlcpy(bootstrap.wifiSsid,        cmd.wifiSsid.c_str(),        sizeof(bootstrap.wifiSsid));
  strlcpy(bootstrap.wifiPassword,    cmd.wifiPassword.c_str(),    sizeof(bootstrap.wifiPassword));
  strlcpy(bootstrap.firebaseApiKey,  cmd.firebaseApiKey.c_str(),  sizeof(bootstrap.firebaseApiKey));
  strlcpy(bootstrap.firebaseDbUrl,   cmd.firebaseDbUrl.c_str(),   sizeof(bootstrap.firebaseDbUrl));
  strlcpy(bootstrap.iotEmail,        cmd.iotEmail.c_str(),        sizeof(bootstrap.iotEmail));
  strlcpy(bootstrap.iotPassword,     cmd.iotPassword.c_str(),     sizeof(bootstrap.iotPassword));

  saveBootstrap();
  rememberHandledBootstrapRequest(cmd.requestId);
  setPendingBootstrapConfirmation(cmd.requestId, "save");

  updateRemoteBootstrapStatus(
    "restarting",
    "Konfigurasi bootstrap tersimpan. ESP32 restart untuk menerapkan jaringan baru.",
    true,
    "",
    true
  );

  delay(500);
  ESP.restart();
}

// ═══════════════════════════════════════════════════════════════
// LAYER 1 — WIFIMANAGER CAPTIVE PORTAL
// ═══════════════════════════════════════════════════════════════
/**
 * How the captive portal works:
 * ─────────────────────────────────────────────────────────────
 * 1. On first boot (or after factory reset), the ESP32 cannot
 *    find a known WiFi network.
 * 2. It starts a soft-AP named AP_SSID with password AP_PASSWORD.
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
  if (connectStoredWiFi()) {
    return;
  }

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
    strlcpy(bootstrap.wifiSsid, WiFi.SSID().c_str(), 64);
    strlcpy(bootstrap.wifiPassword, WiFi.psk().c_str(), 64);
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

  strlcpy(bootstrap.wifiSsid, WiFi.SSID().c_str(), 64);
  strlcpy(bootstrap.wifiPassword, WiFi.psk().c_str(), 64);
  saveBootstrap();
  Serial.printf("[WiFi] Terhubung! IP: %s\n", WiFi.localIP().toString().c_str());
}

// ═══════════════════════════════════════════════════════════════
// AUTO LEARNING BEBAN NORMAL
// ═══════════════════════════════════════════════════════════════

void resetAutoLearningRuntime() {
  autoLearning.running = false;
  autoLearning.requestId = "";
  autoLearning.startedMs = 0;
  autoLearning.lastSampleMs = 0;
  autoLearning.sampleCount = 0;
  autoLearning.minCurrent = 999999.0f;
  autoLearning.maxCurrent = 0.0f;
  autoLearning.sumCurrent = 0.0f;
  autoLearning.maxPowerW = 0.0f;
  autoLearning.sumPowerW = 0.0f;
}

void beginAutoLearning(unsigned long now) {
  resetAutoLearningRuntime();
  autoLearning.running = true;
  autoLearning.requestId = rt.autoLearningRequestId.isEmpty()
    ? String("device-") + String(now)
    : rt.autoLearningRequestId;
  autoLearning.startedMs = now;
  autoLearning.lastSampleMs = 0;
  updateAutoLearningStatus(autoLearning.requestId, "running", true,
    "Perangkat mulai mempelajari beban normal.");
  Serial.println("[Auto Learning] Mulai request " + autoLearning.requestId);
}

void sampleAutoLearning(unsigned long now) {
  if (!autoLearning.running) return;
  if (autoLearning.lastSampleMs != 0 && (now - autoLearning.lastSampleMs < AUTO_LEARNING_SAMPLE_MS)) {
    return;
  }
  autoLearning.lastSampleMs = now;

  float currentA = state.arus;
  float powerW = state.dayaW;
  if (currentA < 0.0f || isnan(currentA)) currentA = 0.0f;
  if (powerW < 0.0f || isnan(powerW)) powerW = 0.0f;

  autoLearning.sampleCount += 1;
  if (currentA < autoLearning.minCurrent) autoLearning.minCurrent = currentA;
  if (currentA > autoLearning.maxCurrent) autoLearning.maxCurrent = currentA;
  if (powerW > autoLearning.maxPowerW) autoLearning.maxPowerW = powerW;
  autoLearning.sumCurrent += currentA;
  autoLearning.sumPowerW += powerW;
}

void finishAutoLearning() {
  if (!autoLearning.running) return;

  if (autoLearning.sampleCount < 3) {
    updateAutoLearningStatus(autoLearning.requestId, "error", false,
      "Learning gagal: sampel pembacaan terlalu sedikit.");
    rt.autoLearningActive = false;
    resetAutoLearningRuntime();
    return;
  }

  float avgCurrent = autoLearning.sumCurrent / (float)autoLearning.sampleCount;
  float avgPowerW = autoLearning.sumPowerW / (float)autoLearning.sampleCount;
  float marginPercent = rt.autoLearningMarginPercent;
  if (marginPercent < 5.0f) marginPercent = 5.0f;
  if (marginPercent > 100.0f) marginPercent = 100.0f;

  float learnedThreshold = autoLearning.maxCurrent * (1.0f + (marginPercent / 100.0f));
  float minimumThreshold = autoLearning.maxCurrent + 0.20f;
  if (learnedThreshold < minimumThreshold) learnedThreshold = minimumThreshold;
  if (learnedThreshold < 0.50f) learnedThreshold = 0.50f;
  if (learnedThreshold > 200.0f) learnedThreshold = 200.0f;

  bool applyThreshold = rt.autoLearningApplyToThreshold;
  bool ok = writeAutoLearningResult(
    autoLearning.requestId,
    autoLearning.sampleCount,
    autoLearning.minCurrent == 999999.0f ? 0.0f : autoLearning.minCurrent,
    autoLearning.maxCurrent,
    avgCurrent,
    autoLearning.maxPowerW,
    avgPowerW,
    learnedThreshold,
    applyThreshold
  );

  if (ok && applyThreshold) {
    rt.thresholdArus = learnedThreshold;
    Serial.printf("[Auto Learning] Threshold baru %.2f A diterapkan.\n", learnedThreshold);
  }
  rt.autoLearningActive = false;
  resetAutoLearningRuntime();
}

void handleAutoLearning(unsigned long now) {
  if (!rt.autoLearningActive) {
    if (autoLearning.running) {
      updateAutoLearningStatus(autoLearning.requestId, "stopped", false,
        "Learning dihentikan dari pengaturan admin.");
      resetAutoLearningRuntime();
    }
    return;
  }

  bool requestChanged = !rt.autoLearningRequestId.isEmpty() &&
                        autoLearning.requestId != rt.autoLearningRequestId;
  if (!autoLearning.running || requestChanged) {
    beginAutoLearning(now);
  }

  sampleAutoLearning(now);

  unsigned long durationMs = rt.autoLearningDurationMs;
  if (durationMs < 30000UL) durationMs = 30000UL;
  if (durationMs > 600000UL) durationMs = 600000UL;
  if (now - autoLearning.startedMs >= durationMs) {
    finishAutoLearning();
  }
}

// ═══════════════════════════════════════════════════════════════
// HARDWARE HELPERS
// ═══════════════════════════════════════════════════════════════

void setRelay(int val) {
  // Relay module polarity is configured in config.h.
#if RELAY_ACTIVE_LOW
  digitalWrite(PIN_RELAY1, val == 1 ? LOW : HIGH);
#else
  digitalWrite(PIN_RELAY1, val == 1 ? HIGH : LOW);
#endif
  state.relay = val;
  Serial.printf("[Relay] → %s\n", val == 1 ? "ON" : "OFF");
}

void setBuzzerOutput(bool on) {
#if BUZZER_ACTIVE_HIGH
  digitalWrite(PIN_BUZZER, on ? HIGH : LOW);
#else
  digitalWrite(PIN_BUZZER, on ? LOW : HIGH);
#endif
}

void buzzerBeep(int times = 3, int onMs = 200, int offMs = 100) {
  if (!rt.buzzerEnabled) return;
  for (int i = 0; i < times; i++) {
    setBuzzerOutput(true);  delay(onMs);
    setBuzzerOutput(false); delay(offMs);
  }
}

void buzzerLong() {
  if (!rt.buzzerEnabled) return;
  setBuzzerOutput(true);  delay(1500);
  setBuzzerOutput(false);
}

#ifdef USE_LCD
void lcdPrintLine(uint8_t row, const String& text) {
  lcd.setCursor(0, row);
  String line = text;
  if (line.length() > LCD_COLS) line.remove(LCD_COLS);
  lcd.print(line);
  for (uint8_t i = line.length(); i < LCD_COLS; i++) {
    lcd.print(' ');
  }
}

void lcdStatus(const char* line1, const char* line2) {
  lcdPrintLine(0, String(line1));
  lcdPrintLine(1, String(line2));
}

void scanI2CBus() {
  byte found = 0;
  Serial.printf("[I2C] Scan LCD bus SDA=%d SCL=%d target=0x%02X\n",
                LCD_SDA_PIN, LCD_SCL_PIN, LCD_ADDR);
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("[I2C] Device ditemukan: 0x%02X\n", addr);
      found++;
      delay(2);
    }
  }
  if (found == 0) {
    Serial.println("[I2C] Tidak ada device. Cek VCC, GND, SDA=21, SCL=22, dan solder backpack LCD.");
  }
}

void initLCD() {
  Wire.begin(LCD_SDA_PIN, LCD_SCL_PIN);
  delay(50);
  scanI2CBus();

  // Auto-detect LCD address: try primary (0x27), fallback to secondary (0x3F)
  byte detectedAddr = 0;
  Wire.beginTransmission(LCD_ADDR_PRIMARY);
  if (Wire.endTransmission() == 0) {
    detectedAddr = LCD_ADDR_PRIMARY;
  } else {
    Wire.beginTransmission(LCD_ADDR_SECONDARY);
    if (Wire.endTransmission() == 0) {
      detectedAddr = LCD_ADDR_SECONDARY;
    }
  }

  if (detectedAddr != 0 && detectedAddr != LCD_ADDR) {
    Serial.printf("[LCD] Alamat terdeteksi 0x%02X (beda dari config 0x%02X) — gunakan terdeteksi\n",
                  detectedAddr, LCD_ADDR);
    lcd = LiquidCrystal_I2C(detectedAddr, LCD_COLS, LCD_ROWS);
  } else if (detectedAddr == 0) {
    Serial.println("[LCD] Tidak ada LCD ditemukan di 0x27 atau 0x3F. Cek kabel SDA/SCL.");
  }

  lcd.init();
  lcd.backlight();
  lcdStatus("IoT Listrik", "Booting...");
  Serial.printf("[LCD] Siap di alamat 0x%02X\n", detectedAddr ? detectedAddr : LCD_ADDR);
}

void updateLCD() {
  char line1[17];
  char line2[17];
  snprintf(line1, sizeof(line1), "I:%4.2fA V:%3.0f", state.arus, state.tegangan);
  snprintf(line2, sizeof(line2), "%-8s R:%s", state.status.c_str(), state.relay ? "ON" : "OFF");
  lcdPrintLine(0, String(line1));
  lcdPrintLine(1, String(line2));
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
  setBuzzerOutput(false);
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
    initLCD();
  #endif

  // ── Load bootstrap config from NVS ──────────────────────────
  loadBootstrap();
  loadEnergyKwhFromNvs();

  // ── Connect WiFi (with captive portal fallback) ──────────────
  #ifdef USE_LCD
    lcdStatus("WiFi", "Connecting...");
  #endif
  connectWithPortal();

  // ── Initialize Firebase with bootstrap credentials ───────────
  #ifdef USE_LCD
    lcdStatus("Firebase", "Init...");
  #endif
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
    confirmPendingBootstrapIfNeeded();
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

  buzzerBeep(2, 150, 80);  // buzzer sebelum monitoring dimulai

  #ifdef USE_LCD
    lcdStatus("Monitoring", "Mulai...");
  #endif

  Serial.printf("[Setup] Free heap: %u bytes\n", ESP.getFreeHeap());
  Serial.println(F("[Setup] Selesai! Mulai monitoring..."));
  Serial.flush();  // pastikan output tercetak sebelum loop

  // ── Start FreeRTOS Task on Core 0 ────────────────────────────
  dataMutex = xSemaphoreCreateMutex();
  if (dataMutex != NULL) {
    xTaskCreatePinnedToCore(
      firebaseTaskCore0,   // Task function
      "FirebaseTask",      // Name
      32768,               // Stack size (32KB)
      NULL,                // Parameter
      1,                   // Priority
      &TaskFirebase,       // Task handle
      0                    // Core 0
    );
    Serial.println("[Setup] FreeRTOS FirebaseTask berjalan di Core 0.");
  } else {
    Serial.println("[Setup] [ERROR] Gagal membuat dataMutex!");
  }

  // ── Stagger timer awal agar Firebase ops tidak semua trigger sekaligus ──
  // Task dimulai setelah delay 5 detik (lihat vTaskDelay di firebaseTaskCore0).
  // Kita atur timer agar send/relay/bootstrap terdistribusi:
  unsigned long nowMs = millis();
  lastSendMs           = nowMs;                          // kirim pertama setelah sendIntervalMs
  lastRelayCheckMs     = nowMs;                          // relay check setelah 2.5 s
  lastBootstrapCheckMs = nowMs;                          // bootstrap setelah 5 s
  // lastSettingsSyncMs sudah diset saat readAllSettings di atas

  delay(500);      // stabilisasi sebelum loop pertama
  yield();
}

// ═══════════════════════════════════════════════════════════════
// FREERTOS TASK (CORE 0) - Network Operations
// ═══════════════════════════════════════════════════════════════

void firebaseTaskCore0(void *pvParameters) {
  // Tunggu 5 detik sebelum mulai operasi Firebase:
  // 1) Memberi waktu Firebase internal SSL context selesai inisialisasi
  // 2) Mencegah race dengan setup() yang baru saja selesai readAllSettings
  vTaskDelay(pdMS_TO_TICKS(5000));
  Serial.println("[Firebase Task] Siap, mulai operasi...");

  for (;;) {
    unsigned long now = millis();

    // Pastikan WiFi terhubung sebelum melakukan operasi network
    if (WiFi.status() == WL_CONNECTED) {

      // 1. Check Remote Bootstrap
      if (isFirebaseReady() && (now - lastBootstrapCheckMs >= REMOTE_BOOTSTRAP_POLL_MS)) {
        lastBootstrapCheckMs = now;
        confirmPendingBootstrapIfNeeded();
        RemoteBootstrapRequest bootstrapCmd;
        if (readRemoteBootstrapRequest(bootstrapCmd)) {
          applyRemoteBootstrapRequest(bootstrapCmd);
        }
      }

      // Read state with Mutex
      DeviceState localState;
      RuntimeSettings localRt;
      if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        localState = state;
        localRt = rt;
        xSemaphoreGive(dataMutex);
      } else {
        vTaskDelay(pdMS_TO_TICKS(10));
        continue;
      }

      // 2. Stream Data to /listrik
      if (now - lastSendMs >= localRt.sendIntervalMs) {
        lastSendMs = now;
        if (localRt.realtimeStreamEnabled) {
          bool monitorOk = writeMonitorData(localState.arus, localState.tegangan, localState.dayaW,
                                            localState.apparentPowerVa, localState.energiKwh,
                                            localState.frekuensi, localState.powerFactor,
                                            localState.status, localState.relay, localState.sensorSource);
          Serial.printf("[Monitor] src=%s I=%.2fA V=%.1fV P=%.1fW S=%.1fVA PF=%.2f f=%.1fHz status=%s relay=%d\n",
                        localState.sensorSource.c_str(), localState.arus, localState.tegangan,
                        localState.dayaW, localState.apparentPowerVa, localState.powerFactor,
                        localState.frekuensi, localState.status.c_str(), localState.relay);
        }
      }

      // 3. Process Pending Logs
      PendingLog logToSend;
      if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
        if (pendingLog.active) {
          logToSend = pendingLog;
          pendingLog.active = false;
        }
        xSemaphoreGive(dataMutex);
      }
      if (logToSend.active) {
        writeLog(logToSend.arus, logToSend.tegangan, logToSend.status, logToSend.relay, logToSend.cause.c_str(),
                 logToSend.dayaW, logToSend.apparentPowerVa, logToSend.energiKwh,
                 logToSend.frekuensi, logToSend.powerFactor, logToSend.sensorSource);
      }

      // 4. Process Pending Alerts
      PendingAlert alertToSend;
      if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
        if (pendingAlert.active) {
          alertToSend = pendingAlert;
          pendingAlert.active = false;
        }
        xSemaphoreGive(dataMutex);
      }
      if (alertToSend.active && localRt.telegramNotifyEnabled) {
        sendAlertIfNeeded(
          alertToSend.newStatus, alertToSend.lastStatus,
          alertToSend.arus, alertToSend.tegangan, alertToSend.relay,
          localRt.telegramBotToken, localRt.telegramChatId,
          localRt.telegramCooldownMs
        );
      }

      // 5. Read Web Relay Command
      if (now - lastRelayCheckMs >= RELAY_COMMAND_POLL_MS) {
        lastRelayCheckMs = now;
        int cmdRelay = localState.relay;
        if (readRelayCommand(cmdRelay) && cmdRelay != localState.relay) {
          Serial.printf("[Relay] Command dari web: %s\n", cmdRelay ? "ON" : "OFF");

          if (cmdRelay == 1 && localRt.autoCutoffEnabled && localState.status == "DANGER") {
            Serial.println("[Relay] Ditolak: kondisi masih berbahaya.");
            updateRelayState(0);
          } else {
            // Kita butuh setRelay fisik (ini i2c / pcf8574). Lakukan via state command
            bool relayApplied = false;
            if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
              setRelay(cmdRelay); // setRelay menggunakan PCF8574, pastikan PCF thread-safe atau diakses di sini OK.
              state.relay = cmdRelay;
              relayApplied = true;

              pendingLog.active = true;
              pendingLog.arus = state.arus;
              pendingLog.tegangan = state.tegangan;
              pendingLog.status = state.status;
              pendingLog.relay = cmdRelay;
              pendingLog.cause = "web_command";
              pendingLog.dayaW = state.dayaW;
              pendingLog.apparentPowerVa = state.apparentPowerVa;
              pendingLog.energiKwh = state.energiKwh;
              pendingLog.frekuensi = state.frekuensi;
              pendingLog.powerFactor = state.powerFactor;
              pendingLog.sensorSource = state.sensorSource;

              xSemaphoreGive(dataMutex);
            }
            if (relayApplied) {
              updateRelayState(cmdRelay);
              buzzerBeep(1, 80, 0); // buzzerBeep blokir, tapi di core 0 tidak masalah.
            }
          }
        }
      }

      // 6. Sync Runtime Settings
      if (now - lastSettingsSyncMs >= localRt.settingsSyncMs) {
        lastSettingsSyncMs = now;
        RuntimeSettings newRt;
        if (readAllSettings(newRt)) {
          if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
            rt = newRt;
            xSemaphoreGive(dataMutex);
          }
        }
      }
    }

    // Yield ke watchdog/task lain
    vTaskDelay(pdMS_TO_TICKS(50));
  }
}

// ═══════════════════════════════════════════════════════════════
// LOOP (CORE 1) - Sensor Reading & Local Logic
// ═══════════════════════════════════════════════════════════════

void loop() {
  unsigned long now = millis();

  // Heap safety — restart jika memori kritis untuk mencegah crash
  uint32_t freeHeap = ESP.getFreeHeap();
  if (freeHeap < 8192) {
    Serial.printf("[WARN] Heap kritis: %u bytes — restart preventif\n", freeHeap);
    Serial.flush();
    delay(500);
    ESP.restart();
  }

  bool trace = firstLoopTrace;
  if (trace) {
    Serial.printf("[Loop] ═══ LOOP PERTAMA (heap: %u) ═══\n", freeHeap);
    Serial.flush();
  }

  // ── Ambil salinan RuntimeSettings dan state yang aman dengan Mutex ──
  RuntimeSettings localRt;
  int currentRelay;
  if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
    localRt = rt;
    currentRelay = state.relay;
    xSemaphoreGive(dataMutex);
  } else {
    // Fallback jika lock gagal
    localRt = rt;
    currentRelay = state.relay;
  }

  // ── WiFi watchdog ────────────────────────────────────────────
  if (trace) { Serial.println("[Loop] 1. Cek WiFi..."); Serial.flush(); }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Terputus — reconnecting...");
    WiFi.reconnect();
    delay(3000);
    return;
  }
  if (trace) { Serial.println("[Loop] 1. WiFi OK"); Serial.flush(); }

  // ── Read metering data from PZEM-004T ───────────────────────
  if (trace) { Serial.println("[Loop] 2. Baca PZEM..."); Serial.flush(); }
  ElectricalReading reading = readElectrical(localRt, g_energiKwh);
  if (trace) { Serial.println("[Loop] 2. PZEM OK"); Serial.flush(); }

  // ── Energy handling ──────────────────────────────────────────
  if (reading.energyFromMeter) {
    g_energiKwh = reading.energiKwh;
    g_lastEnergyMs = now;
  } else {
    unsigned long prev = g_lastEnergyMs;
    if (prev == 0) prev = now;
    if (now >= prev) {
      float dt_h = (now - prev) / 3600000.0f;
      if (dt_h > 0.0f && dt_h < 1.0f) {
        float pKw = reading.dayaW / 1000.0f;
        if (pKw > 0.0f) g_energiKwh += pKw * dt_h;
      }
    }
    g_lastEnergyMs = now;
  }
  if (now - g_lastKwhSaveMs >= 60000UL) {
    g_lastKwhSaveMs = now;
    saveEnergyKwhToNvs();
  }

  // ── Auto Learning ───────────────────────────────────────────
  if (trace) { Serial.println("[Loop] 3. Auto learning..."); Serial.flush(); }
  handleAutoLearning(now);
  if (trace) { Serial.println("[Loop] 3. Auto learning OK"); Serial.flush(); }

  // ── Determine status using RUNTIME threshold ─────────────────
  if (trace) { Serial.println("[Loop] 4. Determine status..."); Serial.flush(); }
  String newStatus = determineStatus(reading.arus, localRt.thresholdArus,
                                      localRt.warningPercent);
  if (trace) { Serial.printf("[Loop] 4. Status OK: %s\n", newStatus.c_str()); Serial.flush(); }
  bool statusChanged = (newStatus != lastStatus);

  // ── Auto-cutoff (uses localRt.autoCutoffEnabled) ───────────────
  if (localRt.autoCutoffEnabled && newStatus == "DANGER" && currentRelay == 1) {
    Serial.println("[Auto-Cutoff] Kondisi berbahaya! Relay OFF.");

    if (xSemaphoreTake(dataMutex, portMAX_DELAY) == pdTRUE) {
      setRelay(0); // This also updates state.relay inside
      currentRelay = 0;
      updateRelayState(0);

      pendingLog.active = true;
      pendingLog.arus = reading.arus;
      pendingLog.tegangan = reading.tegangan;
      pendingLog.status = newStatus;
      pendingLog.relay = 0;
      pendingLog.cause = "auto_cutoff";
      pendingLog.dayaW = reading.dayaW;
      pendingLog.apparentPowerVa = reading.apparentPowerVa;
      pendingLog.energiKwh = g_energiKwh;
      pendingLog.frekuensi = reading.frekuensi;
      pendingLog.powerFactor = reading.powerFactor;
      pendingLog.sensorSource = reading.sensorSource;

      xSemaphoreGive(dataMutex);
    }
    buzzerLong();
  }

  // ── Update Global State dengan Mutex ───────────────────────────
  if (xSemaphoreTake(dataMutex, portMAX_DELAY) == pdTRUE) {
    state.arus            = reading.arus;
    state.tegangan        = reading.tegangan;
    state.dayaW           = reading.dayaW;
    state.apparentPowerVa = reading.apparentPowerVa;
    state.energiKwh       = g_energiKwh;
    state.frekuensi       = reading.frekuensi;
    state.powerFactor     = reading.powerFactor;
    state.sensorSource    = reading.sensorSource;
    state.status          = newStatus;
    // state.relay already accurate from previous operations
    xSemaphoreGive(dataMutex);
  }

  // ── Buzzer feedback ───────────────────────────────────────────
  // Hanya berbunyi jika status MEMBURUK (eskalasi severity), bukan saat
  // kembali ke kondisi lebih baik. Cooldown 60 detik mencegah buzzing
  // berulang akibat PZEM berfluktuasi di sekitar batas threshold.
  if (statusChanged) {
    int newSev  = (newStatus  == "DANGER") ? 2 : (newStatus  == "WARNING") ? 1 : 0;
    int prevSev = (lastStatus == "DANGER") ? 2 : (lastStatus == "WARNING") ? 1 : 0;
    static unsigned long lastBuzzerMs = 0;
    const  unsigned long BUZZER_COOLDOWN_MS = 60000UL;  // 60 s antara bunyi

    bool isEscalation = (newSev > prevSev);
    bool cooldownOk   = (now - lastBuzzerMs >= BUZZER_COOLDOWN_MS);

    if (isEscalation && cooldownOk) {
      if (newStatus == "WARNING") buzzerBeep(2, 100, 100);
      if (newStatus == "DANGER")  buzzerBeep(5, 200, 100);
      lastBuzzerMs = now;
    }
  }

  // ── Update LCD ─────────────────────────────────────────────────
  #ifdef USE_LCD
    static unsigned long lastLcdUpdateMs = 0;
    if (now - lastLcdUpdateMs >= localRt.sendIntervalMs) {
      lastLcdUpdateMs = now;
      if (trace) { Serial.println("[Loop] 5. Update LCD..."); Serial.flush(); }
      updateLCD();
      if (trace) { Serial.println("[Loop] 5. LCD OK"); Serial.flush(); }
    }
  #endif

  // ── Log on status change ──────────────────────────────────────
  if (statusChanged && (now - lastLogMs > 2000)) {
    lastLogMs = now;
    if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
      pendingLog.active = true;
      pendingLog.arus = reading.arus;
      pendingLog.tegangan = reading.tegangan;
      pendingLog.status = newStatus;
      pendingLog.relay = currentRelay;
      pendingLog.cause = "esp32";
      pendingLog.dayaW = reading.dayaW;
      pendingLog.apparentPowerVa = reading.apparentPowerVa;
      pendingLog.energiKwh = g_energiKwh;
      pendingLog.frekuensi = reading.frekuensi;
      pendingLog.powerFactor = reading.powerFactor;
      pendingLog.sensorSource = reading.sensorSource;
      xSemaphoreGive(dataMutex);
    }
  }

  // ── Periodic log (every 5 minutes regardless of status change) ──
  if (now - lastPeriodicLogMs >= PERIODIC_LOG_INTERVAL_MS) {
    lastPeriodicLogMs = now;
    if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
      if (!pendingLog.active) {  // Jangan timpa event log yang belum terkirim
        pendingLog.active       = true;
        pendingLog.arus         = reading.arus;
        pendingLog.tegangan     = reading.tegangan;
        pendingLog.status       = newStatus;
        pendingLog.relay        = currentRelay;
        pendingLog.cause        = "periodic";
        pendingLog.dayaW        = reading.dayaW;
        pendingLog.apparentPowerVa = reading.apparentPowerVa;
        pendingLog.energiKwh    = g_energiKwh;
        pendingLog.frekuensi    = reading.frekuensi;
        pendingLog.powerFactor  = reading.powerFactor;
        pendingLog.sensorSource = reading.sensorSource;
      }
      xSemaphoreGive(dataMutex);
    }
  }

  // ── Telegram alert ─────────────────────────────
  if (localRt.telegramNotifyEnabled && statusChanged) {
    if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
      pendingAlert.active = true;
      pendingAlert.newStatus = newStatus;
      pendingAlert.lastStatus = lastStatus;
      pendingAlert.arus = reading.arus;
      pendingAlert.tegangan = reading.tegangan;
      pendingAlert.relay = currentRelay;
      xSemaphoreGive(dataMutex);
    }
  }

  lastStatus = newStatus;
  if (trace) {
    Serial.printf("[Loop] ═══ LOOP PERTAMA SELESAI (heap: %u) ═══\n", ESP.getFreeHeap());
    Serial.flush();
    firstLoopTrace = false;
  }
  delay(10);  // small yield to keep watchdog happy
}

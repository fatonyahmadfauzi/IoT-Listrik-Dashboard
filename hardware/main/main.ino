/**
 * main.ino — IoT Alat Deteksi Kebocoran Arus Listrik (ESP32)
 * ═══════════════════════════════════════════════════════════════
 * Project: ALAT DETEKSI KEBOCORAN ARUS LISTRIK BERBASIS IoT
 *          DENGAN NOTIFIKASI REAL-TIME
 *
 * Configuration Architecture (see config.h for full details):
 * ┌──────────────────────────────────────────────────────────┐
 * │ LAYER 1 — Bootstrap (NVS + WiFiManager + admin push)     │
 * │   WiFi SSID/password, Firebase API key, DB URL,          │
 * │   IoT device email/password                              │
 * │   → Changed via captive portal atau admin bootstrap      │
 * ├──────────────────────────────────────────────────────────┤
 * │ LAYER 2 — Runtime (Firebase /settings, admin web page)   │
 * │   Threshold, buzzer, auto-cutoff, Telegram token/chatId, │
 * │   calibration factors, send interval, stream pause       │
 * │   → Changed from web Settings page (no reflashing)       │
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
#include "../discord_handler.h"

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
  bool   meterValid      = false;     // true setelah PZEM memberi pembacaan valid
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
unsigned long lastLogRetryMs       = 0;
unsigned long lastRealtimeNotifyMs = 0;

// Log audit setiap menit agar tabel/analytics tetap terisi tanpa membanjiri RTDB.
static const unsigned long PERIODIC_LOG_INTERVAL_MS = 60000UL;   // 1 menit
static const unsigned long LOG_RETRY_INTERVAL_MS    = 10000UL;   // 10 detik
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
  unsigned long uptimeSeconds = 0;
};

// ── Ring buffer log (Core 1 produce, Core 0 consume) ─────────────────────────
// Menggantikan single-slot pendingLog. 4 slot cukup untuk menampung burst event
// (status-change + auto-cutoff + periodic + initial_snapshot) tanpa saling timpa.
// Akses selalu dilindungi dataMutex.
static const uint8_t LOG_BUF_SIZE = 4;
struct LogRingBuf {
  PendingLog slots[LOG_BUF_SIZE];
  uint8_t head = 0;   // index slot berikutnya untuk push
  uint8_t count = 0;  // jumlah slot terisi

  // Tambahkan entri ke buffer. Jika penuh, timpa slot terlama (head - count)
  // agar event terkini tidak terbuang. Return true jika tidak ada yang dibuang.
  bool push(const PendingLog& entry) {
    bool dropped = false;
    if (count == LOG_BUF_SIZE) {
      // Buffer penuh — buang slot terlama (overwrite oldest)
      dropped = true;
      Serial.printf("[LogBuf] Buffer penuh! Slot lama (%s) dibuang untuk beri tempat event baru (%s)\n",
                    slots[head].cause.c_str(), entry.cause.c_str());
    } else {
      count++;
    }
    slots[head] = entry;
    slots[head].active = true;
    head = (head + 1) % LOG_BUF_SIZE;
    return !dropped;
  }

  // Ambil entri tertua (FIFO). Return false jika kosong.
  bool pop(PendingLog& out) {
    if (count == 0) return false;
    uint8_t tail = (head - count + LOG_BUF_SIZE) % LOG_BUF_SIZE;
    out = slots[tail];
    slots[tail].active = false;
    count--;
    return true;
  }

  bool empty() const { return count == 0; }
  uint8_t size() const { return count; }
} logBuf;

// retryLog: entri yang sudah di-pop tapi gagal terkirim.
// Dipisahkan dari logBuf agar retry tidak memblokir slot baru.
PendingLog retryLog;
bool initialHistoryQueued  = false;
bool initialHistoryWritten = false;

struct PendingAlert {
  bool active = false;
  String newStatus = "";
  String lastStatus = "";
  float arus = 0;
  float tegangan = 0;
  float dayaW = 0;
  float apparentPowerVa = 0;
  float energiKwh = 0;
  float frekuensi = 0;
  float powerFactor = 0;
  int relay = 0;
  String sensorSource = "";
} pendingAlert;

// Flag untuk auto-cutoff relay sync: Core 1 set flag, Core 0 kirim ke Firebase
struct PendingRelaySync {
  bool active = false;
  int relayVal = -1;
} pendingRelaySync;

// Flag Discord relay notification: di-set oleh Core 0/1, diproses di Core 0 Firebase task
struct PendingRelayNotif {
  bool active = false;
  int  relayVal = -1;       // 0=OFF, 1=ON
  String cause = "";        // "web_command" atau "auto_cutoff"
  float arus = 0;
  float tegangan = 0;
  float dayaW = 0;
  float apparentPowerVa = 0;
  float energiKwh = 0;
  float frekuensi = 0;
  float powerFactor = 0;
  String status = "";
  String sensorSource = "";
} pendingRelayNotif;

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

void saveRelayStateToNvs(int r) {
  prefs.begin(NVS_NAMESPACE, false);
  prefs.putInt("last_relay", r);
  prefs.end();
}

int loadRelayStateFromNvs() {
  prefs.begin(NVS_NAMESPACE, true);
  int r = prefs.getInt("last_relay", 1); // Default ON
  prefs.end();
  return r;
}

// ─── Relay Locked-OFF flag ──────────────────────────────────────
// Ketika flag ini true, relay TIDAK BOLEH nyala secara otomatis.
// Hanya perintah ON dari web (sendRelayCommand) yang bisa clear flag ini.
// Flag persisten di NVS agar bertahan saat device restart.
void saveRelayLockedOff(bool locked) {
  prefs.begin(NVS_NAMESPACE, false);
  prefs.putBool("relay_lock", locked);
  prefs.end();
  Serial.printf("[Relay] Lock flag → %s\n", locked ? "LOCKED (OFF)" : "UNLOCKED");
}

bool loadRelayLockedOff() {
  prefs.begin(NVS_NAMESPACE, true);
  bool locked = prefs.getBool("relay_lock", false);
  prefs.end();
  return locked;
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



// CATATAN: isMissingFirebasePathError, bootstrapChildPath,
//           readBootstrapBoolChild, readBootstrapStringChild
//           sudah dipindah ke firebase_handler.h — dihapus dari sini untuk menghindari redefinition error.


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

  // Callback: tampilkan info AP di LCD saat portal aktif
  wm.setAPCallback([](WiFiManager* wm) {
    Serial.println(F("[WiFi] ╔══════════════════════════════════╗"));
    Serial.println(F("[WiFi] ║      CAPTIVE PORTAL AKTIF        ║"));
    Serial.println(F("[WiFi] ╠══════════════════════════════════╣"));
    Serial.printf( "[WiFi] ║  AP  : %-26s║\n", AP_SSID);
    Serial.printf( "[WiFi] ║  Pass: %-26s║\n", AP_PASSWORD);
    Serial.println(F("[WiFi] ║  IP  : 192.168.4.1               ║"));
    Serial.println(F("[WiFi] ╚══════════════════════════════════╝"));
    #ifdef USE_LCD
      // Reset LCD untuk menghindari glitch/garbled text akibat lonjakan tegangan (EMI) saat WiFi AP menyala
      lcd.init();
      // Baris 0: Nama AP (potong jika > 16 char)
      char lcdAP[17];
      snprintf(lcdAP, sizeof(lcdAP), "%-16s", AP_SSID);
      lcdPrintLine(0, String(lcdAP));
      // Baris 1: Petunjuk IP portal
      lcdPrintLine(1, "192.168.4.1     ");
    #endif
  });

  Serial.println("[WiFi] Menghubungkan...");
  bool connected = wm.autoConnect(AP_SSID, AP_PASSWORD);

  // Free heap
  delete param_fb_api; delete param_fb_url;
  delete param_iot_email; delete param_iot_pass;

  if (!connected) {
    Serial.println("[WiFi] Gagal terhubung atau portal timeout → restart");
    #ifdef USE_LCD
      lcdStatus("Portal timeout", "Restarting...");
      delay(1500);
    #endif
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
  DeviceState learningState;
  if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(10)) != pdTRUE) return;
  learningState = state;
  xSemaphoreGive(dataMutex);
  if (!learningState.meterValid) return;

  autoLearning.lastSampleMs = now;
  float currentA = learningState.arus;
  float powerW = learningState.dayaW;
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

  // Auto-detect address. Beberapa backpack LCD memakai 0x26, bukan hanya
  // 0x27/0x3F, sehingga alamat itu harus dipilih sebelum lcd.init().
  byte detectedAddr = 0;
  const byte lcdCandidates[] = {
    LCD_ADDR_PRIMARY, LCD_ADDR_SECONDARY, LCD_ADDR_TERTIARY
  };
  for (byte candidate : lcdCandidates) {
    Wire.beginTransmission(candidate);
    if (Wire.endTransmission() == 0) {
      detectedAddr = candidate;
      break;
    }
  }

  // Fallback untuk backpack compatible yang memakai alamat lain di rentang
  // PCF8574. PZEM memakai UART, jadi tidak berbenturan dengan sensor meter.
  if (detectedAddr == 0) {
    for (byte addr = 0x20; addr <= 0x3F; addr++) {
      Wire.beginTransmission(addr);
      if (Wire.endTransmission() == 0) {
        detectedAddr = addr;
        break;
      }
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
  static bool wasMeterValid = true;
  if (state.meterValid != wasMeterValid) {
    lcd.init(); // Re-init LCD to fix out-of-sync HD44780 controller caused by EMI/noise
    wasMeterValid = state.meterValid;
  }

  if (!state.meterValid) {
    lcdPrintLine(0, "SENSOR ERROR!");
    lcdPrintLine(1, state.relay ? "Relay: ON" : "Relay: OFF");
    return;
  }
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
  // Cek relay locked-off flag — jika pernah dimatikan (oleh user atau auto-cutoff)
  // relay WAJIB tetap OFF sampai user klik btn ON secara eksplisit.
  bool lockedOff = loadRelayLockedOff();
  if (lockedOff) {
    state.relay = 0;
    setRelay(0);
    saveRelayStateToNvs(0);
    Serial.println("[Relay] NVS lock aktif — relay tetap OFF (tunggu perintah ON dari web).");
  } else {
    state.relay = loadRelayStateFromNvs();
    setRelay(state.relay); // Restore last relay state
  }

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

  // ── Boot notifications (HTTP only, no Firebase) ─────────────
  // Telegram dan Discord dikirim SEKARANG pakai HTTP langsung (aman di Core 1).
  // Firebase init dipindah ke Core 0 (firebaseTaskCore0) untuk menghindari
  // BearSSL cross-core crash (SSL context TIDAK thread-safe lintas core).
  buzzerBeep(2, 150, 80);

  #ifdef USE_LCD
    lcdStatus("Monitoring", "Mulai...");
  #endif

  Serial.printf("[Setup] Free heap: %u bytes\n", ESP.getFreeHeap());
  Serial.println(F("[Setup] Selesai! Firebase init akan dilakukan di Core 0 Task."));
  Serial.flush();

  // ── Buat mutex SEBELUM task dibuat ───────────────────────────
  dataMutex = xSemaphoreCreateMutex();
  if (dataMutex == NULL) {
    Serial.println("[Setup] [FATAL] Gagal membuat dataMutex — restart!");
    delay(1000);
    ESP.restart();
    return;
  }
  Serial.println("[Setup] dataMutex berhasil dibuat.");

  // ── Inisialisasi timer awal ───────────────────────────────────
  unsigned long nowMs = millis();
  lastSendMs           = nowMs;
  lastRelayCheckMs     = nowMs;
  lastBootstrapCheckMs = nowMs;
  lastSettingsSyncMs   = nowMs;

  delay(200);

  // ── Buat Firebase Task di Core 0 ─────────────────────────────
  // SEMUA operasi Firebase (initFirebase, auth, RTDB read/write) dilakukan
  // di dalam task ini sehingga BearSSL/SSL context hanya berjalan di Core 0.
  xTaskCreatePinnedToCore(
    firebaseTaskCore0,
    "FirebaseTask",
    49152,      // FIX: naikkan dari 32768 ke 49152 — Firebase+SSL+JSON+HTTP butuh stack lebih besar
    NULL,
    1,
    &TaskFirebase,
    0   // Core 0
  );
  Serial.println("[Setup] FreeRTOS FirebaseTask berjalan di Core 0.");

  delay(300);
  yield();
}

// ═══════════════════════════════════════════════════════════════
// FREERTOS TASK (CORE 0) - Network Operations
// ═══════════════════════════════════════════════════════════════

void firebaseTaskCore0(void *pvParameters) {
  // ── Guard mutex ───────────────────────────────────────────────
  if (dataMutex == NULL) {
    Serial.println("[Firebase Task] [FATAL] dataMutex NULL — task berhenti!");
    vTaskDelete(NULL);
    return;
  }

  // ── Tunggu loop() pertama selesai (5 detik) ───────────────────
  // Naikkan dari 3→5 detik: pastikan loop() pertama, PZEM init,
  // dan state global sudah stabil sebelum Firebase mulai polling.
  vTaskDelay(pdMS_TO_TICKS(5000));

  // ── FIREBASE INIT di Core 0 (WAJIB: BearSSL tidak cross-core safe) ──
  // Semua SSL context dibuat dan digunakan di Core 0 saja.
  Serial.println("[Firebase Task] Inisialisasi Firebase di Core 0...");
  initFirebase(
    bootstrap.firebaseApiKey,
    bootstrap.firebaseDbUrl,
    bootstrap.iotEmail,
    bootstrap.iotPassword
  );

  // ── Tunggu auth token (max 20 detik) ─────────────────────────
  Serial.print("[Firebase Task] Menunggu auth token");
  for (int i = 0; i < 20 && !isFirebaseReady(); i++) {
    Serial.print('.');
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
  Serial.println(isFirebaseReady() ? " OK" : " TIMEOUT (lanjut)");

  // ── Load runtime settings dari Firebase ──────────────────────
  // CRITICAL FIX: readAllSettings DIHAPUS dari fase init!
  //
  // Root cause crash StoreProhibited:
  //   1. readAllSettings() membuat SSL connection ke Firebase → gagal dengan
  //      "Incoming record too large" → BearSSL engine error state
  //   2. BearSSL error state menyebabkan heap fragmentation (~60KB MaxBlock terpakai)
  //   3. writeMonitorData() berikutnya tidak bisa alokasi SSL context (heap terfragmentasi)
  //   4. br_ssl_engine_t* = NULL → write ke 0x00000000 → StoreProhibited crash
  //
  // Solusi: Biarkan writeMonitorData() membuat SSL connection PERTAMA dengan
  //         heap yang bersih. Settings akan disync oleh periodic sync (settingsSyncMs)
  //         setelah koneksi SSL sudah stabil.
  //
  if (isFirebaseReady()) {
    confirmPendingBootstrapIfNeeded();
    // Boot notifications menggunakan DEFAULT settings (rt struct defaults dari config.h)
    // Telegram/Discord token akan kosong sampai settings sync pertama berjalan → tidak kirim
    // Ini acceptable: notifikasi boot akan terkirim setelah settings sync pertama.
    Serial.println("[Firebase Task] Settings sync ditunda ke periodic loop (avoid SSL fragmentation).");
  }

  Serial.println("[Firebase Task] Siap, mulai monitoring loop...");

  // FIX: reset semua timer — settings sync terpicu lebih cepat (5 detik) di iterasi pertama
  // setelah writeMonitorData berhasil establish SSL connection yang stabil.
  {
    unsigned long nowReset = millis();
    lastSendMs           = nowReset;
    lastRelayCheckMs     = nowReset;
    lastBootstrapCheckMs = nowReset;
    // FIX: Jadwalkan settings sync 8 detik setelah loop start
    // (setelah 2-3x writeMonitorData berhasil dan SSL connection stabil)
    lastSettingsSyncMs   = nowReset - 992000UL; // Akan trigger di ~8 detik (settingsSyncMs default=10s, 10000-8000=2000 → terlalu rumit)
    // Cara lebih simple: set ke (now - (settingsSyncMs - 8000)) agar trigger 8s setelah loop start
    // Pakai flag saja:
    lastSettingsSyncMs   = nowReset; // akan sync setelah settingsSyncMs (default 10s)
  }


  // Heap monitoring: catat heap setiap 30 detik untuk mendeteksi memory leak
  static unsigned long lastHeapLogMs = 0;

  for (;;) {
    unsigned long now = millis();
    bool realtimeNotifyDue = false;

    // Log heap setiap 30 detik
    if (now - lastHeapLogMs >= 30000) {
      lastHeapLogMs = now;
      Serial.printf("[Heap] Free: %u  MinFree: %u  MaxBlock: %u\n",
                    ESP.getFreeHeap(),
                    ESP.getMinFreeHeap(),
                    ESP.getMaxAllocHeap());
    }

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
       if (xSemaphoreTake(dataMutex, portMAX_DELAY) == pdTRUE) {
         localState = state;
         localRt = rt;
         xSemaphoreGive(dataMutex);
       }

       // Semua request Firebase, termasuk status/hasil Auto Learning, wajib
       // dijalankan pada Core 0. Ini mencegah koneksi RTDB bersama berbenturan
       // dengan polling relay, realtime, dan penulisan log.
       handleAutoLearning(now);

       // 2. Process pending relay sync from Core 1 (auto-cutoff)
      //    Core 1 tidak boleh panggil Firebase langsung (fbData race condition).
      //    Flag ini di-set oleh auto-cutoff, di-handle di sini (Core 0) yang aman.
      {
        int syncVal = -1;
        if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
          if (pendingRelaySync.active) {
            syncVal = pendingRelaySync.relayVal;
            pendingRelaySync.active = false;
          }
          // Re-capture localState setelah auto-cutoff mungkin mengubah state.relay
          localState = state;
          xSemaphoreGive(dataMutex);
        }
        if (syncVal >= 0) {
          updateRelayState(syncVal);
          Serial.printf("[Firebase] Auto-cutoff relay sync: %d ✓\n", syncVal);
        }
      }

      // 3. Read Web Relay Command (BEFORE streaming, so writeMonitorData uses latest relay state)
      if (now - lastRelayCheckMs >= RELAY_COMMAND_POLL_MS) {
        lastRelayCheckMs = now;
        int cmdRelay = -1;  // -1 = no command found
        bool hasCommand = readRelayCommand(cmdRelay);

        if (hasCommand) {
          // ALWAYS clear the command from Firebase so it's not re-processed next cycle
          clearRelayCommand();

          Serial.printf("[Relay] Command dari web: %s (state saat ini: %s)\n",
                        cmdRelay ? "ON" : "OFF", localState.relay ? "ON" : "OFF");

          if (cmdRelay == 0) {
            // ── Perintah OFF ─────────────────────────────────────────
            // Set lock flag: relay tidak boleh nyala otomatis sampai user klik ON lagi.
            saveRelayLockedOff(true);

            bool relayApplied = false;
            if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
              saveRelayStateToNvs(0);
              setRelay(0);
              state.relay = 0;
              relayApplied = true;

              if (state.meterValid) {
                PendingLog entry;
                entry.active = true;
                entry.arus = state.arus;
                entry.tegangan = state.tegangan;
                entry.status = state.status;
                entry.relay = 0;
                entry.cause = "web_command";
                entry.dayaW = state.dayaW;
                entry.apparentPowerVa = state.apparentPowerVa;
                entry.energiKwh = state.energiKwh;
                entry.frekuensi = state.frekuensi;
                entry.powerFactor = state.powerFactor;
                entry.sensorSource = state.sensorSource;
                entry.uptimeSeconds = millis() / 1000UL;
                logBuf.push(entry);
              }
              localState = state;
              xSemaphoreGive(dataMutex);
            }
            if (relayApplied) {
              updateRelayState(0);
              buzzerBeep(1, 80, 0);
              // Queue Discord/Telegram relay notification (protected by mutex)
              if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
                pendingRelayNotif.active   = true;
                pendingRelayNotif.relayVal  = 0;
                pendingRelayNotif.cause     = "web_command";
                pendingRelayNotif.arus      = localState.arus;
                pendingRelayNotif.tegangan  = localState.tegangan;
                pendingRelayNotif.dayaW = localState.dayaW;
                pendingRelayNotif.apparentPowerVa = localState.apparentPowerVa;
                pendingRelayNotif.energiKwh = localState.energiKwh;
                pendingRelayNotif.frekuensi = localState.frekuensi;
                pendingRelayNotif.powerFactor = localState.powerFactor;
                pendingRelayNotif.status    = localState.status;
                pendingRelayNotif.sensorSource = localState.sensorSource;
                xSemaphoreGive(dataMutex);
              }
            }

          } else if (cmdRelay == 1) {
            // ── Perintah ON ──────────────────────────────────────────
            // Tolak jika kondisi masih WARNING atau DANGER.
            bool conditionUnsafe = (localState.status == "DANGER" || localState.status == "WARNING");
            if (localRt.autoCutoffEnabled && conditionUnsafe) {
              Serial.printf("[Relay] ON ditolak: kondisi %s masih tidak aman.\n",
                            localState.status.c_str());
              updateRelayState(0);
            } else {
              // Kondisi aman — clear lock dan nyalakan relay.
              saveRelayLockedOff(false);

              bool relayApplied = false;
              if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
                saveRelayStateToNvs(1);
                setRelay(1);
              state.relay = 1;
              relayApplied = true;

                if (state.meterValid) {
                  PendingLog entry;
                  entry.active = true;
                  entry.arus = state.arus;
                  entry.tegangan = state.tegangan;
                  entry.status = state.status;
                  entry.relay = 1;
                  entry.cause = "web_command";
                  entry.dayaW = state.dayaW;
                  entry.apparentPowerVa = state.apparentPowerVa;
                  entry.energiKwh = state.energiKwh;
                  entry.frekuensi = state.frekuensi;
                  entry.powerFactor = state.powerFactor;
                  entry.sensorSource = state.sensorSource;
                  entry.uptimeSeconds = millis() / 1000UL;
                  logBuf.push(entry);
                }
                localState = state;
                xSemaphoreGive(dataMutex);
              }
              if (relayApplied) {
                updateRelayState(1);
                buzzerBeep(1, 80, 0);
                // Queue Discord/Telegram relay notification (protected by mutex)
                if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
                  pendingRelayNotif.active   = true;
                  pendingRelayNotif.relayVal  = 1;
                  pendingRelayNotif.cause     = "web_command";
                  pendingRelayNotif.arus      = localState.arus;
                  pendingRelayNotif.tegangan  = localState.tegangan;
                  pendingRelayNotif.dayaW = localState.dayaW;
                  pendingRelayNotif.apparentPowerVa = localState.apparentPowerVa;
                  pendingRelayNotif.energiKwh = localState.energiKwh;
                  pendingRelayNotif.frekuensi = localState.frekuensi;
                  pendingRelayNotif.powerFactor = localState.powerFactor;
                  pendingRelayNotif.status    = localState.status;
                  pendingRelayNotif.sensorSource = localState.sensorSource;
                  xSemaphoreGive(dataMutex);
                }
              }
            }
          }
        }
      }

      // 4. Stream Data to /listrik (uses latest relay state from step 2/3)
      // FIX: Enforce minimum 5000ms between writeMonitorData calls.
      //      SSL context cleanup membutuhkan waktu sebelum new SSL handshake.
      //      sendIntervalMs dari Firebase bisa < 5000 → MaxBlock drop → crash.
      unsigned long effectiveSendInterval = max((unsigned long)5000, localRt.sendIntervalMs);
      if (now - lastSendMs >= effectiveSendInterval) {
        lastSendMs = now;
        if (localRt.realtimeStreamEnabled) {
          // Selalu update dashboard, termasuk saat SENSOR_ERROR agar web & notifikasi tahu
          // bahwa sensor putus (angka akan 0 dan status = SENSOR_ERROR).
            bool monitorOk = writeMonitorData(localState.arus, localState.tegangan, localState.dayaW,
                                              localState.apparentPowerVa, localState.energiKwh,
                                              localState.frekuensi, localState.powerFactor,
                                              localState.status, localState.relay, localState.sensorSource);
            Serial.printf("[Monitor] src=%s I=%.2fA V=%.1fV P=%.1fW S=%.1fVA PF=%.2f f=%.1fHz status=%s relay=%d\n",
                          localState.sensorSource.c_str(), localState.arus, localState.tegangan,
                          localState.dayaW, localState.apparentPowerVa, localState.powerFactor,
                          localState.frekuensi, localState.status.c_str(), localState.relay);
            if (monitorOk) {
              if (localRt.realtimeNotifyEnabled &&
                  (lastRealtimeNotifyMs == 0 ||
                   now - lastRealtimeNotifyMs >= localRt.realtimeNotifyIntervalMs)) {
                realtimeNotifyDue = true;
              }

              // Buat satu snapshot histori segera setelah perangkat berhasil
              // mengirim realtime. Hindari log dummy saat PZEM masih boot atau
              // pembacaannya belum valid, agar histori sama dengan /listrik.
              if (!initialHistoryQueued && !initialHistoryWritten &&
                  xSemaphoreTake(dataMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
                PendingLog entry;
                entry.active          = true;
                entry.arus            = localState.arus;
                entry.tegangan        = localState.tegangan;
                entry.status          = localState.status;
                entry.relay           = localState.relay;
                entry.cause           = "initial_snapshot";
                entry.dayaW           = localState.dayaW;
                entry.apparentPowerVa = localState.apparentPowerVa;
                entry.energiKwh       = localState.energiKwh;
                entry.frekuensi       = localState.frekuensi;
                entry.powerFactor     = localState.powerFactor;
                entry.sensorSource    = localState.sensorSource;
                entry.uptimeSeconds   = millis() / 1000UL;
                logBuf.push(entry);
                initialHistoryQueued  = true;
                xSemaphoreGive(dataMutex);
              }

              // FIX: Yield 500ms setelah Firebase call agar BearSSL dapat cleanup
              // SSL context sebelum call berikutnya. Tanpa ini, heap MaxBlock bisa
              // habis karena SSL buffer belum dibebaskan oleh allocator.
              vTaskDelay(pdMS_TO_TICKS(500));
            }
        }

      }

      // 5. Process Pending Logs
      // ── Prioritas kirim: retryLog (gagal sebelumnya) DULU, lalu ambil dari ring buffer.
      // retryLog dan logBuf diproses terpisah: retry yang masih dalam cooldown tidak
      // memblokir slot baru dari ring buffer yang sudah siap dikirim.
      PendingLog logToSend;
      bool retryReady = retryLog.active &&
                        (lastLogRetryMs == 0 || now - lastLogRetryMs >= LOG_RETRY_INTERVAL_MS);
      if (retryReady) {
        // Kirim ulang entri yang gagal sebelumnya
        logToSend = retryLog;
        retryLog.active = false;
        Serial.printf("[LogBuf] Retry log: %s (uptime %lus)\n",
                      logToSend.cause.c_str(), logToSend.uptimeSeconds);
      } else if (!retryLog.active) {
        // Tidak ada retry pending — ambil dari ring buffer (FIFO)
        if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
          logBuf.pop(logToSend);
          if (!logBuf.empty()) {
            Serial.printf("[LogBuf] %u entri masih menunggu di buffer\n", logBuf.size());
          }
          xSemaphoreGive(dataMutex);
        }
      }
      // Jika retryLog masih dalam cooldown, cek apakah ring buffer sudah terlalu penuh
      // (>= 3 dari 4 slot) — kalau iya, kirim slot terlama sekarang untuk hindari overwrite.
      else {
        if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(5)) == pdTRUE) {
          bool bufPressure = (logBuf.size() >= LOG_BUF_SIZE - 1);
          if (bufPressure) {
            logBuf.pop(logToSend);
            Serial.printf("[LogBuf] Buffer tekanan tinggi (%u/%u) — kirim slot terlama (%s) tanpa tunggu retry cooldown\n",
                          logBuf.size() + 1, LOG_BUF_SIZE, logToSend.cause.c_str());
          }
          xSemaphoreGive(dataMutex);
        }
      }

      if (logToSend.active) {
        bool logWritten = writeLog(logToSend.arus, logToSend.tegangan, logToSend.status,
                                    logToSend.relay, logToSend.cause.c_str(),
                                    logToSend.dayaW, logToSend.apparentPowerVa, logToSend.energiKwh,
                                   logToSend.frekuensi, logToSend.powerFactor, logToSend.sensorSource,
                                   logToSend.uptimeSeconds);
        if (logWritten) {
          lastLogRetryMs = 0;
          Serial.printf("[LogBuf] Log terkirim: cause=%s status=%s I=%.2fA (buf remaining: %u)\n",
                        logToSend.cause.c_str(), logToSend.status.c_str(),
                        logToSend.arus, logBuf.size());
          if (logToSend.cause == "initial_snapshot") initialHistoryWritten = true;
        } else {
          retryLog = logToSend;
          retryLog.active = true;
          lastLogRetryMs = now;
          Serial.printf("[LogBuf] ❌ Log GAGAL, retry dalam %lu detik (cause=%s, buf: %u/%u)\n",
                        LOG_RETRY_INTERVAL_MS / 1000UL, logToSend.cause.c_str(),
                        logBuf.size(), LOG_BUF_SIZE);
        }
      }

      // 6. Process Pending Alerts
      PendingAlert alertToSend;
      if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
        if (pendingAlert.active) {
          alertToSend = pendingAlert;
          pendingAlert.active = false;
        }
        xSemaphoreGive(dataMutex);
      }
      if (alertToSend.active) {
        const bool canSendTelegram = localRt.telegramNotifyEnabled &&
                                     !localRt.telegramBotToken.isEmpty() &&
                                     !localRt.telegramChatId.isEmpty();
        const bool canSendDiscord = localRt.discordNotifyEnabled &&
                                    !localRt.discordWebhookAlerts.isEmpty();
        if (canSendTelegram || canSendDiscord) releaseFirebaseHttpConnection();
        // Telegram status alert
        if (canSendTelegram) {
          sendAlertIfNeeded(
            alertToSend.newStatus, alertToSend.lastStatus,
            alertToSend.arus, alertToSend.tegangan,
            alertToSend.dayaW, alertToSend.apparentPowerVa,
            alertToSend.energiKwh, alertToSend.frekuensi, alertToSend.powerFactor,
            alertToSend.relay, alertToSend.sensorSource,
            localRt.telegramBotToken, localRt.telegramChatId,
            localRt.telegramCooldownMs
          );
        }
        // Discord status alert
        if (canSendDiscord) {
          sendDiscordStatusAlert(
            alertToSend.newStatus, alertToSend.lastStatus,
            alertToSend.arus, alertToSend.tegangan,
            alertToSend.dayaW, alertToSend.apparentPowerVa,
            alertToSend.energiKwh, alertToSend.frekuensi, alertToSend.powerFactor,
            alertToSend.relay, alertToSend.sensorSource,
            localRt.discordWebhookAlerts,
            localRt.telegramCooldownMs  // pakai cooldown yang sama
          );
        }
      }

      // 6b. Process Pending Discord Relay Notification
      PendingRelayNotif relayNotifToSend;
      if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
        if (pendingRelayNotif.active) {
          relayNotifToSend = pendingRelayNotif;
          pendingRelayNotif.active = false;
        }
        xSemaphoreGive(dataMutex);
      }
      if (relayNotifToSend.active) {
        const bool canSendTelegram = localRt.telegramNotifyEnabled &&
                                     !localRt.telegramBotToken.isEmpty() &&
                                     !localRt.telegramChatId.isEmpty();
        const bool canSendDiscord = localRt.discordNotifyEnabled &&
                                    !localRt.discordWebhookAlerts.isEmpty();
        if (canSendTelegram || canSendDiscord) releaseFirebaseHttpConnection();
        // Telegram relay notification (pesan relay ON/OFF)
        if (canSendTelegram) {
          String tgMsg = buildRelayMessage(
            relayNotifToSend.relayVal, relayNotifToSend.cause,
            relayNotifToSend.arus, relayNotifToSend.tegangan,
            relayNotifToSend.dayaW, relayNotifToSend.apparentPowerVa,
            relayNotifToSend.energiKwh, relayNotifToSend.frekuensi, relayNotifToSend.powerFactor,
            relayNotifToSend.status, relayNotifToSend.sensorSource
          );
          sendTelegram(tgMsg, localRt.telegramBotToken, localRt.telegramChatId, 5000, true);
        }
        // Discord relay notification
        if (canSendDiscord) {
          sendDiscordRelayNotif(
            relayNotifToSend.relayVal,
            relayNotifToSend.cause,
            relayNotifToSend.arus,
            relayNotifToSend.tegangan,
            relayNotifToSend.dayaW,
            relayNotifToSend.apparentPowerVa,
            relayNotifToSend.energiKwh,
            relayNotifToSend.frekuensi,
            relayNotifToSend.powerFactor,
            relayNotifToSend.status,
            relayNotifToSend.sensorSource,
            localRt.discordWebhookAlerts,
            5000
          );
        }
      }

      // 7. Sync Runtime Settings
      if (now - lastSettingsSyncMs >= localRt.settingsSyncMs) {
        lastSettingsSyncMs = now;
        RuntimeSettings newRt;
        bool syncOk = readAllSettings(newRt);
        if (syncOk) {
          // FIX: Kirim boot notification saat pertama kali settings berhasil diload
          // (menggantikan boot notif yang dihapus dari init phase)
          static bool bootNotifSent = false;
          if (!bootNotifSent) {
            bootNotifSent = true;
            const bool canSendTelegram = newRt.telegramNotifyEnabled &&
                                         !newRt.telegramBotToken.isEmpty() &&
                                         !newRt.telegramChatId.isEmpty();
            const bool canSendDiscord = newRt.discordNotifyEnabled &&
                                        !newRt.discordWebhookAlerts.isEmpty();
            if (canSendTelegram || canSendDiscord) releaseFirebaseHttpConnection();
            if (canSendTelegram) {
              String bootMsg =
                "\xF0\x9F\x9F\xA2 <b>ESP32 Online</b>\n"
                "Perangkat IoT Deteksi Arus aktif.\n"
                "Threshold: <code>" + String(newRt.thresholdArus, 1) + " A</code>\n"
                "IP: <code>" + WiFi.localIP().toString() + "</code>";
              sendTelegram(bootMsg, newRt.telegramBotToken, newRt.telegramChatId, 0, true);
            }
            if (canSendDiscord) {
              char desc[256];
              snprintf(desc, sizeof(desc),
                "Perangkat IoT Deteksi Arus aktif dan terhubung.\n"
                "**Threshold:** `%.1f A`\n**IP:** `%s`",
                newRt.thresholdArus, WiFi.localIP().toString().c_str());
              sendDiscordWebhook(newRt.discordWebhookAlerts,
                "\xF0\x9F\x9F\xA2 ESP32 Online", String(desc),
                DISCORD_COLOR_GREEN, 0, true);
            }
          }
          if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
            rt = newRt;
            xSemaphoreGive(dataMutex);
          }
        }
      }

      // Snapshot berkala yang lengkap untuk pemantauan jarak jauh. Interval
      // minimum default 60 detik agar Telegram/Discord tidak terkena spam atau
      // rate-limit, namun tetap mencerminkan data meter terbaru.
      if (realtimeNotifyDue) {
        const bool canSendTelegram = localRt.telegramNotifyEnabled &&
                                     !localRt.telegramBotToken.isEmpty() &&
                                     !localRt.telegramChatId.isEmpty();
        const bool canSendDiscord = localRt.discordNotifyEnabled &&
                                    !localRt.discordWebhookAlerts.isEmpty();
        if (canSendTelegram || canSendDiscord) {
          releaseFirebaseHttpConnection();
          if (canSendTelegram) {
            String telemetryMessage = buildRealtimeMessage(
              localState.arus, localState.tegangan,
              localState.dayaW, localState.apparentPowerVa,
              localState.energiKwh, localState.frekuensi, localState.powerFactor,
              localState.status, localState.relay, localState.sensorSource
            );
            sendTelegram(telemetryMessage, localRt.telegramBotToken,
                         localRt.telegramChatId, localRt.realtimeNotifyIntervalMs);
          }
          if (canSendDiscord) {
            String title, description;
            buildDiscordRealtimeEmbed(
              localState.arus, localState.tegangan,
              localState.dayaW, localState.apparentPowerVa,
              localState.energiKwh, localState.frekuensi, localState.powerFactor,
              localState.status, localState.relay, localState.sensorSource,
              title, description
            );
            sendDiscordWebhook(localRt.discordWebhookAlerts, title, description,
                               DISCORD_COLOR_BLUE, localRt.realtimeNotifyIntervalMs);
          }
          lastRealtimeNotifyMs = now;
        }
      }

    }

    // Yield ke watchdog/task lain
    // FIX: naikkan dari 50ms → 100ms. Memberi waktu lebih bagi BearSSL dan
    // idle task untuk reclaim/compact heap fragmentation antar request.
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

// ═══════════════════════════════════════════════════════════════
// LOOP (CORE 1) - Sensor Reading & Local Logic
// ═══════════════════════════════════════════════════════════════

void loop() {
  unsigned long now = millis();

  // Heap safety — restart jika memori kritis untuk mencegah crash
  // FIX: naikkan threshold dari 8KB ke 20KB.
  // Jika heap < 20KB di Core 1, Core 0 yang menjalankan SSL PASTI crash
  // karena BearSSL butuh minimal 20-24KB contiguous heap untuk handshake.
  uint32_t freeHeap = ESP.getFreeHeap();
  if (freeHeap < 20480) {
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

  // ── Guard: pastikan mutex sudah siap sebelum diakses ──────────
  // dataMutex dibuat di akhir setup(). Jika loop() berjalan sebelum
  // mutex siap (tidak mungkin secara teoritis, tapi defensif), skip.
  if (dataMutex == NULL) {
    delay(10);
    return;
  }

  // ── Ambil salinan RuntimeSettings dan state yang aman dengan Mutex ──
  RuntimeSettings localRt;
  int currentRelay;
  if (xSemaphoreTake(dataMutex, portMAX_DELAY) == pdTRUE) {
    localRt = rt;
    currentRelay = state.relay;
    xSemaphoreGive(dataMutex);
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
  // Status dan hasilnya diproses oleh firebaseTaskCore0 agar HTTP RTDB hanya
  // dipakai dari satu core. Core 1 tetap membaca PZEM untuk sampel berikutnya.

  // ── Determine status using RUNTIME threshold ─────────────────
  if (trace) { Serial.println("[Loop] 4. Determine status..."); Serial.flush(); }
  String newStatus = reading.valid ? determineStatus(reading.arus, localRt.thresholdArus, localRt.warningPercent) : "SENSOR_ERROR";
  if (trace) { Serial.printf("[Loop] 4. Status OK: %s\n", newStatus.c_str()); Serial.flush(); }
  bool statusChanged = (newStatus != lastStatus);

  // ── Auto-cutoff (WARNING atau DANGER, relay=ON) ─────────────────
  // Trigger jika: autoCutoffEnabled AND (WARNING atau DANGER) AND relay masih ON.
  // Setelah cutoff, set relayLockedOff sehingga relay TIDAK nyala otomatis
  // meskipun kondisi kembali NORMAL — hanya perintah ON dari web yang bisa clear lock.
  bool shouldAutoCutoff = reading.valid
                           && localRt.autoCutoffEnabled
                          && (newStatus == "DANGER" || newStatus == "WARNING")
                          && currentRelay == 1;

  if (shouldAutoCutoff) {
    Serial.printf("[Auto-Cutoff] Kondisi %s — Relay OFF + Lock.\n", newStatus.c_str());

    // Set lock SEBELUM acquire mutex (NVS di luar mutex, ok karena hanya Core 1 yang call ini)
    saveRelayLockedOff(true);

    if (xSemaphoreTake(dataMutex, portMAX_DELAY) == pdTRUE) {
      saveRelayStateToNvs(0);
      setRelay(0);
      currentRelay = 0;
      // JANGAN panggil updateRelayState() di sini — fbData bukan thread-safe!
      // Gunakan flag agar Core 0 yang handle Firebase write.
      pendingRelaySync.active = true;
      pendingRelaySync.relayVal = 0;

      {
        PendingLog entry;
        entry.active = true;
        entry.arus = reading.arus;
        entry.tegangan = reading.tegangan;
        entry.status = newStatus;
        entry.relay = 0;
        entry.cause = "auto_cutoff";
        entry.dayaW = reading.dayaW;
        entry.apparentPowerVa = reading.apparentPowerVa;
        entry.energiKwh = g_energiKwh;
        entry.frekuensi = reading.frekuensi;
        entry.powerFactor = reading.powerFactor;
        entry.sensorSource = reading.sensorSource;
        entry.uptimeSeconds = now / 1000UL;
        logBuf.push(entry);
      }

      // Queue relay notification untuk Telegram & Discord (dikirim dari Core 0)
      pendingRelayNotif.active   = true;
      pendingRelayNotif.relayVal  = 0;
      pendingRelayNotif.cause     = "auto_cutoff";
      pendingRelayNotif.arus      = reading.arus;
      pendingRelayNotif.tegangan  = reading.tegangan;
      pendingRelayNotif.dayaW = reading.dayaW;
      pendingRelayNotif.apparentPowerVa = reading.apparentPowerVa;
      pendingRelayNotif.energiKwh = reading.energiKwh;
      pendingRelayNotif.frekuensi = reading.frekuensi;
      pendingRelayNotif.powerFactor = reading.powerFactor;
      pendingRelayNotif.status    = newStatus;
      pendingRelayNotif.sensorSource = reading.sensorSource;

      xSemaphoreGive(dataMutex);
    }
    if (newStatus == "DANGER") buzzerLong();
    else buzzerBeep(3, 150, 100);  // WARNING: 3 bip pendek
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
    state.meterValid      = reading.valid;
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
    if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(30)) == pdTRUE) {
      PendingLog entry;
      entry.active = true;
      entry.arus = reading.arus;
      entry.tegangan = reading.tegangan;
      entry.status = newStatus;
      entry.relay = currentRelay;
      entry.cause = "esp32";
      entry.dayaW = reading.dayaW;
      entry.apparentPowerVa = reading.apparentPowerVa;
      entry.energiKwh = g_energiKwh;
      entry.frekuensi = reading.frekuensi;
      entry.powerFactor = reading.powerFactor;
      entry.sensorSource = reading.sensorSource;
      entry.uptimeSeconds = now / 1000UL;
      logBuf.push(entry);
      xSemaphoreGive(dataMutex);
    }
  }

  // ── Periodic log (every minute while the PZEM value is valid) ──
  // Dengan ring buffer, periodic log selalu dipush — tidak ada lagi guard
  // "!pendingLog.active" yang sebelumnya menyebabkan periodic log terlewat
  // bila slot tunggal masih terisi event lain.
  if (now - lastPeriodicLogMs >= PERIODIC_LOG_INTERVAL_MS) {
    lastPeriodicLogMs = now;
    if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(30)) == pdTRUE) {
      PendingLog entry;
      entry.active        = true;
      entry.arus          = reading.arus;
      entry.tegangan      = reading.tegangan;
      entry.status        = newStatus;
      entry.relay         = currentRelay;
      entry.cause         = "periodic";
      entry.dayaW         = reading.dayaW;
      entry.apparentPowerVa = reading.apparentPowerVa;
      entry.energiKwh     = g_energiKwh;
      entry.frekuensi     = reading.frekuensi;
      entry.powerFactor   = reading.powerFactor;
      entry.sensorSource  = reading.sensorSource;
      entry.uptimeSeconds = now / 1000UL;
      logBuf.push(entry);
      xSemaphoreGive(dataMutex);
    }
  }

  // ── Telegram + Discord status alert (via pendingAlert, dikirim Core 0) ───
  if (statusChanged) {
    if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(30)) == pdTRUE) {
      pendingAlert.active = true;
      pendingAlert.newStatus = newStatus;
      pendingAlert.lastStatus = lastStatus;
      pendingAlert.arus = reading.arus;
      pendingAlert.tegangan = reading.tegangan;
      pendingAlert.dayaW = reading.dayaW;
      pendingAlert.apparentPowerVa = reading.apparentPowerVa;
      pendingAlert.energiKwh = reading.energiKwh;
      pendingAlert.frekuensi = reading.frekuensi;
      pendingAlert.powerFactor = reading.powerFactor;
      pendingAlert.relay = currentRelay;
      pendingAlert.sensorSource = reading.sensorSource;
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

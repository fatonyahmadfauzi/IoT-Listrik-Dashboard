/**
 * firebase_handler.h — Firebase RTDB Read/Write Operations
 * ————————————————————————————————————————————————————————————————————————————————
 * Uses: Firebase ESP Client library by Mobizt
 *
 * Install via Arduino Library Manager:
 *   Search "Firebase ESP Client" † install by Mobizt
 *   (Also installs ArduinoJson as dependency)
 *
 * KEY CHANGE from previous version:
 *   initFirebase() now accepts runtime parameters (not #define constants)
 *   so it can use credentials loaded from NVS by the WiFiManager portal.
 *
 *   readAllSettings() now reads ALL /settings fields into a RuntimeSettings
 *   struct, including Telegram credentials and calibration factors.
 *
 * CRITICAL FIX — Single FirebaseData:
 *   Menggunakan SATU FirebaseData object (fbData) untuk SEMUA operasi.
 *   Multiple FirebaseData object † masing-masing alokasi ~5KB static buffer
 *   † heap fragmentasi † MaxBlock < 60KB † SSL handshake ke-2 NULL crash.
 *   Karena SEMUA operasi Firebase berjalan di Core 0 secara SERIAL (satu task),
 *   satu FirebaseData object cukup dan aman.
 * ————————————————————————————————————————————————————————————————————————————————
 */

#ifndef FIREBASE_HANDLER_H
#define FIREBASE_HANDLER_H

#include <Arduino.h>
#include "config.h"

// ════════════════════════════════════════════════════════════════════════════════ 
// SKIP_FIREBASE MODE — All Firebase functions become safe no-ops
// ════════════════════════════════════════════════════════════════════════════════ 
#ifdef SKIP_FIREBASE

// Stub FirebaseData so main.ino compiles (it references fbBootstrapData)
struct FirebaseData {
  String errorReason() { return ""; }
  bool boolData()      { return false; }
  String stringData()  { return ""; }
  int intData()        { return 0; }
  String jsonString()  { return "{}"; }
};
static FirebaseData fbData;
static FirebaseData fbBootstrapData;   // kept for compatibility

void initFirebase(const char*, const char*, const char*, const char*) {
  Serial.println("[Firebase] SKIP_FIREBASE aktif — Firebase DINONAKTIFKAN");
}
bool isFirebaseReady() { return false; }
bool writeMonitorData(float, float, float, float, float, float, float,
                      const String&, int, const String& = "PZEM-004T") { return false; }
bool writeLog(float, float, const String&, int, const String&,
              float = 0, float = 0, float = 0, float = 50, float = 0.85,
              const String& = "PZEM-004T") { return false; }
bool readRelayCommand(int&) { return false; }
bool updateRelayState(int) { return false; }
bool readAllSettings(RuntimeSettings& out) {
  Serial.println("[Firebase] SKIP — settings menggunakan default");
  return false;
}
bool updateAutoLearningStatus(const String&, const String&, bool, const String& = "") { return false; }
bool writeAutoLearningResult(const String&, unsigned long, float, float, float, float, float, float, bool) { return false; }

#else
// ════════════════════════════════════════════════════════════════════════════════ 
// NORMAL MODE — Full Firebase implementation
// ════════════════════════════════════════════════════════════════════════════════ 

#include <Firebase_ESP_Client.h>
#include <HTTPClient.h>          // FIX: untuk writeMonitorData persistent HTTP
#include <WiFiClientSecure.h>    // FIX: untuk persistent SSL connection
#include <esp_task_wdt.h>        // FIX: WDT reset saat blocking HTTP


// ——— Firebase global objects —————————————————————————————————————————————————————
// SATU FirebaseData object untuk semua operasi (serialized di Core 0).
// Ini mencegah fragmentasi heap akibat multiple static SSL buffer allocation.
static bool s_fbTokenReady = false;  // Set true saat token_status_ready

// Static buffers agar fbConfig.api_key / database_url tidak corrupt setelah initFirebase() return.
static char s_fbApiKey[136]    = {};
static char s_fbDbUrl[136]     = {};
static char s_fbEmail[72]      = {};
static char s_fbPassword[72]   = {};
FirebaseData   fbData;            // semua operasi RTDB (monitor, log, relay, settings, bootstrap)
FirebaseData   fbBootstrapData;   // alias -- digunakan oleh fungsi bootstrap di main.ino (sama dengan fbData)
FirebaseAuth   fbAuth;
FirebaseConfig fbConfig;

// --- Firebase token callback ------------------------------------------------
void firebaseTokenStatusCallback(TokenInfo info) {
  if (info.status == token_status_error) {
    Serial.println("[Firebase] Token error.");
  } else if (info.status == token_status_ready) {
    s_fbTokenReady = true;
    Serial.println("[Firebase] Auth token ready");
  }
}

void initFirebase(const char* apiKey, const char* dbUrl, const char* email, const char* password) {
  strlcpy(s_fbApiKey, apiKey, sizeof(s_fbApiKey));
  strlcpy(s_fbDbUrl, dbUrl, sizeof(s_fbDbUrl));
  strlcpy(s_fbEmail, email, sizeof(s_fbEmail));
  strlcpy(s_fbPassword, password, sizeof(s_fbPassword));

  fbConfig.api_key = s_fbApiKey;
  fbConfig.database_url = s_fbDbUrl;
  fbAuth.user.email = s_fbEmail;
  fbAuth.user.password = s_fbPassword;

  fbConfig.token_status_callback = firebaseTokenStatusCallback;
  fbConfig.fcs.download_buffer_size = 4096;
  fbConfig.fcs.upload_buffer_size = 1024;

  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);
}

bool isFirebaseReady() {
  return Firebase.ready() && s_fbTokenReady;
}

// Threshold 50KB memberi buffer aman di atas minimum SSL (~40KB).
#define FB_HEAP_GUARD(label) \
  do { \
    uint32_t _fh  = ESP.getFreeHeap(); \
    uint32_t _mb  = ESP.getMaxAllocHeap(); \
    if (_fh < 30000 || _mb < 25000) { \
      Serial.printf("[Firebase] HEAP LOW (free=%u max=%u) -- needs 30K free + 25K block, skip %s\n", _fh, _mb, label); \
      return false; \
    } \
  } while(0)

// --- Persistent HTTP client untuk writeMonitorData --------------------------
// FIX DEFINITIF: Gunakan HTTPClient langsung dengan WiFiClientSecure
// persistent (setReuse=true) agar SSL handshake hanya terjadi SEKALI.
//
// Masalah sebelumnya: Firebase.RTDB.updateNode membuka koneksi SSL baru
// untuk setiap call setelah server menutup keep-alive. Heap terfragmentasi
// setelah 2 koneksi SSL -> SSL handshake ke-3 gagal alokasi -> NULL -> crash.
//
// Solusi: Satu WiFiClientSecure persistent -> SSL session digunakan ulang ->
// tidak ada heap allocation baru untuk SSL handshake setelah call pertama.
static WiFiClientSecure _wcsRTDB;
static HTTPClient       _httpRTDB;
static bool             _rtdbConnected = false;
static unsigned long    _rtdbLastMs    = 0;

// Helper: Pastikan DB URL tidak berakhiran slash agar tidak terjadi double slash (//) yg bikin 401
// Persistent HTTP client untuk Firebase GET/DELETE (settings, relay)
static WiFiClientSecure _wcsFbReq;
static HTTPClient       _httpFbReq;
static bool             _fbReqConnected = false;
static unsigned long    _fbReqLastMs    = 0;

static String _getBaseUrl() {
  String b = String(s_fbDbUrl);
  if (b.endsWith("/")) b.remove(b.length() - 1);
  return b;
}

void releaseFirebaseHttpConnection() {
  if (_rtdbConnected) { _httpRTDB.end(); _wcsRTDB.stop(); _rtdbConnected = false; }
  if (_fbReqConnected) { _httpFbReq.end(); _wcsFbReq.stop(); _fbReqConnected = false; }
}

// Helper: HTTP request ke Firebase RTDB dengan PERSISTENT CONNECTION
static bool _fbHttpRequest(const char* method, const char* path,
                            const char* body, String* respOut = nullptr) {
  const char* token = Firebase.getToken();
  if (!token || strlen(token) < 20) return false;
  
  String url = _getBaseUrl() + path + ".json?auth=" + String(token);
  
  unsigned long now = millis();
  bool needReinit = !_fbReqConnected || (now - _fbReqLastMs > 25000UL);
  if (needReinit) {
    _httpFbReq.end();
    _wcsFbReq.stop();
    _wcsFbReq.setInsecure();
    _httpFbReq.setReuse(true);
    _fbReqConnected = false;
  }
  
  if (!_httpFbReq.begin(_wcsFbReq, url)) {
    _fbReqConnected = false;
    return false;
  }
  
  _httpFbReq.addHeader("Content-Type", "application/json");
  _httpFbReq.setTimeout(10000);
  
  int code = -1;
  if (strcmp(method, "GET") == 0) code = _httpFbReq.GET();
  else if (strcmp(method, "DELETE") == 0) code = _httpFbReq.sendRequest("DELETE");
  else { String b = body ? body : "{}"; code = _httpFbReq.sendRequest(method, b); }
  
  _fbReqLastMs = millis();
  if (code < 0) _fbReqConnected = false; // FIX: force re-init on connection error
  bool ok = (code == 200);
  // FIX: Beri waktu bagi lwIP dan BearSSL untuk membersihkan buffer tcp_recved
  // setelah menerima respon JSON, untuk mencegah StoreProhibited crash
  // saat melakukan banyak fetch beruntun (seperti di bootstrap).
  vTaskDelay(pdMS_TO_TICKS(20));
  if (code == 200) {
    _fbReqConnected = true;
    if (respOut) *respOut = _httpFbReq.getString();
  } else {
    Serial.printf("[Firebase] %s %s => %d\n", method, path, code);
    _httpFbReq.end();
    _fbReqConnected = false;
  }
  return ok;
}

bool writeMonitorData(float arus, float tegangan, float dayaW,
                      float apparentPowerVa, float energiKwh,
                      float freqHz, float powerFactor,
                      const String& status, int relay,
                      const String& sensorSource = "PZEM-004T") {
  if (!isFirebaseReady()) return false;
  Serial.printf("[Firebase] writeMonitorData heap: %u maxBlk: %u\n",
                ESP.getFreeHeap(), ESP.getMaxAllocHeap());
  const char* token = Firebase.getToken();
  if (!token || strlen(token) < 20) { Serial.println("[Firebase] token belum siap"); return false; }
  char json[600];
  snprintf(json, sizeof(json),
    "{\"arus\":%.2f,\"tegangan\":%.1f,\"daya\":%.1f,\"daya_w\":%.1f,"
    "\"apparent_power\":%.1f,\"energi_kwh\":%.4f,\"frekuensi\":%.1f,"
    "\"power_factor\":%.2f,\"sensor_source\":\"%s\",\"status\":\"%s\",\"relay\":%d}",
    arus, tegangan, apparentPowerVa, dayaW, apparentPowerVa, energiKwh, freqHz, powerFactor,
    sensorSource.c_str(), status.c_str(), relay);
  
  String url = _getBaseUrl() + "/listrik.json?auth=" + String(token);
  Serial.printf("[Firebase] HTTP PATCH URL (first 80 chars): %.80s...\n", url.c_str());
  
  unsigned long now = millis();
  bool needReinit = !_rtdbConnected || (now - _rtdbLastMs > 25000UL);
  if (needReinit) {
    _httpRTDB.end();
    _wcsRTDB.stop(); // Bersihkan socket lama untuk cegah crash di koneksi berikutnya
    _wcsRTDB.setInsecure();
    _httpRTDB.setReuse(true);
    _rtdbConnected = false;
    Serial.println("[Firebase] RTDB: membuka koneksi HTTP baru");
  }
  if (!_httpRTDB.begin(_wcsRTDB, url)) {
    Serial.println("[Firebase] writeMonitorData: HTTP begin gagal");
    _rtdbConnected = false;
    return false;
  }
  _httpRTDB.addHeader("Content-Type", "application/json");
  _httpRTDB.setTimeout(10000);
  int code = _httpRTDB.sendRequest("PATCH", String(json));
  _rtdbLastMs = millis();
  if (code == 200) { _rtdbConnected = true; return true; }
  Serial.printf("[Firebase] writeMonitorData gagal: HTTP %d\n", code);
  _httpRTDB.end();
  _rtdbConnected = false;
  return false;
}

bool writeLog(float arus, float tegangan,
              const String& status, int relay,
              const String& source,
              float dayaW = 0.0f, float apparentPowerVa = 0.0f,
              float energiKwh = 0.0f, float freqHz = 50.0f,
              float powerFactor = 0.85f,
              const String& sensorSource = "PZEM-004T",
              long uptimeSeconds = 0) {
  if (!isFirebaseReady()) return false;
  FB_HEAP_GUARD("writeLog");
  const char* token = Firebase.getToken();
  if (!token || strlen(token) < 20) return false;
  if (apparentPowerVa <= 0.0f) apparentPowerVa = arus * tegangan;
  if (dayaW <= 0.0f) dayaW = apparentPowerVa * powerFactor;
  char jsonStr[600];
  snprintf(jsonStr, sizeof(jsonStr),
    "{\"arus\":%.2f,\"tegangan\":%.1f,\"daya\":%.1f,\"daya_w\":%.1f,"
    "\"apparent_power\":%.1f,\"energi_kwh\":%.4f,\"frekuensi\":%.1f,"
    "\"power_factor\":%.2f,\"sensor_source\":\"%s\","
    "\"status\":\"%s\",\"relay\":%d,\"waktu\":\"%s\",\"source\":\"%s\",\"uptime_s\":%ld}",
    arus, tegangan, apparentPowerVa, dayaW, apparentPowerVa, energiKwh, freqHz, powerFactor,
    sensorSource.c_str(), status.c_str(), relay, String(millis()).c_str(), source.c_str(), uptimeSeconds);
  
  String url = _getBaseUrl() + "/logs.json?auth=" + String(token);
  
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  if (http.begin(client, url)) {
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(String(jsonStr));
    http.end();
    if (code == 200) { Serial.println("[Firebase] Log -> " + status + " (" + source + ")"); return true; }
    Serial.printf("[Firebase] writeLog gagal HTTP %d\n", code);
  } else { Serial.println("[Firebase] writeLog HTTP begin gagal"); }
  return false;
}

// --- readRelayCommand() -----------------------------------------------------
bool readRelayCommand(int& outRelay) {
  if (!isFirebaseReady()) return false;
  FB_HEAP_GUARD("readRelayCommand");
  String resp;
  bool ok = _fbHttpRequest("GET", "/commands/relay", nullptr, &resp);
  if (ok) {
    resp.trim();
    if (resp == "null" || resp == "" || resp == "false") return false;
    outRelay = (resp.toInt() == 1) ? 1 : 0;
  }
  return ok;
}

// --- updateRelayState() -----------------------------------------------------
bool updateRelayState(int relayVal) {
  if (!isFirebaseReady()) return false;
  char b[20];
  snprintf(b, sizeof(b), "{\"relay\":%d}", relayVal);
  return _fbHttpRequest("PATCH", "/listrik", b);
}

bool clearRelayCommand() {
  if (!isFirebaseReady()) return false;
  bool ok = _fbHttpRequest("DELETE", "/commands/relay", nullptr);
  if (ok) Serial.println("[Firebase] /commands/relay cleared OK");
  return ok;
}

// --- readAllSettings() ------------------------------------------------------
bool readAllSettings(RuntimeSettings& out) {
  if (!isFirebaseReady()) return false;
  FB_HEAP_GUARD("readAllSettings");

  String resp;
  bool ok = _fbHttpRequest("GET", "/settings", nullptr, &resp);
  if (!ok) return false;
  resp.trim();
  if (resp == "null" || resp == "") return false;

  FirebaseJson    json;
  FirebaseJsonData val;
  json.setJsonData(resp);

  // Numeric thresholds
  if (json.get(val, "thresholdArus")     && val.typeNum == FirebaseJson::JSON_FLOAT)
    out.thresholdArus = val.floatValue;
  if (json.get(val, "warningPercent")) {
    if (val.typeNum == FirebaseJson::JSON_FLOAT) out.warningPercent = val.floatValue;
    else if (val.typeNum == FirebaseJson::JSON_INT) out.warningPercent = (float)val.intValue;
  }
  if (json.get(val, "powerFactorEstimate") && val.typeNum == FirebaseJson::JSON_FLOAT)
    out.powerFactorEstimate = val.floatValue;
  if (json.get(val, "frequencyHz")       && val.typeNum == FirebaseJson::JSON_FLOAT)
    out.frequencyHz = val.floatValue;
  if (json.get(val, "frequencyHz")       && val.typeNum == FirebaseJson::JSON_INT)
    out.frequencyHz = (float)val.intValue;
  if (json.get(val, "arusCalibration")   && val.typeNum == FirebaseJson::JSON_FLOAT)
    out.arusCalibration = val.floatValue;
  if (json.get(val, "teganganCalibration")&& val.typeNum == FirebaseJson::JSON_FLOAT)
    out.teganganCalibration = val.floatValue;

  // Booleans
  if (json.get(val, "buzzerEnabled"))
    out.buzzerEnabled = (val.stringValue == "true" || val.intValue == 1);
  if (json.get(val, "autoCutoffEnabled"))
    out.autoCutoffEnabled = (val.stringValue == "true" || val.intValue == 1);
  if (json.get(val, "telegramNotifyEnabled"))
    out.telegramNotifyEnabled = (val.stringValue == "true" || val.intValue == 1);
  if (json.get(val, "realtimeStreamEnabled"))
    out.realtimeStreamEnabled = (val.stringValue == "true" || val.intValue == 1);

  // Timing
  if (json.get(val, "sendIntervalMs") && val.intValue > 0)
    out.sendIntervalMs = (unsigned long)val.intValue;
  if (json.get(val, "settingsSyncMs") && val.intValue > 0)
    out.settingsSyncMs = (unsigned long)val.intValue;

  // Telegram
  if (json.get(val, "telegramBotToken") && !val.stringValue.isEmpty())
    out.telegramBotToken = val.stringValue;
  if (json.get(val, "telegramChatId")   && !val.stringValue.isEmpty())
    out.telegramChatId = val.stringValue;

  // Discord
  if (json.get(val, "discord/webhookAlerts") && !val.stringValue.isEmpty())
    out.discordWebhookAlerts = val.stringValue;
  if (json.get(val, "discord/enabled"))
    out.discordNotifyEnabled = (val.stringValue == "true" || val.intValue == 1);

  // Auto Learning
  if (json.get(val, "autoLearning/active"))
    out.autoLearningActive = (val.stringValue == "true" || val.intValue == 1);
  if (json.get(val, "autoLearning/requestId"))
    out.autoLearningRequestId = val.stringValue;
  if (json.get(val, "autoLearning/durationMs")) {
    if (val.typeNum == FirebaseJson::JSON_INT && val.intValue > 0)
      out.autoLearningDurationMs = (unsigned long)val.intValue;
    else if (val.typeNum == FirebaseJson::JSON_FLOAT && val.floatValue > 0)
      out.autoLearningDurationMs = (unsigned long)val.floatValue;
  }
  if (json.get(val, "autoLearning/marginPercent")) {
    if (val.typeNum == FirebaseJson::JSON_FLOAT) out.autoLearningMarginPercent = val.floatValue;
    else if (val.typeNum == FirebaseJson::JSON_INT) out.autoLearningMarginPercent = (float)val.intValue;
  }
  if (json.get(val, "autoLearning/applyToThreshold"))
    out.autoLearningApplyToThreshold = (val.stringValue == "true" || val.intValue == 1);

  Serial.printf(
    "[Firebase] Settings synced -> thr=%.1fA warn%%=%.0f PF=%.2f f=%.0fHz "
    "cal_I=%.3f cal_V=%.2f stream=%d sendMs=%lu buzzer=%d cutoff=%d TG=%s DC=%s learn=%d\n",
    out.thresholdArus, out.warningPercent, out.powerFactorEstimate, out.frequencyHz,
    out.arusCalibration, out.teganganCalibration,
    out.realtimeStreamEnabled, out.sendIntervalMs, out.buzzerEnabled, out.autoCutoffEnabled,
    out.telegramBotToken.isEmpty()      ? "unconfigured" : "configured",
    out.discordWebhookAlerts.isEmpty()  ? "unconfigured" : "configured",
    out.autoLearningActive
  );
  return true;
}

bool updateAutoLearningStatus(const String& requestId,
                              const String& status,
                              bool active,
                              const String& message = "") {
  if (!isFirebaseReady()) return false;

  FirebaseJson json;
  json.set("requestId", requestId);
  json.set("status", status);
  json.set("active", active);
  json.set("deviceUpdatedAt", String(millis()));
  if (!message.isEmpty()) json.set("message", message);

  String jsonStr;
  json.toString(jsonStr);
  bool ok = _fbHttpRequest("PATCH", "/settings/autoLearning", jsonStr.c_str());
  return ok;
}

bool writeAutoLearningResult(const String& requestId,
                             unsigned long sampleCount,
                             float minCurrent,
                             float maxCurrent,
                             float avgCurrent,
                             float maxPowerW,
                             float avgPowerW,
                             float learnedThresholdArus,
                             bool applyToThreshold) {
  if (!isFirebaseReady()) return false;

  FirebaseJson json;
  json.set("requestId", requestId);
  json.set("active", false);
  json.set("status", "complete");
  json.set("sampleCount", (int)sampleCount);
  json.set("minCurrent", minCurrent);
  json.set("maxCurrent", maxCurrent);
  json.set("avgCurrent", avgCurrent);
  json.set("maxPowerW", maxPowerW);
  json.set("avgPowerW", avgPowerW);
  json.set("learnedThresholdArus", learnedThresholdArus);
  json.set("applyToThreshold", applyToThreshold);
  json.set("finishedAt", String(millis()));
  json.set("message", applyToThreshold
    ? "Learning selesai. Threshold arus diperbarui oleh perangkat."
    : "Learning selesai. Threshold arus tidak diubah otomatis.");

  String jsonStr;
  json.toString(jsonStr);
  bool resultOk = _fbHttpRequest("PATCH", "/settings/autoLearning", jsonStr.c_str());

  bool thresholdOk = true;
  if (applyToThreshold) {
    char thrBody[40];
    snprintf(thrBody, sizeof(thrBody), "{\"thresholdArus\":%.2f}", learnedThresholdArus);
    thresholdOk = _fbHttpRequest("PATCH", "/settings", thrBody);
    if (!thresholdOk) {
      updateAutoLearningStatus(requestId, "complete", false,
        "Learning selesai, tetapi threshold gagal diperbarui.");
    }
  }
  return resultOk && thresholdOk;
}

// --- Bootstrap helper functions ---------------------------------------------
// Semua bootstrap operations menggunakan fbData (bukan fbBootstrapData terpisah)
// karena semua berjalan di Core 0 secara serial.

String bootstrapChildPath(const char* child) {
  return String("/settings/deviceBootstrap/") + child;
}

bool readBootstrapBoolChild(const char* child, bool& out) {
  const String path = bootstrapChildPath(child);
  String resp;
  bool ok = _fbHttpRequest("GET", path.c_str(), nullptr, &resp);
  if (!ok) return false;
  resp.trim();
  resp.toLowerCase();
  if (resp == "null" || resp == "") return false;
  out = (resp == "true" || resp == "1");
  return true;
}

bool readBootstrapStringChild(const char* child, String& out) {
  const String path = bootstrapChildPath(child);
  String resp;
  bool ok = _fbHttpRequest("GET", path.c_str(), nullptr, &resp);
  if (!ok) return false;
  resp.trim();
  if (resp == "null" || resp == "") return false;
  if (resp.startsWith(""") && resp.endsWith("""))
    resp = resp.substring(1, resp.length() - 1);
  out = resp;
  return true;
}

bool writeBootstrapStatusString(const char* child, const String& value) {
  if (!isFirebaseReady()) return false;
  String path = bootstrapChildPath(child);
  String jsonVal = "\"" + value + "\"";
  return _fbHttpRequest("PUT", path.c_str(), jsonVal.c_str());
}

bool writeBootstrapStatusBool(const char* child, bool value) {
  if (!isFirebaseReady()) return false;
  String path = bootstrapChildPath(child);
  return _fbHttpRequest("PUT", path.c_str(), value ? "true" : "false");
}
#endif // SKIP_FIREBASE

#endif // FIREBASE_HANDLER_H

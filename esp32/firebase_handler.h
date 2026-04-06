/**
 * firebase_handler.h — Firebase RTDB Read/Write Operations
 * ─────────────────────────────────────────────────────────────────────
 * Uses: Firebase ESP Client library by Mobizt
 *
 * Install via Arduino Library Manager:
 *   Search "Firebase ESP Client" → install by Mobizt
 *   (Also installs ArduinoJson as dependency)
 *
 * KEY CHANGE from previous version:
 *   initFirebase() now accepts runtime parameters (not #define constants)
 *   so it can use credentials loaded from NVS by the WiFiManager portal.
 *
 *   readAllSettings() now reads ALL /settings fields into a RuntimeSettings
 *   struct, including Telegram credentials and calibration factors.
 * ─────────────────────────────────────────────────────────────────────
 */

#ifndef FIREBASE_HANDLER_H
#define FIREBASE_HANDLER_H

#include "config.h"
#include <Arduino.h>
#include <Firebase_ESP_Client.h>

// ── Firebase global objects ───────────────────────────────────
// Declared here, defined once — main.ino must NOT re-declare these.
FirebaseData   fbData;
FirebaseAuth   fbAuth;
FirebaseConfig fbConfig;

// ─── initFirebase() ───────────────────────────────────────────
/**
 * Initialize Firebase connection using RUNTIME parameters loaded
 * from NVS (not compile-time #defines).
 *
 * Call ONCE in setup() after WiFi is connected.
 *
 * @param apiKey    Firebase project API key (from NVS/bootstrap)
 * @param dbUrl     Firebase RTDB URL (from NVS/bootstrap)
 * @param email     IoT device email (from NVS/bootstrap)
 * @param password  IoT device password (from NVS/bootstrap)
 */
void initFirebase(const char* apiKey,
                  const char* dbUrl,
                  const char* email,
                  const char* password) {

  fbConfig.api_key      = apiKey;
  fbConfig.database_url = dbUrl;
  fbAuth.user.email     = email;
  fbAuth.user.password  = password;

  fbConfig.token_status_callback = [](TokenInfo info) {
    if (info.status == token_status_error) {
      Serial.printf("[Firebase] Token error: %s\n", getTokenError(info).c_str());
    } else if (info.status == token_status_ready) {
      Serial.println("[Firebase] Auth token ready ✓");
    }
  };

  // Buffer tuning for stability
  fbData.setBSSLBufferSize(4096, 1024);
  fbData.setResponseSize(4096);

  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);

  Serial.printf("[Firebase] Inisialisasi: %s\n", dbUrl);
}

// ─── isFirebaseReady() ────────────────────────────────────────
bool isFirebaseReady() {
  return Firebase.ready();
}

// ─── writeMonitorData() ───────────────────────────────────────
/**
 * Write realtime sensor data to /listrik in Firebase.
 * Only the IoT device email account may write to these paths
 * (enforced by database.rules.json).
 *
 * @param arus      Current RMS (A)
 * @param tegangan  Voltage RMS (V)
 * @param status    Status string: NORMAL|WARNING|LEAKAGE|DANGER
 * @param relay     Relay state: 0=OFF, 1=ON
 * @return true on success
 */
bool writeMonitorData(float arus, float tegangan,
                       const String& status, int relay) {
  if (!isFirebaseReady()) return false;

  FirebaseJson json;
  json.set("arus",       arus);
  json.set("tegangan",   tegangan);
  json.set("status",     status);
  json.set("relay",      relay);
  json.set("updated_at", String(millis()));

  bool ok = Firebase.RTDB.updateNode(&fbData, "/listrik", &json);
  if (!ok) {
    Serial.println("[Firebase] writeMonitorData gagal: " + fbData.errorReason());
  }
  return ok;
}

// ─── writeLog() ───────────────────────────────────────────────
/**
 * Append one log entry to /logs using Firebase push (auto-key).
 *
 * @param arus      Current (A)
 * @param tegangan  Voltage (V)
 * @param status    Status string
 * @param relay     Relay state
 * @param source    "esp32" | "auto_cutoff" | "web_command"
 * @return true on success
 */
bool writeLog(float arus, float tegangan,
              const String& status, int relay,
              const String& source) {
  if (!isFirebaseReady()) return false;

  FirebaseJson json;
  json.set("arus",      arus);
  json.set("tegangan",  tegangan);
  json.set("status",    status);
  json.set("relay",     relay);
  json.set("waktu",     String(millis()));
  json.set("source",    source);

  bool ok = Firebase.RTDB.pushJSON(&fbData, "/logs", &json);
  if (!ok) {
    Serial.println("[Firebase] writeLog gagal: " + fbData.errorReason());
  } else {
    Serial.println("[Firebase] Log → " + status + " (" + source + ")");
  }
  return ok;
}

// ─── readRelayCommand() ───────────────────────────────────────
/**
 * Read /listrik/relay to get the command set by the web admin.
 * The IoT device then applies this to the physical relay.
 *
 * @param outRelay  Output: relay value read (0 or 1)
 * @return true on success
 */
bool readRelayCommand(int& outRelay) {
  if (!isFirebaseReady()) return false;

  bool ok = Firebase.RTDB.getInt(&fbData, "/listrik/relay");
  if (ok) {
    outRelay = fbData.intData();
  } else {
    Serial.println("[Firebase] readRelayCommand gagal: " + fbData.errorReason());
  }
  return ok;
}

// ─── updateRelayState() ────────────────────────────────────────
/**
 * Write confirmed relay state back to /listrik/relay so the web
 * dashboard reflects the actual hardware state (e.g. after auto-cutoff).
 */
bool updateRelayState(int relayVal) {
  if (!isFirebaseReady()) return false;
  bool ok = Firebase.RTDB.setInt(&fbData, "/listrik/relay", relayVal);
  if (!ok) {
    Serial.println("[Firebase] updateRelayState gagal: " + fbData.errorReason());
  }
  return ok;
}

// ─── readAllSettings() ────────────────────────────────────────
/**
 * Read ALL runtime settings from Firebase /settings into a
 * RuntimeSettings struct. Called periodically so web changes
 * take effect without firmware re-upload.
 *
 * Fields read:
 *   thresholdArus, buzzerEnabled, autoCutoffEnabled,
 *   telegramBotToken, telegramChatId,
 *   arusCalibration, teganganCalibration,
 *   sendIntervalMs
 *
 * If /settings does not exist yet, the struct values remain at
 * their default (as declared in config.h RuntimeSettings).
 *
 * @param out  RuntimeSettings struct to populate
 * @return true if Firebase returned data
 */
bool readAllSettings(RuntimeSettings& out) {
  if (!isFirebaseReady()) return false;

  bool ok = Firebase.RTDB.getJSON(&fbData, "/settings");
  if (!ok) {
    Serial.println("[Firebase] readAllSettings gagal: " + fbData.errorReason());
    return false;
  }

  FirebaseJson    json;
  FirebaseJsonData val;
  json.setJsonData(fbData.jsonString());

  // Numeric thresholds
  if (json.get(val, "thresholdArus")     && val.typeNum == FirebaseJson::JSON_FLOAT)
    out.thresholdArus = val.floatValue;
  if (json.get(val, "arusCalibration")   && val.typeNum == FirebaseJson::JSON_FLOAT)
    out.arusCalibration = val.floatValue;
  if (json.get(val, "teganganCalibration")&& val.typeNum == FirebaseJson::JSON_FLOAT)
    out.teganganCalibration = val.floatValue;

  // Booleans
  if (json.get(val, "buzzerEnabled"))
    out.buzzerEnabled = (val.stringValue == "true" || val.intValue == 1);
  if (json.get(val, "autoCutoffEnabled"))
    out.autoCutoffEnabled = (val.stringValue == "true" || val.intValue == 1);

  // Timing
  if (json.get(val, "sendIntervalMs") && val.intValue > 0)
    out.sendIntervalMs = (unsigned long)val.intValue;

  // Telegram credentials (strings)
  if (json.get(val, "telegramBotToken") && !val.stringValue.isEmpty())
    out.telegramBotToken = val.stringValue;
  if (json.get(val, "telegramChatId")   && !val.stringValue.isEmpty())
    out.telegramChatId = val.stringValue;

  Serial.printf(
    "[Firebase] Settings synced → threshold=%.1fA cal_I=%.3f cal_V=%.2f "
    "sendMs=%lu buzzer=%d cutoff=%d TG=%s\n",
    out.thresholdArus, out.arusCalibration, out.teganganCalibration,
    out.sendIntervalMs, out.buzzerEnabled, out.autoCutoffEnabled,
    out.telegramBotToken.isEmpty() ? "unconfigured" : "configured"
  );
  return true;
}

#endif // FIREBASE_HANDLER_H

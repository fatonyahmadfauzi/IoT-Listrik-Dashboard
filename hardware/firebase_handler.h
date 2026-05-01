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
 * @param status    Status string: NORMAL|WARNING|DANGER
 * @param relay     Relay state: 0=OFF, 1=ON
 * @return true on success
 */
bool writeMonitorData(float arus, float tegangan, float dayaW,
                      float apparentPowerVa, float energiKwh,
                      float freqHz, float powerFactor,
                      const String& status, int relay,
                      const String& sensorSource = "PZEM-004T") {
  if (!isFirebaseReady()) return false;

  FirebaseJson json;
  json.set("arus",          arus);
  json.set("tegangan",      tegangan);
  json.set("daya",          apparentPowerVa); // Backward-compatible: apparent power (VA)
  json.set("daya_w",        dayaW);           // Active power from PZEM when available
  json.set("apparent_power", apparentPowerVa);
  json.set("energi_kwh",    energiKwh);
  json.set("frekuensi",     freqHz);
  json.set("power_factor",  powerFactor);
  json.set("sensor_source",  sensorSource);
  json.set("status",        status);
  json.set("relay",         relay);
  json.set("updated_at",    String(millis()));

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
              const String& source,
              float dayaW = 0.0f,
              float apparentPowerVa = 0.0f,
              float energiKwh = 0.0f,
              float freqHz = 50.0f,
              float powerFactor = 0.85f,
              const String& sensorSource = "PZEM-004T") {
  if (!isFirebaseReady()) return false;

  FirebaseJson json;
  if (apparentPowerVa <= 0.0f) apparentPowerVa = arus * tegangan;
  if (dayaW <= 0.0f) dayaW = apparentPowerVa * powerFactor;

  json.set("arus",           arus);
  json.set("tegangan",       tegangan);
  json.set("daya",           apparentPowerVa);
  json.set("daya_w",         dayaW);
  json.set("apparent_power", apparentPowerVa);
  json.set("energi_kwh",     energiKwh);
  json.set("frekuensi",      freqHz);
  json.set("power_factor",   powerFactor);
  json.set("sensor_source",  sensorSource);
  json.set("status",         status);
  json.set("relay",          relay);
  json.set("waktu",          String(millis()));
  json.set("source",         source);

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
 *   telegramBotToken, telegramChatId (supports comma-separated IDs),
 *   arusCalibration, teganganCalibration,
 *   realtimeStreamEnabled, sendIntervalMs,
 *   autoLearning/*
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

  // Telegram credentials (strings)
  if (json.get(val, "telegramBotToken") && !val.stringValue.isEmpty())
    out.telegramBotToken = val.stringValue;
  if (json.get(val, "telegramChatId")   && !val.stringValue.isEmpty())
    out.telegramChatId = val.stringValue;

  // Auto Learning Beban Normal
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
    "[Firebase] Settings synced → thr=%.1fA warn%%=%.0f PF=%.2f f=%.0fHz "
    "cal_I=%.3f cal_V=%.2f stream=%d sendMs=%lu buzzer=%d cutoff=%d TG=%s learn=%d\n",
    out.thresholdArus, out.warningPercent, out.powerFactorEstimate, out.frequencyHz,
    out.arusCalibration, out.teganganCalibration,
    out.realtimeStreamEnabled, out.sendIntervalMs, out.buzzerEnabled, out.autoCutoffEnabled,
    out.telegramBotToken.isEmpty() ? "unconfigured" : "configured",
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

  bool ok = Firebase.RTDB.updateNode(&fbData, "/settings/autoLearning", &json);
  if (!ok) {
    Serial.println("[Firebase] updateAutoLearningStatus gagal: " + fbData.errorReason());
  }
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

  bool resultOk = Firebase.RTDB.updateNode(&fbData, "/settings/autoLearning", &json);
  if (!resultOk) {
    Serial.println("[Firebase] writeAutoLearningResult gagal: " + fbData.errorReason());
  }

  bool thresholdOk = true;
  if (applyToThreshold) {
    thresholdOk = Firebase.RTDB.setFloat(&fbData, "/settings/thresholdArus", learnedThresholdArus);
    if (!thresholdOk) {
      Serial.println("[Firebase] apply learned threshold gagal: " + fbData.errorReason());
      updateAutoLearningStatus(requestId, "complete", false,
        "Learning selesai, tetapi threshold gagal diperbarui.");
    }
  }
  return resultOk && thresholdOk;
}

#endif // FIREBASE_HANDLER_H

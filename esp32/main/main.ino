/**
 * main.ino
 * ─────────────────────────────────────────────────────────────
 * IoT Alat Deteksi Kebocoran Arus Listrik — ESP32 Firmware
 * Project: Alat Deteksi Kebocoran Arus Listrik Berbasis IoT
 *          dengan Notifikasi Real-Time
 *
 * Hardware:
 *   - ESP32 DevKitC V4 (WROOM-32D / WROOM-32U)
 *   - SCT-013 (sensor arus AC)
 *   - ZMPT101B (sensor tegangan AC)
 *   - Relay 2-channel (PIN_RELAY1 = beban utama)
 *   - Buzzer pasif
 *   - (Opsional) LCD 1602 I2C
 *
 * Libraries (install via Arduino Library Manager):
 *   - Firebase ESP Client by Mobizt
 *   - ArduinoJson by Benoit Blanchon
 *   - URLEncode by Masoud K
 *   - (Opsional) LiquidCrystal I2C by Frank de Brabander
 *
 * Board: "ESP32 Dev Module" @ Arduino IDE
 *   Tools → Board → esp32 → ESP32 Dev Module
 *   Tools → Partition Scheme → Default
 *   Upload Speed → 115200 atau 921600
 * ─────────────────────────────────────────────────────────────
 */

#include <Arduino.h>
#include <WiFi.h>
#include "config.h"
#include "sensors.h"
#include "firebase_handler.h"
#include "telegram_handler.h"

// ─── Opsional: LCD ───────────────────────────────────────────
#ifdef USE_LCD
  #include <LiquidCrystal_I2C.h>
  LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);
#endif

// ─── State Global ─────────────────────────────────────────────
struct SensorData {
  float  arus       = 0.0f;
  float  tegangan   = 0.0f;
  float  daya       = 0.0f;
  String status     = "NORMAL";
  int    relay      = 1;     // 1=ON, 0=OFF
};

struct Settings {
  float  thresholdArus    = DEFAULT_THRESHOLD_ARUS;
  bool   buzzerEnabled    = true;
  bool   autoCutoffEnabled= true;
};

SensorData current;
Settings   settings;
String     lastStatus     = "NORMAL";

// Timer millis
unsigned long lastSendMs       = 0;
unsigned long lastSettingsSyncMs = 0;
unsigned long lastLogMs        = 0;

// Log hanya saat status berubah (bukan setiap 2 detik)
bool statusChanged = false;

// ─── WiFi connect ─────────────────────────────────────────────
void connectWiFi() {
  Serial.printf("\n[WiFi] Menghubungkan ke %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(1000);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Terhubung! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] GAGAL! Restart...");
    ESP.restart();
  }
}

// ─── Buzzer helpers ───────────────────────────────────────────
void buzzerBeep(int times = 3, int onMs = 200, int offMs = 100) {
  if (!settings.buzzerEnabled) return;
  for (int i = 0; i < times; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(onMs);
    digitalWrite(PIN_BUZZER, LOW);
    delay(offMs);
  }
}

void buzzerLongBeep() {
  if (!settings.buzzerEnabled) return;
  digitalWrite(PIN_BUZZER, HIGH);
  delay(1500);
  digitalWrite(PIN_BUZZER, LOW);
}

// ─── Relay control ────────────────────────────────────────────
void setRelay(int val) {
  // Relay aktif LOW: val=1(ON) → pin LOW, val=0(OFF) → pin HIGH
  digitalWrite(PIN_RELAY1, val == 1 ? LOW : HIGH);
  current.relay = val;
  Serial.printf("[Relay] Set relay ke: %s\n", val == 1 ? "ON" : "OFF");
}

// ─── Update LCD (opsional) ────────────────────────────────────
#ifdef USE_LCD
void updateLCD() {
  lcd.setCursor(0, 0);
  lcd.printf("A:%.2fA  V:%.0fV ", current.arus, current.tegangan);
  lcd.setCursor(0, 1);
  lcd.printf("%-8s R:%s", current.status.c_str(), current.relay ? "ON " : "OFF");
}
#endif

// ─── setup() ──────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n======================================");
  Serial.println("  IoT Deteksi Kebocoran Arus Listrik");
  Serial.println("======================================");

  // Pin output
  pinMode(PIN_RELAY1, OUTPUT);
  pinMode(PIN_RELAY2, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  // Relay ON saat startup (default beban terhubung)
  setRelay(1);

  // Inisialisasi ADC sensor
  initSensors();

  // Opsional LCD
  #ifdef USE_LCD
    lcd.init();
    lcd.backlight();
    lcd.print("  Inisialisasi...");
  #endif

  // Hubungkan WiFi
  connectWiFi();

  // Inisialisasi Firebase
  initFirebase();

  // Tunggu Firebase auth token siap (max 10 detik)
  Serial.print("[Firebase] Menunggu token");
  for (int i = 0; i < 10 && !isFirebaseReady(); i++) {
    Serial.print(".");
    delay(1000);
  }
  Serial.println(isFirebaseReady() ? " SIAP!" : " TIMEOUT.");

  // Baca settings awal dari Firebase
  readSettings(settings.thresholdArus, settings.buzzerEnabled, settings.autoCutoffEnabled);

  // Boot notification Telegram
  sendTelegram("🟢 <b>ESP32 Online</b>\nPerangkat IoT Deteksi Arus Listrik aktif.\nThreshold: " +
               String(settings.thresholdArus, 1) + " A", true);

  Serial.println("[Setup] Selesai! Memulai monitoring...\n");
  buzzerBeep(2, 150, 80);
}

// ─── loop() ───────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // ── Periksa koneksi WiFi ──────────────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Terputus! Reconnect...");
    WiFi.reconnect();
    delay(3000);
    return;
  }

  // ── Baca sensor ──────────────────────────────────────────
  current.arus     = readArus();
  current.tegangan = readTegangan();
  current.daya     = computeDaya(current.arus, current.tegangan);

  // ── Tentukan status ───────────────────────────────────────
  String newStatus = determineStatus(current.arus, current.tegangan, settings.thresholdArus);
  statusChanged    = (newStatus != lastStatus);

  // ── Auto cutoff ─────────────────────────────────────────
  if (settings.autoCutoffEnabled &&
     (newStatus == "DANGER" || newStatus == "LEAKAGE") &&
      current.relay == 1) {

    Serial.println("[Auto-Cutoff] Kondisi berbahaya! Relay dimatikan.");
    setRelay(0);
    updateRelayState(0);    // update Firebase
    buzzerLongBeep();

    // Log peristiwa auto-cutoff
    writeLog(current.arus, current.tegangan, newStatus, 0, "auto_cutoff");
  }

  current.status = newStatus;

  // ── Buzzer warning ────────────────────────────────────────
  if (settings.buzzerEnabled) {
    if (newStatus == "WARNING" && statusChanged) {
      buzzerBeep(2, 100, 100);
    }
    if (newStatus == "LEAKAGE" && statusChanged) {
      buzzerBeep(5, 200, 100);
    }
  }

  // ── Kirim ke Firebase (interval) ─────────────────────────
  if (now - lastSendMs >= SEND_INTERVAL_MS) {
    lastSendMs = now;

    bool ok = writeMonitorData(current.arus, current.tegangan,
                                current.status, current.relay);
    Serial.printf("[Monitor] A=%.2f V=%.1f S=%s R=%d OK=%d\n",
                  current.arus, current.tegangan,
                  current.status.c_str(), current.relay, ok);

    // Update LCD
    #ifdef USE_LCD
      updateLCD();
    #endif
  }

  // ── Tulis log saat status berubah ────────────────────────
  if (statusChanged && now - lastLogMs > 2000) {
    lastLogMs = now;
    writeLog(current.arus, current.tegangan, newStatus, current.relay, "esp32");
  }

  // ── Baca command relay dari Firebase ─────────────────────
  // Periksa setiap SEND_INTERVAL untuk respons cepat
  if (now % 2500 < 50) {   // sekitar setiap 2.5 detik
    int cmdRelay = current.relay;
    if (readRelayCommand(cmdRelay) && cmdRelay != current.relay) {
      Serial.printf("[Relay] Command dari web: %s\n", cmdRelay ? "ON" : "OFF");

      // Jika auto-cutoff aktif dan kondisi masih berbahaya, tolak command ON
      if (cmdRelay == 1 && settings.autoCutoffEnabled &&
         (current.status == "DANGER" || current.status == "LEAKAGE")) {
        Serial.println("[Relay] Relay tidak bisa ON saat kondisi berbahaya!");
        updateRelayState(0);  // paksa kembali ke OFF di Firebase
      } else {
        setRelay(cmdRelay);
        writeLog(current.arus, current.tegangan, current.status, cmdRelay, "web_command");
        buzzerBeep(1, 80, 0);
      }
    }
  }

  // ── Kirim Telegram alert ─────────────────────────────────
  sendAlertIfNeeded(newStatus, lastStatus,
                    current.arus, current.tegangan, current.relay);

  // ── Sinkron settings dari Firebase ───────────────────────
  if (now - lastSettingsSyncMs >= SETTINGS_SYNC_MS) {
    lastSettingsSyncMs = now;
    readSettings(settings.thresholdArus, settings.buzzerEnabled, settings.autoCutoffEnabled);
  }

  // Simpan status terakhir
  lastStatus = newStatus;

  // Delay kecil agar CPU tidak terlalu sibuk (ADC sampling sudah blocking)
  delay(10);
}

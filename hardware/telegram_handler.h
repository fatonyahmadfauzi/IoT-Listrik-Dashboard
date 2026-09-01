/**
 * telegram_handler.h — Telegram Bot Notification Handler
 * ---
 * KEY CHANGE from previous version:
 *   Telegram Bot Token and Chat ID are no longer compile-time macros.
 *   They are passed as RUNTIME PARAMETERS loaded from Firebase /settings.
 *   This means they can be changed from the web Settings page without
 *   reflashing the firmware.
 *
 * Required library:
 *   HTTPClient — built-in to ESP32 Arduino core (no install needed)
 *   UrlEncode  — search "URLEncode" by Masoud K in Arduino Library Manager
 * ---
 */

#ifndef TELEGRAM_HANDLER_H
#define TELEGRAM_HANDLER_H

#include "config.h"
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <UrlEncode.h>
#include <esp_task_wdt.h>  // FIX: reset WDT saat HTTP blocking

static const char* TELEGRAM_API_BASE = "https://api.telegram.org/bot";

// --- Anti-spam state ---
static unsigned long _lastTelegramMs = 0;
static String        _lastTelegramMsg = "";

bool isTelegramChatSeparator(char c) {
  return c == ',' || c == ';' || c == '\n' || c == '\r' || c == '\t' || c == ' ';
}

bool sendTelegramToOneChat(const String& message,
                           const String& botToken,
                           const String& chatId) {
  String url = String(TELEGRAM_API_BASE)
             + botToken
             + "/sendMessage?chat_id=" + urlEncode(chatId)
             + "&text="               + urlEncode(message)
             + "&parse_mode=HTML";

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    http.begin(client, url);
  http.setTimeout(8000);
  int code = http.GET();
  http.end();

  if (code == 200) {
    Serial.printf("[Telegram] Terkirim ke %s (HTTP %d)\n", chatId.c_str(), code);
    return true;
  }

  Serial.printf("[Telegram] Gagal ke %s (HTTP %d)\n", chatId.c_str(), code);
  return false;
}

// --- sendTelegram() ---
/**
 * Send a text message to a Telegram chat via Bot API.
 *
 * @param message   HTML-formatted message body
 * @param botToken  Bot token from RuntimeSettings.telegramBotToken
 * @param chatId    One or more chat/group IDs from RuntimeSettings.telegramChatId
 * @param cooldownMs Min milliseconds between repeated messages (anti-spam)
 * @param force     If true, bypass cooldown and duplicate checks
 * @return true if message was sent successfully
 */
bool sendTelegram(const String& message,
                  const String& botToken,
                  const String& chatId,
                  unsigned long cooldownMs = 30000,
                  bool          force      = false) {

  // Validate credentials — silently skip if not configured
  if (botToken.isEmpty() || chatId.isEmpty()) {
    Serial.println("[Telegram] Skip: token/chatId belum dikonfigurasi di Firebase /settings");
    return false;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Telegram] Skip: WiFi tidak terhubung");
    return false;
  }

  unsigned long now = millis();

  if (!force) {
    // Cooldown check
    if ((now - _lastTelegramMs) < cooldownMs) {
      Serial.println("[Telegram] Skip: cooldown aktif");
      return false;
    }
    // Duplicate message check
    if (message == _lastTelegramMsg) {
      Serial.println("[Telegram] Skip: pesan yang sama");
      return false;
    }
  }

  int total = 0;
  int sent = 0;
  String current = "";

  for (size_t i = 0; i <= chatId.length(); i++) {
    char c = (i < chatId.length()) ? chatId.charAt(i) : ',';
    if (isTelegramChatSeparator(c)) {
      current.trim();
      if (!current.isEmpty()) {
        total++;
        if (sendTelegramToOneChat(message, botToken, current)) sent++;
      }
      current = "";
    } else {
      current += c;
    }
  }

  bool ok = sent > 0;
  if (ok) {
    _lastTelegramMs  = now;
    _lastTelegramMsg = message;
    Serial.printf("[Telegram] Terkirim ke %d/%d tujuan\n", sent, total);
  } else {
    Serial.printf("[Telegram] Gagal ke semua tujuan (%d)\n", total);
  }
  return ok;
}

// --- buildAlertMessage() ---
/**
 * Build a formatted Telegram HTML alert message.
 *
 * @param status    Current system status
 * @param arus      Current reading (A)
 * @param tegangan  Voltage reading (V)
 * @param relay     Relay state (0=OFF, 1=ON)
 * @return String   HTML-formatted message
 */
String buildAlertMessage(const String& status,
                          const String& previousStatus,
                          float arus, float tegangan,
                          float dayaW, float apparentPowerVa,
                          float energiKwh, float frekuensi, float powerFactor,
                          int relay, const String& sensorSource) {
  const char* emoji;
  const char* title;

  if      (status == "DANGER")  { emoji = "🚨"; title = "<b>BAHAYA — ARUS ≥ THRESHOLD!</b>"; }
  else if (status == "WARNING") { emoji = "🔔"; title = "<b>Peringatan Arus Mendekati Batas</b>"; }
  else if (status == "SENSOR_ERROR") { emoji = "\xE2\x9A\xA0\xEF\xB8\x8F"; title = "<b>SENSOR ERROR \xE2\x80\x94 Pembacaan Sensor Gagal!</b>"; }
  else                          { emoji = "✅"; title = "<b>Sistem Kembali NORMAL</b>"; }

  char buf[896];
  snprintf(buf, sizeof(buf),
    "%s %s\n\n"
    "Status sebelumnya: <code>%s -> %s</code>\n"
    "<b>Snapshot Data Realtime:</b>\n"
    "  Arus     : <code>%.2f A</code>\n"
    "  Tegangan : <code>%.1f V</code>\n"
    "  Daya aktif : <code>%.1f W</code>\n"
    "  Daya semu  : <code>%.1f VA</code>\n"
    "  Energi     : <code>%.4f kWh</code>\n"
    "  PF         : <code>%.2f</code>\n"
    "  Frekuensi  : <code>%.1f Hz</code>\n"
    "  Relay    : <code>%s</code>\n\n"
    "Sumber meter: <code>%s</code>\n"
    "Uptime: <code>%lu s</code>",
    emoji, title,
    previousStatus.c_str(), status.c_str(),
    arus, tegangan,
    dayaW, apparentPowerVa, energiKwh, powerFactor, frekuensi,
    relay == 1 ? "ON" : "OFF",
    sensorSource.c_str(),
    millis() / 1000UL
  );

  return String(buf);
}

// --- sendAlertIfNeeded() ---
/**
 * Send a Telegram alert only when status changes to/from a
 * critical state. Prevents alert fatigue from repeated messages.
 *
 * Triggers on:
 *  - Transition INTO DANGER or WARNING (from NORMAL)
 *  - Recovery FROM DANGER back to NORMAL
 *
 * @param newStatus   Current status string
 * @param lastStatus  Previous status string
 * @param arus        Current reading (A)
 * @param tegangan    Voltage reading (V)
 * @param relay       Relay state
 * @param botToken    From RuntimeSettings.telegramBotToken
 * @param chatId      One or more IDs from RuntimeSettings.telegramChatId
 * @param cooldownMs  From RuntimeSettings.telegramCooldownMs
 */
String buildRelayMessage(int relayVal, const String& cause,
                         float arus, float tegangan,
                         float dayaW, float apparentPowerVa,
                         float energiKwh, float frekuensi, float powerFactor,
                         const String& status, const String& sensorSource) {
  const char* icon = relayVal == 1
    ? "\xF0\x9F\x9F\xA2"
    : (cause == "auto_cutoff" ? "\xF0\x9F\x94\xB4" : "\xE2\x9A\xAB");
  const char* title = relayVal == 1
    ? "Relay Dinyalakan (ON)"
    : (cause == "auto_cutoff" ? "Relay Dimatikan Otomatis (Auto-Cutoff)" : "Relay Dimatikan (OFF)");
  const char* causeText = cause == "auto_cutoff"
    ? "Auto-Cutoff (kondisi berbahaya)"
    : (cause == "web_command" ? "Perintah Dashboard Web" : cause.c_str());

  char buf[896];
  snprintf(buf, sizeof(buf),
    "%s <b>%s</b>\n\n"
    "<b>Snapshot data realtime saat perintah:</b>\n"
    "  Arus       : <code>%.2f A</code>\n"
    "  Tegangan   : <code>%.1f V</code>\n"
    "  Daya aktif : <code>%.1f W</code>\n"
    "  Daya semu  : <code>%.1f VA</code>\n"
    "  Energi     : <code>%.4f kWh</code>\n"
    "  PF         : <code>%.2f</code>\n"
    "  Frekuensi  : <code>%.1f Hz</code>\n"
    "  Status     : <code>%s</code>\n"
    "  Penyebab   : <code>%s</code>\n"
    "  Sumber meter: <code>%s</code>\n"
    "  Uptime     : <code>%lu s</code>",
    icon, title,
    arus, tegangan, dayaW, apparentPowerVa, energiKwh, powerFactor, frekuensi,
    status.c_str(), causeText, sensorSource.c_str(), millis() / 1000UL
  );
  return String(buf);
}

String buildRealtimeMessage(float arus, float tegangan,
                            float dayaW, float apparentPowerVa,
                            float energiKwh, float frekuensi, float powerFactor,
                            const String& status, int relay,
                            const String& sensorSource) {
  char buf[896];
  snprintf(buf, sizeof(buf),
    "\xF0\x9F\x93\xA1 <b>Data Realtime Listrik</b>\n\n"
    "Status      : <code>%s</code>\n"
    "Arus        : <code>%.2f A</code>\n"
    "Tegangan    : <code>%.1f V</code>\n"
    "Daya aktif  : <code>%.1f W</code>\n"
    "Daya semu   : <code>%.1f VA</code>\n"
    "Energi      : <code>%.4f kWh</code>\n"
    "Power factor: <code>%.2f</code>\n"
    "Frekuensi   : <code>%.1f Hz</code>\n"
    "Relay       : <code>%s</code>\n"
    "Sumber      : <code>%s</code>\n"
    "Uptime      : <code>%lu s</code>",
    status.c_str(), arus, tegangan, dayaW, apparentPowerVa,
    energiKwh, powerFactor, frekuensi, relay == 1 ? "ON" : "OFF",
    sensorSource.c_str(), millis() / 1000UL
  );
  return String(buf);
}

void sendAlertIfNeeded(const String& newStatus, const String& lastStatus,
                        float arus, float tegangan,
                        float dayaW, float apparentPowerVa,
                        float energiKwh, float frekuensi, float powerFactor,
                        int relay, const String& sensorSource,
                        const String& botToken, const String& chatId,
                        unsigned long cooldownMs) {
  bool shouldSend = false;

  if (newStatus == "DANGER"       && lastStatus != "DANGER")        shouldSend = true;
  if (newStatus == "WARNING"      && lastStatus == "NORMAL")        shouldSend = true;
  if (newStatus == "SENSOR_ERROR" && lastStatus != "SENSOR_ERROR") shouldSend = true;
  if (newStatus == "NORMAL"       && (lastStatus == "DANGER" || lastStatus == "WARNING" 
                                      || lastStatus == "LEAKAGE" || lastStatus == "SENSOR_ERROR")) shouldSend = true;

  if (shouldSend) {
    String msg = buildAlertMessage(
      newStatus, lastStatus,
      arus, tegangan, dayaW, apparentPowerVa,
      energiKwh, frekuensi, powerFactor,
      relay, sensorSource
    );
    sendTelegram(msg, botToken, chatId, cooldownMs);
  }
}

#endif // TELEGRAM_HANDLER_H

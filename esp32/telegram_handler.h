/**
 * telegram_handler.h — Telegram Bot Notification Handler
 * ─────────────────────────────────────────────────────────────────────
 * KEY CHANGE from previous version:
 *   Telegram Bot Token and Chat ID are no longer compile-time macros.
 *   They are passed as RUNTIME PARAMETERS loaded from Firebase /settings.
 *   This means they can be changed from the web Settings page without
 *   reflashing the firmware.
 *
 * Required library:
 *   HTTPClient — built-in to ESP32 Arduino core (no install needed)
 *   UrlEncode  — search "URLEncode" by Masoud K in Arduino Library Manager
 * ─────────────────────────────────────────────────────────────────────
 */

#ifndef TELEGRAM_HANDLER_H
#define TELEGRAM_HANDLER_H

#include "config.h"
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <UrlEncode.h>

static const char* TELEGRAM_API_BASE = "https://api.telegram.org/bot";

// ── Anti-spam state ───────────────────────────────────────────
static unsigned long _lastTelegramMs = 0;
static String        _lastTelegramMsg = "";

// ─── sendTelegram() ───────────────────────────────────────────
/**
 * Send a text message to a Telegram chat via Bot API.
 *
 * @param message   HTML-formatted message body
 * @param botToken  Bot token from RuntimeSettings.telegramBotToken
 * @param chatId    Chat/group ID from RuntimeSettings.telegramChatId
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

  // Build Telegram sendMessage URL
  String url = String(TELEGRAM_API_BASE)
             + botToken
             + "/sendMessage?chat_id=" + urlEncode(chatId)
             + "&text="               + urlEncode(message)
             + "&parse_mode=HTML";

  HTTPClient http;
  http.begin(url);
  http.setTimeout(8000);
  int code = http.GET();
  http.end();

  bool ok = (code == 200);
  if (ok) {
    _lastTelegramMs  = now;
    _lastTelegramMsg = message;
    Serial.printf("[Telegram] Terkirim (HTTP %d)\n", code);
  } else {
    Serial.printf("[Telegram] Gagal (HTTP %d)\n", code);
  }
  return ok;
}

// ─── buildAlertMessage() ──────────────────────────────────────
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
                          float arus, float tegangan, int relay) {
  const char* emoji;
  const char* title;

  if      (status == "DANGER")  { emoji = "🚨"; title = "<b>BAHAYA KRITIS!</b>"; }
  else if (status == "LEAKAGE") { emoji = "⚠️"; title = "<b>KEBOCORAN ARUS!</b>"; }
  else if (status == "WARNING") { emoji = "🔔"; title = "<b>Peringatan Arus Tinggi</b>"; }
  else                          { emoji = "✅"; title = "<b>Sistem Kembali NORMAL</b>"; }

  char buf[512];
  snprintf(buf, sizeof(buf),
    "%s %s\n\n"
    "📊 <b>Data Sensor:</b>\n"
    "  ⚡ Arus     : <code>%.2f A</code>\n"
    "  🔌 Tegangan : <code>%.1f V</code>\n"
    "  🔁 Relay    : <code>%s</code>\n\n"
    "⏱ Uptime: <code>%lu s</code>",
    emoji, title,
    arus, tegangan,
    relay == 1 ? "ON" : "OFF",
    millis() / 1000UL
  );

  return String(buf);
}

// ─── sendAlertIfNeeded() ──────────────────────────────────────
/**
 * Send a Telegram alert only when status changes to/from a
 * critical state. Prevents alert fatigue from repeated messages.
 *
 * Triggers on:
 *  - Transition INTO DANGER, LEAKAGE, or WARNING (from NORMAL)
 *  - Recovery FROM DANGER or LEAKAGE back to NORMAL
 *
 * @param newStatus   Current status string
 * @param lastStatus  Previous status string
 * @param arus        Current reading (A)
 * @param tegangan    Voltage reading (V)
 * @param relay       Relay state
 * @param botToken    From RuntimeSettings.telegramBotToken
 * @param chatId      From RuntimeSettings.telegramChatId
 * @param cooldownMs  From RuntimeSettings.telegramCooldownMs
 */
void sendAlertIfNeeded(const String& newStatus, const String& lastStatus,
                        float arus, float tegangan, int relay,
                        const String& botToken, const String& chatId,
                        unsigned long cooldownMs) {
  bool shouldSend = false;

  if (newStatus == "DANGER"  && lastStatus != "DANGER")   shouldSend = true;
  if (newStatus == "LEAKAGE" && lastStatus != "LEAKAGE")  shouldSend = true;
  if (newStatus == "WARNING" && lastStatus == "NORMAL")   shouldSend = true;
  if (newStatus == "NORMAL"  &&
     (lastStatus == "DANGER" || lastStatus == "LEAKAGE")) shouldSend = true;

  if (shouldSend) {
    String msg = buildAlertMessage(newStatus, arus, tegangan, relay);
    sendTelegram(msg, botToken, chatId, cooldownMs);
  }
}

#endif // TELEGRAM_HANDLER_H

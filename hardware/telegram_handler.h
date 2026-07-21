/**
 * telegram_handler.h â€” Telegram Bot Notification Handler
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * KEY CHANGE from previous version:
 *   Telegram Bot Token and Chat ID are no longer compile-time macros.
 *   They are passed as RUNTIME PARAMETERS loaded from Firebase /settings.
 *   This means they can be changed from the web Settings page without
 *   reflashing the firmware.
 *
 * Required library:
 *   HTTPClient â€” built-in to ESP32 Arduino core (no install needed)
 *   UrlEncode  â€” search "URLEncode" by Masoud K in Arduino Library Manager
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Anti-spam state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ sendTelegram() â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // Validate credentials â€” silently skip if not configured
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

// â”€â”€â”€ buildAlertMessage() â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  if      (status == "DANGER")  { emoji = "ðŸš¨"; title = "<b>BAHAYA â€” ARUS â‰¥ THRESHOLD!</b>"; }
  else if (status == "WARNING") { emoji = "ðŸ””"; title = "<b>Peringatan Arus Mendekati Batas</b>"; }
  else                          { emoji = "âœ…"; title = "<b>Sistem Kembali NORMAL</b>"; }

  char buf[512];
  snprintf(buf, sizeof(buf),
    "%s %s\n\n"
    "ðŸ“Š <b>Data Sensor:</b>\n"
    "  âš¡ Arus     : <code>%.2f A</code>\n"
    "  ðŸ”Œ Tegangan : <code>%.1f V</code>\n"
    "  ðŸ” Relay    : <code>%s</code>\n\n"
    "â± Uptime: <code>%lu s</code>",
    emoji, title,
    arus, tegangan,
    relay == 1 ? "ON" : "OFF",
    millis() / 1000UL
  );

  return String(buf);
}

// â”€â”€â”€ sendAlertIfNeeded() â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
void sendAlertIfNeeded(const String& newStatus, const String& lastStatus,
                        float arus, float tegangan, int relay,
                        const String& botToken, const String& chatId,
                        unsigned long cooldownMs) {
  bool shouldSend = false;

  if (newStatus == "DANGER"  && lastStatus != "DANGER")   shouldSend = true;
  if (newStatus == "WARNING" && lastStatus == "NORMAL")   shouldSend = true;
  if (newStatus == "NORMAL"  && lastStatus == "DANGER")   shouldSend = true;

  if (shouldSend) {
    String msg = buildAlertMessage(newStatus, arus, tegangan, relay);
    sendTelegram(msg, botToken, chatId, cooldownMs);
  }
}

#endif // TELEGRAM_HANDLER_H

/**
 * discord_handler.h â€” Discord Webhook Notification Handler
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Kirim notifikasi ke Discord via Webhook URL yang dikonfigurasi di
 * Firebase /settings/discord/webhookAlerts
 *
 * Notifikasi yang dikirim:
 *   - Boot: device online
 *   - Status change: WARNING / LEAKAGE / DANGER / NORMAL recovery
 *   - Relay ON / OFF (oleh web command atau auto-cutoff)
 *
 * Required library:
 *   HTTPClient â€” built-in to ESP32 Arduino core (no install needed)
 *   ArduinoJson â€” install via Arduino Library Manager
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

#ifndef DISCORD_HANDLER_H
#define DISCORD_HANDLER_H

#include "config.h"
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>  // FIX: reset WDT saat HTTP blocking

// â”€â”€ Anti-spam state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
static unsigned long _lastDiscordMs  = 0;
static String        _lastDiscordMsg = "";

// â”€â”€â”€ sendDiscordWebhook() â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Kirim Discord embed ke webhook URL.
 *
 * @param webhookUrl  URL webhook Discord (dari RuntimeSettings.discordWebhookAlerts)
 * @param title       Judul embed
 * @param description Isi/body embed
 * @param color       Warna sisi kiri embed (decimal: merah=16711680, hijau=65280, kuning=16776960)
 * @param cooldownMs  Jeda minimum antar pesan (ms)
 * @param force       Jika true, bypass cooldown & duplicate check
 * @return true jika berhasil terkirim (HTTP 200/204)
 */
bool sendDiscordWebhook(const String& webhookUrl,
                        const String& title,
                        const String& description,
                        uint32_t      color      = 0x00B0FF,  // biru default
                        unsigned long cooldownMs = 30000,
                        bool          force      = false) {

  // Validasi URL
  if (webhookUrl.isEmpty() || !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    Serial.println("[Discord] Skip: webhook URL belum dikonfigurasi atau tidak valid.");
    return false;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Discord] Skip: WiFi tidak terhubung.");
    return false;
  }

  unsigned long now = millis();
  String dedupeKey = title + "|" + description;

  if (!force) {
    if ((now - _lastDiscordMs) < cooldownMs) {
      Serial.println("[Discord] Skip: cooldown aktif.");
      return false;
    }
    if (dedupeKey == _lastDiscordMsg) {
      Serial.println("[Discord] Skip: pesan yang sama.");
      return false;
    }
  }

  // Build JSON payload â€” Discord embed format
  // Gunakan String manual agar tidak perlu ArduinoJson dependency
  String escapedTitle = title;
  String escapedDesc  = description;
  // Escape double-quote dan backslash dalam string
  escapedTitle.replace("\\", "\\\\");
  escapedTitle.replace("\"", "\\\"");
  escapedTitle.replace("\n", "\\n");
  escapedDesc.replace("\\", "\\\\");
  escapedDesc.replace("\"", "\\\"");
  escapedDesc.replace("\n", "\\n");

  char colorHex[12];
  snprintf(colorHex, sizeof(colorHex), "%u", (unsigned int)color);

  String payload = "{\"embeds\":[{\"title\":\"";
  payload += escapedTitle;
  payload += "\",\"description\":\"";
  payload += escapedDesc;
  payload += "\",\"color\":";
  payload += colorHex;
  payload += "}]}";

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    http.begin(client, webhookUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  int code = http.POST(payload);
  http.end();

  // Discord mengembalikan 204 No Content saat sukses
  bool ok = (code == 200 || code == 204);
  if (ok) {
    _lastDiscordMs  = now;
    _lastDiscordMsg = dedupeKey;
    Serial.printf("[Discord] Terkirim (HTTP %d)\n", code);
  } else {
    Serial.printf("[Discord] Gagal (HTTP %d)\n", code);
  }
  return ok;
}

// â”€â”€ Warna embed standar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
#define DISCORD_COLOR_GREEN    0x2ECC71   // Normal / online
#define DISCORD_COLOR_YELLOW   0xF1C40F   // Warning
#define DISCORD_COLOR_ORANGE   0xE67E22   // Leakage
#define DISCORD_COLOR_RED      0xE74C3C   // Danger
#define DISCORD_COLOR_BLUE     0x3498DB   // Info / relay ON
#define DISCORD_COLOR_GRAY     0x95A5A6   // Relay OFF / offline

// â”€â”€â”€ buildDiscordStatusEmbed() â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Buat judul + deskripsi embed untuk notifikasi perubahan status.
 */
void buildDiscordStatusEmbed(const String& status,
                              float arus, float tegangan, int relay,
                              String& outTitle, String& outDesc, uint32_t& outColor) {
  if (status == "DANGER") {
    outTitle = "ðŸš¨ BAHAYA â€” Arus â‰¥ Threshold!";
    outColor = DISCORD_COLOR_RED;
  } else if (status == "WARNING") {
    outTitle = "ðŸ”” Peringatan â€” Arus Mendekati Batas";
    outColor = DISCORD_COLOR_YELLOW;
  } else if (status == "LEAKAGE") {
    outTitle = "âš ï¸ Kebocoran Arus Terdeteksi!";
    outColor = DISCORD_COLOR_ORANGE;
  } else {
    outTitle = "âœ… Sistem Kembali Normal";
    outColor = DISCORD_COLOR_GREEN;
  }

  char buf[256];
  snprintf(buf, sizeof(buf),
    "**Data Sensor:**\n"
    "âš¡ Arus     : `%.2f A`\n"
    "ðŸ”Œ Tegangan : `%.1f V`\n"
    "ðŸ” Relay    : `%s`\n"
    "â± Uptime   : `%lu s`",
    arus, tegangan,
    relay == 1 ? "ON" : "OFF",
    millis() / 1000UL
  );
  outDesc = String(buf);
}

// â”€â”€â”€ buildDiscordRelayEmbed() â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Buat judul + deskripsi embed untuk notifikasi relay ON/OFF.
 */
void buildDiscordRelayEmbed(int relayVal, const String& cause,
                             float arus, float tegangan, const String& status,
                             String& outTitle, String& outDesc, uint32_t& outColor) {
  if (relayVal == 1) {
    outTitle = "ðŸŸ¢ Relay Dinyalakan (ON)";
    outColor = DISCORD_COLOR_BLUE;
  } else {
    if (cause == "auto_cutoff") {
      outTitle = "ðŸ”´ Relay Dimatikan Otomatis (Auto-Cutoff)";
      outColor = DISCORD_COLOR_RED;
    } else {
      outTitle = "âš« Relay Dimatikan (OFF)";
      outColor = DISCORD_COLOR_GRAY;
    }
  }

  char buf[300];
  snprintf(buf, sizeof(buf),
    "**Data Sensor saat perintah:**\n"
    "âš¡ Arus     : `%.2f A`\n"
    "ðŸ”Œ Tegangan : `%.1f V`\n"
    "ðŸ“Š Status   : `%s`\n"
    "ðŸ“‹ Penyebab : `%s`\n"
    "â± Uptime   : `%lu s`",
    arus, tegangan,
    status.c_str(),
    cause == "auto_cutoff" ? "Auto-Cutoff (kondisi berbahaya)" :
    cause == "web_command"  ? "Perintah dari Dashboard Web"    : cause.c_str(),
    millis() / 1000UL
  );
  outDesc = String(buf);
}

// â”€â”€â”€ sendDiscordStatusAlert() â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Kirim notifikasi Discord saat status berubah (WARNING/LEAKAGE/DANGER/NORMAL).
 * Hanya kirim saat transisi yang relevan (anti-spam).
 */
void sendDiscordStatusAlert(const String& newStatus, const String& lastStatus,
                             float arus, float tegangan, int relay,
                             const String& webhookUrl,
                             unsigned long cooldownMs) {
  bool shouldSend = false;
  if (newStatus == "DANGER"  && lastStatus != "DANGER")  shouldSend = true;
  if (newStatus == "LEAKAGE" && lastStatus != "LEAKAGE") shouldSend = true;
  if (newStatus == "WARNING" && lastStatus == "NORMAL")  shouldSend = true;
  if (newStatus == "NORMAL"  && (lastStatus == "DANGER" || lastStatus == "LEAKAGE")) shouldSend = true;

  if (!shouldSend) return;

  String title, desc;
  uint32_t color;
  buildDiscordStatusEmbed(newStatus, arus, tegangan, relay, title, desc, color);
  sendDiscordWebhook(webhookUrl, title, desc, color, cooldownMs);
}

// â”€â”€â”€ sendDiscordRelayNotif() â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Kirim notifikasi Discord saat relay berubah state.
 * Dipanggil dari main.ino setelah relay command dieksekusi.
 */
void sendDiscordRelayNotif(int relayVal, const String& cause,
                            float arus, float tegangan, const String& status,
                            const String& webhookUrl,
                            unsigned long cooldownMs = 5000) {
  if (webhookUrl.isEmpty()) return;

  String title, desc;
  uint32_t color;
  buildDiscordRelayEmbed(relayVal, cause, arus, tegangan, status, title, desc, color);
  // Relay notification pakai cooldown pendek (5 detik) agar ON/OFF cepat terkirim
  sendDiscordWebhook(webhookUrl, title, desc, color, cooldownMs, true);
}

#endif // DISCORD_HANDLER_H

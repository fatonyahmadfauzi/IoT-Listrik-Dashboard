/**
 * Firebase Cloud Functions — IoT Listrik Dashboard
 * 
 * Notifikasi terintegrasi:
 *   1. FCM Android (alarm nada keras)
 *   2. Discord Webhook per-channel berdasarkan jenis event:
 *      - #⚡-alerts      → Status BAHAYA / WARNING / NORMAL recovery
 *      - #🔌-relay       → Perubahan relay ON/OFF
 *      - #📊-monitoring  → Snapshot data listrik periodik
 *      - #📋-logs        → Entry log aktivitas baru
 * 
 * Konfigurasi Webhook:
 *   Simpan di Firebase Functions Secret (aman, tidak hardcode):
 *   firebase functions:secrets:set DISCORD_WEBHOOK_ALERTS
 *   firebase functions:secrets:set DISCORD_WEBHOOK_RELAY
 *   firebase functions:secrets:set DISCORD_WEBHOOK_MONITORING
 *   firebase functions:secrets:set DISCORD_WEBHOOK_LOGS
 */

const { onValueUpdated, onValueCreated } = require("firebase-functions/v2/database");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();

// ─── Discord Webhook Secrets ───────────────────────────────────────────────
const WEBHOOK_ALERTS     = defineSecret("DISCORD_WEBHOOK_ALERTS");
const WEBHOOK_RELAY      = defineSecret("DISCORD_WEBHOOK_RELAY");
const WEBHOOK_MONITORING = defineSecret("DISCORD_WEBHOOK_MONITORING");
const WEBHOOK_LOGS       = defineSecret("DISCORD_WEBHOOK_LOGS");

// ─── Helper: Kirim embed ke Discord Webhook ────────────────────────────────
async function sendDiscordEmbed(webhookUrl, embed) {
  if (!webhookUrl) {
    console.warn("Discord webhook URL kosong, lewati pengiriman.");
    return;
  }
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Discord webhook error ${res.status}: ${text}`);
    } else {
      console.log(`Discord embed terkirim ke channel.`);
    }
  } catch (err) {
    console.error("Gagal mengirim ke Discord:", err);
  }
}

// ─── Helper: Warna embed berdasarkan status ────────────────────────────────
function statusColor(status) {
  switch ((status || "").toUpperCase()) {
    case "DANGER":  return 0xED4245; // Merah Discord
    case "WARNING": return 0xFEE75C; // Kuning Discord
    case "NORMAL":  return 0x57F287; // Hijau Discord
    default:        return 0x5865F2; // Biru Discord (default)
  }
}

// ─── Helper: Emoji status ─────────────────────────────────────────────────
function statusEmoji(status) {
  switch ((status || "").toUpperCase()) {
    case "DANGER":  return "🔴";
    case "WARNING": return "🟡";
    case "NORMAL":  return "🟢";
    default:        return "🔵";
  }
}

// ─── Timestamp Indonesia ──────────────────────────────────────────────────
function waktuIndonesia() {
  return new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "medium",
  });
}

// ══════════════════════════════════════════════════════════════════════════
// [1] TRIGGER: Status Berubah → #⚡-alerts + FCM Android
// ══════════════════════════════════════════════════════════════════════════
exports.onStatusChanged = onValueUpdated(
  {
    ref: "/listrik/status",
    region: "asia-southeast1",
    secrets: [WEBHOOK_ALERTS],
  },
  async (event) => {
    const statusBaru   = event.data.after.val();
    const statusLama   = event.data.before.val();

    if (statusBaru === statusLama) return;

    const isBahaya  = statusBaru === "DANGER";
    const isWarning = statusBaru === "WARNING";
    const isPulih   = statusBaru === "NORMAL" && (statusLama === "DANGER" || statusLama === "WARNING");

    // Ambil snapshot data listrik terkini untuk embed
    const snap = await admin.database().ref("/listrik").get();
    const d    = snap.val() || {};

    // ── Discord: #⚡-alerts ──
    const embed = {
      title: `${statusEmoji(statusBaru)} Status Kelistrikan: ${statusBaru}`,
      description: isBahaya
        ? "⚠️ **KEBOCORAN ARUS TERDETEKSI!** Relay sedang diputuskan otomatis."
        : isWarning
        ? "⚡ Arus mendekati batas ambang. Pantau dengan seksama."
        : isPulih
        ? "✅ Kondisi kelistrikan telah kembali **NORMAL**."
        : `Status berubah dari \`${statusLama}\` → \`${statusBaru}\``,
      color: statusColor(statusBaru),
      fields: [
        { name: "⚡ Arus",       value: `${d.arus ?? "-"} A`,       inline: true },
        { name: "🔋 Tegangan",   value: `${d.tegangan ?? "-"} V`,   inline: true },
        { name: "💡 Daya",       value: `${d.daya ?? "-"} W`,       inline: true },
        { name: "🔌 Relay",      value: d.relay ? "ON (Aktif)" : "OFF (Mati)", inline: true },
        { name: "📡 Frekuensi",  value: `${d.frekuensi ?? "-"} Hz`, inline: true },
        { name: "📊 PF",         value: `${d.power_factor ?? "-"}`, inline: true },
      ],
      footer: { text: `IoT Listrik Dashboard • ${waktuIndonesia()}` },
      thumbnail: { url: "https://iot-listrik-dashboard.vercel.app/assets/icons/icon-192x192.png" },
    };

    await sendDiscordEmbed(WEBHOOK_ALERTS.value(), embed);

    // ── FCM Android ──
    const fcmAction = isBahaya || isWarning ? "TRIGGER_ALARM" : isPulih ? "STOP_ALARM" : null;
    if (fcmAction) {
      const fcmPayload = {
        topic: "iot_alarms",
        data: { action: fcmAction, status: statusBaru, title: embed.title, message: embed.description },
        android: { priority: "high" },
      };
      try {
        await admin.messaging().send(fcmPayload);
        console.log("FCM terkirim:", fcmAction);
      } catch (err) {
        console.error("FCM error:", err);
      }
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════
// [2] TRIGGER: Relay Berubah → #🔌-relay
// ══════════════════════════════════════════════════════════════════════════
exports.onRelayChanged = onValueUpdated(
  {
    ref: "/listrik/relay",
    region: "asia-southeast1",
    secrets: [WEBHOOK_RELAY],
  },
  async (event) => {
    const relayBaru = event.data.after.val();
    const relayLama = event.data.before.val();

    if (relayBaru === relayLama) return;

    const embed = {
      title: relayBaru ? "🔌 Relay DINYALAKAN" : "🪫 Relay DIMATIKAN",
      description: `Relay listrik baru saja diubah ke posisi **${relayBaru ? "ON" : "OFF"}**.`,
      color: relayBaru ? 0x57F287 : 0xED4245,
      fields: [
        { name: "Status Sebelumnya", value: relayLama ? "ON" : "OFF", inline: true },
        { name: "Status Sekarang",   value: relayBaru ? "ON" : "OFF", inline: true },
      ],
      footer: { text: `IoT Listrik Dashboard • ${waktuIndonesia()}` },
    };

    await sendDiscordEmbed(WEBHOOK_RELAY.value(), embed);
  }
);

// ══════════════════════════════════════════════════════════════════════════
// [3] TRIGGER: Data Listrik Update → #📊-monitoring (rate-limited 1x/5mnt)
// ══════════════════════════════════════════════════════════════════════════
exports.onListrikUpdated = onValueUpdated(
  {
    ref: "/listrik/updated_at",
    region: "asia-southeast1",
    secrets: [WEBHOOK_MONITORING],
  },
  async (event) => {
    // Rate limiting: hanya kirim 1x per 5 menit via flag di RTDB
    const flagRef  = admin.database().ref("/_discord_last_monitoring");
    const flagSnap = await flagRef.get();
    const now      = Date.now();
    const lastSent = flagSnap.val() || 0;

    if (now - lastSent < 5 * 60 * 1000) {
      console.log("Rate limit: skip monitoring Discord (kirim terlalu cepat).");
      return;
    }

    await flagRef.set(now);

    const snap = await admin.database().ref("/listrik").get();
    const d    = snap.val() || {};

    const embed = {
      title: "📊 Update Data Monitoring Listrik",
      color: statusColor(d.status),
      fields: [
        { name: "⚡ Arus",       value: `${d.arus ?? "-"} A`,       inline: true },
        { name: "🔋 Tegangan",   value: `${d.tegangan ?? "-"} V`,   inline: true },
        { name: "💡 Daya Aktif", value: `${d.daya ?? "-"} W`,       inline: true },
        { name: "🔌 Relay",      value: d.relay ? "ON" : "OFF",     inline: true },
        { name: "📡 Frekuensi",  value: `${d.frekuensi ?? "-"} Hz`, inline: true },
        { name: "📊 Power Factor",value: `${d.power_factor ?? "-"}`,inline: true },
        { name: "🔆 Energi",     value: `${d.energi_kwh ?? "-"} kWh`, inline: true },
        { name: "🔴 Status",     value: `${statusEmoji(d.status)} ${d.status ?? "-"}`, inline: true },
      ],
      footer: { text: `IoT Listrik Dashboard • ${waktuIndonesia()}` },
      thumbnail: { url: "https://iot-listrik-dashboard.vercel.app/assets/icons/icon-192x192.png" },
    };

    await sendDiscordEmbed(WEBHOOK_MONITORING.value(), embed);
  }
);

// ══════════════════════════════════════════════════════════════════════════
// [4] TRIGGER: Log Baru → #📋-logs
// ══════════════════════════════════════════════════════════════════════════
exports.onNewLog = onValueCreated(
  {
    ref: "/logs/{logId}",
    region: "asia-southeast1",
    secrets: [WEBHOOK_LOGS],
  },
  async (event) => {
    const log    = event.data.val();
    const logId  = event.params.logId;

    if (!log) return;

    const embed = {
      title: "📋 Aktivitas Log Baru",
      description: log.message || log.pesan || log.keterangan || `Log ID: ${logId}`,
      color: 0x99AAB5, // Abu-abu Discord
      fields: [
        log.type  && { name: "Tipe",    value: String(log.type),   inline: true },
        log.user  && { name: "Pengguna",value: String(log.user),   inline: true },
        log.value !== undefined && { name: "Nilai", value: String(log.value), inline: true },
      ].filter(Boolean),
      footer: { text: `IoT Listrik Dashboard • ${waktuIndonesia()} • ID: ${logId.slice(-6)}` },
    };

    await sendDiscordEmbed(WEBHOOK_LOGS.value(), embed);
  }
);

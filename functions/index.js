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
 * PWA Simulator Functions:
 *   - createTempAccount  → buat akun temp 15 menit + kirim email via Resend
 *   - cleanupTempAccount → hapus akun + data sim setelah expired
 *   - testSimNotification → kirim test notif ke Telegram/Discord
 */

const { onValueUpdated, onValueCreated } = require("firebase-functions/v2/database");
const { onCall, HttpsError }             = require("firebase-functions/v2/https");
const admin  = require("firebase-admin");
const fetch  = require("node-fetch");
const Resend = require("resend").Resend;

admin.initializeApp();

// ─── Environment Variables (via .env) ─────────
const WEBHOOK_ALERTS     = process.env.DISCORD_WEBHOOK_ALERTS || "";
const WEBHOOK_RELAY      = process.env.DISCORD_WEBHOOK_RELAY || "";
const WEBHOOK_MONITORING = process.env.DISCORD_WEBHOOK_MONITORING || "";
const WEBHOOK_LOGS       = process.env.DISCORD_WEBHOOK_LOGS || "";
const RESEND_API_KEY     = process.env.RESEND_API_KEY || "";


// ─── Helper: Discord embed ─────────────────────────────────────
async function sendDiscordEmbed(webhookUrl, embed) {
  if (!webhookUrl) { console.warn("Discord webhook URL kosong."); return; }
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) console.error(`Discord webhook error ${res.status}: ${await res.text()}`);
    else console.log("Discord embed terkirim.");
  } catch (err) { console.error("Gagal ke Discord:", err); }
}

// ─── Helper: Telegram message ──────────────────────────────────
async function sendTelegramMessage(botToken, chatId, text) {
  if (!botToken || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } catch (err) { console.error("Gagal ke Telegram:", err); }
}

function statusColor(s) {
  switch ((s || "").toUpperCase()) {
    case "DANGER":  return 0xED4245;
    case "WARNING": return 0xFEE75C;
    case "NORMAL":  return 0x57F287;
    default:        return 0x5865F2;
  }
}
function statusEmoji(s) {
  switch ((s || "").toUpperCase()) {
    case "DANGER":  return "🔴";
    case "WARNING": return "🟡";
    case "NORMAL":  return "🟢";
    default:        return "🔵";
  }
}
function waktuIndonesia() {
  return new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "medium",
  });
}

// ─── Helper: generate random string ───────────────────────────
function randomStr(len, chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789") {
  let r = "";
  for (let i = 0; i < len; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

// ─── Helper: beautiful email HTML ─────────────────────────────
function buildEmailHTML({ tempEmail, password, expiresAt }) {
  const expiresStr = new Date(expiresAt).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Akun Demo IoT Listrik</title>
</head>
<body style="margin:0;padding:0;background:#070c18;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#070c18;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr><td align="center" style="padding-bottom:32px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#0f2040);border:1px solid rgba(59,130,246,0.3);border-radius:16px;padding:20px 32px;">
          <span style="font-size:40px;">⚡</span>
          <h1 style="color:#e2e8f0;font-size:22px;margin:8px 0 4px 0;font-weight:700;">IoT Listrik Dashboard</h1>
          <p style="color:#94a3b8;font-size:13px;margin:0;">Simulator Akun Demo</p>
        </div>
      </td></tr>

      <!-- Title -->
      <tr><td align="center" style="padding-bottom:24px;">
        <h2 style="color:#e2e8f0;font-size:20px;margin:0;font-weight:700;">🧪 Akun Demo Anda Siap!</h2>
        <p style="color:#94a3b8;font-size:14px;margin:8px 0 0;">Gunakan kredensial berikut untuk mengakses simulator IoT</p>
      </td></tr>

      <!-- Credentials Card -->
      <tr><td style="padding-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);border-radius:12px;padding:24px;">
          <tr>
            <td style="padding-bottom:16px;">
              <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">📧 Email Demo</p>
              <p style="color:#e2e8f0;font-size:16px;font-weight:700;font-family:monospace;margin:0;
                background:rgba(255,255,255,0.05);border-radius:8px;padding:10px 14px;">${tempEmail}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:16px;">
              <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">🔑 Password</p>
              <p style="color:#60a5fa;font-size:18px;font-weight:700;font-family:monospace;margin:0;
                background:rgba(59,130,246,0.1);border-radius:8px;padding:10px 14px;letter-spacing:2px;">${password}</p>
            </td>
          </tr>
          <tr>
            <td>
              <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">⏱ Berlaku Hingga</p>
              <p style="color:#f59e0b;font-size:15px;font-weight:600;font-family:monospace;margin:0;
                background:rgba(245,158,11,0.08);border-radius:8px;padding:10px 14px;">${expiresStr} WIB (15 menit)</p>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- CTA Button -->
      <tr><td align="center" style="padding-bottom:24px;">
        <a href="https://iot-listrik-dashboard.vercel.app/simulator"
          style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;
            text-decoration:none;font-size:16px;font-weight:700;padding:14px 36px;
            border-radius:999px;box-shadow:0 4px 20px rgba(59,130,246,0.4);">
          ⚡ Buka Simulator →
        </a>
      </td></tr>

      <!-- Multi-platform info -->
      <tr><td style="padding-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:20px;">
          <tr><td>
            <p style="color:#34d399;font-size:13px;font-weight:700;margin:0 0 8px;">✅ Login di semua platform:</p>
            <table>
              <tr>
                <td style="color:#94a3b8;font-size:13px;padding:3px 8px;">🌐 Web Browser</td>
                <td style="color:#94a3b8;font-size:13px;padding:3px 8px;">📱 Android App</td>
              </tr>
              <tr>
                <td style="color:#94a3b8;font-size:13px;padding:3px 8px;">🖥 Windows App</td>
                <td style="color:#94a3b8;font-size:13px;padding:3px 8px;">💻 CLI Terminal</td>
              </tr>
            </table>
            <p style="color:#6b7280;font-size:12px;margin:8px 0 0;">Gunakan email dan password di atas untuk login di platform manapun.</p>
          </td></tr>
        </table>
      </td></tr>

      <!-- Warning -->
      <tr><td style="padding-bottom:32px;">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px 20px;">
          <tr><td>
            <p style="color:#f87171;font-size:13px;margin:0;">
              ⚠️ <strong>Perhatian:</strong> Akun ini hanya untuk simulasi. Data akan otomatis dihapus setelah 15 menit.
              Jangan gunakan akun nyata Anda untuk login ke simulator.
            </p>
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td align="center">
        <p style="color:#4b5563;font-size:12px;margin:0;">
          © 2026 IoT Listrik Dashboard · Skripsi S1 Teknik Informatika · Universitas Bina Insani
        </p>
        <p style="color:#374151;font-size:11px;margin:4px 0 0;">
          Email ini dikirim otomatis. Abaikan jika Anda tidak meminta akun demo.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════
// [1] STATUS BERUBAH → #⚡-alerts + FCM Android
// ══════════════════════════════════════════════════════════════
exports.onStatusChanged = onValueUpdated(
  { ref: "/listrik/status", region: "asia-southeast1" },
  async (event) => {
    const statusBaru = event.data.after.val();
    const statusLama = event.data.before.val();
    if (statusBaru === statusLama) return;

    const isBahaya  = statusBaru === "DANGER";
    const isWarning = statusBaru === "WARNING";
    const isPulih   = statusBaru === "NORMAL" && (statusLama === "DANGER" || statusLama === "WARNING");

    const snap = await admin.database().ref("/listrik").get();
    const d    = snap.val() || {};

    const embed = {
      title: `${statusEmoji(statusBaru)} Status Kelistrikan: ${statusBaru}`,
      description: isBahaya
        ? "⚠️ **KEBOCORAN ARUS TERDETEKSI!** Relay sedang diputuskan otomatis."
        : isWarning ? "⚡ Arus mendekati batas ambang. Pantau dengan seksama."
        : isPulih   ? "✅ Kondisi kelistrikan telah kembali **NORMAL**."
        : `Status berubah dari \`${statusLama}\` → \`${statusBaru}\``,
      color: statusColor(statusBaru),
      fields: [
        { name: "⚡ Arus",         value: `${d.arus ?? "-"} A`,                   inline: true },
        { name: "🔋 Tegangan",     value: `${d.tegangan ?? "-"} V`,               inline: true },
        { name: "💡 Daya Aktif",   value: `${d.daya_w ?? d.daya ?? "-"} W`,       inline: true },
        { name: "🔌 Relay",        value: d.relay ? "ON (Aktif)" : "OFF (Mati)",  inline: true },
        { name: "📡 Frekuensi",    value: `${d.frekuensi ?? "-"} Hz`,             inline: true },
        { name: "📊 Power Factor", value: `${d.power_factor ?? "-"}`,             inline: true },
        { name: "🔆 Energi",       value: `${d.energi_kwh ?? "-"} kWh`,           inline: true },
        { name: "⚡ Daya Semu",    value: `${d.daya ?? d.apparent_power ?? "-"} VA`, inline: true },
      ],
      footer: { text: `IoT Listrik Dashboard • ${waktuIndonesia()}` },
      thumbnail: { url: "https://iot-listrik-dashboard.vercel.app/assets/icons/icon-192x192.png" },
    };

    await sendDiscordEmbed(WEBHOOK_ALERTS, embed);

    const fcmAction = isBahaya || isWarning ? "TRIGGER_ALARM" : isPulih ? "STOP_ALARM" : null;
    if (fcmAction) {
      try {
        await admin.messaging().send({
          topic: "iot_alarms",
          data: { action: fcmAction, status: statusBaru, title: embed.title, message: embed.description },
          android: { priority: "high" },
        });
        console.log("FCM terkirim:", fcmAction);
      } catch (err) { console.error("FCM error:", err); }
    }
  }
);

// ══════════════════════════════════════════════════════════════
// [2] RELAY BERUBAH → #🔌-relay
// ══════════════════════════════════════════════════════════════
exports.onRelayChanged = onValueUpdated(
  { ref: "/listrik/relay", region: "asia-southeast1" },
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
    await sendDiscordEmbed(WEBHOOK_RELAY, embed);
  }
);

// ══════════════════════════════════════════════════════════════
// [3] DATA UPDATE → #📊-monitoring (rate-limited 1x/5mnt)
// ══════════════════════════════════════════════════════════════
exports.onListrikUpdated = onValueUpdated(
  { ref: "/listrik/updated_at", region: "asia-southeast1" },
  async (event) => {
    const flagRef  = admin.database().ref("/_discord_last_monitoring");
    const flagSnap = await flagRef.get();
    const now      = Date.now();
    const lastSent = flagSnap.val() || 0;
    if (now - lastSent < 5 * 60 * 1000) { console.log("Rate limit: skip monitoring."); return; }
    await flagRef.set(now);

    const snap = await admin.database().ref("/listrik").get();
    const d    = snap.val() || {};

    const embed = {
      title: "📊 Update Data Monitoring Listrik",
      color: statusColor(d.status),
      fields: [
        { name: "⚡ Arus",         value: `${d.arus ?? "-"} A`,                     inline: true },
        { name: "🔋 Tegangan",     value: `${d.tegangan ?? "-"} V`,                 inline: true },
        { name: "💡 Daya Aktif",   value: `${d.daya_w ?? d.daya ?? "-"} W`,         inline: true },
        { name: "⚡ Daya Semu",    value: `${d.daya ?? d.apparent_power ?? "-"} VA`, inline: true },
        { name: "🔌 Relay",        value: d.relay ? "ON" : "OFF",                   inline: true },
        { name: "📡 Frekuensi",    value: `${d.frekuensi ?? "-"} Hz`,               inline: true },
        { name: "📊 Power Factor", value: `${d.power_factor ?? "-"}`,               inline: true },
        { name: "🔆 Energi",       value: `${d.energi_kwh ?? "-"} kWh`,             inline: true },
        { name: "🔴 Status",       value: `${statusEmoji(d.status)} ${d.status ?? "-"}`, inline: true },
      ],
      footer: { text: `IoT Listrik Dashboard • ${waktuIndonesia()}` },
      thumbnail: { url: "https://iot-listrik-dashboard.vercel.app/assets/icons/icon-192x192.png" },
    };
    await sendDiscordEmbed(WEBHOOK_MONITORING, embed);
  }
);

// ══════════════════════════════════════════════════════════════
// [4] LOG BARU → #📋-logs
// ══════════════════════════════════════════════════════════════
exports.onNewLog = onValueCreated(
  { ref: "/logs/{logId}", region: "asia-southeast1" },
  async (event) => {
    const log   = event.data.val();
    const logId = event.params.logId;
    if (!log) return;

    const embed = {
      title: "📋 Aktivitas Log Baru",
      description: log.message || log.pesan || log.keterangan || `Log ID: ${logId}`,
      color: 0x99AAB5,
      fields: [
        log.type  && { name: "Tipe",     value: String(log.type),  inline: true },
        log.user  && { name: "Pengguna", value: String(log.user),  inline: true },
        log.value !== undefined && { name: "Nilai", value: String(log.value), inline: true },
      ].filter(Boolean),
      footer: { text: `IoT Listrik Dashboard • ${waktuIndonesia()} • ID: ${logId.slice(-6)}` },
    };
    await sendDiscordEmbed(WEBHOOK_LOGS, embed);
  }
);

// ══════════════════════════════════════════════════════════════
// [5] CREATE TEMP ACCOUNT — PWA Simulator
// ══════════════════════════════════════════════════════════════
exports.createTempAccount = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const { realEmail } = request.data;

    if (!realEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(realEmail)) {
      throw new HttpsError("invalid-argument", "Email tidak valid.");
    }

    const randomId = randomStr(8);
    const tempEmail = `sim_${randomId}@iotlistrik.demo`;
    const password  = randomStr(4, "ABCDEFGHJKLMNPQRSTUVWXYZ")
                    + randomStr(4, "23456789")
                    + randomStr(4, "abcdefghjkmnpqrstuvwxyz");
    const expiresAt = Date.now() + 15 * 60 * 1000;

    // Buat Firebase Auth user
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email: tempEmail,
        password,
        displayName: `Demo ${randomId}`,
      });
    } catch (err) {
      console.error("Gagal buat user:", err);
      throw new HttpsError("internal", "Gagal membuat akun demo: " + err.message);
    }

    // Set custom claim isTempAccount
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      isTempAccount: true,
      realEmail,
      expiresAt,
    });

    // Simpan session di RTDB
    await admin.database().ref(`/temp_sessions/${userRecord.uid}`).set({
      realEmail,
      tempEmail,
      createdAt: Date.now(),
      expiresAt,
    });

    // Init data simulator
    await admin.database().ref(`/sim/${userRecord.uid}`).set({
      listrik: {
        arus: 0, tegangan: 220, daya: 0, energi_kwh: 0,
        frekuensi: 50, power_factor: 0.85,
        relay: 1, status: "NORMAL",
        updated_at: new Date().toISOString(),
      },
      settings: {
        thresholdArus: 10, warningPercent: 80,
        buzzerEnabled: true, autoCutoffEnabled: true,
        sendIntervalMs: 2000,
        telegramBotToken: "", telegramChatId: "",
        telegramNotifyEnabled: false,
        discord: {
          enabled: false,
          webhookAlerts: "", webhookRelay: "",
          webhookMonitoring: "", webhookLogs: "",
        },
      },
    });

    // Kirim email via Resend
    try {
      const resend = new Resend(RESEND_API_KEY);
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: realEmail,
        subject: "⚡ Akun Demo IoT Listrik Siap Digunakan",
        html: buildEmailHTML({ tempEmail, password, expiresAt }),
      });
      console.log("Email terkirim ke:", realEmail);
    } catch (err) {
      console.error("Gagal kirim email:", err);
      // Lanjutkan walau email gagal — credentials tetap dikembalikan
    }

    return { tempEmail, password, expiresAt, uid: userRecord.uid };
  }
);

// ══════════════════════════════════════════════════════════════
// [6] CLEANUP TEMP ACCOUNT — dipanggil saat timer habis / logout
// ══════════════════════════════════════════════════════════════
exports.cleanupTempAccount = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Harus login terlebih dahulu.");
    if (!request.auth.token.isTempAccount) {
      throw new HttpsError("permission-denied", "Hanya untuk akun demo.");
    }

    try {
      await admin.database().ref(`/sim/${uid}`).remove();
      await admin.database().ref(`/temp_sessions/${uid}`).remove();
      await admin.auth().deleteUser(uid);
      console.log("Temp account dihapus:", uid);
    } catch (err) {
      console.error("Gagal cleanup:", err);
      throw new HttpsError("internal", "Gagal menghapus akun demo: " + err.message);
    }

    return { success: true };
  }
);

// ══════════════════════════════════════════════════════════════
// [7] TEST NOTIFICATION — kirim test notif dari simulator
//     Dipanggil via httpsCallable dari simulator-control.js
// ══════════════════════════════════════════════════════════════
exports.testSimNotification = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Harus login.");
    if (!request.auth.token.isTempAccount) {
      throw new HttpsError("permission-denied", "Hanya untuk akun demo.");
    }

    const { scenario = "DANGER", channels = ["discord", "telegram"] } = request.data;

    // Baca settings sim
    const settingsSnap = await admin.database().ref(`/sim/${uid}/settings`).get();
    const s = settingsSnap.val() || {};

    // Baca energi_kwh saat ini untuk akumulasi
    const energySnap = await admin.database().ref(`/sim/${uid}/listrik/energi_kwh`).get();
    const currentEnergy = parseFloat(energySnap.val() || 0);

    // Generate data sesuai scenario — lengkap seperti hardware SCT-013 + ZMPT101B
    const scenarios = {
      NORMAL:  { arus: 2.5,   tegangan: 222, pf: 0.92, status: "NORMAL",  relay: 1 },
      WARNING: { arus: 8.5,   tegangan: 218, pf: 0.88, status: "WARNING", relay: 1 },
      DANGER:  { arus: 25.3,  tegangan: 205, pf: 0.72, status: "DANGER",  relay: 0 },
    };
    const sc = scenarios[scenario] || scenarios.DANGER;
    const apparent = parseFloat((sc.arus * sc.tegangan).toFixed(1));
    const active   = parseFloat((apparent * sc.pf).toFixed(1));
    const frekuensi = scenario === "DANGER" ? 49.6 : 50.0;

    const fullPayload = {
      arus:           sc.arus,
      tegangan:       sc.tegangan,
      daya:           apparent,           // Apparent Power (VA) = V × I
      daya_w:         active,             // Active Power (W) = VA × PF
      apparent_power: apparent,           // Alias untuk CLI
      power_factor:   sc.pf,
      frekuensi,
      energi_kwh:     parseFloat((currentEnergy + (active / 1000) * (5 / 3600)).toFixed(4)),
      relay:          sc.relay,
      status:         sc.status,
      updated_at:     new Date().toISOString(),
    };

    // Update /sim/{uid}/listrik dengan payload lengkap
    await admin.database().ref(`/sim/${uid}/listrik`).set(fullPayload);

    // Log lengkap di /sim/{uid}/logs
    await admin.database().ref(`/sim/${uid}/logs`).push({
      message:      `[TEST] Simulasi notifikasi ${scenario}`,
      type:         "test",
      status:       scenario,
      waktu:        new Date().toISOString(),
      arus:         sc.arus,
      tegangan:     sc.tegangan,
      daya:         apparent,
      daya_w:       active,
      power_factor: sc.pf,
      frekuensi,
      energi_kwh:   fullPayload.energi_kwh,
      relay:        sc.relay,
      source:       "TEST_ALERT",
    });

    const results = {};

    // ── Telegram ──────────────────────────────────────────────────────
    if (channels.includes("telegram") && s.telegramBotToken && s.telegramChatId) {
      const msg = `🧪 *TEST SIMULASI — ${scenario}*\n`
        + `⚡ Arus: ${sc.arus} A | 🔋 Tegangan: ${sc.tegangan} V\n`
        + `💡 Daya: ${active} W (${apparent} VA)\n`
        + `📊 PF: ${sc.pf} | 📡 Freq: ${frekuensi} Hz\n`
        + `🔌 Relay: ${sc.relay ? "ON" : "OFF"} | 🔴 Status: ${scenario}\n`
        + `_IoT Listrik Dashboard Simulator_`;
      await sendTelegramMessage(s.telegramBotToken, s.telegramChatId, msg);
      results.telegram = "sent";
    } else {
      // Fix bug: hanya "not_configured" jika keduanya tidak ada
      results.telegram = (!s.telegramBotToken || !s.telegramChatId)
        ? "not_configured"
        : "channel_not_requested";
    }

    // ── Discord ──────────────────────────────────────────────────────
    if (channels.includes("discord") && s.discord?.enabled !== false && s.discord?.webhookAlerts) {
      const embed = {
        title: `🧪 Test Notifikasi Simulator — ${statusEmoji(scenario)} ${scenario}`,
        description: "Ini adalah test notifikasi dari IoT Listrik Dashboard Simulator.\nData simulasi telah diperbarui sesuai skenario.",
        color: statusColor(scenario),
        fields: [
          { name: "⚡ Arus",         value: `${sc.arus} A`,       inline: true },
          { name: "🔋 Tegangan",     value: `${sc.tegangan} V`,   inline: true },
          { name: "💡 Daya Aktif",   value: `${active} W`,        inline: true },
          { name: "🔌 Relay",        value: sc.relay ? "ON" : "OFF", inline: true },
          { name: "📊 Power Factor", value: `${sc.pf}`,           inline: true },
          { name: "📡 Frekuensi",    value: `${frekuensi} Hz`,    inline: true },
        ],
        footer: { text: `IoT Simulator • ${waktuIndonesia()}` },
        thumbnail: { url: "https://iot-listrik-dashboard.vercel.app/assets/icons/icon-192x192.png" },
      };
      await sendDiscordEmbed(s.discord.webhookAlerts, embed);
      results.discord = "sent";
    } else {
      results.discord = (!s.discord?.webhookAlerts)
        ? "not_configured"
        : "channel_not_requested";
    }

    return { success: true, scenario, results };
  }
);

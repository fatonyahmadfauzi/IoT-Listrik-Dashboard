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
const crypto = require("crypto");
const fetch  = require("node-fetch");
const Resend = require("resend").Resend;

admin.initializeApp();

// ─── Environment Variables (via .env) ─────────
const WEBHOOK_ALERTS     = process.env.DISCORD_WEBHOOK_ALERTS || "";
const WEBHOOK_RELAY      = process.env.DISCORD_WEBHOOK_RELAY || "";
const WEBHOOK_MONITORING = process.env.DISCORD_WEBHOOK_MONITORING || "";
const WEBHOOK_LOGS       = process.env.DISCORD_WEBHOOK_LOGS || "";
const RESEND_API_KEY     = process.env.RESEND_API_KEY || "";
const RESET_OTP_TTL_MS = 10 * 60 * 1000;
const RESET_OTP_COOLDOWN_MS = 60 * 1000;
const RESET_OTP_MAX_ATTEMPTS = 5;
const RESET_OTP_PATH = "/admin_secure/liveDataResetOtps";


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
function normalizeTelegramChatId(value) {
  const id = String(value ?? "").trim();
  return /^-?\d+$/.test(id) ? id : "";
}

function parseTelegramChatIds(...sources) {
  const ids = [];
  const add = (value) => {
    const id = normalizeTelegramChatId(value);
    if (id && !ids.includes(id)) ids.push(id);
  };

  const visit = (source) => {
    if (source == null) return;
    if (Array.isArray(source)) {
      source.forEach(visit);
      return;
    }
    if (typeof source === "object") {
      if ("chatId" in source || "telegramChatId" in source || "id" in source) {
        add(source.chatId ?? source.telegramChatId ?? source.id);
        return;
      }
      Object.entries(source)
        .filter(([key]) => !["name", "label", "displayName", "title"].includes(key))
        .forEach(([, value]) => visit(value));
      return;
    }
    String(source).split(/[\s,;]+/).forEach(add);
  };

  sources.forEach(visit);
  return ids;
}

function getTelegramChatIds(settings) {
  return parseTelegramChatIds(
    settings?.telegramRecipients,
    settings?.telegramChatIds,
    settings?.telegramChatId,
    settings?.telegram?.chat_id
  );
}

async function sendTelegramMessage(botToken, chatIds, text, parseMode = "Markdown") {
  const ids = parseTelegramChatIds(chatIds);
  if (!botToken || ids.length === 0) return false;

  const results = await Promise.allSettled(ids.map(async (chatId) => {
    const body = { chat_id: chatId, text };
    if (parseMode) body.parse_mode = parseMode;
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`Telegram error ${res.status} untuk ${chatId}: ${await res.text()}`);
      return false;
    }
    return true;
  }));

  return results.some((result) => result.status === "fulfilled" && result.value);
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
        <p style="margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#374151;line-height:1.7;">
          Email ini dikirim otomatis. Jangan balas email ini.
        </p>
        <p style="margin:8px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.7;">
          &copy; 2025 <strong style="color:#9ca3af;font-weight:600;">IoT Listrik Dashboard</strong><br>
          <span style="color:#4b5563;font-size:11px;">Sistem Deteksi Kebocoran Arus &nbsp;&middot;&nbsp; Built by Fatony Ahmad Fauzi</span>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function maskEmail(email) {
  const raw = String(email || "").trim();
  const [local, domain] = raw.split("@");
  if (!local || !domain) return raw;
  const visibleLocal = local.length <= 2
    ? `${local[0] || "*"}*`
    : `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 2))}`;
  const domainParts = domain.split(".");
  const domainName = domainParts.shift() || "";
  const maskedDomain = domainName.length <= 2
    ? `${domainName[0] || "*"}*`
    : `${domainName.slice(0, 2)}${"*".repeat(Math.max(1, domainName.length - 2))}`;
  return `${visibleLocal}@${[maskedDomain, ...domainParts].filter(Boolean).join(".")}`;
}

function buildAdminResetOtpEmailHTML({ otp, email, expiresAt }) {
  const d = new Date(expiresAt);
  const timeStr = d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateStr = d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="id" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="x-apple-disable-message-reformatting"/>
<title>OTP Reset Data IoT</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; }
  @media only screen and (max-width:600px) {
    .container { width: 100% !important; padding: 0 12px !important; }
    .card-pad { padding: 28px 20px !important; }
    .otp-value { font-size: 26px !important; letter-spacing: 5px !important; }
    .detail-card { padding: 16px 18px !important; }
    .footer-text { font-size: 12px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#060c18;word-spacing:normal;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Kode OTP admin untuk reset data realtime sensor perangkat IoT telah dibuat. Gunakan dalam 10 menit.&#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;</div>

<!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#060c18;">
<tr><td align="center" style="padding:48px 16px 40px;">
  <table class="container" role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;">

    <tr><td align="center" style="padding-bottom:32px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background-color:#1d4ed8;width:44px;height:44px;border-radius:12px;text-align:center;vertical-align:middle;font-size:22px;line-height:44px;">
            &#128274;
          </td>
          <td style="padding-left:12px;vertical-align:middle;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:17px;font-weight:700;color:#f1f5f9;line-height:1;">IoT Listrik Dashboard</p>
            <p style="margin:3px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#4b5563;line-height:1;">Verifikasi Reset Data Realtime</p>
          </td>
        </tr>
      </table>
    </td></tr>

    <tr><td class="card-pad" style="background-color:#0f1729;border:1px solid #1e2d45;border-radius:20px;padding:36px 32px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td style="background-color:#3f0a0a;border:1px solid #dc2626;border-radius:100px;padding:5px 16px 5px 12px;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;font-weight:700;color:#fca5a5;letter-spacing:0.3px;">&#128274;&nbsp; OTP Verifikasi Admin</p>
          </td>
        </tr>
      </table>

      <h1 style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1.15;">Kode OTP Siap Digunakan</h1>
      <p style="margin:0 0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;color:#6b7280;line-height:1.65;">
        Permintaan ini berasal dari akun admin <strong style="color:#e5e7eb;">${email}</strong> untuk mengosongkan data realtime sensor perangkat IoT pada node
        <strong style="color:#93c5fd;">/listrik</strong>.
      </p>

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
        <tr>
          <td style="background-color:#030d1f;border:1px solid #1e3a5f;border-left:3px solid #f43f5e;border-radius:14px;padding:18px 20px;">
            <p style="margin:0 0 7px;font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;color:#fb7185;text-transform:uppercase;letter-spacing:1px;">KODE OTP</p>
            <p class="otp-value" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:800;color:#f8fafc;letter-spacing:8px;line-height:1.2;">${otp}</p>
          </td>
        </tr>
      </table>

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
        <tr>
          <td style="background-color:#1c0f00;border:1px solid #78350f;border-radius:14px;padding:14px 20px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;">&#9201;&nbsp; Kadaluarsa</p>
                  <p style="margin:4px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:700;color:#fbbf24;line-height:1.3;">${timeStr} WIB &mdash; ${dateStr}</p>
                </td>
                <td align="right" style="vertical-align:middle;white-space:nowrap;padding-left:12px;">
                  <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:800;color:#f59e0b;background-color:#292001;border-radius:8px;padding:6px 12px;">10 MENIT</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
        <tr>
          <td class="detail-card" style="background-color:#080f1f;border:1px solid #1e2d45;border-radius:14px;padding:18px 20px;">
            <p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:700;color:#f1f5f9;line-height:1.5;">Yang akan terjadi setelah OTP benar</p>
            <ul style="margin:0;padding-left:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;color:#cbd5e1;line-height:1.9;">
              <li>Data realtime sensor di <strong>/listrik</strong> akan direset ke nilai kosong/default.</li>
              <li>Histori log tidak dihapus.</li>
              <li>Jika device fisik masih online, data baru bisa muncul lagi pada heartbeat berikutnya.</li>
            </ul>
          </td>
        </tr>
      </table>

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td class="detail-card" style="background-color:#1c0f00;border:1px solid #78350f;border-radius:14px;padding:16px 20px;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;color:#fbbf24;line-height:1.8;">
              Abaikan email ini jika Anda tidak sedang meminta reset data realtime perangkat IoT.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>

    <tr><td style="height:32px;"></td></tr>

    <tr><td align="center">
      <p class="footer-text" style="margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#374151;line-height:1.7;">
        Email ini dikirim otomatis. Jangan balas email ini.
      </p>
      <p class="footer-text" style="margin:8px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.7;">
        &copy; 2025 <strong style="color:#9ca3af;font-weight:600;">IoT Listrik Dashboard</strong><br>
        <span style="color:#4b5563;font-size:11px;">Sistem Deteksi Kebocoran Arus &nbsp;&middot;&nbsp; Built by Fatony Ahmad Fauzi</span>
      </p>
    </td></tr>

  </table>
</td></tr>
</table>
<!--[if mso | IE]></td></tr></table><![endif]-->
</body>
</html>`;
}

function hashResetOtp(uid, actionId, otp) {
  return crypto
    .createHash("sha256")
    .update(`${uid}:${actionId}:${String(otp).trim()}`)
    .digest("hex");
}

async function requireAdminRequest(request) {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Harus login sebagai admin.");
  }
  if (request.auth?.token?.isTempAccount) {
    throw new HttpsError("permission-denied", "Akun temp simulator tidak diizinkan.");
  }

  const roleSnap = await admin.database().ref(`/users/${uid}/role`).get();
  if (roleSnap.val() !== "admin") {
    throw new HttpsError("permission-denied", "Hanya admin yang diizinkan.");
  }

  const email = String(request.auth?.token?.email || "").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("failed-precondition", "Email admin tidak ditemukan.");
  }

  return { uid, email };
}

function buildClearedListrikPayload(clearedAt = new Date().toISOString()) {
  return {
    arus: 0,
    tegangan: 0,
    daya: 0,
    daya_w: 0,
    apparent_power: 0,
    energi_kwh: 0,
    frekuensi: 0,
    power_factor: 0,
    relay: 0,
    status: "NORMAL",
    updated_at: 0,
    reset_by_admin: true,
    reset_note: "Data realtime dikosongkan oleh admin setelah verifikasi OTP email.",
    reset_at: clearedAt,
  };
}

function formatIndonesiaDateTime(value) {
  return new Date(value).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function buildAdminResetTelegramMessage({ email, targetPath, clearedAt }) {
  return [
    "Notifikasi Admin - IoT Listrik Dashboard",
    "",
    "Data realtime perangkat IoT berhasil dikosongkan.",
    `Admin: ${email}`,
    `Path: ${targetPath}`,
    `Waktu: ${formatIndonesiaDateTime(clearedAt)} WIB`,
    "Histori log tetap tersimpan.",
    "Jika perangkat fisik masih online, data baru dapat muncul lagi pada heartbeat berikutnya.",
  ].join("\n");
}

function buildAdminResetDiscordEmbed({ email, targetPath, clearedAt }) {
  return {
    title: "🧹 Data Realtime IoT Dikosongkan",
    description: "Admin berhasil mengosongkan data realtime sensor perangkat IoT setelah verifikasi OTP email.",
    color: 0x60A5FA,
    fields: [
      { name: "Admin", value: email, inline: false },
      { name: "Path", value: targetPath, inline: true },
      { name: "Waktu", value: `${formatIndonesiaDateTime(clearedAt)} WIB`, inline: true },
      { name: "Histori Log", value: "Tetap tersimpan", inline: true },
      { name: "Catatan", value: "Data baru bisa muncul lagi jika perangkat fisik masih online.", inline: false },
    ],
    footer: { text: "IoT Listrik Dashboard • Admin Reset Audit" },
    timestamp: new Date(clearedAt).toISOString(),
  };
}

async function sendAdminResetNotifications({ email, targetPath, clearedAt }) {
  try {
    const settingsSnap = await admin.database().ref("/settings").get();
    const settings = settingsSnap.val() || {};
    const discordSettings = settings.discord || {};

    const telegramEnabled = settings.telegramNotifyEnabled !== false;
    const telegramBotToken = String(settings.telegramBotToken || "").trim();
    const telegramChatIds = getTelegramChatIds(settings);

    const discordEnabled = discordSettings.enabled !== false;
    const discordWebhook =
      discordSettings.webhookLogs ||
      discordSettings.webhookAlerts ||
      discordSettings.webhookMonitoring ||
      discordSettings.webhookRelay ||
      "";

    const telegramPromise = telegramEnabled
      ? sendTelegramMessage(
          telegramBotToken,
          telegramChatIds,
          buildAdminResetTelegramMessage({ email, targetPath, clearedAt }),
          null
        )
      : Promise.resolve(false);

    const discordPromise = discordEnabled
      ? sendDiscordEmbed(
          discordWebhook,
          buildAdminResetDiscordEmbed({ email, targetPath, clearedAt })
        )
      : Promise.resolve(false);

    const [telegramResult, discordResult] = await Promise.allSettled([telegramPromise, discordPromise]);
    return {
      telegram: telegramResult.status === "fulfilled" ? telegramResult.value : false,
      discord: discordResult.status === "fulfilled" ? discordResult.value : false,
    };
  } catch (err) {
    console.error("Gagal menyiapkan notifikasi reset admin:", err);
    return { telegram: false, discord: false };
  }
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
          data: {
            action: fcmAction,
            status: statusBaru,
            title: embed.title,
            message: embed.description,
            source: "hardware",
          },
          android: { priority: "high" },
          webpush: {
            notification: {
              title: embed.title,
              body: embed.description,
              icon: "https://iot-listrik-dashboard.vercel.app/assets/icons/icon-192x192.png",
              vibrate: [200, 100, 200]
            }
          }
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

    // Kirim Push Notification ke seluruh perangkat jika Relay berubah
    try {
      await admin.messaging().send({
        topic: "iot_alarms",
        data: {
          action: "RELAY_CHANGED",
          status: relayBaru ? "ON" : "OFF",
          source: "hardware",
        },
        android: { priority: "high" },
        webpush: {
          notification: {
            title: embed.title,
            body: embed.description,
            icon: "https://iot-listrik-dashboard.vercel.app/assets/icons/icon-192x192.png"
          }
        }
      });
    } catch (err) { console.error("FCM relay error:", err); }
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
        telegramBotToken: "", telegramChatId: "", telegramChatIds: [], telegramRecipients: [],
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
// [FCM] SUBSCRIBE BROWSER TOKEN TO TOPICS
// ══════════════════════════════════════════════════════════════
exports.subscribeToAlarms = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const { token } = request.data;
    if (!token) throw new HttpsError("invalid-argument", "Token tidak disertakan.");
    
    try {
      await admin.messaging().subscribeToTopic([token], "iot_alarms");
      console.log("Berhasil mendaftarkan FCM Token browser ke topik iot_alarms");
      return { success: true };
    } catch (err) {
      console.error("Gagal subscribe FCM Web Push:", err);
      throw new HttpsError("internal", err.message);
    }
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
    const telegramChatIds = getTelegramChatIds(s);
    if (channels.includes("telegram") && s.telegramBotToken && telegramChatIds.length > 0) {
      const msg = `🧪 *TEST SIMULASI — ${scenario}*\n`
        + `⚡ Arus: ${sc.arus} A | 🔋 Tegangan: ${sc.tegangan} V\n`
        + `💡 Daya: ${active} W (${apparent} VA)\n`
        + `📊 PF: ${sc.pf} | 📡 Freq: ${frekuensi} Hz\n`
        + `🔌 Relay: ${sc.relay ? "ON" : "OFF"} | 🔴 Status: ${scenario}\n`
        + `_IoT Listrik Dashboard Simulator_`;
      results.telegram = await sendTelegramMessage(s.telegramBotToken, telegramChatIds, msg)
        ? "sent"
        : "failed";
    } else {
      // Fix bug: hanya "not_configured" jika keduanya tidak ada
      results.telegram = (!s.telegramBotToken || telegramChatIds.length === 0)
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

// ══════════════════════════════════════════════════════════════
// [8] ADMIN OTP — reset data realtime /listrik
// ══════════════════════════════════════════════════════════════
exports.requestListrikDataResetOtp = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const { uid, email } = await requireAdminRequest(request);

    if (!RESEND_API_KEY) {
      throw new HttpsError(
        "failed-precondition",
        "RESEND_API_KEY belum dikonfigurasi di Cloud Functions."
      );
    }

    const otpRef = admin.database().ref(`${RESET_OTP_PATH}/${uid}`);
    const existingSnap = await otpRef.get();
    const existing = existingSnap.val() || {};
    const now = Date.now();

    if (existing.requestedAt && (now - Number(existing.requestedAt)) < RESET_OTP_COOLDOWN_MS) {
      const waitMs = RESET_OTP_COOLDOWN_MS - (now - Number(existing.requestedAt));
      throw new HttpsError(
        "resource-exhausted",
        `Tunggu ${Math.ceil(waitMs / 1000)} detik sebelum meminta OTP baru.`
      );
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const actionId = `live-reset-${Date.now()}-${randomStr(6, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789")}`;
    const expiresAt = now + RESET_OTP_TTL_MS;

    await otpRef.set({
      actionId,
      otpHash: hashResetOtp(uid, actionId, otp),
      requestedAt: now,
      expiresAt,
      attempts: 0,
      requestedByUid: uid,
      requestedByEmail: email,
      status: "otp_sent",
      targetPath: "/listrik",
    });

    try {
      const resend = new Resend(RESEND_API_KEY);
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: "🔐 OTP Reset Data Realtime IoT",
        html: buildAdminResetOtpEmailHTML({ otp, email, expiresAt }),
      });
    } catch (err) {
      await otpRef.remove();
      console.error("Gagal kirim OTP reset data IoT:", err);
      throw new HttpsError("internal", "Gagal mengirim OTP ke email admin.");
    }

    return {
      success: true,
      actionId,
      maskedEmail: maskEmail(email),
      expiresAt,
      ttlMs: RESET_OTP_TTL_MS,
      targetPath: "/listrik",
    };
  }
);

exports.confirmListrikDataReset = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const { uid, email } = await requireAdminRequest(request);
    const otp = String(request.data?.otp || "").trim();
    const actionId = String(request.data?.actionId || "").trim();

    if (!/^\d{6}$/.test(otp)) {
      throw new HttpsError("invalid-argument", "OTP harus 6 digit angka.");
    }
    if (!actionId) {
      throw new HttpsError("invalid-argument", "Action ID tidak ditemukan. Minta OTP baru.");
    }

    const otpRef = admin.database().ref(`${RESET_OTP_PATH}/${uid}`);
    const otpSnap = await otpRef.get();
    const payload = otpSnap.val();

    if (!payload || payload.actionId !== actionId) {
      throw new HttpsError("not-found", "Permintaan OTP tidak ditemukan. Minta OTP baru.");
    }

    const now = Date.now();
    if (payload.consumedAt) {
      throw new HttpsError("failed-precondition", "OTP ini sudah pernah dipakai.");
    }
    if (Number(payload.expiresAt || 0) < now) {
      await otpRef.remove();
      throw new HttpsError("deadline-exceeded", "OTP sudah kedaluwarsa. Minta OTP baru.");
    }

    const attempts = Number(payload.attempts || 0);
    if (attempts >= RESET_OTP_MAX_ATTEMPTS) {
      throw new HttpsError("permission-denied", "OTP diblokir karena terlalu banyak percobaan salah.");
    }

    const expectedHash = hashResetOtp(uid, actionId, otp);
    if (payload.otpHash !== expectedHash) {
      const nextAttempts = attempts + 1;
      await otpRef.update({
        attempts: nextAttempts,
        lastAttemptAt: now,
        status: nextAttempts >= RESET_OTP_MAX_ATTEMPTS ? "locked" : "invalid_otp",
      });
      throw new HttpsError(
        "permission-denied",
        nextAttempts >= RESET_OTP_MAX_ATTEMPTS
          ? "OTP salah terlalu banyak kali. Minta OTP baru."
          : "Kode OTP salah."
      );
    }

    const clearedAtIso = new Date(now).toISOString();
    const clearedPayload = buildClearedListrikPayload(clearedAtIso);
    await admin.database().ref("/listrik").set(clearedPayload);

    await otpRef.update({
      status: "completed",
      consumedAt: now,
      clearedAt: now,
      clearedByEmail: email,
      otpHash: null,
      attempts,
    });
    const notificationResults = await sendAdminResetNotifications({
      email,
      targetPath: "/listrik",
      clearedAt: clearedAtIso,
    });

    return {
      success: true,
      clearedAt: now,
      targetPath: "/listrik",
      message: "Data realtime perangkat IoT berhasil dikosongkan.",
      notifications: notificationResults,
    };
  }
);

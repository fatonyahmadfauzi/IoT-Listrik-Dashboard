const admin = require("firebase-admin");
const crypto = require("crypto");
const { Resend } = require("resend");

const DATABASE_URL =
  process.env.FIREBASE_DATABASE_URL ||
  "https://monitoring-listrik-719b1-default-rtdb.asia-southeast1.firebasedatabase.app/";

const RESET_OTP_TTL_MS = 10 * 60 * 1000;
const RESET_OTP_COOLDOWN_MS = 60 * 1000;
const RESET_OTP_MAX_ATTEMPTS = 5;
const RESET_OTP_PATH = "/admin_secure/liveDataResetOtps";

let initErrorMsg = "";

function ensureAdminApp() {
  if (admin.apps.length) return admin;

  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT Env Var is empty or undefined");
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: DATABASE_URL,
    });
  } catch (error) {
    initErrorMsg = error.message;
    throw error;
  }

  return admin;
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getBearerToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || "";
  if (!authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice("Bearer ".length).trim();
}

async function requireAdminRequest(req) {
  ensureAdminApp();

  const token = getBearerToken(req);
  if (!token) {
    throw httpError(401, "Token admin tidak ditemukan.");
  }

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(token);
  } catch (error) {
    throw httpError(401, "Token admin tidak valid atau sudah kedaluwarsa.");
  }

  if (decoded.isTempAccount) {
    throw httpError(403, "Akun temp simulator tidak diizinkan.");
  }

  const uid = decoded.uid;
  const email = String(decoded.email || "").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError(400, "Email admin tidak ditemukan pada token login.");
  }

  const roleSnap = await admin.database().ref(`/users/${uid}/role`).get();
  if (roleSnap.val() !== "admin") {
    throw httpError(403, "Hanya admin yang diizinkan.");
  }

  return { uid, email };
}

function randomStr(len, chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789") {
  let r = "";
  for (let i = 0; i < len; i++) {
    r += chars[Math.floor(Math.random() * chars.length)];
  }
  return r;
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

async function sendTelegramMessage(botToken, chatIds, text) {
  const ids = parseTelegramChatIds(chatIds);
  if (!botToken || ids.length === 0) return false;

  const results = await Promise.allSettled(ids.map(async (chatId) => {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      console.error(`Telegram reset notification error ${res.status} untuk ${chatId}: ${await res.text()}`);
      return false;
    }
    return true;
  }));

  return results.some((result) => result.status === "fulfilled" && result.value);
}

function isDiscordWebhookUrl(value) {
  return typeof value === "string" && value.trim().startsWith("https://discord.com/api/webhooks/");
}

async function sendDiscordEmbed(webhookUrl, embed) {
  if (!isDiscordWebhookUrl(webhookUrl)) return false;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!res.ok && res.status !== 204) {
      console.error(`Discord reset notification error ${res.status}: ${await res.text()}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Gagal kirim notifikasi reset ke Discord:", error);
    return false;
  }
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
          buildAdminResetTelegramMessage({ email, targetPath, clearedAt })
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
  } catch (error) {
    console.error("Gagal menyiapkan notifikasi reset admin:", error);
    return { telegram: false, discord: false };
  }
}

function buildResetOtpEmailHTML({ otp, email, expiresAt }) {
  const expiresStr = new Date(expiresAt).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>OTP Reset Data IoT</title>
<style>
  @media only screen and (max-width:600px) {
    .container { width: 100% !important; }
    .outer-shell { padding: 18px 14px 22px !important; border-radius: 26px !important; }
    .otp-panel,
    .info-panel,
    .warning-panel { padding: 22px 18px !important; }
    .otp-code {
      font-size: 30px !important;
      letter-spacing: 8px !important;
      padding: 18px 20px !important;
    }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Kode OTP admin untuk reset data realtime sensor perangkat IoT telah dibuat. Gunakan dalam 10 menit.</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
  <tr>
    <td align="center" style="padding:24px 12px 28px;">
      <table class="container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td class="outer-shell" style="background:#eef0ff;border:1px solid #d9ddfb;border-radius:30px;padding:22px 20px 26px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom:18px;">
                  <table width="100%" cellpadding="0" cellspacing="0" class="otp-panel" style="background:#f8e8ee;border:1.5px solid #e6b3bf;border-radius:28px;padding:24px 20px;">
                    <tr>
                      <td align="center">
                        <p style="margin:0 0 18px;font-size:14px;font-weight:500;letter-spacing:4px;color:#ab6e79;">KODE OTP</p>
                        <div class="otp-code" style="display:inline-block;background:#efe7ee;border-radius:18px;padding:20px 28px;font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:700;letter-spacing:10px;color:#2f3441;line-height:1;">
                          ${otp}
                        </div>
                        <p style="margin:20px 0 0;font-size:16px;color:#8b6d20;line-height:1.5;">
                          Berlaku sampai ${expiresStr} WIB
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding-bottom:18px;">
                  <table width="100%" cellpadding="0" cellspacing="0" class="info-panel" style="background:#edf3ff;border:1.5px solid #bfd2fb;border-radius:28px;padding:24px 22px;">
                    <tr>
                      <td>
                        <p style="margin:0 0 14px;font-size:16px;font-weight:700;color:#42526e;line-height:1.5;">Yang akan terjadi setelah OTP benar:</p>
                        <ul style="margin:0;padding-left:26px;font-size:16px;color:#5f6674;line-height:1.9;">
                          <li>Data realtime sensor di <strong>/listrik</strong> akan direset ke nilai kosong/default.</li>
                          <li>Histori log tidak dihapus.</li>
                          <li>Jika device fisik masih online, data baru bisa muncul lagi pada heartbeat berikutnya.</li>
                        </ul>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0" class="warning-panel" style="background:#f5efe8;border:1.5px solid #d8c5a8;border-radius:28px;padding:22px 22px;">
                    <tr>
                      <td>
                        <p style="margin:0;font-size:16px;color:#6e5a2b;line-height:1.8;">
                          Abaikan email ini jika Anda tidak sedang meminta reset data realtime perangkat IoT.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:22px 16px 0;">
            <p style="margin:0;font-size:12px;color:#c7ccd7;line-height:1.7;">&copy; 2026 IoT Listrik Dashboard</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function hashResetOtp(uid, actionId, otp) {
  return crypto
    .createHash("sha256")
    .update(`${uid}:${actionId}:${String(otp).trim()}`)
    .digest("hex");
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

async function requestLiveResetOtp(req) {
  const { uid, email } = await requireAdminRequest(req);

  if (!process.env.RESEND_API_KEY) {
    throw httpError(500, "RESEND_API_KEY belum dikonfigurasi di Vercel.");
  }

  const otpRef = admin.database().ref(`${RESET_OTP_PATH}/${uid}`);
  const existingSnap = await otpRef.get();
  const existing = existingSnap.val() || {};
  const now = Date.now();

  if (existing.requestedAt && (now - Number(existing.requestedAt)) < RESET_OTP_COOLDOWN_MS) {
    const waitMs = RESET_OTP_COOLDOWN_MS - (now - Number(existing.requestedAt));
    throw httpError(429, `Tunggu ${Math.ceil(waitMs / 1000)} detik sebelum meminta OTP baru.`);
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
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "🔐 OTP Reset Data Realtime IoT",
      html: buildResetOtpEmailHTML({ otp, email, expiresAt }),
    });
  } catch (error) {
    await otpRef.remove();
    console.error("Gagal kirim OTP reset realtime:", error);
    throw httpError(500, "Gagal mengirim OTP ke email admin.");
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

async function confirmLiveResetOtp(req) {
  const { uid, email } = await requireAdminRequest(req);
  const otp = String(req.body?.otp || "").trim();
  const actionId = String(req.body?.actionId || "").trim();

  if (!/^\d{6}$/.test(otp)) {
    throw httpError(400, "OTP harus 6 digit angka.");
  }
  if (!actionId) {
    throw httpError(400, "Action ID tidak ditemukan. Minta OTP baru.");
  }

  const otpRef = admin.database().ref(`${RESET_OTP_PATH}/${uid}`);
  const otpSnap = await otpRef.get();
  const payload = otpSnap.val();

  if (!payload || payload.actionId !== actionId) {
    throw httpError(404, "Permintaan OTP tidak ditemukan. Minta OTP baru.");
  }

  const now = Date.now();
  if (payload.consumedAt) {
    throw httpError(409, "OTP ini sudah pernah dipakai.");
  }
  if (Number(payload.expiresAt || 0) < now) {
    await otpRef.remove();
    throw httpError(408, "OTP sudah kedaluwarsa. Minta OTP baru.");
  }

  const attempts = Number(payload.attempts || 0);
  if (attempts >= RESET_OTP_MAX_ATTEMPTS) {
    throw httpError(403, "OTP diblokir karena terlalu banyak percobaan salah.");
  }

  const expectedHash = hashResetOtp(uid, actionId, otp);
  if (payload.otpHash !== expectedHash) {
    const nextAttempts = attempts + 1;
    await otpRef.update({
      attempts: nextAttempts,
      lastAttemptAt: now,
      status: nextAttempts >= RESET_OTP_MAX_ATTEMPTS ? "locked" : "invalid_otp",
    });
    throw httpError(
      403,
      nextAttempts >= RESET_OTP_MAX_ATTEMPTS
        ? "OTP salah terlalu banyak kali. Minta OTP baru."
        : "Kode OTP salah."
    );
  }

  const clearedAtIso = new Date(now).toISOString();
  await admin.database().ref("/listrik").set(buildClearedListrikPayload(clearedAtIso));
  await otpRef.update({
    status: "completed",
    consumedAt: now,
    clearedAt: now,
    clearedByEmail: email,
    otpHash: null,
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

module.exports = {
  ensureAdminApp,
  initErrorMsg,
  setCors,
  requestLiveResetOtp,
  confirmLiveResetOtp,
};

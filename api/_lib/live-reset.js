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
</head>
<body style="margin:0;padding:0;background:#070c18;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#070c18;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding-bottom:28px;">
          <div style="display:inline-block;background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid rgba(239,68,68,0.28);border-radius:16px;padding:20px 32px;">
            <span style="font-size:40px;">🛡️</span>
            <h1 style="color:#e2e8f0;font-size:22px;margin:8px 0 4px 0;font-weight:700;">IoT Listrik Dashboard</h1>
            <p style="color:#94a3b8;font-size:13px;margin:0;">Verifikasi Reset Data Realtime IoT</p>
          </div>
        </td></tr>

        <tr><td align="center" style="padding-bottom:20px;">
          <h2 style="color:#e2e8f0;font-size:20px;margin:0;font-weight:700;">Kode OTP Admin</h2>
          <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:10px 0 0;">
            Kode ini diminta dari akun admin <strong style="color:#e2e8f0;">${email}</strong> untuk mengosongkan data realtime perangkat IoT pada node <code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;color:#93c5fd;">/listrik</code>.
          </p>
        </td></tr>

        <tr><td style="padding-bottom:24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:14px;padding:24px;">
            <tr><td align="center">
              <p style="color:#fca5a5;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Kode OTP</p>
              <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:#f8fafc;font-family:monospace;background:rgba(255,255,255,0.05);border-radius:12px;padding:16px 20px;display:inline-block;">
                ${otp}
              </div>
              <p style="color:#fbbf24;font-size:13px;margin:14px 0 0;">Berlaku sampai ${expiresStr} WIB</p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding-bottom:24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.22);border-radius:12px;padding:18px 20px;">
            <tr><td>
              <p style="color:#bfdbfe;font-size:13px;margin:0 0 8px;"><strong>Yang akan terjadi setelah OTP benar:</strong></p>
              <ul style="margin:0;padding-left:18px;color:#cbd5e1;font-size:13px;line-height:1.7;">
                <li>Data realtime sensor di <strong>/listrik</strong> akan direset ke nilai kosong/default.</li>
                <li>Histori log tidak dihapus.</li>
                <li>Jika device fisik masih online, data baru bisa muncul lagi pada heartbeat berikutnya.</li>
              </ul>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding-bottom:28px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.22);border-radius:12px;padding:16px 20px;">
            <tr><td>
              <p style="color:#fde68a;font-size:13px;line-height:1.7;margin:0;">
                Abaikan email ini jika Anda tidak sedang meminta reset data realtime perangkat IoT.
              </p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td align="center">
          <p style="color:#4b5563;font-size:12px;margin:0;">© 2026 IoT Listrik Dashboard</p>
        </td></tr>
      </table>
    </td></tr>
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

function buildClearedListrikPayload() {
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
    reset_at: new Date().toISOString(),
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

  await admin.database().ref("/listrik").set(buildClearedListrikPayload());
  await otpRef.update({
    status: "completed",
    consumedAt: now,
    clearedAt: now,
    clearedByEmail: email,
    otpHash: null,
  });

  return {
    success: true,
    clearedAt: now,
    targetPath: "/listrik",
    message: "Data realtime perangkat IoT berhasil dikosongkan.",
  };
}

module.exports = {
  ensureAdminApp,
  initErrorMsg,
  setCors,
  requestLiveResetOtp,
  confirmLiveResetOtp,
};

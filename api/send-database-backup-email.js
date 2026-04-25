const fs = require("fs/promises");
const path = require("path");
const admin = require("firebase-admin");
const { Resend } = require("resend");
const {
  ensureAdminApp,
  setCors,
  httpError,
  requireAdminRequest,
} = require("./_lib/live-reset");

function maskEmail(email) {
  const raw = String(email || "").trim();
  const [local, domain] = raw.split("@");
  if (!local || !domain) return raw;
  const visibleLocal = local.length <= 2
    ? `${local[0] || "*"}*`
    : `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 2))}`;
  return `${visibleLocal}@${domain}`;
}

function formatStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}${map.month}${map.day}-${map.hour}${map.minute}${map.second}`;
}

function formatDateTimeLabel(date = new Date()) {
  return date.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatSize(bytes = 0) {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function buildBackupEmailHTML({
  email,
  projectId,
  databaseUrl,
  sentAtLabel,
  attachments,
  topLevelKeys,
}) {
  const attachmentRows = attachments.map((file) => `
    <tr>
      <td style="padding:12px 14px;border-top:1px solid #1e293b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;color:#e2e8f0;">
        <strong>${file.filename}</strong><br>
        <span style="color:#94a3b8;font-size:12px;">${file.sizeLabel}</span>
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Backup Firebase Berhasil Dibuat</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    @media only screen and (max-width:600px) {
      .container { width:100% !important; }
      .card-pad { padding:24px 18px !important; }
      .hero-title { font-size:24px !important; }
      .meta-grid td { display:block !important; width:100% !important; padding-right:0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#060c18;word-spacing:normal;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#060c18;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table class="container" role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#1d4ed8;width:44px;height:44px;border-radius:12px;text-align:center;font-size:22px;line-height:44px;">&#9889;</td>
                  <td style="padding-left:12px;">
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:17px;font-weight:700;color:#f8fafc;">IoT Listrik Dashboard</p>
                    <p style="margin:3px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#64748b;">Backup Database Firebase</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="card-pad" style="background:#0f172a;border:1px solid #1e293b;border-radius:20px;padding:32px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                <tr>
                  <td style="background:#052e16;border:1px solid #16a34a;border-radius:999px;padding:6px 14px;">
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;font-weight:700;color:#4ade80;">Backup siap diunduh</p>
                  </td>
                </tr>
              </table>

              <h1 class="hero-title" style="margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;">Snapshot RTDB dan rules sudah dikirim</h1>
              <p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.7;color:#94a3b8;">
                Backup ini dibuat atas permintaan admin <strong style="color:#e2e8f0;">${email}</strong>. Lampiran berisi ekspor JSON Realtime Database saat ini dan file rules yang aktif di workspace project.
              </p>

              <table class="meta-grid" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
                <tr>
                  <td style="width:50%;padding:0 10px 12px 0;vertical-align:top;">
                    <div style="background:#111c31;border:1px solid #1e3a5f;border-radius:14px;padding:14px;">
                      <p style="margin:0 0 6px;font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;color:#60a5fa;letter-spacing:1px;">PROJECT</p>
                      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:700;color:#e2e8f0;line-height:1.5;">${projectId}</p>
                    </div>
                  </td>
                  <td style="width:50%;padding:0 0 12px 0;vertical-align:top;">
                    <div style="background:#111c31;border:1px solid #1e3a5f;border-radius:14px;padding:14px;">
                      <p style="margin:0 0 6px;font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;color:#60a5fa;letter-spacing:1px;">WAKTU BACKUP</p>
                      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:700;color:#e2e8f0;line-height:1.5;">${sentAtLabel} WIB</p>
                    </div>
                  </td>
                </tr>
              </table>

              <div style="background:#101827;border:1px solid #1f2937;border-radius:16px;padding:16px 18px;margin-bottom:18px;">
                <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;font-weight:700;color:#e2e8f0;">Ringkasan snapshot</p>
                <p style="margin:0 0 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;line-height:1.65;color:#94a3b8;">
                  Database URL: <span style="color:#e2e8f0;">${databaseUrl}</span>
                </p>
                <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;line-height:1.65;color:#94a3b8;">
                  Node utama: <span style="color:#e2e8f0;">${topLevelKeys.length ? topLevelKeys.join(", ") : "(kosong)"}</span>
                </p>
              </div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b1220;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="padding:14px 14px 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;font-weight:700;color:#e2e8f0;">
                    Lampiran email
                  </td>
                </tr>
                ${attachmentRows}
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top:18px;">
              <p style="margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#64748b;line-height:1.7;">
                Email ini dikirim otomatis. Jangan balas email ini.
              </p>
              <p style="margin:8px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#94a3b8;line-height:1.7;">
                &copy; 2026 <strong style="color:#e2e8f0;font-weight:600;">IoT Listrik Dashboard</strong><br>
                <span style="color:#64748b;font-size:11px;">Sistem Deteksi Kebocoran Arus &nbsp;&middot;&nbsp; Built by Fatony Ahmad Fauzi</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendDatabaseBackupEmail(req) {
  ensureAdminApp();
  const { email } = await requireAdminRequest(req);

  if (!process.env.RESEND_API_KEY) {
    throw httpError(500, "RESEND_API_KEY belum dikonfigurasi di Vercel.");
  }

  const snapshot = await admin.database().ref("/").get();
  const dbPayload = snapshot.val() || {};
  const rulesPath = path.join(process.cwd(), "database.rules.json");
  const rulesRaw = await fs.readFile(rulesPath, "utf8");

  const now = new Date();
  const sentAt = now.getTime();
  const sentAtLabel = formatDateTimeLabel(now);
  const projectId = process.env.FIREBASE_PROJECT_ID
    || admin.app().options.projectId
    || "monitoring-listrik-719b1";
  const databaseUrl = admin.app().options.databaseURL
    || "https://monitoring-listrik-719b1-default-rtdb.asia-southeast1.firebasedatabase.app";
  const stamp = formatStamp(now);

  const dbFilename = `${projectId}-default-rtdb-export-${stamp}.json`;
  const rulesFilename = `${projectId}-database-rules-${stamp}.json`;
  const dbJson = JSON.stringify(dbPayload, null, 2);

  const attachments = [
    {
      filename: dbFilename,
      content: Buffer.from(dbJson, "utf8"),
      content_type: "application/json",
    },
    {
      filename: rulesFilename,
      content: Buffer.from(rulesRaw, "utf8"),
      content_type: "application/json",
    },
  ];

  const sizeBytes = attachments.reduce((total, file) => total + (Buffer.isBuffer(file.content) ? file.content.length : Buffer.byteLength(String(file.content || ""), "utf8")), 0);
  if (sizeBytes > 38 * 1024 * 1024) {
    throw httpError(413, "Ukuran backup terlalu besar untuk dikirim melalui email. Silakan kurangi data atau gunakan ekspor manual.");
  }

  const attachmentMeta = [
    { filename: dbFilename, sizeBytes: Buffer.byteLength(dbJson, "utf8"), sizeLabel: formatSize(Buffer.byteLength(dbJson, "utf8")) },
    { filename: rulesFilename, sizeBytes: Buffer.byteLength(rulesRaw, "utf8"), sizeLabel: formatSize(Buffer.byteLength(rulesRaw, "utf8")) },
  ];

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "🗄️ Backup Firebase RTDB & Rules",
    html: buildBackupEmailHTML({
      email,
      projectId,
      databaseUrl,
      sentAtLabel,
      attachments: attachmentMeta,
      topLevelKeys: Object.keys(dbPayload || {}),
    }),
    attachments,
  });

  return {
    success: true,
    sentAt,
    projectId,
    maskedEmail: maskEmail(email),
    attachments: attachmentMeta,
    topLevelKeys: Object.keys(dbPayload || {}),
  };
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const result = await sendDatabaseBackupEmail(req);
    return res.status(200).json(result);
  } catch (error) {
    console.error("send-database-backup-email error:", error);
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      error: error?.message || "Gagal membuat backup database Firebase.",
    });
  }
}

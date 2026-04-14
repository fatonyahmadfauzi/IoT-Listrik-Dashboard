const admin = require("firebase-admin");
const { Resend } = require("resend");

let initErrorMsg = "";
// Initialize Firebase Admin lazily to avoid multiple init errors in Serverless
if (!admin.apps.length) {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
       throw new Error("FIREBASE_SERVICE_ACCOUNT Env Var is empty or undefined");
    }
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://monitoring-listrik-719b1-default-rtdb.asia-southeast1.firebasedatabase.app/" // adjust to your actual DB URL
    });
  } catch (error) {
    console.error("Firebase admin init error:", error);
    initErrorMsg = error.message;
  }
}

const resend = new Resend(process.env.RESEND_API_KEY);

function randomStr(len, chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789") {
  let r = "";
  for (let i = 0; i < len; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

function buildEmailHTML({ tempEmail, password, expiresAt }) {
  const d = new Date(expiresAt);
  const timeStr = d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit", minute: "2-digit",
  });
  const dateStr = d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric", month: "long", year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="id" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="x-apple-disable-message-reformatting"/>
<title>Akun Simulator IoT Siap</title>
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
    .cred-value { font-size: 16px !important; }
    .pw-value { font-size: 22px !important; letter-spacing: 4px !important; }
    .cta-btn { padding: 16px 20px !important; font-size: 16px !important; }
    .sec-cta-wrap { display: block !important; width: 100% !important; }
    .sec-cta-cell { display: block !important; width: 100% !important; padding: 0 0 8px 0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#060c18;word-spacing:normal;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Akun simulator IoT Listrik Anda siap. Email &amp; password tersedia di dalam &mdash; berlaku hanya 15 menit.&#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;</div>

<!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->

<!-- OUTER WRAPPER -->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#060c18;">
<tr><td align="center" style="padding:48px 16px 40px;">

  <!-- CONTAINER -->
  <table class="container" role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;">

    <!-- ━━━ A. WORDMARK HEADER ━━━ -->
    <tr><td align="center" style="padding-bottom:32px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background-color:#1d4ed8;width:44px;height:44px;border-radius:12px;text-align:center;vertical-align:middle;font-size:22px;line-height:44px;">
            &#9889;
          </td>
          <td style="padding-left:12px;vertical-align:middle;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:17px;font-weight:700;color:#f1f5f9;line-height:1;">IoT Listrik Dashboard</p>
            <p style="margin:3px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#4b5563;line-height:1;">Simulator Akun Demo</p>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- ━━━ B. MAIN CARD ━━━ -->
    <tr><td class="card-pad" style="background-color:#0f1729;border:1px solid #1e2d45;border-radius:20px;padding:36px 32px;">

      <!-- B1. STATUS CHIP -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td style="background-color:#052e16;border:1px solid #16a34a;border-radius:100px;padding:5px 16px 5px 12px;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;font-weight:700;color:#4ade80;letter-spacing:0.3px;">&#10003;&nbsp; Akun Berhasil Dibuat</p>
          </td>
        </tr>
      </table>

      <!-- B2. HEADING -->
      <h1 style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1.15;">Kredensial Demo Siap</h1>
      <p style="margin:0 0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;color:#6b7280;line-height:1.65;">
        Gunakan data berikut untuk masuk ke Simulator IoT Listrik.<br>
        <strong style="color:#ef4444;">Segera gunakan — berlaku hanya 15 menit.</strong>
      </p>

      <!-- ─── CREDENTIAL MODULE ─── -->

      <!-- Email row -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
        <tr>
          <td style="background-color:#080f1f;border:1px solid #1e2d45;border-radius:14px;padding:18px 20px;">
            <p style="margin:0 0 7px;font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:1px;">EMAIL DEMO</p>
            <p class="cred-value" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:600;color:#cbd5e1;word-break:break-all;line-height:1.4;">${tempEmail}</p>
          </td>
        </tr>
      </table>

      <!-- Password row — hero credential -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
        <tr>
          <td style="background-color:#030d1f;border:1px solid #1e3a5f;border-left:3px solid #3b82f6;border-radius:14px;padding:18px 20px;">
            <p style="margin:0 0 7px;font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:1px;">PASSWORD</p>
            <p class="pw-value" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:26px;font-weight:800;color:#93c5fd;letter-spacing:6px;line-height:1.2;">${password}</p>
          </td>
        </tr>
      </table>

      <!-- Expiry row -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="background-color:#1c0f00;border:1px solid #78350f;border-radius:14px;padding:14px 20px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;">&#9201;&nbsp; Kadaluarsa</p>
                  <p style="margin:4px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:700;color:#fbbf24;line-height:1.3;">${timeStr} WIB &mdash; ${dateStr}</p>
                </td>
                <td align="right" style="vertical-align:middle;white-space:nowrap;padding-left:12px;">
                  <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:800;color:#f59e0b;background-color:#292001;border-radius:8px;padding:6px 12px;">15 MENIT</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

    </td></tr>

    <!-- SPACER -->
    <tr><td style="height:12px;"></td></tr>

    <!-- ━━━ C. PRIMARY CTA ━━━ -->
    <tr><td>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="background-color:#065f46;background:linear-gradient(160deg,#047857,#10b981);border-radius:16px;">
            <a href="https://iot-listrik-dashboard.vercel.app/simulator/login?install=1" target="_blank" style="display:block;text-decoration:none;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td class="cta-btn" align="center" style="padding:20px 28px;">
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:17px;font-weight:800;color:#ffffff;line-height:1;">&#9654;&nbsp; Buka Simulator Sekarang</p>
                    <p style="margin:6px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;font-weight:400;color:rgba(255,255,255,0.65);line-height:1;">iot-listrik-dashboard.vercel.app/simulator/login</p>
                  </td>
                </tr>
              </table>
            </a>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- SPACER -->
    <tr><td style="height:8px;"></td></tr>

    <!-- ━━━ D. SECONDARY CTAs — text link style, no heavy panels ━━━ -->
    <tr><td style="border-top:1px solid #1a2540;padding-top:16px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center">
            <p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Akses Lainnya</p>
          </td>
        </tr>
        <tr>
          <td align="center">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:0 6px;">
                  <a href="https://iot-listrik-dashboard.vercel.app/app/login?install=1" target="_blank" style="display:inline-block;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600;color:#93c5fd;background-color:#0c1a2e;border:1px solid #1e3a5f;border-radius:10px;padding:10px 18px;">&#x1F5A5;&#xFE0F;&nbsp; Dashboard Monitor</a>
                </td>
                <td style="padding:0 6px;">
                  <a href="https://iot-listrik-dashboard.vercel.app/downloads" target="_blank" style="display:inline-block;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600;color:#9ca3af;background-color:#0d1117;border:1px solid #1f2937;border-radius:10px;padding:10px 18px;">&#x1F4F1;&nbsp; Download App</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- SPACER -->
    <tr><td style="height:32px;"></td></tr>

    <!-- ━━━ E. FOOTER ━━━ -->
    <tr><td align="center">
      <p style="margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#374151;line-height:1.7;">
        Email ini dikirim otomatis. Jangan balas email ini.<br>
        Data akun dan sesi akan dihapus otomatis setelah <strong style="color:#4b5563;">15 menit</strong>.
      </p>
      <p style="margin:8px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.7;">
        &copy; 2025 <strong style="color:#9ca3af;font-weight:600;">IoT Listrik Dashboard</strong><br>
        <span style="color:#4b5563;font-size:11px;">Sistem Deteksi Kebocoran Arus &nbsp;&middot;&nbsp; Built by Fatony Ahmad Fauzi</span>
      </p>
    </td></tr>

  </table>
  <!-- /CONTAINER -->

</td></tr>
</table>
<!-- /OUTER WRAPPER -->

<!--[if mso | IE]></td></tr></table><![endif]-->

</body>
</html>`;
}

export default async function handler(req, res) {
  // CORS Configuration
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { realEmail } = req.body;

  if (!realEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(realEmail)) {
    return res.status(400).json({ error: "Email tidak valid." });
  }

  if (!admin.apps.length) {
    return res.status(500).json({ 
       error: "Server Config Error: Firebase Admin tidak valid. Detail: " + initErrorMsg 
    });
  }

  const randomId = randomStr(8);
  const tempEmail = `sim_${randomId}@iotlistrik.demo`;
  const password  = randomStr(4, "ABCDEFGHJKLMNPQRSTUVWXYZ") 
                  + randomStr(4, "23456789") 
                  + randomStr(4, "abcdefghjkmnpqrstuvwxyz");
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  try {
    // 1. Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email: tempEmail,
      password: password,
      displayName: `Demo ${randomId}`,
    });

    // 2. Set Custom Claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      isTempAccount: true,
      realEmail,
      expiresAt,
    });

    // 3. Set Session & Initial Data in RTDB
    const db = admin.database();
    
    // Create Temporary Session Marker
    await db.ref(`/temp_sessions/${userRecord.uid}`).set({
      realEmail,
      tempEmail,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      expiresAt,
    });

    // Init Data for Dashboard Simulation
    await db.ref(`/sim/${userRecord.uid}`).set({
      listrik: {
        arus: 0, 
        tegangan: 220, 
        daya: 0, 
        energi_kwh: 0,
        frekuensi: 50, 
        power_factor: 0.85,
        relay: 1, 
        status: "NORMAL",
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
          webhookAlerts: "", webhookRelay: "", webhookMonitoring: "", webhookLogs: "",
        },
      },
    });

    // 4. Send Email via Resend
    let emailSent = false;
    try {
      const { data, error } = await resend.emails.send({
        from: "onboarding@resend.dev", // You can keep this for testing to yourself, or use verified domain
        to: realEmail,
        subject: "⚡ Akun Demo IoT Listrik Siap Digunakan",
        html: buildEmailHTML({ tempEmail, password, expiresAt }),
      });
      if (error) {
         console.error("Resend error response:", error);
      } else {
         emailSent = true;
      }
    } catch (err) {
      console.error("Gagal kirim email via Resend:", err);
    }

    // 5. Autoclean Pasif Jaringan 
    // (Karena Vercel Free tidak support Cron hitungan menit, kita numpang bersih-bersih disini)
    try {
      const snapSessions = await db.ref('/temp_sessions').once('value');
      const sessions = snapSessions.val() || {};
      const now = Date.now();
      const promises = [];

      for (const uid in sessions) {
        if (sessions[uid].expiresAt && now >= sessions[uid].expiresAt) {
          promises.push(
            admin.auth().deleteUser(uid).catch(() => {}),
            db.ref(`/sim/${uid}`).remove(),
            db.ref(`/temp_sessions/${uid}`).remove()
          );
        }
      }
      if (promises.length > 0) await Promise.allSettled(promises);
    } catch(err) {
      console.error("Gagal Auto-cleanup pasif", err);
    }

    return res.status(200).json({ 
      success: true, 
      tempEmail, 
      password, 
      expiresAt, 
      uid: userRecord.uid,
      emailSent
    });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Gagal membuat akun demo: " + error.message });
  }
}

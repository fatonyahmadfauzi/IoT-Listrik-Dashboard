const admin = require("firebase-admin");
const { Resend } = require("resend");

// Initialize Firebase Admin lazily to avoid multiple init errors in Serverless
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://monitoring-listrik-719b1-default-rtdb.asia-southeast1.firebasedatabase.app/" // adjust to your actual DB URL
    });
  } catch (error) {
    console.error("Firebase admin init error:", error);
  }
}

const resend = new Resend(process.env.RESEND_API_KEY);

function randomStr(len, chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789") {
  let r = "";
  for (let i = 0; i < len; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

function buildEmailHTML({ tempEmail, password, expiresAt }) {
  const expiresStr = new Date(expiresAt).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit"
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
      <tr><td align="center" style="padding-bottom:32px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#0f2040);border:1px solid rgba(59,130,246,0.3);border-radius:16px;padding:20px 32px;">
          <span style="font-size:40px;">⚡</span>
          <h1 style="color:#e2e8f0;font-size:22px;margin:8px 0 4px 0;font-weight:700;">IoT Listrik Dashboard</h1>
          <p style="color:#94a3b8;font-size:13px;margin:0;">Simulator Akun Demo</p>
        </div>
      </td></tr>
      <tr><td align="center" style="padding-bottom:24px;">
        <h2 style="color:#e2e8f0;font-size:20px;margin:0;font-weight:700;">🧪 Akun Demo Anda Siap!</h2>
        <p style="color:#94a3b8;font-size:14px;margin:8px 0 0;">Gunakan kredensial berikut untuk mengakses simulator IoT</p>
      </td></tr>
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
                background:rgba(245,158,11,0.08);border-radius:8px;padding:10px 14px;">${expiresStr} WIB (5 menit)</p>
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding-bottom:24px;">
        <a href="https://iot-listrik-dashboard.vercel.app/app/login?install=1"
          style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;
            text-decoration:none;font-size:16px;font-weight:700;padding:14px 36px;
            border-radius:999px;box-shadow:0 4px 20px rgba(59,130,246,0.4);">
          ⚡ Buka Simulator →
        </a>
      </td></tr>
      <tr><td style="padding-bottom:24px;">
        <p style="color:#6b7280;font-size:12px;margin:8px 0 0;text-align:center;">Gunakan email dan password di atas untuk login di platform manapun (Web, PWA, Android, Windows).</p>
      </td></tr>
    </table>
  </td></tr>
</table>
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
    return res.status(500).json({ error: "Server Configuration Error: Firebase Admin not initialized (Missing Environment Variables)." });
  }

  const randomId = randomStr(8);
  const tempEmail = `sim_${randomId}@iotlistrik.demo`;
  const password  = randomStr(4, "ABCDEFGHJKLMNPQRSTUVWXYZ") 
                  + randomStr(4, "23456789") 
                  + randomStr(4, "abcdefghjkmnpqrstuvwxyz");
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

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

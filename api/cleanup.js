const admin = require("firebase-admin");
const crypto = require("crypto");

// Initialize Firebase Admin lazily to avoid multiple init errors in Serverless
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://monitoring-listrik-719b1-default-rtdb.asia-southeast1.firebasedatabase.app/" // sesuaikan jika berbeda
    });
  } catch (error) {
    console.error("Firebase admin init error di cleanup:", error);
  }
}

function getHeader(req, name) {
  const value = req.headers?.[name.toLowerCase()] ?? req.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

function safeEqual(a, b) {
  if (!a || !b) return false;

  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function getProvidedSecret(req) {
  const authHeader = getHeader(req, "authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  const headerSecret = getHeader(req, "x-cron-secret");
  if (headerSecret) return String(headerSecret).trim();

  const querySecret = req.query?.secret;
  return Array.isArray(querySecret) ? querySecret[0] : querySecret;
}

function validateCleanupSecret(req) {
  const expectedSecret = process.env.CRON_SECRET || process.env.CLEANUP_SECRET;

  if (!expectedSecret) {
    return {
      ok: false,
      status: 500,
      message: "CRON_SECRET belum diset di environment Vercel.",
    };
  }

  if (!safeEqual(getProvidedSecret(req), expectedSecret)) {
    return {
      ok: false,
      status: 401,
      message: "Unauthorized cleanup request.",
    };
  }

  return { ok: true };
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secretCheck = validateCleanupSecret(req);
  if (!secretCheck.ok) {
    return res.status(secretCheck.status).json({ error: secretCheck.message });
  }
  
  if (!admin.apps.length) {
    return res.status(500).json({ error: "Firebase Admin tidak terinisialisasi" });
  }

  const db = admin.database();
  const auth = admin.auth();
  const now = Date.now();
  let deletedCount = 0;

  try {
    const snapshot = await db.ref('/temp_sessions').once('value');
    if (!snapshot.exists()) {
      return res.status(200).json({ success: true, message: "Tidak ada sesi temporary", deleted: 0 });
    }

    const sessions = snapshot.val();
    const promises = [];

    for (const uid in sessions) {
      const session = sessions[uid];
      if (session.expiresAt && now >= session.expiresAt) {
        deletedCount++;
        promises.push(
          // 1. Hapus User dari Autentikasi
          auth.deleteUser(uid).catch(e => console.error(`Gagal menghapus Auth User ${uid}:`, e.message)),
          // 2. Kosongkan Data Simulator
          db.ref(`/sim/${uid}`).remove(),
          // 3. Hapus Catatan Sesi
          db.ref(`/temp_sessions/${uid}`).remove()
        );
      }
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }

    return res.status(200).json({ 
      success: true, 
      message: `Pembersihan berhasil. Menghapus ${deletedCount} sesi kadaluarsa.`,
      deleted: deletedCount 
    });

  } catch (err) {
    console.error("Kesalahan Cleanup Cron:", err);
    return res.status(500).json({ error: err.message });
  }
}

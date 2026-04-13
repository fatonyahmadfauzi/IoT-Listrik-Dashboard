const admin = require("firebase-admin");

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

export default async function handler(req, res) {
  // Hanya izinkan Vercel Cron dan manual trigger (POST/GET) 
  // Opsi: Anda bisa amankan ujung API ini dengan header khusus. Di sini kita biarkan terbuka untuk kemudahan testing.
  
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

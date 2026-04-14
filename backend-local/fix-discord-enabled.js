/**
 * fix-discord-enabled.js
 * Memperbaiki discord.enabled=false di semua akun sim yang punya webhook tapi enabled=false.
 * Jalankan sekali: node backend-local/fix-discord-enabled.js
 */
const admin = require('firebase-admin');
const path  = require('path');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(path.join(__dirname, 'serviceAccountKey.json'))),
    databaseURL: 'https://monitoring-listrik-719b1-default-rtdb.asia-southeast1.firebasedatabase.app',
  });
}
const db = admin.database();

async function fix() {
  console.log('[Fix] Membaca semua akun sim dari /sim/...');
  const snap = await db.ref('/sim').get();
  if (!snap.exists()) { console.log('[Fix] Tidak ada data /sim'); process.exit(0); }

  const promises = [];
  snap.forEach(child => {
    const uid = child.key;
    const discord = child.child('settings/discord').val();
    if (!discord) return;

    const hasWebhook = !!(discord.webhookAlerts || discord.webhookRelay || discord.webhookMonitoring || discord.webhookLogs);
    const isDisabled = discord.enabled === false;

    console.log(`  UID ${uid.slice(0,12)}: enabled=${discord.enabled}, hasWebhook=${hasWebhook}`);

    if (hasWebhook && isDisabled) {
      console.log(`  → FIX: Set enabled=true untuk ${uid.slice(0,12)}`);
      promises.push(db.ref(`/sim/${uid}/settings/discord/enabled`).set(true));
    }
  });

  if (promises.length === 0) {
    console.log('[Fix] Tidak ada yang perlu diperbaiki.');
  } else {
    await Promise.all(promises);
    console.log(`[Fix] ✅ Selesai. ${promises.length} akun diperbaiki.`);
  }
  process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });

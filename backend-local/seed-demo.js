/**
 * Demo data untuk RTDB /listrik tanpa perangkat IoT.
 * Memakai Firebase Admin (sama seperti server.js) — melewati security rules.
 *
 * Prasyarat:
 *   - File .env di folder ini berisi FIREBASE_DATABASE_URL
 *   - serviceAccountKey.json (atau path di FIREBASE_SERVICE_ACCOUNT_PATH)
 *
 * Usage:
 *   node seed-demo.js           → tulis sekali, lalu exit
 *   node seed-demo.js --live    → update setiap ~2.5 detik (simulasi realtime)
 *   node seed-demo.js --logs=50 → generate 50 log entries ke /logs
 *   node seed-demo.js --logs=50 --clear-logs → hapus /logs dulu, lalu isi ulang
 *   node seed-demo.js --live --logs=1 → saat live, ikut push log setiap tick
 */
require('dotenv').config();
const admin = require('firebase-admin');

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
const databaseURL = process.env.FIREBASE_DATABASE_URL;

if (!databaseURL) {
  console.error('❌ FIREBASE_DATABASE_URL tidak ada di .env');
  process.exit(1);
}

try {
  const serviceAccount = require(serviceAccountPath);
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL,
    });
  }
} catch (e) {
  console.error(`❌ Gagal load service account: ${serviceAccountPath}`);
  console.error(e.message);
  process.exit(1);
}

const db = admin.database();
const LIVE = process.argv.includes('--live');
const INTERVAL_MS = Number(process.env.DEMO_INTERVAL_MS) || 2500;

function getArgInt(name, defVal) {
  const p = process.argv.find((x) => x.startsWith(`--${name}=`));
  if (!p) return defVal;
  const v = parseInt(p.split('=')[1], 10);
  return Number.isFinite(v) ? v : defVal;
}

const LOG_COUNT = Math.min(Math.max(getArgInt('logs', 0), 0), 500);
const CLEAR_LOGS = process.argv.includes('--clear-logs');

function rnd(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Bangun snapshot mirip firmware: status NORMAL / WARNING / DANGER
 * (threshold referensi 10 A — samakan dengan /settings di Console jika beda).
 */
function buildListrik() {
  const threshold = 10;
  const warnRatio = 0.8;

  let arus;
  const roll = Math.random();
  if (roll < 0.07) {
    arus = rnd(threshold, threshold * 1.2);
  } else if (roll < 0.2) {
    arus = rnd(threshold * warnRatio, threshold * 0.98);
  } else {
    arus = rnd(0.15, threshold * 0.75);
  }

  const tegangan = rnd(218, 225);
  const apparent = arus * tegangan;
  const pf = Math.min(0.99, Math.max(0.7, rnd(0.82, 0.92)));
  const dayaW = apparent * pf;

  let status = 'NORMAL';
  if (arus >= threshold) status = 'DANGER';
  else if (arus >= threshold * warnRatio) status = 'WARNING';

  const relay = status === 'DANGER' ? 0 : 1;

  return {
    arus: Math.round(arus * 100) / 100,
    tegangan: Math.round(tegangan * 10) / 10,
    daya: Math.round(apparent * 10) / 10,
    energi_kwh: Math.round(rnd(0.01, 48.999) * 1000) / 1000,
    frekuensi: 50,
    power_factor: Math.round(pf * 100) / 100,
    status,
    relay,
    updated_at: Date.now(),
  };
}

function buildLogEntry(fromListrik) {
  const source = LIVE ? 'demo_live' : 'demo_seed';
  return {
    arus: fromListrik.arus,
    tegangan: fromListrik.tegangan,
    status: fromListrik.status,
    relay: fromListrik.relay,
    power_factor: fromListrik.power_factor,
    frekuensi: fromListrik.frekuensi,
    daya: fromListrik.daya,
    energi_kwh: fromListrik.energi_kwh,
    waktu: Date.now(),
    source,
  };
}

async function writeOnce() {
  const data = buildListrik();
  await db.ref('/listrik').update(data);
  console.log(
    `[demo] ${new Date().toISOString()}  ${data.status}  I=${data.arus}A  V=${data.tegangan}V  kWh=${data.energi_kwh}`
  );
  if (LOG_COUNT > 0) {
    await db.ref('/logs').push(buildLogEntry(data));
  }
}

async function seedLogs(count) {
  if (count <= 0) return;
  if (CLEAR_LOGS) {
    console.log('🧹 Menghapus /logs ...');
    await db.ref('/logs').remove();
  }

  console.log(`🧾 Mengisi /logs sebanyak ${count} entri ...`);
  const baseNow = Date.now();
  const updates = [];
  for (let i = 0; i < count; i++) {
    const d = buildListrik();
    // buat timestamp seolah-olah historis (mundur per 30–90 detik)
    const t = baseNow - (count - i) * Math.floor(rnd(30000, 90000));
    const entry = buildLogEntry({ ...d, updated_at: t });
    entry.waktu = t;
    updates.push(db.ref('/logs').push(entry));
  }
  await Promise.all(updates);
  console.log('✅ /logs terisi.');
}

async function main() {
  // Seed logs first (so tables show up immediately)
  if (LOG_COUNT > 1) {
    await seedLogs(LOG_COUNT);
  }

  console.log('✅ Menulis data demo ke /listrik …');
  // Always write one current snapshot
  await db.ref('/listrik').update(buildListrik());

  if (!LIVE) {
    if (LOG_COUNT === 1) {
      // logs=1 in non-live mode → push exactly one log row
      const d = await db.ref('/listrik').once('value');
      await db.ref('/logs').push(buildLogEntry(d.val() || buildListrik()));
    }
    console.log(
      'Selesai. Gunakan --live untuk realtime, atau --logs=N untuk mengisi tabel log.'
    );
    process.exit(0);
  }

  console.log(`Mode LIVE: update setiap ${INTERVAL_MS} ms. Ctrl+C berhenti.`);
  setInterval(() => {
    writeOnce().catch((err) => console.error(err));
  }, INTERVAL_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

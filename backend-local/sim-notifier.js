/**
 * sim-notifier.js — Simulator Multi-Platform Notifier
 * ─────────────────────────────────────────────────────
 * Menangani notifikasi Discord, Telegram, dan FCM untuk
 * semua akun simulator (temp accounts) secara dinamis.
 *
 * Data tiap akun disimpan di:
 *   /sim/{uid}/listrik        → data sensor
 *   /sim/{uid}/settings/      → Telegram token, Discord webhook, dll
 *   /sim/{uid}/settings/discord/ → Discord webhook config
 *   /sim/{uid}/logs           → log aktivitas
 *
 * Cara menjalankan:
 *   npm run sim-notify
 *   (atau: node backend-local/sim-notifier.js)
 *
 * ─────────────────────────────────────────────────────
 */

const admin = require('firebase-admin');
const fetch = require('node-fetch');
const path  = require('path');
const fs    = require('fs');

// ── Firebase Admin Init ──────────────────────────────────────────────────
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('[ERROR] serviceAccountKey.json tidak ditemukan di backend-local/');
  console.error('        Download dari Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}

// Cek apakah firebase-admin sudah diinit (jika dijalankan bersama server.js)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
    databaseURL: 'https://monitoring-listrik-719b1-default-rtdb.asia-southeast1.firebasedatabase.app',
  });
}

const db = admin.database();
console.log('[Sim Notifier] Terhubung ke Firebase RTDB ✅');

// ── State per UID ──────────────────────────────────────────────────────────
// Menyimpan config, status terakhir, dan listener untuk setiap UID aktif
const simState = {};

// ── Helpers: Waktu ─────────────────────────────────────────────────────────
function waktuId() {
  return new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'short',
    timeStyle: 'medium',
  });
}

// ── Helper: Warna & emoji status ───────────────────────────────────────────
function statusColor(s) {
  switch ((s || '').toUpperCase()) {
    case 'DANGER':  return 0xED4245;
    case 'WARNING': return 0xFEE75C;
    case 'NORMAL':  return 0x57F287;
    default:        return 0x5865F2;
  }
}
function statusEmoji(s) {
  switch ((s || '').toUpperCase()) {
    case 'DANGER':  return '🔴';
    case 'WARNING': return '🟡';
    case 'NORMAL':  return '🟢';
    default:        return '🔵';
  }
}

// ── Helper: Kirim Discord Embed ────────────────────────────────────────────
async function sendDiscordEmbed(webhookUrl, embed) {
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) return false;
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (res.ok || res.status === 204) {
      return true;
    } else {
      const txt = await res.text();
      console.error(`[Discord] HTTP ${res.status}:`, txt.slice(0, 200));
      return false;
    }
  } catch (err) {
    console.error('[Discord] Fetch error:', err.message);
    return false;
  }
}

// ── Helper: Kirim Telegram Message ─────────────────────────────────────────
function normalizeTelegramChatId(value) {
  const id = String(value ?? '').trim();
  return /^-?\d+$/.test(id) ? id : '';
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
    if (typeof source === 'object') {
      Object.values(source).forEach(visit);
      return;
    }
    String(source).split(/[\s,;]+/).forEach(add);
  };

  sources.forEach(visit);
  return ids;
}

function getTelegramChatIds(cfg) {
  return parseTelegramChatIds(
    cfg?.telegramChatIds,
    cfg?.telegramChatId,
    cfg?.telegram?.chat_id
  );
}

function hasTelegramConfig(cfg) {
  return !!(cfg?.telegramBotToken && getTelegramChatIds(cfg).length > 0);
}

async function sendTelegram(botToken, chatIds, message) {
  const ids = parseTelegramChatIds(chatIds);
  if (!botToken || ids.length === 0) return false;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const results = await Promise.allSettled(ids.map(async (chatId) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: String(chatId),
        text: message,
        parse_mode: 'HTML',
      }),
    });
    const json = await res.json();
    if (json.ok) {
      return true;
    }
    return false;
  }));

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`[Telegram] Fetch error ${ids[index]}:`, result.reason?.message || result.reason);
    } else if (!result.value) {
      console.error(`[Telegram] Gagal terkirim ke ${ids[index]}`);
    }
  });

  return results.some((result) => result.status === 'fulfilled' && result.value);
}

// ── Helper: Kirim FCM Push ─────────────────────────────────────────────────
async function sendFCM(status, uid) {
  const payload = {
    topic: 'iot_alarms',
    data: {
      action: status === 'DANGER' ? 'TRIGGER_ALARM' : 'STOP_ALARM',
      status,
      title: status === 'DANGER' ? '🚨 BAHAYA SIM!' : '✅ Status Normal',
      message: status === 'DANGER'
        ? `Simulator[${uid.slice(0,8)}]: Overcurrent terdeteksi!`
        : `Simulator[${uid.slice(0,8)}]: Kondisi kembali normal.`,
      uid,
      source: 'simulator',
    },
    android: { priority: 'high' },
  };
  try {
    await admin.messaging().send(payload);
    console.log(`[FCM] Alarm terkirim → status=${status}, uid=${uid.slice(0,8)}`);
  } catch (err) {
    console.error('[FCM] Error:', err.code || err.message);
  }
}

// ── Helper: Baca config terbaru dari Firebase (untuk API endpoints) ─────────
async function fetchConfigFresh(uid) {
  try {
    const [settingsSnap, discordSnap] = await Promise.all([
      db.ref(`/sim/${uid}/settings`).get(),
      db.ref(`/sim/${uid}/settings/discord`).get(),
    ]);
    const cfg = settingsSnap.val() || {};
    // Pastikan discord selalu ter-merge dari subpath
    if (!cfg.discord && discordSnap.exists()) {
      cfg.discord = discordSnap.val();
    }
    return cfg;
  } catch (err) {
    console.error(`[Config] Error fetch config untuk ${uid.slice(0,8)}:`, err.message);
    return {};
  }
}

// ── Core: Notifikasi saat status berubah ───────────────────────────────────
async function handleStatusChange(uid, currentStatus, prevStatus, listrikData, cfg = null) {
  // Jika cfg tidak diberikan, baca dari state atau Firebase langsung
  if (!cfg) {
    cfg = simState[uid]?.config;
    if (!cfg || Object.keys(cfg).length === 0) {
      console.log(`[Sim] [${uid.slice(0,8)}] Config kosong di state, fetch dari Firebase...`);
      cfg = await fetchConfigFresh(uid);
      if (simState[uid]) simState[uid].config = cfg;
    }
  }

  const d = listrikData || {};

  console.log(`\n[Sim] [${uid.slice(0,8)}] Status: ${prevStatus} → ${currentStatus}`);
  console.log(`  Config: telegram=${!!(cfg.telegramBotToken)}, discord.enabled=${cfg.discord?.enabled}, discord.webhookAlerts=${!!(cfg.discord?.webhookAlerts)}`);

  const isAlert    = currentStatus === 'DANGER' || currentStatus === 'WARNING';
  const isRecovery = currentStatus === 'NORMAL' && (prevStatus === 'DANGER' || prevStatus === 'WARNING');

  // ── 1. Discord #alerts ─────────────────────────────────────────────────
  // Kirim jika ada webhook (enabled !== false = default aktif)
  if (cfg.discord?.enabled !== false && cfg.discord?.webhookAlerts) {
    const isBahaya = currentStatus === 'DANGER';
    const embed = {
      title: `${statusEmoji(currentStatus)} [SIM] Status: ${currentStatus}`,
      description: isBahaya
        ? '⚠️ **OVERCURRENT TERDETEKSI!** Relay diputuskan otomatis.'
        : isRecovery
        ? '✅ Kondisi kelistrikan simulator kembali **NORMAL**.'
        : `Status berubah dari \`${prevStatus}\` → \`${currentStatus}\``,
      color: statusColor(currentStatus),
      fields: [
        { name: '⚡ Arus',         value: `${d.arus         ?? '-'} A`,   inline: true },
        { name: '🔋 Tegangan',     value: `${d.tegangan     ?? '-'} V`,   inline: true },
        { name: '💡 Daya',         value: `${d.daya         ?? '-'} W`,   inline: true },
        { name: '🔌 Relay',        value: d.relay ? 'ON' : 'OFF',         inline: true },
        { name: '📡 Frekuensi',    value: `${d.frekuensi    ?? '-'} Hz`,  inline: true },
        { name: '📊 Power Factor', value: `${d.power_factor ?? '-'}`,     inline: true },
        { name: '🆔 Session',      value: `\`${uid.slice(0,12)}...\``,   inline: false },
      ],
      footer: { text: `IoT Listrik Simulator • ${waktuId()}` },
      thumbnail: { url: 'https://iot-listrik-dashboard.vercel.app/assets/icons/icon-192x192.png' },
    };
    const ok = await sendDiscordEmbed(cfg.discord.webhookAlerts, embed);
    console.log(`  [Discord #alerts] ${ok ? '✅ Terkirim' : '❌ Gagal'}`);
  } else {
    console.log(`  [Discord #alerts] ⚠️ Skip: enabled=${cfg.discord?.enabled}, hasWebhook=${!!(cfg.discord?.webhookAlerts)}`);
  }

  // ── 2. Discord #relay (jika relay mati karena DANGER) ─────────────────
  if (currentStatus === 'DANGER' && cfg.discord?.enabled !== false && cfg.discord?.webhookRelay) {
    const embed = {
      title: '🪫 [SIM] Relay DIMATIKAN (Auto-Cutoff)',
      description: 'Relay diputus otomatis karena overcurrent terdeteksi.',
      color: 0xED4245,
      footer: { text: `IoT Listrik Simulator • ${waktuId()}` },
    };
    await sendDiscordEmbed(cfg.discord.webhookRelay, embed);
  }

  // ── 3. Telegram ────────────────────────────────────────────────────────
  const tgEnabled = cfg.telegramNotifyEnabled !== false;
  const tgToken   = cfg.telegramBotToken;
  const tgChatIds = getTelegramChatIds(cfg);

  if (tgEnabled && tgToken && tgChatIds.length > 0) {
    let msg = '';
    if (currentStatus === 'DANGER') {
      msg = `🔴 <b>[SIMULATOR] BAHAYA KRITIS!</b>\n` +
        `⚡ Arus: <b>${d.arus ?? '-'} A</b>\n` +
        `🔋 Tegangan: ${d.tegangan ?? '-'} V\n` +
        `🔌 Relay: <b>OFF (Auto Cutoff)</b>\n` +
        `🕐 ${waktuId()}\n` +
        `<i>Session: ${uid.slice(0,12)}...</i>`;
    } else if (currentStatus === 'WARNING') {
      msg = `🟡 <b>[SIMULATOR] Peringatan Arus Tinggi</b>\n` +
        `⚡ Arus: <b>${d.arus ?? '-'} A</b>\n` +
        `🔋 Tegangan: ${d.tegangan ?? '-'} V\n` +
        `🕐 ${waktuId()}`;
    } else if (isRecovery) {
      msg = `🟢 <b>[SIMULATOR] Status Kembali Normal</b>\n` +
        `⚡ Arus: ${d.arus ?? '-'} A\n` +
        `🔋 Tegangan: ${d.tegangan ?? '-'} V\n` +
        `🕐 ${waktuId()}`;
    }
    if (msg) {
      const ok = await sendTelegram(tgToken, tgChatIds, msg);
      console.log(`  [Telegram] ${ok ? '✅ Terkirim' : '❌ Gagal'}`);
    }
  } else {
    console.log(`  [Telegram] ⚠️ Skip: enabled=${tgEnabled}, hasToken=${!!(tgToken)}, chatIds=${tgChatIds.length}`);
  }

  // ── 4. FCM Push Notification (Android/Web) ─────────────────────────────
  if (isAlert || isRecovery) {
    await sendFCM(currentStatus, uid);
  }
}

// ── Core: Notifikasi log baru ──────────────────────────────────────────────
async function handleNewLog(uid, logKey, logData) {
  const cfg = simState[uid]?.config || {};
  if (cfg.discord?.enabled === false || !cfg.discord?.webhookLogs) return;


  const log = logData || {};
  const embed = {
    title: '📋 [SIM] Log Aktivitas Baru',
    description: log.message || log.source || `Log ID: ${logKey}`,
    color: 0x99AAB5,
    fields: [
      log.status && { name: 'Status', value: log.status, inline: true },
      log.arus !== undefined && { name: '⚡ Arus', value: `${log.arus} A`, inline: true },
      log.source && { name: 'Sumber', value: log.source, inline: true },
      { name: '🆔 Session', value: `\`${uid.slice(0,12)}...\``, inline: false },
    ].filter(Boolean),
    footer: { text: `IoT Listrik Simulator • ${waktuId()} • ${logKey.slice(-6)}` },
  };
  await sendDiscordEmbed(cfg.discord.webhookLogs, embed);
}

// ── Core: Setup listener untuk satu UID ───────────────────────────────────
function setupListenersForUid(uid) {
  if (simState[uid]?.listenersAttached) return;

  console.log(`[Sim] Memasang listener untuk UID: ${uid.slice(0,12)}...`);
  simState[uid] = simState[uid] || {};
  simState[uid].lastStatus = null;
  simState[uid].logsInitialized = false;
  simState[uid].listenersAttached = true;
  simState[uid].config = {};

  // 1. Watch config settings (root)
  db.ref(`/sim/${uid}/settings`).on('value', (snap) => {
    const newCfg = snap.val() || {};
    // Jaga discord subpath agar tidak hilang jika sudah ada
    const prevDiscord = simState[uid].config?.discord;
    simState[uid].config = newCfg;
    // Jika root tidak punya discord tapi subpath punya, pertahankan
    if (!newCfg.discord && prevDiscord) {
      simState[uid].config.discord = prevDiscord;
    }
    console.log(`[Sim] [${uid.slice(0,8)}] Config root dimuat: telegram=${!!(newCfg.telegramBotToken)}, discord=${!!(newCfg.discord?.enabled)}`);
  });

  // 2. Watch config settings/discord (subpath khusus)
  db.ref(`/sim/${uid}/settings/discord`).on('value', (snap) => {
    if (snap.exists()) {
      if (!simState[uid].config) simState[uid].config = {};
      simState[uid].config.discord = snap.val();
      console.log(`[Sim] [${uid.slice(0,8)}] Discord config dimuat: enabled=${snap.val()?.enabled}, hasAlerts=${!!(snap.val()?.webhookAlerts)}`);
    }
  });

  // 3. Watch status listrik - kirim notifikasi saat status berubah + data ke #monitoring
  db.ref(`/sim/${uid}/listrik`).on('value', async (snap) => {
    const d = snap.val();
    if (!d) return;
    const currentStatus = d.status || 'NORMAL';
    const prevStatus = simState[uid].lastStatus;

    // Status berubah → kirim alert ke semua platform
    if (currentStatus !== prevStatus) {
      simState[uid].lastStatus = currentStatus;
      await handleStatusChange(uid, currentStatus, prevStatus, d);
    }

    // Data monitoring reguler → kirim ke #monitoring (Discord) dan Telegram
    // Throttle: maks 1x per 30 detik agar tidak spam channel
    const cfg = simState[uid].config || {};
    const now = Date.now();
    const lastMonitor = simState[uid].lastMonitorSent || 0;
    const MONITOR_THROTTLE_MS = 30_000; // 30 detik

    if ((now - lastMonitor) >= MONITOR_THROTTLE_MS) {
      simState[uid].lastMonitorSent = now;

      // Kirim ke Discord #monitoring jika ada webhook
      if (cfg.discord?.enabled !== false && cfg.discord?.webhookMonitoring) {
        const embed = {
          title: `📊 [SIM] Telemetri Real-Time`,
          color: currentStatus === 'DANGER' ? 0xED4245 : currentStatus === 'WARNING' ? 0xFEE75C : 0x5865F2,
          fields: [
            { name: '⚡ Arus',         value: `${d.arus         ?? '-'} A`,   inline: true },
            { name: '🔋 Tegangan',     value: `${d.tegangan     ?? '-'} V`,   inline: true },
            { name: '💡 Daya',         value: `${d.daya         ?? '-'} W`,   inline: true },
            { name: '🔌 Relay',        value: d.relay ? 'ON' : 'OFF',         inline: true },
            { name: '📡 Frekuensi',    value: `${d.frekuensi    ?? '-'} Hz`,  inline: true },
            { name: '📊 Power Factor', value: `${d.power_factor ?? '-'}`,     inline: true },
            { name: `${statusEmoji(currentStatus)} Status`, value: currentStatus, inline: true },
            { name: '🆔 Session',      value: `\`${uid.slice(0,12)}...\``,    inline: false },
          ],
          footer: { text: `IoT Listrik Simulator • Monitoring • ${waktuId()}` },
        };
        sendDiscordEmbed(cfg.discord.webhookMonitoring, embed)
          .then(ok => { if (ok) console.log(`[Monitor] [${uid.slice(0,8)}] Discord #monitoring ✅`); })
          .catch(() => {});
      }

      // Kirim summary data ke Telegram saat streaming jika ada token
      // Hanya kirim jika ada data streaming aktif (arus > 0)
      const telegramChatIds = getTelegramChatIds(cfg);
      if (cfg.telegramNotifyEnabled !== false && cfg.telegramBotToken && telegramChatIds.length > 0 && d.arus) {
        const msg = `📊 <b>[SIM] Data Telemetri</b>\n` +
          `⚡ Arus: <b>${d.arus ?? '-'} A</b>\n` +
          `🔋 Tegangan: ${d.tegangan ?? '-'} V\n` +
          `💡 Daya: ${d.daya ?? '-'} W\n` +
          `${statusEmoji(currentStatus)} Status: <b>${currentStatus}</b>\n` +
          `🕐 ${waktuId()}\n` +
          `<i>Session: ${uid.slice(0,12)}...</i>`;
        sendTelegram(cfg.telegramBotToken, telegramChatIds, msg)
          .then(ok => { if (ok) console.log(`[Monitor] [${uid.slice(0,8)}] Telegram data ✅`); })
          .catch(() => {});
      }
    }

  });

  // 4. Watch logs (hanya entri baru)
  db.ref(`/sim/${uid}/logs`).orderByKey().limitToLast(1).on('child_added', async (snap) => {
    if (!simState[uid].logsInitialized) {
      simState[uid].logsInitialized = true;
      return; // Skip log yang sudah ada saat server start
    }
    await handleNewLog(uid, snap.key, snap.val());
  });
}

// ── Core: Monitor /sim/ untuk semua UID (termasuk yang sudah ada) ──────────
console.log('[Sim Notifier] Memantau aktivitas akun simulator di /sim/...');

// child_added dipanggil untuk semua UID yang ada + yang baru ditambahkan
db.ref('/sim').on('child_added', (snap) => {
  const uid = snap.key;
  if (uid && !simState[uid]?.listenersAttached) {
    setupListenersForUid(uid);
  }
});

// Cleanup listener jika UID di-remove
db.ref('/sim').on('child_removed', (snap) => {
  const uid = snap.key;
  if (uid && simState[uid]) {
    console.log(`[Sim] UID dihapus: ${uid.slice(0,12)}...`);
    db.ref(`/sim/${uid}/listrik`).off();
    db.ref(`/sim/${uid}/settings`).off();
    db.ref(`/sim/${uid}/settings/discord`).off();
    db.ref(`/sim/${uid}/logs`).off();
    delete simState[uid];
  }
});

// ── API Test: Endpoint untuk test dari CLI ────────────────────────────────
const express = require('express');
const app = express();
const PORT = 3002;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  const activeUids = Object.keys(simState);
  res.json({
    ok: true,
    service: 'sim-notifier',
    activeSimulators: activeUids.length,
    uids: activeUids.map(u => u.slice(0, 12) + '...'),
    time: new Date().toISOString(),
  });
});

// Manual test notify endpoint (digunakan oleh tombol Test Alert di frontend via CORS)
app.post('/api/sim/test-notify', async (req, res) => {
  const { uid } = req.body || {};
  if (!uid) return res.status(400).json({ error: 'uid required' });

  // Selalu fetch config terbaru dari Firebase untuk memastikan data akurat
  let cfg = simState[uid]?.config;
  if (!cfg || (!hasTelegramConfig(cfg) && !cfg.discord?.webhookAlerts)) {
    console.log(`[Test] Config tidak ada di state untuk ${uid.slice(0,8)}, fetch dari Firebase...`);
    cfg = await fetchConfigFresh(uid);
    // Update state jika UID sudah diregister
    if (simState[uid]) simState[uid].config = cfg;
    else {
      // Daftarkan UID ini agar future events bisa ditangani
      setupListenersForUid(uid);
      simState[uid] = simState[uid] || {};
      simState[uid].config = cfg;
    }
  }

  console.log(`[Test] UID=${uid.slice(0,8)}, telegram=${!!(cfg.telegramBotToken)}, discord.enabled=${cfg.discord?.enabled}, discord.webhookAlerts=${!!(cfg.discord?.webhookAlerts)}`);

  const results = { discord: false, telegram: false };

  // Test Discord
  if (cfg.discord?.enabled !== false && cfg.discord?.webhookAlerts) {
    results.discord = await sendDiscordEmbed(cfg.discord.webhookAlerts, {
      title: '🔔 [SIM] Test Notifikasi Aktif',
      description: 'Koneksi Discord Webhook simulator berhasil! Notifikasi real-time siap.',
      color: 0x5865F2,
      fields: [
        { name: 'Status', value: '✅ Terhubung', inline: true },
        { name: 'Waktu', value: waktuId(), inline: true },
        { name: '🆔 Session', value: `\`${uid.slice(0,12)}...\``, inline: false },
      ],
      footer: { text: 'IoT Listrik Simulator — Test Notifikasi' },
    });
    console.log(`[Test Discord] ${results.discord ? '✅' : '❌'}`);
  }

  // Test Telegram
  const telegramChatIds = getTelegramChatIds(cfg);
  if (cfg.telegramBotToken && telegramChatIds.length > 0) {
    results.telegram = await sendTelegram(
      cfg.telegramBotToken,
      telegramChatIds,
      `🔔 <b>[SIMULATOR] Test Notifikasi Berhasil!</b>\n` +
      `Sistem notifikasi siap menerima alert.\n` +
      `🕐 ${waktuId()}\n` +
      `<i>Session: ${uid.slice(0,12)}...</i>`
    );
    console.log(`[Test Telegram] ${results.telegram ? '✅' : '❌'}`);
  }

  res.json({ ok: true, results, configFound: !!(hasTelegramConfig(cfg) || cfg.discord?.webhookAlerts) });
});

// Endpoint untuk mengirim test alert dari simulator control panel
app.post('/api/sim/alert', async (req, res) => {
  const { uid, status, data } = req.body || {};
  if (!uid || !status) return res.status(400).json({ error: 'uid and status required' });

  // Selalu fetch config terbaru. Jika state kosong, ambil dari Firebase
  let cfg = simState[uid]?.config;
  if (!cfg || (!hasTelegramConfig(cfg) && !cfg.discord?.webhookAlerts)) {
    console.log(`[Alert] Config tidak ada di state untuk ${uid.slice(0,8)}, fetch dari Firebase...`);
    cfg = await fetchConfigFresh(uid);
    if (simState[uid]) {
      simState[uid].config = cfg;
    } else {
      setupListenersForUid(uid);
      simState[uid] = simState[uid] || {};
      simState[uid].config = cfg;
    }
  }

  const prevStatus = simState[uid]?.lastStatus || 'NORMAL';
  if (simState[uid]) {
    simState[uid].lastStatus = status;
  }

  try {
    await handleStatusChange(uid, status, prevStatus, data || {}, cfg);
    res.json({ ok: true, uid, status, configFound: !!(hasTelegramConfig(cfg) || cfg.discord?.webhookAlerts) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint baru: Reload config untuk UID tertentu (dipanggil setelah settings disimpan)
app.post('/api/sim/reload-config', async (req, res) => {
  const { uid } = req.body || {};
  if (!uid) return res.status(400).json({ error: 'uid required' });

  try {
    const cfg = await fetchConfigFresh(uid);
    if (!simState[uid]) {
      setupListenersForUid(uid);
    }
    if (simState[uid]) {
      simState[uid].config = cfg;
    }
    console.log(`[Config] Config di-reload untuk ${uid.slice(0,8)}: telegram=${!!(cfg.telegramBotToken)}, discord.enabled=${cfg.discord?.enabled}`);
    res.json({ ok: true, uid, configFound: !!(hasTelegramConfig(cfg) || cfg.discord?.webhookAlerts) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Sim API] http://localhost:${PORT}`);
  console.log(`  GET  /health`);
  console.log(`  POST /api/sim/test-notify  { uid }`);
  console.log(`  POST /api/sim/alert        { uid, status, data }`);
  console.log(`  POST /api/sim/reload-config { uid }`);
});

process.on('SIGINT', () => {
  console.log('\n[Sim Notifier] Dihentikan.');
  process.exit(0);
});
process.on('uncaughtException', (err) => console.error('[Sim] Unhandled Exception:', err));
process.on('unhandledRejection', (reason) => console.error('[Sim] Unhandled Rejection:', reason));

/**
 * discord-notifier.js — Local Discord Notifier Server
 * ─────────────────────────────────────────────────────
 * Jalankan di lokal (atau server) untuk mengirim notifikasi Discord
 * berdasarkan perubahan data Firebase RTDB secara real-time.
 *
 * Webhook URL dikonfigurasi via halaman admin Settings → Discord.
 * Disimpan di RTDB /settings/discord/ → dibaca server ini secara live.
 *
 * Cara menjalankan:
 *   node backend-local/discord-notifier.js
 *
 * Cara expose publik via ngrok (opsional, tidak diperlukan untuk notifikasi):
 *   ngrok http 3001
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

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
  databaseURL: 'https://monitoring-listrik-719b1-default-rtdb.asia-southeast1.firebasedatabase.app',
});

const db = admin.database();
console.log('[Discord Notifier] Terhubung ke Firebase RTDB ✅');

// ── Config cache dari RTDB ────────────────────────────────────────────────
let settingsConfig = {};
let discordConfig = { enabled: false };

db.ref('/settings').on('value', (snap) => {
  settingsConfig = snap.val() || {};
  if (!settingsConfig.discord) settingsConfig.discord = discordConfig;
});

db.ref('/settings/discord').on('value', (snap) => {
  discordConfig = snap.val() || { enabled: false };
  settingsConfig = { ...settingsConfig, discord: discordConfig };
  console.log(`[Config] Discord config dimuat: enabled=${discordConfig.enabled}`);
});

// ── Helper: Kirim embed Discord ───────────────────────────────────────────
async function sendEmbed(webhookUrl, embed) {
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) return;
  if (!discordConfig.enabled) return;
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok && res.status !== 204) {
      const txt = await res.text();
      console.error(`[Discord] HTTP ${res.status}:`, txt.slice(0, 200));
    } else {
      console.log(`[Discord] Embed terkirim → ${webhookUrl.slice(0, 60)}...`);
    }
  } catch (err) {
    console.error('[Discord] Fetch error:', err.message);
  }
}

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
      if ('chatId' in source || 'telegramChatId' in source || 'id' in source) {
        add(source.chatId ?? source.telegramChatId ?? source.id);
        return;
      }
      Object.entries(source)
        .filter(([key]) => !['name', 'label', 'displayName', 'title'].includes(key))
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

async function sendTelegram(botToken, chatIds, message) {
  const ids = parseTelegramChatIds(chatIds);
  if (!botToken || ids.length === 0) return false;

  const results = await Promise.allSettled(ids.map(async (chatId) => {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: String(chatId),
        text: message,
        parse_mode: 'HTML',
      }),
    });
    if (!res.ok) {
      console.error(`[Telegram] HTTP ${res.status} untuk ${chatId}:`, (await res.text()).slice(0, 200));
      return false;
    }
    return true;
  }));

  return results.some((result) => result.status === 'fulfilled' && result.value);
}

// ── Helper: Warna & emoji status ─────────────────────────────────────────
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
function waktu() {
  return new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'medium' });
}

function buildMonitoringSummary(d = {}) {
  return [
    `Arus ${d.arus ?? '-'} A`,
    `Tegangan ${d.tegangan ?? '-'} V`,
    `Daya ${d.daya ?? '-'} W`,
    `Relay ${d.relay ? 'ON' : 'OFF'}`,
    `Status ${d.status ?? 'NORMAL'}`,
  ].join(' • ');
}

async function publishClientEvent({
  event,
  title,
  message,
  severity = 'info',
  payload = {},
}) {
  const eventId = `physical-${event}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = Date.now();
  const nextPayload = {
    id: eventId,
    event,
    source: 'hardware',
    scope: 'physical',
    target: 'physical',
    severity,
    title,
    message,
    created_at: createdAt,
    created_at_iso: new Date(createdAt).toISOString(),
    ...payload,
  };
  await db.ref('/notifications/system/latest').set(nextPayload);
  return nextPayload;
}

async function sendInfoFCM(title, message, event, severity = 'info') {
  try {
    await admin.messaging().send({
      topic: 'iot_alarms',
      data: {
        action: 'SHOW_INFO',
        event,
        severity,
        title,
        message,
        source: 'hardware',
        scope: 'physical',
      },
      android: { priority: 'high' },
      webpush: {
        notification: {
          title,
          body: message,
          icon: 'https://iot-listrik-dashboard.vercel.app/assets/icons/icon-192x192.png',
          vibrate: [200, 100, 200],
        },
      },
    });
  } catch (err) {
    console.error('[FCM] Info event gagal dikirim:', err.message);
  }
}

async function broadcastPhysicalSystemEvent({
  event,
  title,
  message,
  severity = 'info',
  telegramMessage = '',
  payload = {},
}) {
  const telegramEnabled = settingsConfig.telegramNotifyEnabled !== false;
  const telegramBotToken = String(settingsConfig.telegramBotToken || '').trim();
  const telegramChatIds = getTelegramChatIds(settingsConfig);

  const tasks = [
    publishClientEvent({ event, title, message, severity, payload }),
    sendInfoFCM(title, message, event, severity),
  ];

  if (telegramEnabled && telegramBotToken && telegramChatIds.length > 0 && telegramMessage) {
    tasks.push(sendTelegram(telegramBotToken, telegramChatIds, telegramMessage));
  }

  await Promise.allSettled(tasks);
}

// ════════════════════════════════════════════════════════════════════════
// LISTENER 1 — Status → #alerts
// ════════════════════════════════════════════════════════════════════════
let lastStatus = null;
db.ref('/listrik/status').on('value', async (snap) => {
  const status = snap.val();
  if (status === lastStatus) return;
  const prev   = lastStatus;
  lastStatus   = status;
  if (prev === null) return; // skip nilai awal saat server baru start

  console.log(`[Status] ${prev} → ${status}`);

  // Ambil semua data listrik
  const listrikSnap = await db.ref('/listrik').get();
  const d = listrikSnap.val() || {};

  const isBahaya = status === 'DANGER';
  const isPulih  = status === 'NORMAL' && (prev === 'DANGER' || prev === 'WARNING');

  const embed = {
    title:       `${statusEmoji(status)} Status Kelistrikan: ${status}`,
    description: isBahaya
      ? '⚠️ **KEBOCORAN ARUS TERDETEKSI!** Relay sedang diputuskan otomatis.'
      : isPulih
      ? '✅ Kondisi kelistrikan telah kembali **NORMAL**.'
      : `Status berubah dari \`${prev}\` → \`${status}\``,
    color:  statusColor(status),
    fields: [
      { name: '⚡ Arus',        value: `${d.arus       ?? '-'} A`,  inline: true },
      { name: '🔋 Tegangan',    value: `${d.tegangan   ?? '-'} V`,  inline: true },
      { name: '💡 Daya',        value: `${d.daya       ?? '-'} W`,  inline: true },
      { name: '🔌 Relay',       value: d.relay ? 'ON' : 'OFF',      inline: true },
      { name: '📡 Frekuensi',   value: `${d.frekuensi  ?? '-'} Hz`, inline: true },
      { name: '📊 Power Factor', value: `${d.power_factor ?? '-'}`, inline: true },
    ],
    footer: { text: `IoT Listrik Dashboard • ${waktu()}` },
    thumbnail: { url: 'https://iot-listrik-dashboard.vercel.app/assets/icons/icon-192x192.png' },
  };

  await sendEmbed(discordConfig.webhookAlerts, embed);
});

// ════════════════════════════════════════════════════════════════════════
// LISTENER 2 — Relay → #relay
// ════════════════════════════════════════════════════════════════════════
let lastRelay = null;
db.ref('/listrik/relay').on('value', async (snap) => {
  const relay = snap.val();
  if (relay === lastRelay) return;
  const prev = lastRelay;
  lastRelay  = relay;
  if (prev === null) return;

  console.log(`[Relay] ${prev} → ${relay}`);
  const embed = {
    title:       relay ? '🔌 Relay DINYALAKAN' : '🪫 Relay DIMATIKAN',
    description: `Relay berubah ke posisi **${relay ? 'ON' : 'OFF'}**.`,
    color:       relay ? 0x57F287 : 0xED4245,
    fields: [
      { name: 'Sebelumnya', value: prev  ? 'ON' : 'OFF', inline: true },
      { name: 'Sekarang',   value: relay ? 'ON' : 'OFF', inline: true },
    ],
    footer: { text: `IoT Listrik Dashboard • ${waktu()}` },
  };
  await sendEmbed(discordConfig.webhookRelay, embed);
});

// ════════════════════════════════════════════════════════════════════════
// LISTENER 3 — updated_at → #monitoring & #alerts (Presence Watchdog)
// ════════════════════════════════════════════════════════════════════════
let lastMonitoringSent = 0;
let lastSeenLocalTime = Date.now();
let isOnline = true;

// Watchdog interval (every 10 seconds)
setInterval(async () => {
  // If no data received for 30 seconds and we think it's online
  if (Date.now() - lastSeenLocalTime > 30000 && isOnline) {
    isOnline = false;
    console.log('[Presence] 🔴 Perangkat OFFLINE (Koneksi terputus/Tidak ada data)');

    const embed = {
      title: '🔴 [OFFLINE] Perangkat Terputus',
      description: 'Koneksi dari hardware utama terputus. Tidak ada data masuk selama lebih dari 30 detik.',
      color: 0xED4245,
      footer: { text: `IoT Listrik Dashboard • ${waktu()}` }
    };
    await sendEmbed(discordConfig.webhookAlerts, embed);
    await broadcastPhysicalSystemEvent({
      event: 'device_offline',
      title: embed.title,
      message: embed.description,
      severity: 'danger',
      telegramMessage:
        `🔴 <b>[OFFLINE] Perangkat Terputus</b>\n` +
        `Koneksi dari hardware utama terputus. Tidak ada data masuk selama lebih dari 30 detik.\n` +
        `🕐 ${waktu()}`,
    });
  }
}, 10000);

db.ref('/listrik/updated_at').on('value', async (snap) => {
  const now = Date.now();
  lastSeenLocalTime = now; // Update heartbeat time on any new data!

  // If we were offline, we are now online!
  if (!isOnline) {
    isOnline = true;
    console.log('[Presence] 🟢 Perangkat kembali ONLINE');

    const embed = {
      title: '🟢 [ONLINE] Perangkat Terhubung',
      description: 'Koneksi kembali pulih. Data telemetri mulai diterima.',
      color: 0x57F287,
      footer: { text: `IoT Listrik Dashboard • ${waktu()}` }
    };
    await sendEmbed(discordConfig.webhookAlerts, embed);
    await broadcastPhysicalSystemEvent({
      event: 'device_online',
      title: embed.title,
      message: embed.description,
      severity: 'success',
      telegramMessage:
        `🟢 <b>[ONLINE] Perangkat Terhubung</b>\n` +
        `Koneksi kembali pulih. Data telemetri mulai diterima.\n` +
        `🕐 ${waktu()}`,
    });
  }

  if (now - lastMonitoringSent < 5 * 60 * 1000) return; // rate limit 5 mins
  if (!discordConfig.webhookMonitoring) return;
  lastMonitoringSent = now;

  const listrikSnap = await db.ref('/listrik').get();
  const d = listrikSnap.val() || {};

  const embed = {
    title: '📊 Update Data Monitoring Listrik',
    color: statusColor(d.status),
    fields: [
      { name: '⚡ Arus',         value: `${d.arus         ?? '-'} A`,   inline: true },
      { name: '🔋 Tegangan',     value: `${d.tegangan     ?? '-'} V`,   inline: true },
      { name: '💡 Daya',         value: `${d.daya         ?? '-'} W`,   inline: true },
      { name: '🔌 Relay',        value: d.relay ? 'ON' : 'OFF',         inline: true },
      { name: '📡 Frekuensi',    value: `${d.frekuensi    ?? '-'} Hz`,  inline: true },
      { name: '📊 Power Factor', value: `${d.power_factor ?? '-'}`,     inline: true },
      { name: '🔆 Energi',       value: `${d.energi_kwh   ?? '-'} kWh`, inline: true },
      { name: '🔴 Status',       value: `${statusEmoji(d.status)} ${d.status ?? '-'}`, inline: true },
    ],
    footer: { text: `IoT Listrik Dashboard • ${waktu()}` },
    thumbnail: { url: 'https://iot-listrik-dashboard.vercel.app/assets/icons/icon-192x192.png' },
  };

  await sendEmbed(discordConfig.webhookMonitoring, embed);
  await broadcastPhysicalSystemEvent({
    event: 'monitoring_update',
    title: embed.title,
    message: buildMonitoringSummary(d),
    severity: 'info',
    telegramMessage:
      `📊 <b>Update Data Monitoring Listrik</b>\n` +
      `⚡ Arus: <b>${d.arus ?? '-'} A</b>\n` +
      `🔋 Tegangan: ${d.tegangan ?? '-'} V\n` +
      `💡 Daya: ${d.daya ?? '-'} W\n` +
      `🔌 Relay: <b>${d.relay ? 'ON' : 'OFF'}</b>\n` +
      `📡 Frekuensi: ${d.frekuensi ?? '-'} Hz\n` +
      `📊 Power Factor: ${d.power_factor ?? '-'}\n` +
      `🔆 Energi: ${d.energi_kwh ?? '-'} kWh\n` +
      `${statusEmoji(d.status)} Status: <b>${d.status ?? 'NORMAL'}</b>\n` +
      `🕐 ${waktu()}`,
    payload: {
      metrics: {
        arus: d.arus ?? 0,
        tegangan: d.tegangan ?? 0,
        daya: d.daya ?? 0,
        relay: d.relay ? 1 : 0,
        frekuensi: d.frekuensi ?? 0,
        power_factor: d.power_factor ?? 0,
        energi_kwh: d.energi_kwh ?? 0,
        status: d.status ?? 'NORMAL',
      },
    },
  });
});

// ════════════════════════════════════════════════════════════════════════
// LISTENER 4 — /logs → #logs (entry baru saja)
// ════════════════════════════════════════════════════════════════════════
let logsInitialized = false;
db.ref('/logs').orderByKey().limitToLast(1).on('child_added', async (snap) => {
  // Skip log awal yang sudah ada saat server pertama start
  if (!logsInitialized) { logsInitialized = true; return; }

  const log   = snap.val();
  const logId = snap.key;
  if (!log || !discordConfig.webhookLogs) return;

  console.log(`[Log] Entri baru: ${logId}`);
  const embed = {
    title:       '📋 Aktivitas Log Baru',
    description: log.message || log.pesan || log.keterangan || `Log ID: ${logId}`,
    color:       0x99AAB5,
    fields: [
      log.type  && { name: 'Tipe',     value: String(log.type),  inline: true },
      log.user  && { name: 'Pengguna', value: String(log.user),  inline: true },
      log.value !== undefined && { name: 'Nilai',   value: String(log.value), inline: true },
    ].filter(Boolean),
    footer: { text: `IoT Listrik Dashboard • ${waktu()} • ID: ${logId.slice(-6)}` },
  };
  await sendEmbed(discordConfig.webhookLogs, embed);
});

// ── Keep-alive ────────────────────────────────────────────────────────────
console.log('[Discord Notifier] Mendengarkan perubahan RTDB... (Ctrl+C untuk berhenti)');
process.on('SIGINT', () => { console.log('\n[Discord Notifier] Dihentikan.'); process.exit(0); });

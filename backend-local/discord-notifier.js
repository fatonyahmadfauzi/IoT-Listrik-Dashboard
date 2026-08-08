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
const FormData = require('form-data');
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

const JAKARTA_TZ = 'Asia/Jakarta';
const DAILY_ARCHIVE_ROOT = '/admin_secure/dailyTelemetry/physical';
const DAILY_REPORT_STATE_PATH = '/admin_secure/dailyReports/physical';
const DAILY_REPORT_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const DAILY_REPORT_MINUTE_GATE = 5;
const TELEGRAM_COMMAND_STATE_PATH = '/admin_secure/telegramCommandState/physical';
const TELEGRAM_COMMAND_POLL_INTERVAL_MS = 4000;

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

function normalizeTelegramRecipient(value) {
  if (value == null) return null;

  if (typeof value === 'object' && !Array.isArray(value)) {
    const chatId = normalizeTelegramChatId(value.chatId ?? value.telegramChatId ?? value.id);
    if (!chatId) return null;
    return {
      name: String(value.name ?? value.label ?? '').trim(),
      chatId,
      paused: value.paused === true,
      pausedAt: Number(value.pausedAt || 0) || 0,
      resumedAt: Number(value.resumedAt || 0) || 0,
      pauseSource: String(value.pauseSource || '').trim(),
    };
  }

  const chatId = normalizeTelegramChatId(value);
  return chatId
    ? { name: '', chatId, paused: false, pausedAt: 0, resumedAt: 0, pauseSource: '' }
    : null;
}

function parseTelegramRecipients(...sources) {
  const recipients = [];
  const add = (value) => {
    const recipient = normalizeTelegramRecipient(value);
    if (!recipient) return;

    const existing = recipients.find((item) => item.chatId === recipient.chatId);
    if (existing) {
      if (!existing.name && recipient.name) existing.name = recipient.name;
      if (recipient.paused === true) existing.paused = true;
      if (!existing.pausedAt && recipient.pausedAt) existing.pausedAt = recipient.pausedAt;
      if (!existing.resumedAt && recipient.resumedAt) existing.resumedAt = recipient.resumedAt;
      if (!existing.pauseSource && recipient.pauseSource) existing.pauseSource = recipient.pauseSource;
      return;
    }
    recipients.push(recipient);
  };

  const visit = (source) => {
    if (source == null) return;
    if (Array.isArray(source)) {
      source.forEach(visit);
      return;
    }
    if (typeof source === 'object') {
      if ('chatId' in source || 'telegramChatId' in source || 'id' in source) {
        add(source);
        return;
      }
      Object.entries(source)
        .filter(([key]) => !['name', 'label', 'displayName', 'title'].includes(key))
        .forEach(([, value]) => visit(value));
      return;
    }
    String(source)
      .split(/[\s,;]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach(add);
  };

  sources.forEach(visit);
  return recipients;
}

function parseTelegramChatIds(...sources) {
  return parseTelegramRecipients(...sources).map((recipient) => recipient.chatId);
}

function getTelegramRecipients(settings) {
  const structuredRecipients = parseTelegramRecipients(settings?.telegramRecipients);
  if (structuredRecipients.length > 0) return structuredRecipients;

  return parseTelegramRecipients(
    settings?.telegramChatIds,
    settings?.telegramChatId,
    settings?.telegram?.chat_id
  );
}

function getActiveTelegramRecipients(recipients = []) {
  return Array.isArray(recipients)
    ? recipients.filter((recipient) => recipient?.paused !== true)
    : [];
}

function getTelegramChatIds(settings) {
  return getActiveTelegramRecipients(getTelegramRecipients(settings)).map((recipient) => recipient.chatId);
}

function buildTelegramSettingsPayload(recipients = []) {
  const normalizedRecipients = parseTelegramRecipients(recipients);
  const activeChatIds = getActiveTelegramRecipients(normalizedRecipients).map((recipient) => recipient.chatId);

  return {
    telegramRecipients: normalizedRecipients.map((recipient) => ({
      name: recipient.name || '',
      chatId: recipient.chatId,
      paused: recipient.paused === true,
      pausedAt: Number(recipient.pausedAt || 0) || 0,
      resumedAt: Number(recipient.resumedAt || 0) || 0,
      pauseSource: String(recipient.pauseSource || '').trim(),
    })),
    telegramChatIds: activeChatIds,
    telegramChatId: activeChatIds.join(','),
  };
}

async function callTelegramApi(botToken, method, payload = null) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, payload == null
    ? { method: 'GET' }
    : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    const message = data?.description || `Telegram API ${method} gagal (${res.status})`;
    throw new Error(message);
  }

  return data?.result ?? null;
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

async function sendTelegramDocument(botToken, chatIds, buffer, filename, caption = '') {
  const ids = parseTelegramChatIds(chatIds);
  if (!botToken || ids.length === 0 || !buffer?.length) return false;

  const results = await Promise.allSettled(ids.map(async (chatId) => {
    const form = new FormData();
    form.append('chat_id', String(chatId));
    if (caption) form.append('caption', caption);
    if (caption) form.append('parse_mode', 'HTML');
    form.append('document', buffer, {
      filename,
      contentType: 'application/vnd.ms-excel',
      knownLength: buffer.length,
    });

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      headers: form.getHeaders(),
      body: form,
    });
    if (!res.ok) {
      console.error(`[Telegram] Dokumen HTTP ${res.status} untuk ${chatId}:`, (await res.text()).slice(0, 200));
      return false;
    }
    return true;
  }));

  return results.some((result) => result.status === 'fulfilled' && result.value);
}

let telegramCommandPollBusy = false;
let telegramCommandOffset = 0;
let telegramCommandStateReady = false;
let telegramCommandTokenCache = '';

function normalizeTelegramCommand(text = '') {
  const firstToken = String(text || '').trim().split(/\s+/)[0] || '';
  return firstToken.toLowerCase().replace(/@[\w_]+$/, '');
}

function isTelegramMasterEnabled() {
  return settingsConfig.telegramNotifyEnabled !== false;
}

function buildTelegramCommandHelpText() {
  return [
    '🤖 <b>Perintah Notifikasi Telegram</b>',
    '',
    '/pause — hentikan notifikasi untuk chat ini',
    '/resume — aktifkan lagi notifikasi untuk chat ini',
    '/status — lihat status notifikasi chat ini',
    '/help — tampilkan bantuan ini',
    '',
    'Perintah berlaku personal untuk setiap Chat ID / Group ID yang sudah terdaftar.',
  ].join('\n');
}

function buildTelegramRegistrationText(chatId) {
  return [
    '⚠️ <b>Chat ini belum terdaftar</b>',
    `Chat ID: <b>${chatId}</b>`,
    '',
    'Minta admin menambahkan Chat ID / Group ID ini dulu di halaman Konfigurasi Telegram agar perintah personal bisa dipakai.',
  ].join('\n');
}

function buildTelegramStatusText(recipient, totalRecipients, activeRecipients) {
  const personalStatus = recipient?.paused === true ? 'PAUSE' : 'AKTIF';
  const masterStatus = isTelegramMasterEnabled() ? 'AKTIF' : 'DIMATIKAN';
  const label = recipient?.name ? ` (${recipient.name})` : '';

  return [
    '📡 <b>Status Notifikasi Telegram</b>',
    `Chat ID${label}: <b>${recipient?.chatId || '-'}</b>`,
    `Status personal: <b>${personalStatus}</b>`,
    `Master switch sistem: <b>${masterStatus}</b>`,
    `Penerima aktif saat ini: <b>${activeRecipients}/${totalRecipients}</b>`,
    '',
    'Gunakan /pause atau /resume untuk mengatur chat ini secara personal.',
  ].join('\n');
}

async function sendTelegramCommandReply(botToken, chatId, text) {
  try {
    await callTelegramApi(botToken, 'sendMessage', {
      chat_id: String(chatId),
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
    return true;
  } catch (err) {
    console.error(`[Telegram Commands] Gagal membalas ke ${chatId}:`, err.message);
    return false;
  }
}

async function loadTelegramCommandState(botToken) {
  if (telegramCommandStateReady) return;

  const snap = await db.ref(TELEGRAM_COMMAND_STATE_PATH).get();
  const state = snap.val() || {};
  const storedOffset = Number(state.offset || 0) || 0;
  const storedBotToken = String(state.botToken || '').trim();

  telegramCommandTokenCache = botToken;

  if (storedOffset > 0 && (!storedBotToken || storedBotToken === botToken)) {
    telegramCommandOffset = storedOffset;
    telegramCommandStateReady = true;
    return;
  }

  try {
    const updates = await callTelegramApi(botToken, 'getUpdates', {
      timeout: 0,
      limit: 100,
      allowed_updates: ['message'],
    });
    if (Array.isArray(updates) && updates.length > 0) {
      const latestUpdateId = Math.max(...updates.map((item) => Number(item?.update_id || 0)).filter(Boolean));
      telegramCommandOffset = latestUpdateId > 0 ? latestUpdateId + 1 : 0;
    } else {
      telegramCommandOffset = 0;
    }
  } catch (err) {
    console.error('[Telegram Commands] Gagal bootstrap offset:', err.message);
    telegramCommandOffset = 0;
  }

  telegramCommandStateReady = true;
  await db.ref(TELEGRAM_COMMAND_STATE_PATH).update({
    offset: telegramCommandOffset,
    botToken,
    updatedAt: Date.now(),
  });
}

async function persistTelegramCommandState(botToken) {
  await db.ref(TELEGRAM_COMMAND_STATE_PATH).update({
    offset: telegramCommandOffset,
    botToken,
    updatedAt: Date.now(),
  });
}

async function saveTelegramRecipientsFromCommand(recipients) {
  const payload = buildTelegramSettingsPayload(recipients);
  await db.ref('/settings').update(payload);
  settingsConfig = { ...settingsConfig, ...payload };
  return payload;
}

async function handleTelegramCommand(botToken, message) {
  const chatId = normalizeTelegramChatId(message?.chat?.id);
  const command = normalizeTelegramCommand(message?.text || '');
  if (!chatId || !command) return;

  if (!['/pause', '/resume', '/status', '/help'].includes(command)) return;

  const recipients = getTelegramRecipients(settingsConfig);
  const recipientIndex = recipients.findIndex((recipient) => recipient.chatId === chatId);
  const recipient = recipientIndex >= 0 ? recipients[recipientIndex] : null;
  const totalRecipients = recipients.length;
  const activeRecipients = getActiveTelegramRecipients(recipients).length;

  if (command === '/help') {
    const helpText = [
      buildTelegramCommandHelpText(),
      '',
      recipient
        ? buildTelegramStatusText(recipient, totalRecipients, activeRecipients)
        : buildTelegramRegistrationText(chatId),
    ].join('\n');
    await sendTelegramCommandReply(botToken, chatId, helpText);
    return;
  }

  if (!recipient) {
    await sendTelegramCommandReply(botToken, chatId, buildTelegramRegistrationText(chatId));
    return;
  }

  if (command === '/status') {
    await sendTelegramCommandReply(botToken, chatId, buildTelegramStatusText(recipient, totalRecipients, activeRecipients));
    return;
  }

  if (command === '/pause') {
    if (recipient.paused === true) {
      await sendTelegramCommandReply(
        botToken,
        chatId,
        [
          '⏸️ <b>Notifikasi sudah dalam keadaan pause</b>',
          '',
          buildTelegramStatusText(recipient, totalRecipients, activeRecipients),
        ].join('\n')
      );
      return;
    }

    recipients[recipientIndex] = {
      ...recipient,
      paused: true,
      pausedAt: Date.now(),
      pauseSource: 'telegram_command',
    };
    const payload = await saveTelegramRecipientsFromCommand(recipients);
    const nextActiveCount = Array.isArray(payload.telegramChatIds) ? payload.telegramChatIds.length : 0;

    await sendTelegramCommandReply(
      botToken,
      chatId,
      [
        '⏸️ <b>Notifikasi untuk chat ini berhasil di-pause</b>',
        `Chat ID: <b>${chatId}</b>`,
        `Penerima aktif sekarang: <b>${nextActiveCount}/${recipients.length}</b>`,
        '',
        'Gunakan /resume kapan saja untuk mengaktifkan lagi notifikasi di chat ini.',
      ].join('\n')
    );
    return;
  }

  if (command === '/resume') {
    if (recipient.paused !== true) {
      await sendTelegramCommandReply(
        botToken,
        chatId,
        [
          '▶️ <b>Notifikasi untuk chat ini sudah aktif</b>',
          '',
          buildTelegramStatusText(recipient, totalRecipients, activeRecipients),
        ].join('\n')
      );
      return;
    }

    recipients[recipientIndex] = {
      ...recipient,
      paused: false,
      resumedAt: Date.now(),
      pauseSource: 'telegram_command',
    };
    const payload = await saveTelegramRecipientsFromCommand(recipients);
    const nextActiveCount = Array.isArray(payload.telegramChatIds) ? payload.telegramChatIds.length : 0;

    await sendTelegramCommandReply(
      botToken,
      chatId,
      [
        '▶️ <b>Notifikasi untuk chat ini aktif kembali</b>',
        `Chat ID: <b>${chatId}</b>`,
        `Penerima aktif sekarang: <b>${nextActiveCount}/${recipients.length}</b>`,
        '',
        isTelegramMasterEnabled()
          ? 'Notifikasi berikutnya akan dikirim lagi ke chat ini.'
          : 'Catatan: master switch Telegram sistem sedang dimatikan, jadi notifikasi umum masih belum akan terkirim sampai diaktifkan lagi oleh admin.',
      ].join('\n')
    );
  }
}

async function pollTelegramCommands() {
  if (telegramCommandPollBusy) return;

  const botToken = String(settingsConfig.telegramBotToken || '').trim();
  if (!botToken) return;

  telegramCommandPollBusy = true;
  try {
    await loadTelegramCommandState(botToken);

    if (telegramCommandTokenCache !== botToken) {
      telegramCommandOffset = 0;
      telegramCommandTokenCache = botToken;
      telegramCommandStateReady = false;
      await loadTelegramCommandState(botToken);
    }

    const updates = await callTelegramApi(botToken, 'getUpdates', {
      offset: telegramCommandOffset,
      timeout: 0,
      limit: 20,
      allowed_updates: ['message'],
    });

    if (!Array.isArray(updates) || updates.length === 0) return;

    for (const update of updates) {
      const updateId = Number(update?.update_id || 0);
      if (updateId > 0) {
        telegramCommandOffset = Math.max(telegramCommandOffset, updateId + 1);
      }
      await handleTelegramCommand(botToken, update?.message);
    }

    await persistTelegramCommandState(botToken);
  } catch (err) {
    console.error('[Telegram Commands] Poll gagal:', err.message);
  } finally {
    telegramCommandPollBusy = false;
  }
}

async function sendDiscordFile(webhookUrl, buffer, filename, content = '', embeds = []) {
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) return false;
  if (!discordConfig.enabled || !buffer?.length) return false;

  const form = new FormData();
  form.append('payload_json', JSON.stringify({ content, embeds }));
  form.append('files[0]', buffer, {
    filename,
    contentType: 'application/vnd.ms-excel',
    knownLength: buffer.length,
  });

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: form.getHeaders(),
      body: form,
    });
    if (!res.ok && res.status !== 204) {
      const txt = await res.text();
      console.error(`[Discord] File HTTP ${res.status}:`, txt.slice(0, 200));
      return false;
    }
    console.log(`[Discord] File laporan harian terkirim → ${webhookUrl.slice(0, 60)}...`);
    return true;
  } catch (err) {
    console.error('[Discord] Upload file error:', err.message);
    return false;
  }
}

function getJakartaParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: JAKARTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: Number(parts.hour || 0),
    minute: Number(parts.minute || 0),
    second: Number(parts.second || 0),
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

function getPreviousJakartaDateKey(date = new Date()) {
  return getJakartaParts(new Date(date.getTime() - 24 * 60 * 60 * 1000)).dateKey;
}

function formatDailyFileName(dateKey) {
  const [year, month, day] = String(dateKey).split('-');
  return `monitoring-listrik-${day}-${month}-${year}.xls`;
}

function formatDailyDateLabel(dateKey) {
  const [year, month, day] = String(dateKey).split('-');
  return `${day}/${month}/${year}`;
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatMetricValue(value, digits = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return num.toFixed(digits);
}

function derivePowerMetrics(raw = {}) {
  const arus = Number(raw.arus ?? 0);
  const tegangan = Number(raw.tegangan ?? 0);
  const pf = Number(raw.power_factor ?? 0.85);
  const apparentPower = Number(raw.apparent_power ?? raw.daya ?? arus * tegangan);
  const activePower = Number(raw.daya_w ?? raw.active_power ?? apparentPower * pf);
  return {
    activePower: Number.isFinite(activePower) ? activePower : 0,
    apparentPower: Number.isFinite(apparentPower) ? apparentPower : 0,
    pf: Number.isFinite(pf) ? pf : 0.85,
  };
}

function formatPowerLabel(raw = {}) {
  const { activePower, apparentPower } = derivePowerMetrics(raw);
  return `${formatMetricValue(activePower, 1)} W / ${formatMetricValue(apparentPower, 1)} VA`;
}

function relayIsOn(value) {
  return value === true || value === 1 || String(value ?? '').trim().toUpperCase() === 'ON';
}

function formatTelemetryTimestamp(value) {
  if (value === undefined || value === null || value === '') return waktu();

  const numeric = Number(value);
  const date = Number.isFinite(numeric) && numeric > 100000000000
    ? new Date(numeric)
    : new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleString('id-ID', {
      timeZone: JAKARTA_TZ,
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  }

  return String(value);
}

function getRealtimeTelemetry(raw = {}) {
  const power = derivePowerMetrics(raw);
  const status = String(raw.status || 'NORMAL').trim().toUpperCase() || 'NORMAL';
  const sensorSource = String(raw.sensor_source ?? raw.source ?? 'PZEM-004T').trim() || 'PZEM-004T';

  return {
    arus: formatMetricValue(raw.arus, 2),
    tegangan: formatMetricValue(raw.tegangan, 1),
    dayaAktif: formatMetricValue(power.activePower, 1),
    dayaSemu: formatMetricValue(power.apparentPower, 1),
    energi: formatMetricValue(raw.energi_kwh, 3),
    frekuensi: formatMetricValue(raw.frekuensi, 1),
    powerFactor: formatMetricValue(power.pf, 2),
    relay: relayIsOn(raw.relay) ? 'ON (beban aktif)' : 'OFF (beban diputus)',
    status,
    sensorSource,
    updatedAt: formatTelemetryTimestamp(raw.updated_at ?? raw.updatedAt ?? raw.timestamp),
  };
}

function buildRealtimeDiscordFields(raw = {}) {
  const data = getRealtimeTelemetry(raw);
  return [
    { name: '⚡ Arus', value: `${data.arus} A`, inline: true },
    { name: '🔋 Tegangan', value: `${data.tegangan} V`, inline: true },
    { name: '💡 Daya Aktif', value: `${data.dayaAktif} W`, inline: true },
    { name: '🔌 Daya Semu', value: `${data.dayaSemu} VA`, inline: true },
    { name: '🔆 Energi', value: `${data.energi} kWh`, inline: true },
    { name: '📊 Power Factor', value: data.powerFactor, inline: true },
    { name: '📡 Frekuensi', value: `${data.frekuensi} Hz`, inline: true },
    { name: '🔌 Relay', value: data.relay, inline: true },
    { name: `${statusEmoji(data.status)} Status`, value: data.status, inline: true },
    { name: '🧭 Sumber meter', value: data.sensorSource, inline: true },
    { name: '⏱ Waktu pembacaan', value: data.updatedAt, inline: false },
  ];
}

function escapeHtml(value) {
  return escapeXml(value);
}

function buildRealtimeTelegramMessage(title, raw = {}, description = '') {
  const data = getRealtimeTelemetry(raw);
  const lines = [
    `${statusEmoji(data.status)} <b>${escapeHtml(title)}</b>`,
    description ? escapeHtml(description) : '',
    '',
    '📡 <b>Snapshot data realtime</b>',
    `⚡ Arus: <b>${data.arus} A</b>`,
    `🔋 Tegangan: <b>${data.tegangan} V</b>`,
    `💡 Daya aktif: <b>${data.dayaAktif} W</b>`,
    `🔌 Daya semu: <b>${data.dayaSemu} VA</b>`,
    `🔆 Energi: <b>${data.energi} kWh</b>`,
    `📊 Power factor: <b>${data.powerFactor}</b>`,
    `📡 Frekuensi: <b>${data.frekuensi} Hz</b>`,
    `🔌 Relay: <b>${data.relay}</b>`,
    `${statusEmoji(data.status)} Status: <b>${data.status}</b>`,
    `🧭 Sumber meter: <code>${escapeHtml(data.sensorSource)}</code>`,
    `⏱ Pembacaan: <code>${escapeHtml(data.updatedAt)}</code>`,
  ];
  return lines.filter(Boolean).join('\n');
}

function normalizeArchiveRecord(raw = {}) {
  const recordedAt = Number(raw.recordedAt || raw.timestamp || 0);
  const recordedDate = Number.isFinite(recordedAt) && recordedAt > 0
    ? new Date(recordedAt)
    : new Date();

  const power = derivePowerMetrics(raw);
  return {
    recordedAt,
    waktu: recordedDate.toLocaleString('id-ID', {
      timeZone: JAKARTA_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    arus: Number(raw.arus ?? 0),
    tegangan: Number(raw.tegangan ?? 0),
    daya: power.activePower,
    apparent_power: power.apparentPower,
    energi_kwh: Number(raw.energi_kwh ?? 0),
    frekuensi: Number(raw.frekuensi ?? 0),
    power_factor: Number(raw.power_factor ?? 0),
    relay: Number(raw.relay ?? 0) === 1 ? 1 : 0,
    status: String(raw.status || 'NORMAL'),
    source: String(raw.source || 'hardware'),
  };
}

function buildDailyExcelBuffer(rows, dateKey) {
  const totalRows = rows.length;
  const avgArus = totalRows ? rows.reduce((sum, row) => sum + row.arus, 0) / totalRows : 0;
  const avgTegangan = totalRows ? rows.reduce((sum, row) => sum + row.tegangan, 0) / totalRows : 0;
  const maxArus = totalRows ? Math.max(...rows.map((row) => row.arus)) : 0;
  const dangerCount = rows.filter((row) => row.status === 'DANGER').length;
  const warningCount = rows.filter((row) => row.status === 'WARNING').length;
  const normalCount = rows.filter((row) => row.status === 'NORMAL').length;
  const lastEnergi = totalRows ? rows[rows.length - 1].energi_kwh : 0;

  const summaryRows = [
    ['Tanggal Laporan', formatDailyDateLabel(dateKey)],
    ['Jumlah Data', totalRows],
    ['Rata-rata Arus (A)', formatMetricValue(avgArus, 2)],
    ['Rata-rata Tegangan (V)', formatMetricValue(avgTegangan, 1)],
    ['Arus Maksimum (A)', formatMetricValue(maxArus, 2)],
    ['Status NORMAL', normalCount],
    ['Status WARNING', warningCount],
    ['Status DANGER', dangerCount],
    ['Energi Terakhir (kWh)', formatMetricValue(lastEnergi, 3)],
  ];

  const dataRowsXml = rows.map((row) => `
    <Row>
      <Cell><Data ss:Type="String">${escapeXml(row.waktu)}</Data></Cell>
      <Cell><Data ss:Type="Number">${escapeXml(formatMetricValue(row.arus, 2))}</Data></Cell>
      <Cell><Data ss:Type="Number">${escapeXml(formatMetricValue(row.tegangan, 1))}</Data></Cell>
      <Cell><Data ss:Type="Number">${escapeXml(formatMetricValue(row.daya, 1))}</Data></Cell>
      <Cell><Data ss:Type="Number">${escapeXml(formatMetricValue(row.apparent_power, 1))}</Data></Cell>
      <Cell><Data ss:Type="Number">${escapeXml(formatMetricValue(row.frekuensi, 1))}</Data></Cell>
      <Cell><Data ss:Type="Number">${escapeXml(formatMetricValue(row.power_factor, 2))}</Data></Cell>
      <Cell><Data ss:Type="Number">${escapeXml(formatMetricValue(row.energi_kwh, 3))}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(row.relay ? 'ON' : 'OFF')}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(row.status)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(row.source)}</Data></Cell>
    </Row>
  `).join('');

  const summaryXml = summaryRows.map(([label, value]) => `
    <Row>
      <Cell ss:StyleID="HeaderCell"><Data ss:Type="String">${escapeXml(label)}</Data></Cell>
      <Cell><Data ss:Type="${typeof value === 'number' ? 'Number' : 'String'}">${escapeXml(value)}</Data></Cell>
    </Row>
  `).join('');

  const xml = `<?xml version="1.0"?>
  <?mso-application progid="Excel.Sheet"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:html="http://www.w3.org/TR/REC-html40">
    <Styles>
      <Style ss:ID="HeaderCell">
        <Font ss:Bold="1"/>
        <Interior ss:Color="#DCEBFF" ss:Pattern="Solid"/>
      </Style>
      <Style ss:ID="TableHeader">
        <Font ss:Bold="1" ss:Color="#FFFFFF"/>
        <Interior ss:Color="#1D4ED8" ss:Pattern="Solid"/>
      </Style>
    </Styles>
    <Worksheet ss:Name="Ringkasan">
      <Table>
        ${summaryXml}
      </Table>
    </Worksheet>
    <Worksheet ss:Name="Data 24 Jam">
      <Table>
        <Row>
          <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Waktu (WIB)</Data></Cell>
          <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Arus (A)</Data></Cell>
          <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tegangan (V)</Data></Cell>
          <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Daya Aktif (W)</Data></Cell>
          <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Daya Semu (VA)</Data></Cell>
          <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Frekuensi (Hz)</Data></Cell>
          <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Power Factor</Data></Cell>
          <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Energi (kWh)</Data></Cell>
          <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Relay</Data></Cell>
          <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Status</Data></Cell>
          <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Sumber</Data></Cell>
        </Row>
        ${dataRowsXml}
      </Table>
    </Worksheet>
  </Workbook>`;

  return Buffer.from(xml, 'utf8');
}

// ── Helper: Warna & emoji status ─────────────────────────────────────────
function statusColor(s) {
  switch ((s || '').toUpperCase()) {
    case 'DANGER':  return 0xED4245;
    case 'WARNING': return 0xFEE75C;
    case 'LEAKAGE': return 0xF97316;
    case 'NORMAL':  return 0x57F287;
    default:        return 0x5865F2;
  }
}
function statusEmoji(s) {
  switch ((s || '').toUpperCase()) {
    case 'DANGER':  return '🔴';
    case 'WARNING': return '🟡';
    case 'LEAKAGE': return '🟠';
    case 'NORMAL':  return '🟢';
    default:        return '🔵';
  }
}
function waktu() {
  return new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'medium' });
}

function buildMonitoringSummary(d = {}) {
  const data = getRealtimeTelemetry(d);
  return [
    `Arus ${data.arus} A`,
    `Tegangan ${data.tegangan} V`,
    `Daya aktif ${data.dayaAktif} W`,
    `Daya semu ${data.dayaSemu} VA`,
    `Energi ${data.energi} kWh`,
    `PF ${data.powerFactor}`,
    `Frekuensi ${data.frekuensi} Hz`,
    `Relay ${data.relay}`,
    `Status ${data.status}`,
    `Sumber ${data.sensorSource}`,
  ].join(' • ');
}

async function archivePhysicalTelemetrySnapshot(d = {}) {
  const timestamp = Date.now();
  const dateKey = getJakartaParts(new Date(timestamp)).dateKey;
  const power = derivePowerMetrics(d);
  const payload = {
    recordedAt: timestamp,
    recordedAtIso: new Date(timestamp).toISOString(),
    localDate: dateKey,
    arus: Number(d.arus ?? 0),
    tegangan: Number(d.tegangan ?? 0),
    daya: power.activePower,
    daya_w: power.activePower,
    apparent_power: power.apparentPower,
    energi_kwh: Number(d.energi_kwh ?? 0),
    frekuensi: Number(d.frekuensi ?? 0),
    power_factor: Number(d.power_factor ?? 0),
    relay: d.relay ? 1 : 0,
    status: String(d.status || 'NORMAL'),
    source: 'hardware',
  };
  await db.ref(`${DAILY_ARCHIVE_ROOT}/${dateKey}`).push(payload);
  return payload;
}

let dailyReportBusy = false;

async function maybeSendPhysicalDailyReport() {
  if (dailyReportBusy) return false;
  dailyReportBusy = true;

  try {
    const now = new Date();
    const nowJakarta = getJakartaParts(now);
    if (nowJakarta.hour === 0 && nowJakarta.minute < DAILY_REPORT_MINUTE_GATE) {
      return false;
    }

    const reportDateKey = getPreviousJakartaDateKey(now);
    const stateSnap = await db.ref(DAILY_REPORT_STATE_PATH).get();
    const state = stateSnap.val() || {};

    if (state.lastSentDateKey === reportDateKey || state.lastEvaluatedDateKey === reportDateKey) {
      return false;
    }

    const archiveSnap = await db.ref(`${DAILY_ARCHIVE_ROOT}/${reportDateKey}`).get();
    const archiveRaw = archiveSnap.val() || {};
    const rows = Object.values(archiveRaw)
      .map(normalizeArchiveRecord)
      .sort((a, b) => a.recordedAt - b.recordedAt);

    if (rows.length === 0) {
      await db.ref(DAILY_REPORT_STATE_PATH).update({
        lastEvaluatedDateKey: reportDateKey,
        lastResult: 'no_data',
        lastCheckedAt: Date.now(),
      });
      console.log(`[Daily Report] Tidak ada data baru untuk ${reportDateKey}; laporan tidak dikirim.`);
      return false;
    }

    const filename = formatDailyFileName(reportDateKey);
    const buffer = buildDailyExcelBuffer(rows, reportDateKey);
    const label = formatDailyDateLabel(reportDateKey);
    const caption =
      `📁 <b>Laporan Harian Monitoring Listrik</b>\n` +
      `Tanggal: <b>${label}</b>\n` +
      `Jumlah data: <b>${rows.length}</b>\n` +
      `Isi file mencakup telemetri 24 jam penuh untuk tanggal tersebut.`;

    const discordWebhook =
      discordConfig.webhookDailyReport ||
      discordConfig.webhookMonitoring ||
      '';
    const telegramEnabled = settingsConfig.telegramNotifyEnabled !== false;
    const telegramBotToken = String(settingsConfig.telegramBotToken || '').trim();
    const telegramChatIds = getTelegramChatIds(settingsConfig);
    const hasTelegramDestination = telegramEnabled && telegramBotToken && telegramChatIds.length > 0;

    if (!discordWebhook && !hasTelegramDestination) {
      await db.ref(DAILY_REPORT_STATE_PATH).update({
        lastEvaluatedDateKey: reportDateKey,
        lastResult: 'missing_destination',
        lastCheckedAt: Date.now(),
        lastFilename: filename,
        lastRowCount: rows.length,
      });
      console.warn(`[Daily Report] ${reportDateKey} dilewati karena tujuan Telegram/Discord belum dikonfigurasi.`);
      return false;
    }

    const discordEmbed = {
      title: '📁 Laporan Harian Monitoring Listrik',
      description: `File Excel telemetri 24 jam untuk tanggal **${label}**.`,
      color: 0x60A5FA,
      fields: [
        { name: 'Jumlah Data', value: String(rows.length), inline: true },
        { name: 'Tanggal', value: label, inline: true },
      ],
      footer: { text: `IoT Listrik Dashboard • ${waktu()}` },
    };

    const results = await Promise.allSettled([
      sendDiscordFile(
        discordWebhook,
        buffer,
        filename,
        `📁 Laporan Excel harian untuk ${label}`,
        [discordEmbed]
      ),
      hasTelegramDestination
        ? sendTelegramDocument(telegramBotToken, telegramChatIds, buffer, filename, caption)
        : Promise.resolve(false),
      publishClientEvent({
        event: 'daily_excel_report',
        title: 'Laporan Excel harian dibuat',
        message: `Laporan tanggal ${label} berhasil dibuat dan dikirim otomatis.`,
        severity: 'info',
        payload: {
          report_date: reportDateKey,
          filename,
          rows: rows.length,
        },
      }),
      sendInfoFCM(
        'Laporan harian dibuat',
        `File Excel tanggal ${label} sudah dikirim otomatis.`,
        'daily_excel_report',
        'info'
      ),
    ]);

    const discordSent = results[0].status === 'fulfilled' && results[0].value;
    const telegramSent = results[1].status === 'fulfilled' && results[1].value;

    await db.ref(DAILY_REPORT_STATE_PATH).update({
      lastSentDateKey: reportDateKey,
      lastEvaluatedDateKey: reportDateKey,
      lastResult: 'sent',
      lastCheckedAt: Date.now(),
      lastFilename: filename,
      lastRowCount: rows.length,
      lastDiscordSent: !!discordSent,
      lastTelegramSent: !!telegramSent,
    });

    console.log(`[Daily Report] ${filename} terkirim. Discord=${discordSent} Telegram=${telegramSent}`);
    return true;
  } catch (err) {
    console.error('[Daily Report] Gagal membuat laporan harian:', err.message);
    try {
      await db.ref(DAILY_REPORT_STATE_PATH).update({
        lastResult: 'error',
        lastError: String(err.message || err),
        lastCheckedAt: Date.now(),
      });
    } catch (_) {}
    return false;
  } finally {
    dailyReportBusy = false;
  }
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
    fields: buildRealtimeDiscordFields(d),
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
  const listrikSnap = await db.ref('/listrik').get();
  const d = listrikSnap.val() || {};
  const embed = {
    title:       relay ? '🔌 Relay DINYALAKAN' : '🪫 Relay DIMATIKAN',
    description: `Relay berubah ke posisi **${relay ? 'ON' : 'OFF'}**.`,
    color:       relay ? 0x57F287 : 0xED4245,
    fields: [
      { name: 'Sebelumnya', value: prev  ? 'ON' : 'OFF', inline: true },
      { name: 'Sekarang',   value: relay ? 'ON' : 'OFF', inline: true },
      ...buildRealtimeDiscordFields({ ...d, relay }),
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
let lastArchivedUpdatedAt = null;

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
  const listrikSnap = await db.ref('/listrik').get();
  const d = listrikSnap.val() || {};
  const power = derivePowerMetrics(d);
  const updateMarker = String(d.updated_at ?? snap.val() ?? '');

  if (updateMarker && updateMarker !== lastArchivedUpdatedAt) {
    lastArchivedUpdatedAt = updateMarker;
    archivePhysicalTelemetrySnapshot(d).catch((err) => {
      console.error('[Daily Report] Gagal mengarsip snapshot telemetri:', err.message);
    });
  }

  lastMonitoringSent = now;

  const embed = {
    title: '📊 Update Data Monitoring Listrik',
    color: statusColor(d.status),
    fields: buildRealtimeDiscordFields(d),
    footer: { text: `IoT Listrik Dashboard • ${waktu()}` },
    thumbnail: { url: 'https://iot-listrik-dashboard.vercel.app/assets/icons/icon-192x192.png' },
  };

  const notificationTasks = [];
  if (discordConfig.enabled !== false && discordConfig.webhookMonitoring) {
    notificationTasks.push(sendEmbed(discordConfig.webhookMonitoring, embed));
  }
  await broadcastPhysicalSystemEvent({
    event: 'monitoring_update',
    title: embed.title,
    message: buildMonitoringSummary(d),
    severity: 'info',
    telegramMessage: buildRealtimeTelegramMessage('Update Data Monitoring Listrik', d),
    payload: {
      metrics: {
        arus: d.arus ?? 0,
        tegangan: d.tegangan ?? 0,
        daya: power.apparentPower,
        daya_w: power.activePower,
        apparent_power: power.apparentPower,
        relay: d.relay ? 1 : 0,
        frekuensi: d.frekuensi ?? 0,
        power_factor: d.power_factor ?? 0,
        energi_kwh: d.energi_kwh ?? 0,
        status: d.status ?? 'NORMAL',
      },
    },
  });
  await Promise.allSettled(notificationTasks);
});

// ════════════════════════════════════════════════════════════════════════
// LISTENER — /settings/realtimeStreamEnabled → #alerts (Pause/Resume Stream)
// ════════════════════════════════════════════════════════════════════════
let lastStreamEnabled = null;
db.ref('/settings/realtimeStreamEnabled').on('value', async (snap) => {
  const enabled = snap.val();
  if (enabled === lastStreamEnabled) return;
  const prev = lastStreamEnabled;
  lastStreamEnabled = enabled;
  if (prev === null) return; // skip initial value on server start

  const isPaused = enabled === false;
  const label = isPaused ? 'DIPAUSE' : 'DIRESUME';
  const emoji = isPaused ? '⏸️' : '▶️';
  const color = isPaused ? 0xFEE75C : 0x57F287;

  console.log(`[Stream] Realtime stream ${label}`);

  const embed = {
    title: `${emoji} Stream Data Realtime ${label}`,
    description: isPaused
      ? 'ESP32 berhenti mengirim telemetri periodik ke /listrik. Device tetap membaca settings dan command relay, tetapi dashboard bisa terlihat offline karena heartbeat dihentikan.'
      : 'ESP32 kembali mengirim telemetri periodik ke /listrik. Dashboard akan menerima data realtime kembali.',
    color,
    fields: [
      { name: 'Status Stream', value: isPaused ? '⏸️ Paused' : '▶️ Active', inline: true },
      { name: 'Waktu', value: waktu(), inline: true },
    ],
    footer: { text: `IoT Listrik Dashboard • ${waktu()}` },
  };

  await sendEmbed(discordConfig.webhookAlerts, embed);
  await broadcastPhysicalSystemEvent({
    event: isPaused ? 'stream_paused' : 'stream_resumed',
    title: embed.title,
    message: embed.description,
    severity: isPaused ? 'warning' : 'success',
    telegramMessage:
      `${emoji} <b>Stream Data Realtime ${label}</b>\n` +
      (isPaused
        ? 'ESP32 berhenti mengirim telemetri periodik. Dashboard bisa terlihat offline karena heartbeat dihentikan.'
        : 'ESP32 kembali mengirim telemetri periodik. Dashboard akan menerima data realtime kembali.') +
      `\n🕐 ${waktu()}`,
  });
});

// ════════════════════════════════════════════════════════════════════════
// LISTENER — /settings/buzzerEnabled → #alerts (Buzzer On/Off)
// ════════════════════════════════════════════════════════════════════════
let lastBuzzerEnabled = null;
db.ref('/settings/buzzerEnabled').on('value', async (snap) => {
  const enabled = snap.val();
  if (enabled === lastBuzzerEnabled) return;
  const prev = lastBuzzerEnabled;
  lastBuzzerEnabled = enabled;
  if (prev === null) return;

  const isOff = enabled === false;
  const label = isOff ? 'DIMATIKAN' : 'DIAKTIFKAN';
  const emoji = isOff ? '🔇' : '🔔';
  const color = isOff ? 0xFEE75C : 0x57F287;

  console.log(`[Settings] Buzzer ${label}`);

  const embed = {
    title: `${emoji} Buzzer ${label}`,
    description: isOff
      ? 'Buzzer tidak akan berbunyi saat kondisi abnormal terdeteksi.'
      : 'Buzzer akan berbunyi saat kondisi abnormal terdeteksi.',
    color,
    fields: [
      { name: 'Status Buzzer', value: isOff ? '🔇 Nonaktif' : '🔔 Aktif', inline: true },
      { name: 'Waktu', value: waktu(), inline: true },
    ],
    footer: { text: `IoT Listrik Dashboard • ${waktu()}` },
  };

  await sendEmbed(discordConfig.webhookAlerts, embed);
  await broadcastPhysicalSystemEvent({
    event: isOff ? 'buzzer_disabled' : 'buzzer_enabled',
    title: embed.title,
    message: embed.description,
    severity: isOff ? 'warning' : 'success',
    telegramMessage:
      `${emoji} <b>Buzzer ${label}</b>\n` +
      (isOff
        ? 'Buzzer tidak akan berbunyi saat kondisi abnormal terdeteksi.'
        : 'Buzzer akan berbunyi saat kondisi abnormal terdeteksi.') +
      `\n🕐 ${waktu()}`,
  });
});

// ════════════════════════════════════════════════════════════════════════
// LISTENER — /settings/autoCutoffEnabled → #alerts (Auto-Cutoff On/Off)
// ════════════════════════════════════════════════════════════════════════
let lastAutoCutoffEnabled = null;
db.ref('/settings/autoCutoffEnabled').on('value', async (snap) => {
  const enabled = snap.val();
  if (enabled === lastAutoCutoffEnabled) return;
  const prev = lastAutoCutoffEnabled;
  lastAutoCutoffEnabled = enabled;
  if (prev === null) return;

  const isOff = enabled === false;
  const label = isOff ? 'DIMATIKAN' : 'DIAKTIFKAN';
  const emoji = isOff ? '⚠️' : '🛡️';
  const color = isOff ? 0xED4245 : 0x57F287;

  console.log(`[Settings] Auto-Cutoff Relay ${label}`);

  const embed = {
    title: `${emoji} Auto-Cutoff Relay ${label}`,
    description: isOff
      ? '⚠️ **PERINGATAN:** Relay TIDAK akan dimatikan otomatis saat DANGER (arus ≥ threshold). Risiko kerusakan perangkat meningkat!'
      : 'Relay akan dimatikan otomatis saat arus melampaui threshold DANGER. Proteksi keamanan aktif.',
    color,
    fields: [
      { name: 'Status Auto-Cutoff', value: isOff ? '⚠️ Nonaktif' : '🛡️ Aktif', inline: true },
      { name: 'Waktu', value: waktu(), inline: true },
    ],
    footer: { text: `IoT Listrik Dashboard • ${waktu()}` },
  };

  await sendEmbed(discordConfig.webhookAlerts, embed);
  await broadcastPhysicalSystemEvent({
    event: isOff ? 'auto_cutoff_disabled' : 'auto_cutoff_enabled',
    title: embed.title,
    message: embed.description,
    severity: isOff ? 'danger' : 'success',
    telegramMessage:
      `${emoji} <b>Auto-Cutoff Relay ${label}</b>\n` +
      (isOff
        ? '⚠️ PERINGATAN: Relay TIDAK akan dimatikan otomatis saat DANGER. Risiko kerusakan perangkat meningkat!'
        : 'Relay akan dimatikan otomatis saat arus melampaui threshold DANGER. Proteksi keamanan aktif.') +
      `\n🕐 ${waktu()}`,
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

setTimeout(() => {
  maybeSendPhysicalDailyReport().catch((err) => {
    console.error('[Daily Report] Initial scheduler error:', err.message);
  });
}, 15000);

setInterval(() => {
  maybeSendPhysicalDailyReport().catch((err) => {
    console.error('[Daily Report] Scheduler error:', err.message);
  });
}, DAILY_REPORT_CHECK_INTERVAL_MS);

setInterval(() => {
  pollTelegramCommands().catch((err) => {
    console.error('[Telegram Commands] Scheduler error:', err.message);
  });
}, TELEGRAM_COMMAND_POLL_INTERVAL_MS);

// ── Keep-alive ────────────────────────────────────────────────────────────
console.log('[Discord Notifier] Mendengarkan perubahan RTDB... (Ctrl+C untuk berhenti)');
console.log('[Daily Report] Scheduler aktif — cek laporan harian setiap 5 menit.');
console.log('[Telegram Commands] Polling aktif — cek /pause, /resume, /status, /help setiap 4 detik.');
process.on('SIGINT', () => { console.log('\n[Discord Notifier] Dihentikan.'); process.exit(0); });

/**
 * settings.js — Settings page (Admin only)
 * ─────────────────────────────────────────────────────────────────────
 * User management utama tetap tanpa Firebase Functions:
 *
 *   LIST   → baca /users dari RTDB langsung
 *   CREATE → pakai Secondary Firebase App (admin tidak ter-logout)
 *   DELETE → hapus /users/{uid} dari RTDB (Auth account tetap ada)
 *   ROLE   → tulis langsung ke /users/{uid}/role di RTDB
 *   RESET  → sendPasswordResetEmail() — kirim email ke user
 *
 * Tradeoff vs Functions:
 *  ✅ Tanpa Functions, tanpa Cloud APIs yang perlu diaktifkan
 *  ✅ Lebih simpel untuk thesis project
 *  ⚠️  Delete hanya menghapus RTDB profile, bukan Firebase Auth account
 *      (user masih bisa login tapi tidak punya role → dianggap unauthorized)
 *  ⚠️  Admin tidak bisa set password langsung — hanya bisa kirim reset email
 *  ⚠️  List user hanya menampilkan yang pernah login (ada di RTDB /users)
 *
 * Fitur sensitif yang memakai Firebase Functions:
 *   - OTP email untuk reset data realtime /listrik
 * ─────────────────────────────────────────────────────────────────────
 */

import { db, auth, firebaseConfig }  from './firebase-config.js';
import { loadClientConfig, saveClientConfig } from './client-config.js';
import { initPage, populateSidebar, initSidebarToggle, logout, getDbPrefix, isTempAccount, getCurrentUser } from './auth.js';
import { requestNotificationPermission, checkAndNotify, checkAdminResetNotify, initAudio, showToast, stopWebSiren } from './notifications.js';
import { ref, onValue, set, update, remove, get }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  getAuth,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeApp, deleteApp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// ── DOM: System settings ──────────────────────────────────────
const inpThreshold    = document.getElementById('inpThreshold');
const inpSendInterval = document.getElementById('inpSendInterval');
const inpBuzzer       = document.getElementById('inpBuzzer');
const inpAutoCutoff   = document.getElementById('inpAutoCutoff');
const inpWarningPct   = document.getElementById('inpWarningPercent');
const inpPowerFactor  = document.getElementById('inpPowerFactor');
const inpFrequency    = document.getElementById('inpFrequency');
const inpTelegramNotify = document.getElementById('inpTelegramNotify');

// ── DOM: Client backend (localStorage) ────────────────────────
const inpPublicApiBase = document.getElementById('inpPublicApiBase');
const inpLocalApiBase  = document.getElementById('inpLocalApiBase');
const inpDataMode      = document.getElementById('inpDataMode');
const inpHealthPath    = document.getElementById('inpHealthPath');
const inpAutoFailover  = document.getElementById('inpAutoFailover');
const inpRetryMs       = document.getElementById('inpRetryMs');
const inpTimeoutMs     = document.getElementById('inpTimeoutMs');
const saveClientBtn    = document.getElementById('saveClientConfigBtn');
const clientSaveStatus = document.getElementById('clientSaveStatus');

// ── DOM: Calibration ─────────────────────────────────────────
const inpArusCal      = document.getElementById('inpArusCal');
const inpTeganganCal  = document.getElementById('inpTeganganCal');

// ── DOM: Telegram ─────────────────────────────────────────────
const inpBotToken     = document.getElementById('inpBotToken');
const inpRecipientName = document.getElementById('inpTelegramRecipientName');
const inpChatId       = document.getElementById('inpChatId');
let telegramRecipients = [];
let editingChatIdIndex = -1;
let chatIdListEl = null;
let addChatIdBtn = null;
let cancelChatIdEditBtn = null;

// ── DOM: Discord ──────────────────────────────────────────────
const inpDiscordAlerts     = document.getElementById('inpDiscordAlerts');
const inpDiscordRelay      = document.getElementById('inpDiscordRelay');
const inpDiscordMonitoring = document.getElementById('inpDiscordMonitoring');
const inpDiscordLogs       = document.getElementById('inpDiscordLogs');
const inpDiscordEnabled    = document.getElementById('inpDiscordEnabled');
const discordSaveStatus    = document.getElementById('discordSaveStatus');
const saveDiscordBtn       = document.getElementById('saveDiscordBtn');
const testDiscordBtn       = document.getElementById('testDiscordBtn');

// ── reveal webhook fields ──────────────────────────────────────
window.toggleReveal = (inputId, btn) => {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isHidden = inp.type === 'password';
  inp.type = isHidden ? 'text' : 'password';
  const icon = btn.querySelector('.material-symbols-rounded');
  if (icon) icon.textContent = isHidden ? 'visibility_off' : 'visibility';
};

// ── DOM: Controls ─────────────────────────────────────────────
const saveBtn         = document.getElementById('saveSettingsBtn');
const saveStatus      = document.getElementById('saveStatus');

// ── DOM: Device bootstrap / Wi-Fi management (admin only) ────
const deviceBootstrapSection = document.getElementById('deviceBootstrapSection');
const inpDeviceWifiSsid      = document.getElementById('inpDeviceWifiSsid');
const inpDeviceWifiPassword  = document.getElementById('inpDeviceWifiPassword');
const inpDeviceApiKey        = document.getElementById('inpDeviceApiKey');
const inpDeviceDbUrl         = document.getElementById('inpDeviceDbUrl');
const inpDeviceEmail         = document.getElementById('inpDeviceEmail');
const inpDevicePassword      = document.getElementById('inpDevicePassword');
const saveDeviceBootstrapBtn = document.getElementById('saveDeviceBootstrapBtn');
const clearDeviceBootstrapBtn = document.getElementById('clearDeviceBootstrapBtn');
const deviceBootstrapStatus  = document.getElementById('deviceBootstrapStatus');
const deviceBootstrapMeta    = document.getElementById('deviceBootstrapMeta');

let latestDeviceBootstrap = {};

// ── DOM: Admin live data reset via OTP ────────────────────────
const liveDataResetSection   = document.getElementById('liveDataResetSection');
const adminResetEmail        = document.getElementById('adminResetEmail');
const inpLiveResetOtp        = document.getElementById('inpLiveResetOtp');
const sendLiveResetOtpBtn    = document.getElementById('sendLiveResetOtpBtn');
const confirmLiveResetBtn    = document.getElementById('confirmLiveResetBtn');
const liveDataResetStatus    = document.getElementById('liveDataResetStatus');
const liveDataResetMeta      = document.getElementById('liveDataResetMeta');

let liveResetActionId = '';
let liveResetExpiresAt = 0;
let liveResetMaskedEmail = '';

// ── Helper: Reload config di sim-notifier setelah settings disimpan ────────
async function reloadSimNotifierConfig() {
  // Hanya berlaku untuk simulator (temp accounts)
  // Panggil endpoint reload-config agar backend langsung sinkron
  try {
    const { getCurrentUser, isTempAccount, getDbPrefix } = await import('./auth.js');
    const user = getCurrentUser();
    const isTemp = isTempAccount();
    if (!user?.uid || !isTemp) return;
    await fetch('http://localhost:3002/api/sim/reload-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid }),
      signal: AbortSignal.timeout(3000),
    });
    console.log('[Settings] Config di-reload di sim-notifier ✅');
  } catch {
    // sim-notifier mungkin tidak jalan — itu OK, RTDB listener akan menangkap
    console.log('[Settings] sim-notifier tidak tersedia (akan sinkron via RTDB listener)');
  }
}

// ── DOM: Users ────────────────────────────────────────────────
const usersTbody      = document.getElementById('usersTbody');
const addUserBtn      = document.getElementById('addUserBtn');
const modalOverlay    = document.getElementById('addUserModal');
const formEmail       = document.getElementById('newEmail');
const formPassword    = document.getElementById('newPassword');
const formDisplayName = document.getElementById('newDisplayName');
const formRole        = document.getElementById('newRole');
const modalSubmit     = document.getElementById('modalSubmitBtn');
const modalCancel     = document.getElementById('modalCancelBtn');
const modalClose      = document.getElementById('modalClose');

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

function setValidation(id, msg, ok) {
  const el = document.getElementById(id);
  if (!el) return ok;
  el.textContent = msg;
  el.className   = `validation-msg ${ok ? 'ok' : 'error'}`;
  return ok;
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
    };
  }

  const chatId = normalizeTelegramChatId(value);
  return chatId ? { name: '', chatId } : null;
}

function parseTelegramRecipients(...sources) {
  const recipients = [];
  const add = (value) => {
    const recipient = normalizeTelegramRecipient(value);
    if (!recipient) return;

    const existing = recipients.find((item) => item.chatId === recipient.chatId);
    if (existing) {
      if (!existing.name && recipient.name) existing.name = recipient.name;
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

function getTelegramRecipientsFromSettings(settings) {
  return parseTelegramRecipients(
    settings?.telegramRecipients,
    settings?.telegramChatIds,
    settings?.telegramChatId,
    settings?.telegram?.chat_id
  );
}

function renderTelegramChatIds() {
  if (!chatIdListEl) return;

  chatIdListEl.innerHTML = '';

  if (telegramRecipients.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'chat-id-empty';
    empty.textContent = 'Belum ada penerima Telegram tersimpan.';
    chatIdListEl.appendChild(empty);
    return;
  }

  telegramRecipients.forEach((recipient, index) => {
    const item = document.createElement('div');
    item.className = 'chat-id-item';

    const main = document.createElement('div');
    main.className = 'chat-id-main';

    const name = document.createElement('span');
    name.className = 'chat-id-name';
    name.textContent = recipient.name || `Penerima ${index + 1}`;

    const value = document.createElement('span');
    value.className = 'chat-id-value';
    value.textContent = recipient.chatId;

    main.append(name, value);

    const actions = document.createElement('div');
    actions.className = 'chat-id-item-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-secondary btn-sm';
    editBtn.dataset.chatAction = 'edit';
    editBtn.dataset.index = String(index);
    editBtn.textContent = 'Edit';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.dataset.chatAction = 'delete';
    deleteBtn.dataset.index = String(index);
    deleteBtn.textContent = 'Hapus';

    actions.append(editBtn, deleteBtn);
    item.append(main, actions);
    chatIdListEl.appendChild(item);
  });
}

function resetChatIdEditor() {
  editingChatIdIndex = -1;
  if (inpRecipientName) inpRecipientName.value = '';
  if (inpChatId) inpChatId.value = '';
  if (addChatIdBtn) addChatIdBtn.textContent = 'Tambah';
  if (cancelChatIdEditBtn) cancelChatIdEditBtn.hidden = true;
  setValidation('valChatId', '', true);
}

function commitChatIdInput({ silent = false } = {}) {
  const name = inpRecipientName?.value.trim() || '';
  const raw = inpChatId?.value.trim() || '';
  if (!raw && !name) return true;
  if (!raw && name) {
    if (!silent) setValidation('valChatId', 'Chat ID wajib diisi', false);
    return false;
  }

  const chatId = normalizeTelegramChatId(raw);
  if (!chatId) {
    if (!silent) setValidation('valChatId', 'Chat ID harus angka', false);
    return false;
  }

  const duplicateIndex = telegramRecipients.findIndex((item) => item.chatId === chatId);
  if (duplicateIndex !== -1 && duplicateIndex !== editingChatIdIndex) {
    setValidation('valChatId', 'Chat ID sudah ada di daftar', false);
    return false;
  }

  const recipient = { name, chatId };
  if (editingChatIdIndex >= 0) {
    telegramRecipients[editingChatIdIndex] = recipient;
  } else {
    telegramRecipients.push(recipient);
  }

  resetChatIdEditor();
  renderTelegramChatIds();
  setValidation('valChatId', 'Penerima siap disimpan', true);
  return true;
}

function initTelegramChatManager() {
  if (!inpChatId || inpChatId.dataset.managerReady === '1') return;
  inpChatId.dataset.managerReady = '1';
  inpChatId.placeholder = 'Masukkan ID lalu klik Tambah';

  const manager = document.createElement('div');
  manager.className = 'chat-id-manager';

  const actions = document.createElement('div');
  actions.className = 'chat-id-actions';

  addChatIdBtn = document.createElement('button');
  addChatIdBtn.type = 'button';
  addChatIdBtn.className = 'btn btn-secondary btn-sm';
  addChatIdBtn.textContent = 'Tambah';
  addChatIdBtn.addEventListener('click', () => commitChatIdInput());

  cancelChatIdEditBtn = document.createElement('button');
  cancelChatIdEditBtn.type = 'button';
  cancelChatIdEditBtn.className = 'btn btn-ghost btn-sm';
  cancelChatIdEditBtn.textContent = 'Batal Edit';
  cancelChatIdEditBtn.hidden = true;
  cancelChatIdEditBtn.addEventListener('click', resetChatIdEditor);

  actions.append(addChatIdBtn, cancelChatIdEditBtn);

  chatIdListEl = document.createElement('div');
  chatIdListEl.className = 'chat-id-list';
  chatIdListEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-chat-action]');
    if (!button) return;

    const index = Number(button.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= telegramRecipients.length) return;

    if (button.dataset.chatAction === 'edit') {
      editingChatIdIndex = index;
      if (inpRecipientName) inpRecipientName.value = telegramRecipients[index].name || '';
      inpChatId.value = telegramRecipients[index].chatId;
      inpChatId.focus();
      if (addChatIdBtn) addChatIdBtn.textContent = 'Update';
      if (cancelChatIdEditBtn) cancelChatIdEditBtn.hidden = false;
      setValidation('valChatId', 'Edit penerima lalu klik Update', true);
      return;
    }

    if (button.dataset.chatAction === 'delete') {
      telegramRecipients.splice(index, 1);
      resetChatIdEditor();
      renderTelegramChatIds();
      setValidation('valChatId', 'Penerima dihapus dari daftar', true);
    }
  });

  manager.append(actions, chatIdListEl);
  const editorGrid = inpChatId.closest('.recipient-editor-grid');
  if (editorGrid) {
    editorGrid.insertAdjacentElement('afterend', manager);
  } else {
    inpChatId.insertAdjacentElement('afterend', manager);
  }
  renderTelegramChatIds();
}

function clearValidations() {
  ['valThreshold','valWarningPercent','valSendInterval','valArusCal',
   'valTeganganCal','valPowerFactor','valFrequency','valBotToken','valChatId']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.className = 'validation-msg'; }
    });
}

function validateAll() {
  let valid = true;
  clearValidations();

  const threshold = parseFloat(inpThreshold?.value);
  if (isNaN(threshold) || threshold <= 0 || threshold > 200) {
    setValidation('valThreshold', 'Threshold harus antara 0.1 – 200 A', false);
    valid = false;
  } else { setValidation('valThreshold', 'Valid', true); }

  const wp = parseFloat(inpWarningPct?.value);
  if (isNaN(wp) || wp < 50 || wp > 99) {
    setValidation('valWarningPercent', 'Antara 50 – 99 %', false);
    valid = false;
  } else { setValidation('valWarningPercent', 'Valid', true); }

  const interval = parseInt(inpSendInterval?.value);
  if (isNaN(interval) || interval < 500 || interval > 60000) {
    setValidation('valSendInterval', 'Interval harus antara 500 – 60000 ms', false);
    valid = false;
  } else { setValidation('valSendInterval', 'Valid', true); }

  const arusCal = parseFloat(inpArusCal?.value);
  if (isNaN(arusCal) || arusCal <= 0 || arusCal > 10) {
    setValidation('valArusCal', 'Harus antara 0.01 – 10', false);
    valid = false;
  } else { setValidation('valArusCal', 'Valid', true); }

  const tegCal = parseFloat(inpTeganganCal?.value);
  if (isNaN(tegCal) || tegCal <= 0 || tegCal > 2000) {
    setValidation('valTeganganCal', 'Harus antara 0.01 – 2000', false);
    valid = false;
  } else { setValidation('valTeganganCal', 'Valid', true); }

  const pf = parseFloat(inpPowerFactor?.value);
  if (isNaN(pf) || pf < 0.5 || pf > 1) {
    setValidation('valPowerFactor', 'PF antara 0.5 – 1', false);
    valid = false;
  } else { setValidation('valPowerFactor', 'Valid', true); }

  const fq = parseFloat(inpFrequency?.value);
  if (isNaN(fq) || fq < 45 || fq > 65) {
    setValidation('valFrequency', '45 – 65 Hz', false);
    valid = false;
  } else { setValidation('valFrequency', 'Valid', true); }

  const token = inpBotToken?.value.trim();
  if (token && !/^\d+:[A-Za-z0-9_-]{35,}$/.test(token)) {
    setValidation('valBotToken', 'Format token tidak valid', false);
    valid = false;
  }

  const chatId = inpChatId?.value.trim();
  if (chatId && !normalizeTelegramChatId(chatId)) {
    setValidation('valChatId', 'Chat ID harus angka', false);
    valid = false;
  }

  return valid;
}

function isRealAdminSettingsSession() {
  return !isTempAccount() && getDbPrefix() === '';
}

function getCallableErrorMessage(err, fallback = 'Terjadi kesalahan.') {
  const message = String(err?.message || fallback)
    .replace(/^internal\s*/i, '')
    .replace(/^permission-denied\s*/i, '')
    .replace(/^invalid-argument\s*/i, '')
    .replace(/^failed-precondition\s*/i, '')
    .replace(/^resource-exhausted\s*/i, '')
    .replace(/^deadline-exceeded\s*/i, '')
    .replace(/^not-found\s*/i, '')
    .replace(/^unauthenticated\s*/i, '')
    .trim();
  return message || fallback;
}

function getLiveResetApiBase() {
  const origin = window.location?.origin || '';
  return /^https?:\/\//i.test(origin)
    ? origin
    : 'https://iot-listrik-dashboard.vercel.app';
}

async function callLiveResetApi(path, body = {}) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Sesi admin tidak ditemukan. Silakan login ulang.');
  }

  const res = await fetch(`${getLiveResetApiBase()}/api/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data;
}

function setDeviceBootstrapVisibility() {
  if (!deviceBootstrapSection) return;
  deviceBootstrapSection.hidden = !isRealAdminSettingsSession();
}

function setLiveDataResetVisibility() {
  if (!liveDataResetSection) return;
  liveDataResetSection.hidden = !isRealAdminSettingsSession();
  if (adminResetEmail) {
    const currentUser = getCurrentUser();
    adminResetEmail.textContent = currentUser?.email
      ? `OTP akan dikirim ke email admin yang sedang login: ${currentUser.email}`
      : 'OTP akan dikirim ke email admin yang sedang login.';
  }
}

function renderDeviceBootstrapStatus(data = {}) {
  if (!deviceBootstrapStatus || !deviceBootstrapMeta) return;

  const status = String(data.status || 'idle').toLowerCase();
  const requestedAt = data.requestedAt ? String(data.requestedAt) : '';
  const confirmedAt = data.lastConfirmedAt ? String(data.lastConfirmedAt) : '';
  const requestedBy = data.requestedBy ? String(data.requestedBy) : '';
  const activeSsid = data.activeSsid ? String(data.activeSsid) : '';
  const message = data.statusMessage
    ? String(data.statusMessage)
    : 'Belum ada permintaan bootstrap yang dikirim.';

  const statusMap = {
    idle: 'Siap',
    pending: 'Menunggu ESP32',
    applying: 'Menyimpan ke NVS',
    restarting: 'Sedang restart',
    connected: 'Terkonfirmasi',
    portal: 'Masuk captive portal',
    error: 'Gagal diterapkan',
  };

  deviceBootstrapStatus.textContent = statusMap[status] || status || 'Siap';

  const meta = [];
  meta.push(message);
  if (requestedBy) meta.push(`Diminta oleh: ${requestedBy}`);
  if (requestedAt) meta.push(`Waktu permintaan: ${requestedAt}`);
  if (confirmedAt) {
    meta.push(/^\d+$/.test(confirmedAt)
      ? `Konfirmasi device (uptime): ${confirmedAt} ms`
      : `Konfirmasi device: ${confirmedAt}`);
  }
  if (activeSsid) meta.push(`SSID aktif: ${activeSsid}`);
  if (data.lastError) meta.push(`Detail error: ${String(data.lastError)}`);
  deviceBootstrapMeta.innerHTML = meta.join('<br>');
}

function renderLiveDataResetState({ type = 'idle', message = '' } = {}) {
  if (!liveDataResetStatus || !liveDataResetMeta) return;

  const now = Date.now();
  const expiresLabel = liveResetExpiresAt > now
    ? new Date(liveResetExpiresAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    : '';

  const statusMap = {
    idle: 'Siap',
    otp_sent: 'OTP terkirim',
    success: 'Reset berhasil',
    error: 'Perlu perhatian',
  };

  liveDataResetStatus.textContent = statusMap[type] || 'Siap';

  const parts = [];
  if (message) parts.push(message);
  if (liveResetMaskedEmail) parts.push(`Email tujuan: ${liveResetMaskedEmail}`);
  if (liveResetActionId) parts.push(`ID verifikasi: ${liveResetActionId}`);
  if (expiresLabel) parts.push(`OTP berlaku sampai: ${expiresLabel} WIB`);
  if (!parts.length) {
    parts.push('Bagian ini hanya mengosongkan data realtime di /listrik. Histori log tidak dihapus.');
  }
  liveDataResetMeta.innerHTML = parts.join('<br>');
}

function validateDeviceBootstrapPayload() {
  if (!inpDeviceWifiSsid || !inpDeviceApiKey || !inpDeviceDbUrl || !inpDeviceEmail || !inpDevicePassword) {
    return 'Form bootstrap device tidak tersedia.';
  }

  if (!inpDeviceWifiSsid.value.trim()) return 'SSID Wi-Fi wajib diisi.';
  if (!inpDeviceApiKey.value.trim()) return 'Firebase API Key wajib diisi.';

  const dbUrl = inpDeviceDbUrl.value.trim();
  if (!dbUrl || !/^https:\/\/.+/.test(dbUrl)) {
    return 'Realtime Database URL harus diawali https://';
  }

  const email = inpDeviceEmail.value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Email akun IoT tidak valid.';
  }

  if (!inpDevicePassword.value.trim()) return 'Password akun IoT wajib diisi.';
  return '';
}

function loadDeviceBootstrapSettings() {
  if (!isRealAdminSettingsSession() || !deviceBootstrapSection) return;

  onValue(ref(db, 'settings/deviceBootstrap'), (snap) => {
    const data = snap.val() || {};
    latestDeviceBootstrap = data;

    if (inpDeviceWifiSsid)     inpDeviceWifiSsid.value = data.wifiSsid || '';
    if (inpDeviceWifiPassword) inpDeviceWifiPassword.value = data.wifiPassword || '';
    if (inpDeviceApiKey)       inpDeviceApiKey.value = data.firebaseApiKey || '';
    if (inpDeviceDbUrl)        inpDeviceDbUrl.value = data.firebaseDbUrl || '';
    if (inpDeviceEmail)        inpDeviceEmail.value = data.iotEmail || '';
    if (inpDevicePassword)     inpDevicePassword.value = data.iotPassword || '';

    renderDeviceBootstrapStatus(data);
  });
}

async function saveDeviceBootstrapSettings() {
  if (!isRealAdminSettingsSession()) {
    showToast('Fitur bootstrap device hanya untuk admin utama.', 'error');
    return;
  }

  const validationError = validateDeviceBootstrapPayload();
  if (validationError) {
    showToast(validationError, 'error');
    return;
  }

  const currentUser = getCurrentUser();
  const payload = {
    ...latestDeviceBootstrap,
    action: 'save',
    requestId: `bootstrap-${Date.now()}`,
    pending: true,
    status: 'pending',
    statusMessage: 'Menunggu ESP32 membaca permintaan bootstrap dari Firebase.',
    requestedAt: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    requestedBy: currentUser?.email || 'admin',
    wifiSsid: inpDeviceWifiSsid?.value.trim() || '',
    wifiPassword: inpDeviceWifiPassword?.value ?? '',
    firebaseApiKey: inpDeviceApiKey?.value.trim() || '',
    firebaseDbUrl: inpDeviceDbUrl?.value.trim() || '',
    iotEmail: inpDeviceEmail?.value.trim() || '',
    iotPassword: inpDevicePassword?.value ?? '',
    lastError: '',
    restartRequired: true,
  };

  try {
    if (saveDeviceBootstrapBtn) {
      saveDeviceBootstrapBtn.disabled = true;
      saveDeviceBootstrapBtn.textContent = 'Mengirim...';
    }
    await set(ref(db, 'settings/deviceBootstrap'), payload);
    latestDeviceBootstrap = payload;
    renderDeviceBootstrapStatus(payload);
    showToast('Permintaan bootstrap dikirim. ESP32 akan restart setelah menerapkan konfigurasi baru.', 'success');
  } catch (err) {
    showToast('Gagal kirim bootstrap device: ' + err.message, 'error');
  } finally {
    if (saveDeviceBootstrapBtn) {
      saveDeviceBootstrapBtn.disabled = false;
      saveDeviceBootstrapBtn.innerHTML = '<span class="material-symbols-rounded">wifi</span> Simpan & Terapkan ke Device';
    }
  }
}

async function clearDeviceBootstrapSettings() {
  if (!isRealAdminSettingsSession()) {
    showToast('Fitur bootstrap device hanya untuk admin utama.', 'error');
    return;
  }

  const confirmed = window.confirm(
    'Hapus konfigurasi Wi-Fi dan bootstrap device? ESP32 akan restart lalu masuk captive portal setup.'
  );
  if (!confirmed) return;

  const currentUser = getCurrentUser();
  const payload = {
    ...latestDeviceBootstrap,
    action: 'clear',
    requestId: `bootstrap-clear-${Date.now()}`,
    pending: true,
    status: 'pending',
    statusMessage: 'Menunggu ESP32 menghapus konfigurasi bootstrap dan membuka captive portal.',
    requestedAt: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    requestedBy: currentUser?.email || 'admin',
    wifiSsid: '',
    wifiPassword: '',
    lastError: '',
    restartRequired: true,
  };

  try {
    if (clearDeviceBootstrapBtn) {
      clearDeviceBootstrapBtn.disabled = true;
      clearDeviceBootstrapBtn.textContent = 'Mengirim...';
    }
    await set(ref(db, 'settings/deviceBootstrap'), payload);
    latestDeviceBootstrap = payload;
    renderDeviceBootstrapStatus(payload);
    showToast('Permintaan hapus bootstrap dikirim. Device akan masuk mode setup setelah restart.', 'success');
  } catch (err) {
    showToast('Gagal hapus bootstrap device: ' + err.message, 'error');
  } finally {
    if (clearDeviceBootstrapBtn) {
      clearDeviceBootstrapBtn.disabled = false;
      clearDeviceBootstrapBtn.innerHTML = '<span class="material-symbols-rounded">wifi_off</span> Hapus Wi-Fi & Buka Setup';
    }
  }
}

async function requestLiveDataResetOtp() {
  if (!isRealAdminSettingsSession()) {
    showToast('Fitur reset data realtime hanya untuk admin utama.', 'error');
    return;
  }

  try {
    if (sendLiveResetOtpBtn) {
      sendLiveResetOtpBtn.disabled = true;
      sendLiveResetOtpBtn.innerHTML = '<span class="material-symbols-rounded">mail</span> Mengirim OTP...';
    }

    const data = await callLiveResetApi('request-live-reset-otp', {});

    liveResetActionId = String(data.actionId || '');
    liveResetExpiresAt = Number(data.expiresAt || 0);
    liveResetMaskedEmail = String(data.maskedEmail || getCurrentUser()?.email || '');

    if (inpLiveResetOtp) inpLiveResetOtp.value = '';
    renderLiveDataResetState({
      type: 'otp_sent',
      message: 'Kode OTP sudah dikirim ke email admin. Masukkan 6 digit OTP untuk mengosongkan data realtime /listrik.',
    });
    showToast('OTP reset data realtime berhasil dikirim ke email admin.', 'success');
  } catch (err) {
    renderLiveDataResetState({
      type: 'error',
      message: getCallableErrorMessage(err, 'Gagal meminta OTP reset data realtime.'),
    });
    showToast(getCallableErrorMessage(err, 'Gagal meminta OTP reset data realtime.'), 'error');
  } finally {
    if (sendLiveResetOtpBtn) {
      sendLiveResetOtpBtn.disabled = false;
      sendLiveResetOtpBtn.innerHTML = '<span class="material-symbols-rounded">mail</span> Kirim OTP ke Email Admin';
    }
  }
}

async function confirmLiveDataReset() {
  if (!isRealAdminSettingsSession()) {
    showToast('Fitur reset data realtime hanya untuk admin utama.', 'error');
    return;
  }
  if (!liveResetActionId) {
    showToast('Minta OTP dulu sebelum mengosongkan data realtime.', 'warning');
    return;
  }

  const otp = inpLiveResetOtp?.value.trim() || '';
  if (!/^\d{6}$/.test(otp)) {
    showToast('OTP harus 6 digit angka.', 'error');
    return;
  }

  try {
    if (confirmLiveResetBtn) {
      confirmLiveResetBtn.disabled = true;
      confirmLiveResetBtn.innerHTML = '<span class="material-symbols-rounded">delete_forever</span> Memproses...';
    }

    const data = await callLiveResetApi('confirm-live-reset', {
      otp,
      actionId: liveResetActionId,
    });
    const clearedLabel = data.clearedAt
      ? new Date(Number(data.clearedAt)).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      : 'baru saja';

    liveResetActionId = '';
    liveResetExpiresAt = 0;
    if (inpLiveResetOtp) inpLiveResetOtp.value = '';

    renderLiveDataResetState({
      type: 'success',
      message: `Data realtime /listrik berhasil dikosongkan pada ${clearedLabel} WIB.`,
    });
    showToast('Data realtime perangkat IoT berhasil dikosongkan.', 'success');
  } catch (err) {
    renderLiveDataResetState({
      type: 'error',
      message: getCallableErrorMessage(err, 'Gagal mengosongkan data realtime /listrik.'),
    });
    showToast(getCallableErrorMessage(err, 'Gagal mengosongkan data realtime /listrik.'), 'error');
  } finally {
    if (confirmLiveResetBtn) {
      confirmLiveResetBtn.disabled = false;
      confirmLiveResetBtn.innerHTML = '<span class="material-symbols-rounded">delete_forever</span> Kosongkan Data Realtime';
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS — LOAD & SAVE (Firebase RTDB langsung)
// ═══════════════════════════════════════════════════════════════

function loadSettings() {
  onValue(ref(db, getDbPrefix() + '/settings'), (snap) => {
    const d = snap.val() || {};
    if (inpThreshold)    inpThreshold.value     = d.thresholdArus        ?? 10;
    if (inpWarningPct)   inpWarningPct.value    = d.warningPercent       ?? 80;
    if (inpSendInterval) inpSendInterval.value   = d.sendIntervalMs       ?? 2000;
    if (inpBuzzer)       inpBuzzer.checked        = d.buzzerEnabled        ?? true;
    if (inpAutoCutoff)   inpAutoCutoff.checked    = d.autoCutoffEnabled    ?? true;
    if (inpArusCal)      inpArusCal.value          = d.arusCalibration     ?? 1.000;
    if (inpTeganganCal)  inpTeganganCal.value      = d.teganganCalibration ?? 1.0;
    if (inpPowerFactor)  inpPowerFactor.value      = d.powerFactorEstimate ?? 0.85;
    if (inpFrequency)    inpFrequency.value        = d.frequencyHz         ?? 50;
    if (inpTelegramNotify) inpTelegramNotify.checked = d.telegramNotifyEnabled !== false;
    if (inpBotToken) {
      inpBotToken.value       = d.telegramBotToken ?? '';
      inpBotToken.placeholder = d.telegramBotToken
        ? '••• (tersimpan)'
        : '1234567890:ABCDEF...';
    }
    telegramRecipients = getTelegramRecipientsFromSettings(d);
    resetChatIdEditor();
    renderTelegramChatIds();
    if (saveStatus) {
      saveStatus.textContent = 'Settings dimuat dari Firebase';
      setTimeout(() => { if (saveStatus) saveStatus.textContent = ''; }, 3000);
    }
  });
}

async function saveSettings() {
  if (!commitChatIdInput()) {
    showToast('Periksa kembali Chat ID Telegram', 'error');
    return;
  }

  if (!validateAll()) {
    showToast('Periksa kembali nilai yang tidak valid', 'error');
    return;
  }
  const payload = {
    thresholdArus:       parseFloat(inpThreshold?.value    || 10),
    warningPercent:      parseFloat(inpWarningPct?.value    || 80),
    sendIntervalMs:      parseInt(inpSendInterval?.value   || 2000),
    buzzerEnabled:       inpBuzzer?.checked      ?? true,
    autoCutoffEnabled:   inpAutoCutoff?.checked  ?? true,
    arusCalibration:     parseFloat(inpArusCal?.value      || 1),
    teganganCalibration: parseFloat(inpTeganganCal?.value  || 1),
    powerFactorEstimate: parseFloat(inpPowerFactor?.value   || 0.85),
    frequencyHz:         parseFloat(inpFrequency?.value     || 50),
    telegramNotifyEnabled: inpTelegramNotify?.checked ?? true,
  };
  const token  = inpBotToken?.value.trim();
  if (token)  payload.telegramBotToken = token;
  const telegramChatIds = telegramRecipients.map((recipient) => recipient.chatId);
  payload.telegramRecipients = telegramRecipients;
  payload.telegramChatIds = telegramChatIds;
  payload.telegramChatId = telegramChatIds.join(',');

  try {
    saveBtn.disabled    = true;
    saveBtn.textContent = 'Menyimpan...';
    // Gunakan update() bukan set() agar /settings/discord subpath TIDAK TERHAPUS
    await update(ref(db, getDbPrefix() + '/settings'), payload);
    showToast('Settings tersimpan — ESP32 sinkron dalam ~10 detik', 'success');
    if (saveStatus) saveStatus.textContent = 'Disimpan ' + new Date().toLocaleTimeString('id-ID');
    // Reload config di sim-notifier agar notifikasi langsung sinkron
    reloadSimNotifierConfig().catch(() => {});
  } catch (err) {
    showToast('Gagal simpan: ' + err.message, 'error');
    if (saveStatus) saveStatus.textContent = 'Gagal';
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = 'Simpan Semua Settings';
  }
}

// ═══════════════════════════════════════════════════════════════
// DISCORD WEBHOOK — LOAD, SAVE & TEST
// ═══════════════════════════════════════════════════════════════

function loadDiscordSettings() {
  onValue(ref(db, getDbPrefix() + '/settings/discord'), (snap) => {
    const d = snap.val() || {};
    if (inpDiscordAlerts)     inpDiscordAlerts.value     = d.webhookAlerts     || '';
    if (inpDiscordRelay)      inpDiscordRelay.value      = d.webhookRelay      || '';
    if (inpDiscordMonitoring) inpDiscordMonitoring.value = d.webhookMonitoring || '';
    if (inpDiscordLogs)       inpDiscordLogs.value       = d.webhookLogs       || '';
    if (inpDiscordEnabled)    inpDiscordEnabled.checked  = d.enabled !== false;
    // Placeholder hint untuk yang sudah tersimpan
    [inpDiscordAlerts, inpDiscordRelay, inpDiscordMonitoring, inpDiscordLogs]
      .forEach(el => { if (el && el.value) el.placeholder = '••• (tersimpan)'; });
  });
}

async function saveDiscordSettings() {
  const hasAlerts     = inpDiscordAlerts?.value.trim().startsWith('https://discord.com/api/webhooks/');
  const hasRelay      = inpDiscordRelay?.value.trim().startsWith('https://discord.com/api/webhooks/');
  const hasMonitoring = inpDiscordMonitoring?.value.trim().startsWith('https://discord.com/api/webhooks/');
  const hasLogs       = inpDiscordLogs?.value.trim().startsWith('https://discord.com/api/webhooks/');
  const hasAnyWebhook = hasAlerts || hasRelay || hasMonitoring || hasLogs;

  // Jika ada webhook valid → otomatis enabled=true (jangan biarkan user lupa toggle)
  const enabledValue = hasAnyWebhook ? true : (inpDiscordEnabled?.checked ?? false);

  const payload = {
    webhookAlerts:     inpDiscordAlerts?.value.trim()     || '',
    webhookRelay:      inpDiscordRelay?.value.trim()      || '',
    webhookMonitoring: inpDiscordMonitoring?.value.trim() || '',
    webhookLogs:       inpDiscordLogs?.value.trim()       || '',
    enabled:           enabledValue,
  };

  // Validasi minimal satu webhook terisi
  if (!hasAnyWebhook && enabledValue) {
    showToast('Masukkan minimal satu Webhook URL Discord yang valid', 'error');
    return;
  }


  if (saveDiscordBtn) { saveDiscordBtn.disabled = true; saveDiscordBtn.textContent = 'Menyimpan...'; }
  try {
    await set(ref(db, getDbPrefix() + '/settings/discord'), payload);
    showToast('Konfigurasi Discord tersimpan ke Firebase RTDB', 'success');
    if (discordSaveStatus) discordSaveStatus.textContent = 'Disimpan ' + new Date().toLocaleTimeString('id-ID');
    // Reload config di sim-notifier agar notifikasi Discord langsung aktif
    reloadSimNotifierConfig().catch(() => {});
  } catch (err) {
    showToast('Gagal simpan Discord: ' + err.message, 'error');
  } finally {
    if (saveDiscordBtn) { saveDiscordBtn.disabled = false; saveDiscordBtn.innerHTML = '<span class="material-symbols-rounded">save</span> Simpan Konfigurasi Discord'; }
  }
}

async function testDiscordWebhook() {
  // Kirim test embed langsung dari browser ke webhook #alerts
  const url = inpDiscordAlerts?.value.trim();
  if (!url || !url.startsWith('https://discord.com/api/webhooks/')) {
    showToast('Isi Webhook #alerts terlebih dahulu untuk test', 'error');
    return;
  }
  if (testDiscordBtn) { testDiscordBtn.disabled = true; testDiscordBtn.textContent = 'Mengirim...'; }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '🔔 Test Notifikasi — IoT Listrik Dashboard',
          description: 'Koneksi Discord Webhook berhasil! Sistem notifikasi real-time siap digunakan.',
          color: 0x5865F2,
          fields: [
            { name: 'Status', value: '✅ Webhook terhubung', inline: true },
            { name: 'Waktu',  value: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }), inline: true },
          ],
          footer: { text: 'IoT Listrik Dashboard — Discord Integration Test' },
        }],
      }),
    });
    if (res.ok || res.status === 204) {
      showToast('✅ Test embed berhasil dikirim ke #alerts!', 'success');
    } else {
      showToast(`Discord menolak: HTTP ${res.status}`, 'error');
    }
  } catch (err) {
    showToast('Gagal kirim test: ' + err.message, 'error');
  } finally {
    if (testDiscordBtn) { testDiscordBtn.disabled = false; testDiscordBtn.innerHTML = '<span class="material-symbols-rounded">send</span> Test Kirim Pesan'; }
  }
}

function loadClientConfigUi() {
  const c = loadClientConfig();
  if (inpPublicApiBase) inpPublicApiBase.value = c.publicApiBase || '';
  if (inpLocalApiBase)  inpLocalApiBase.value  = c.localApiBase || 'http://localhost:3000';
  if (inpDataMode)      inpDataMode.value      = c.mode || 'AUTO';
  if (inpHealthPath)    inpHealthPath.value    = c.healthPath || '/health';
  if (inpAutoFailover)  inpAutoFailover.checked = c.autoFailover !== false;
  if (inpRetryMs)       inpRetryMs.value       = String(c.retryIntervalMs ?? 6000);
  if (inpTimeoutMs)     inpTimeoutMs.value     = String(c.timeoutMs ?? 4000);
}

function saveClientConfigFromForm() {
  saveClientConfig({
    publicApiBase: inpPublicApiBase?.value.trim() || '',
    localApiBase:  inpLocalApiBase?.value.trim()  || 'http://localhost:3000',
    mode:          inpDataMode?.value || 'AUTO',
    healthPath:    inpHealthPath?.value.trim() || '/health',
    autoFailover:  inpAutoFailover?.checked ?? true,
    retryIntervalMs: parseInt(inpRetryMs?.value || '6000', 10),
    timeoutMs:       parseInt(inpTimeoutMs?.value || '4000', 10),
  });
  if (clientSaveStatus) {
    clientSaveStatus.textContent = 'Disimpan ' + new Date().toLocaleTimeString('id-ID');
    setTimeout(() => { if (clientSaveStatus) clientSaveStatus.textContent = ''; }, 4000);
  }
  showToast('Konfigurasi klien disimpan (browser ini)', 'success');
}

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT — Tanpa Firebase Functions
// ═══════════════════════════════════════════════════════════════

/**
 * LIST USERS
 * Baca dari /users di RTDB (hanya user yang pernah login akan tampil).
 * User yang dibuat via "Tambah User" langsung ditulis ke /users juga.
 */
let usersUnsubscribe = null;
let unsubListrik = null;

function startAlarmMonitor() {
  if (unsubListrik) return; // already started
  unsubListrik = onValue(ref(db, getDbPrefix() + '/listrik'), (snap) => {
    const d = snap.val();
    if (!d) return;
    const status = d.status || 'NORMAL';
    const arus = Number(d.arus || 0);
    const tegangan = Number(d.tegangan || 0);
    checkAndNotify(status, arus, tegangan);
    checkAdminResetNotify(d);
  });
}

function loadUsers() {
  if (!usersTbody) return;
  usersTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--text-secondary);">
    <div style="display:flex;align-items:center;justify-content:center;gap:10px;">
      <div class="spinner"></div>Memuat pengguna...
    </div></td></tr>`;

  if (usersUnsubscribe) usersUnsubscribe();

  usersUnsubscribe = onValue(ref(db, '/users'), (snap) => {
    if (!snap.exists()) {
      usersTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--text-secondary);">
        Belum ada pengguna</td></tr>`;
      return;
    }
    const users = [];
    snap.forEach(child => users.push({ uid: child.key, ...child.val() }));
    renderUsers(users);
  }, (err) => {
    showToast('Gagal memuat users: ' + err.message, 'error');
  });
}

function renderUsers(users) {
  const currentUid = auth.currentUser?.uid;
  usersTbody.innerHTML = users.map(u => {
    const isMe  = u.uid === currentUid;
    const badge = u.role === 'admin'
      ? `<span class="role-pill admin">Admin</span>`
      : `<span class="role-pill user">User</span>`;
    return `<tr>
      <td data-label="Pengguna">
        <div style="font-weight:600;">${u.displayName || '—'}${isMe ? ' <span style="font-size:10px;color:var(--primary-light);">(kamu)</span>' : ''}</div>
        <div style="font-size:12px;color:var(--text-secondary);">${u.email}</div>
      </td>
      <td data-label="Role">${badge}</td>
      <td data-label="Dibuat" class="text-sm text-muted">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '—'}</td>
      <td data-label="Ubah Role">
        ${isMe ? '<span class="text-muted text-sm">—</span>' : `
        <select class="form-select" style="width:100px;padding:6px 10px;"
                onchange="changeRole('${u.uid}', this.value)">
          <option value="user"  ${u.role !== 'admin' ? 'selected' : ''}>User</option>
          <option value="admin" ${u.role === 'admin'  ? 'selected' : ''}>Admin</option>
        </select>`}
      </td>
      <td data-label="Aksi">
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm"
                  onclick="sendResetEmail('${u.email}')"><span class='material-symbols-rounded'>mail</span>Reset PW</button>
          ${!isMe ? `<button class="btn btn-danger btn-sm"
                  onclick="deleteUser('${u.uid}','${u.email}')"><span class='material-symbols-rounded'>delete</span>Hapus</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ─── CHANGE ROLE ─────────────────────────────────────────────
window.changeRole = async (uid, role) => {
  try {
    await set(ref(db, `/users/${uid}/role`), role);
    showToast(`Role diubah ke "${role}"`, 'success');
  } catch (err) {
    showToast('Gagal ubah role: ' + err.message, 'error');
  }
};

// ─── DELETE USER (hapus RTDB profile saja) ───────────────────
window.deleteUser = async (uid, email) => {
  if (!confirm(
    `Hapus profile "${email}" dari sistem?\n\n` +
    `Akun Firebase Auth-nya tetap ada (bisa login ulang).\n` +
    `Untuk hapus permanen, gunakan Firebase Console → Authentication.`
  )) return;
  try {
    await remove(ref(db, `/users/${uid}`));
    showToast(`Profile "${email}" dihapus dari RTDB`, 'success');
    // Note: loadUsers listener akan otomatis update karena onValue
  } catch (err) {
    showToast('Gagal hapus: ' + err.message, 'error');
  }
};

// ─── SEND PASSWORD RESET EMAIL ────────────────────────────────
window.sendResetEmail = async (email) => {
  if (!confirm(`Kirim email reset password ke "${email}"?`)) return;
  try {
    await sendPasswordResetEmail(auth, email);
    showToast(`Email reset password terkirim ke "${email}"`, 'success');
  } catch (err) {
    const msgs = {
      'auth/user-not-found': 'Email tidak terdaftar di Firebase Auth',
      'auth/too-many-requests': 'Terlalu banyak percobaan, coba lagi nanti',
    };
    showToast(msgs[err.code] || err.message, 'error');
  }
};

// ─── CREATE USER (secondary Firebase app — admin tidak ter-logout) ──
function openAddModal()  { modalOverlay?.classList.add('open');    formEmail?.focus(); }
function closeAddModal() { modalOverlay?.classList.remove('open'); }

addUserBtn?.addEventListener('click',   openAddModal);
modalCancel?.addEventListener('click',  closeAddModal);
modalClose?.addEventListener('click',   closeAddModal);
modalOverlay?.addEventListener('click', e => { if (e.target === modalOverlay) closeAddModal(); });

modalSubmit?.addEventListener('click', async () => {
  const email       = formEmail?.value.trim();
  const password    = formPassword?.value;
  const displayName = formDisplayName?.value.trim();
  const role        = formRole?.value || 'user';

  if (!email || !password) { showToast('Email dan password wajib diisi', 'error'); return; }
  if (password.length < 8) { showToast('Password minimal 8 karakter', 'error'); return; }

  modalSubmit.disabled    = true;
  modalSubmit.textContent = 'Membuat akun...';

  // Pakai secondary app agar admin tidak ter-logout dari sesi utama
  let secondaryApp = null;
  try {
    secondaryApp = initializeApp(firebaseConfig, 'secondary-' + Date.now());
    const secondaryAuth = getAuth(secondaryApp);

    // Buat akun di Firebase Auth
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const newUid = cred.user.uid;

    // Atur display name
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }

    // Logout dari secondary app sebelum dihapus
    await signOut(secondaryAuth);

    // Tulis profile ke RTDB (menggunakan admin session utama)
    await set(ref(db, `/users/${newUid}`), {
      email,
      displayName: displayName || '',
      role,
      createdAt: new Date().toISOString(),
    });

    showToast(`Akun "${email}" berhasil dibuat`, 'success');
    closeAddModal();
    [formEmail, formPassword, formDisplayName].forEach(el => { if (el) el.value = ''; });
    if (formRole) formRole.value = 'user';
    // loadUsers() tidak perlu dipanggil manual — onValue listener auto-update

  } catch (err) {
    const msgs = {
      'auth/email-already-in-use': 'Email sudah terdaftar.',
      'auth/weak-password':        'Password terlalu lemah.',
      'auth/invalid-email':        'Format email tidak valid.',
    };
    showToast('Gagal: ' + (msgs[err.code] || err.message), 'error');
  } finally {
    if (secondaryApp) {
      try { await deleteApp(secondaryApp); } catch (_) {}
    }
    modalSubmit.disabled    = false;
    modalSubmit.textContent = 'Buat Akun';
  }
});

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
initPage({
  requireAdmin: true,
  onAuthed: (user, role) => {
    populateSidebar(user, role);
    initSidebarToggle();
    setDeviceBootstrapVisibility();
    setLiveDataResetVisibility();
    renderLiveDataResetState();
    initTelegramChatManager();
    loadSettings();
    loadClientConfigUi();
    loadDiscordSettings();
    loadDeviceBootstrapSettings();
    loadUsers();
    saveBtn?.addEventListener('click', saveSettings);
    saveDiscordBtn?.addEventListener('click', saveDiscordSettings);
    saveDeviceBootstrapBtn?.addEventListener('click', saveDeviceBootstrapSettings);
    clearDeviceBootstrapBtn?.addEventListener('click', clearDeviceBootstrapSettings);
    sendLiveResetOtpBtn?.addEventListener('click', requestLiveDataResetOtp);
    confirmLiveResetBtn?.addEventListener('click', confirmLiveDataReset);
    testDiscordBtn?.addEventListener('click', testDiscordWebhook);
    saveClientBtn?.addEventListener('click', saveClientConfigFromForm);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('refreshUsersBtn')?.addEventListener('click', loadUsers);
    [inpThreshold, inpWarningPct, inpSendInterval, inpArusCal, inpTeganganCal,
     inpPowerFactor, inpFrequency, inpBotToken, inpChatId]
      .forEach(el => el?.addEventListener('input', validateAll));

    // Alarm: tetap bunyi walau pindah menu (settings) dengan memonitor status /listrik
    requestNotificationPermission();
    // Coba unlock lebih awal (kalau browser sudah pernah di-gesture di halaman sebelumnya).
    try { initAudio(); } catch (_) {}
    window.addEventListener('click', () => initAudio(), { once: true });
    startAlarmMonitor();
    window.addEventListener('beforeunload', () => {
      try { stopWebSiren(); } catch (_) {}
    });
  },
});

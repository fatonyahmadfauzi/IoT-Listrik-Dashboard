import { db, firebaseConfig } from '/firebase-config.js';
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  createUserWithEmailAndPassword,
  signOut,
  getAuth as getFirebaseAuth,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { ref, set, remove } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const installBtn = document.getElementById('installBtn');
const installHint = document.getElementById('installHint');
const demoEmailInput = document.getElementById('demoEmailInput');
const demoPasswordEl = document.getElementById('demoPassword');
const demoStatusEl = document.getElementById('demoStatus');
const demoTimerEl = document.getElementById('demoTimer');
const demoCreateBtn = document.getElementById('demoCreateBtn');
const demoResetBtn = document.getElementById('demoResetBtn');
const demoGenerateDataBtn = document.getElementById('demoGenerateDataBtn');
const demoNotifyBtn = document.getElementById('demoNotifyBtn');
const demoDataOutput = document.getElementById('demoDataOutput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingsStatus = document.getElementById('settingsStatus');

const inpThreshold = document.getElementById('inpThreshold');
const inpWarningPercent = document.getElementById('inpWarningPercent');
const inpSendInterval = document.getElementById('inpSendInterval');
const inpBuzzer = document.getElementById('inpBuzzer');
const inpAutoCutoff = document.getElementById('inpAutoCutoff');
const inpArusCal = document.getElementById('inpArusCal');
const inpTeganganCal = document.getElementById('inpTeganganCal');
const inpPowerFactor = document.getElementById('inpPowerFactor');
const inpFrequency = document.getElementById('inpFrequency');
const inpBotToken = document.getElementById('inpBotToken');
const inpRecipientName = document.getElementById('inpTelegramRecipientName');
const inpChatId = document.getElementById('inpChatId');
const inpTelegramNotify = document.getElementById('inpTelegramNotify');
const inpPublicApiBase = document.getElementById('inpPublicApiBase');
const inpLocalApiBase = document.getElementById('inpLocalApiBase');
const inpDataMode = document.getElementById('inpDataMode');
const inpAutoFailover = document.getElementById('inpAutoFailover');
const inpHealthPath = document.getElementById('inpHealthPath');
const inpRetryMs = document.getElementById('inpRetryMs');
const inpTimeoutMs = document.getElementById('inpTimeoutMs');

const SESSION_KEY = 'pwa_demo_session';
const SETTINGS_KEY = 'pwa_demo_settings';
let telegramRecipients = [];
let editingChatIdIndex = -1;
let chatIdListEl = null;
let addChatIdBtn = null;
let cancelChatIdEditBtn = null;

const DEFAULT_SETTINGS = {
  threshold: 10,
  warningPercent: 80,
  sendInterval: 2000,
  buzzer: true,
  autoCutoff: true,
  arusCal: 1.0,
  teganganCal: 1.0,
  powerFactor: 0.85,
  frequency: 50,
  botToken: '',
  chatId: '',
  chatIds: [],
  recipients: [],
  telegramNotify: true,
  publicApiBase: '',
  localApiBase: 'http://localhost:3000',
  dataMode: 'AUTO',
  healthPath: '/health',
  autoFailover: true,
  retryMs: 6000,
  timeoutMs: 4000,
};

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) {
    installBtn.classList.remove('hidden');
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice && choice.outcome === 'accepted') {
      showStatus('Install app berhasil.', 'success');
    }
    deferredPrompt = null;
    installBtn.classList.add('hidden');
  });
}

function showStatus(message, type = 'info') {
  if (!settingsStatus) return;
  settingsStatus.textContent = message;
  settingsStatus.style.color = type === 'error' ? '#f87171' : type === 'success' ? '#34d399' : '#94a3b8';
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getEmailKey(email) {
  return email.toLowerCase().replace(/[.#$\[\]]/g, '_');
}

function loadSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function removeSession() {
  localStorage.removeItem(SESSION_KEY);
}

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
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
    String(source).split(/[\s,;]+/).forEach(add);
  };

  sources.forEach(visit);
  return recipients;
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
}

function commitChatIdInput() {
  const name = inpRecipientName?.value.trim() || '';
  const raw = inpChatId?.value.trim() || '';
  if (!raw && !name) return true;
  if (!raw && name) {
    showStatus('Chat ID wajib diisi.', 'error');
    return false;
  }

  const chatId = normalizeTelegramChatId(raw);
  if (!chatId) {
    showStatus('Chat ID harus angka.', 'error');
    return false;
  }

  const duplicateIndex = telegramRecipients.findIndex((item) => item.chatId === chatId);
  if (duplicateIndex !== -1 && duplicateIndex !== editingChatIdIndex) {
    showStatus('Chat ID sudah ada di daftar.', 'error');
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
  showStatus('Penerima siap disimpan.', 'success');
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
  addChatIdBtn.addEventListener('click', commitChatIdInput);

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
      return;
    }

    if (button.dataset.chatAction === 'delete') {
      telegramRecipients.splice(index, 1);
      resetChatIdEditor();
      renderTelegramChatIds();
      showStatus('Penerima dihapus dari daftar.', 'success');
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

function saveSettings() {
  if (!commitChatIdInput()) return;

  const chatIds = telegramRecipients.map((recipient) => recipient.chatId);
  const payload = {
    threshold: parseFloat(inpThreshold.value) || 10,
    warningPercent: parseFloat(inpWarningPercent.value) || 80,
    sendInterval: parseInt(inpSendInterval.value, 10) || 2000,
    buzzer: inpBuzzer.checked,
    autoCutoff: inpAutoCutoff.checked,
    arusCal: parseFloat(inpArusCal.value) || 1.0,
    teganganCal: parseFloat(inpTeganganCal.value) || 1.0,
    powerFactor: parseFloat(inpPowerFactor.value) || 0.85,
    frequency: parseFloat(inpFrequency.value) || 50,
    botToken: inpBotToken.value.trim(),
    chatId: chatIds.join(','),
    chatIds,
    recipients: telegramRecipients,
    telegramNotify: inpTelegramNotify.checked,
    publicApiBase: inpPublicApiBase.value.trim(),
    localApiBase: inpLocalApiBase.value.trim() || 'http://localhost:3000',
    dataMode: inpDataMode.value,
    autoFailover: inpAutoFailover.checked,
    healthPath: inpHealthPath.value.trim() || '/health',
    retryMs: parseInt(inpRetryMs.value, 10) || 6000,
    timeoutMs: parseInt(inpTimeoutMs.value, 10) || 4000,
  };

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
  showStatus('Pengaturan demo tersimpan lokal.', 'success');
  setTimeout(() => showStatus('', 'info'), 4000);
}

function applySettings() {
  const config = loadSettings();
  inpThreshold.value = config.threshold;
  inpWarningPercent.value = config.warningPercent;
  inpSendInterval.value = config.sendInterval;
  inpBuzzer.checked = config.buzzer;
  inpAutoCutoff.checked = config.autoCutoff;
  inpArusCal.value = config.arusCal;
  inpTeganganCal.value = config.teganganCal;
  inpPowerFactor.value = config.powerFactor;
  inpFrequency.value = config.frequency;
  inpBotToken.value = config.botToken;
  telegramRecipients = parseTelegramRecipients(config.recipients, config.chatIds, config.chatId);
  resetChatIdEditor();
  renderTelegramChatIds();
  inpTelegramNotify.checked = config.telegramNotify;
  inpPublicApiBase.value = config.publicApiBase;
  inpLocalApiBase.value = config.localApiBase;
  inpDataMode.value = config.dataMode;
  inpHealthPath.value = config.healthPath;
  inpRetryMs.value = config.retryMs;
  inpTimeoutMs.value = config.timeoutMs;
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function sessionExpired(session) {
  return !session || !session.expiresAt || Date.now() > session.expiresAt;
}

async function writeDemoProfile(session, data = null) {
  if (!session || !session.key) return;
  const demoRef = ref(db, `demo_users/${session.key}`);
  const payload = {
    email: session.email,
    password: session.password,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    active: session.active,
    lastData: data,
  };
  await set(demoRef, payload);
}

async function removeDemoProfileData(session) {
  if (!session || !session.key) return;
  const demoRef = ref(db, `demo_users/${session.key}`);
  await remove(demoRef);
}

async function createAuthDemoUser(email, password) {
  let secondaryApp = null;
  try {
    secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
    const secondaryAuth = getFirebaseAuth(secondaryApp);
    await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await signOut(secondaryAuth);
  } finally {
    if (secondaryApp) {
      await deleteApp(secondaryApp).catch(() => {});
    }
  }
}

async function createDemoSession(email) {
  if (!validEmail(email)) {
    throw new Error('Masukkan email demo yang valid terlebih dahulu.');
  }

  const password = `Demo@${Math.floor(Math.random() * 900000 + 100000)}`;
  const session = {
    email,
    password,
    createdAt: Date.now(),
    expiresAt: Date.now() + 15 * 60 * 1000,
    active: true,
    key: getEmailKey(email),
  };

  await createAuthDemoUser(email, password);
  await writeDemoProfile(session, null);
  saveSession(session);
  return session;
}

async function updateSessionUI(session) {
  const active = session && !sessionExpired(session) && session.active;
  if (!session) {
    demoPasswordEl.textContent = '-';
    demoStatusEl.textContent = 'Belum aktif';
    demoTimerEl.textContent = '00:00';
    return;
  }

  demoEmailInput.value = session.email || '';
  demoPasswordEl.textContent = session.password || '-';
  demoStatusEl.textContent = active ? 'Aktif' : 'Berakhir';
  demoTimerEl.textContent = formatTime(Math.max(0, Math.round((session.expiresAt - Date.now()) / 1000)));

  if (!active && session.active) {
    session.active = false;
    saveSession(session);
    await removeDemoProfileData(session).catch(() => {});
  }
}

function getSimulatorData(session) {
  const settings = loadSettings();
  const rawArus = parseFloat((Math.random() * 15 + 1).toFixed(2));
  const arus = parseFloat((rawArus * settings.arusCal).toFixed(2));
  const tegangan = parseFloat((Math.random() * 30 + 210).toFixed(1)) * settings.teganganCal;
  const power = parseFloat((arus * tegangan * settings.powerFactor).toFixed(0));
  const threshold = settings.threshold;
  const percent = threshold > 0 ? Math.round((arus / threshold) * 100) : 0;
  let status = 'NORMAL';

  if (arus >= threshold) {
    status = 'DANGER';
  } else if (percent >= settings.warningPercent) {
    status = 'WARNING';
  }

  return {
    timestamp: new Date().toLocaleTimeString(),
    arus: `${arus.toFixed(2)} A`,
    tegangan: `${tegangan.toFixed(1)} V`,
    daya: `${power} W`,
    status,
    telegram: settings.telegramNotify ? 'Terkirim' : 'Simulasi',
    threshold,
    warningPercent: settings.warningPercent,
    percentThreshold: `${percent}%`,
    buzzer: settings.buzzer ? 'ON' : 'OFF',
    autoCutoff: settings.autoCutoff ? 'ON' : 'OFF',
  };
}

async function generateDemoData() {
  const session = loadSession();
  if (!session || sessionExpired(session) || !session.active) {
    alert('Sesi demo belum aktif atau sudah habis. Buat akun demo terlebih dahulu.');
    return;
  }
  const data = getSimulatorData(session);
  demoDataOutput.textContent = JSON.stringify(data, null, 2);
  await writeDemoProfile(session, data).catch(() => {});
  if (loadSettings().buzzer && ['WARNING', 'DANGER'].includes(data.status)) {
    window.navigator.vibrate?.([100, 50, 100]);
  }
}

async function triggerDemoNotification() {
  if (!('Notification' in window)) {
    alert('Browser Anda tidak mendukung notifikasi.');
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification('Demo Notifikasi IoT Listrik', {
      body: 'Simulasi alert demo berhasil dikirim.',
    });
    return;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification('Demo Notifikasi IoT Listrik', {
        body: 'Simulasi alert demo berhasil dikirim.',
      });
    } else {
      alert('Notifikasi tidak diizinkan.');
    }
  } else {
    alert('Notifikasi diblokir. Buka pengaturan browser untuk mengizinkan.');
  }
}

async function deleteDemoData() {
  const session = loadSession();
  if (!session || !session.key) {
    alert('Tidak ada sesi demo yang aktif.');
    return;
  }
  await removeDemoProfileData(session).catch(() => {});
  demoDataOutput.textContent = 'Data demo dihapus.';
}

createBtn?.addEventListener('click', async () => {
  const email = demoEmailInput.value.trim();
  if (!email) {
    alert('Isi email demo terlebih dahulu.');
    return;
  }
  try {
    const session = await createDemoSession(email);
    updateSessionUI(session);
    showStatus('Akun demo berhasil dibuat. Password tersimpan di sini.', 'success');
  } catch (err) {
    showStatus(err.message || 'Gagal membuat akun demo.', 'error');
  }
});

demoResetBtn?.addEventListener('click', async () => {
  const session = loadSession();
  if (session) {
    await removeDemoProfileData(session).catch(() => {});
  }
  removeSession();
  demoPasswordEl.textContent = '-';
  demoStatusEl.textContent = 'Belum aktif';
  demoTimerEl.textContent = '00:00';
  demoDataOutput.textContent = 'Tidak ada data.';
  showStatus('Sesi demo di-reset. Akun tetap ada jika sudah dibuat.', 'info');
});

demoGenerateDataBtn?.addEventListener('click', generateDemoData);

demoNotifyBtn?.addEventListener('click', triggerDemoNotification);
saveSettingsBtn?.addEventListener('click', saveSettings);

window.addEventListener('load', () => {
  initTelegramChatManager();
  applySettings();
  const session = loadSession();
  if (session) {
    updateSessionUI(session);
  }
  setInterval(() => {
    const session = loadSession();
    if (session) {
      if (sessionExpired(session) && session.active) {
        session.active = false;
        saveSession(session);
        removeDemoProfileData(session).catch(() => {});
        updateSessionUI(session);
      } else {
        updateSessionUI(session);
      }
    }
  }, 1000);
});

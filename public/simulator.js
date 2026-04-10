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

function saveSettings() {
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
    chatId: inpChatId.value.trim(),
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
  inpChatId.value = config.chatId;
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
    expiresAt: Date.now() + 5 * 60 * 1000,
    active: true,
    key: getEmailKey(email),
  };

  await createAuthDemoUser(email, password);
  await writeDemoProfile(session, null);
  saveSession(session);
  return session;
}

function updateSessionUI(session) {
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

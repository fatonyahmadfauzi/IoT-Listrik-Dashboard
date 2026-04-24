/**
 * notifications.js
 * ─────────────────────────────────────────────────────────────
 * Browser notification helpers.
 * Uses the Web Notifications API (no server needed).
 * Triggered locally when RTDB status changes to LEAKAGE/DANGER.
 * ─────────────────────────────────────────────────────────────
 */

let lastNotifiedStatus = null;
try {
  // Simpan status terakhir agar pindah halaman (dashboard/history/settings) tidak memicu notifikasi ulang.
  const saved = localStorage.getItem('iot_last_notified_status');
  if (saved) lastNotifiedStatus = saved;
} catch (_) {}

// Ulangi notifikasi OS beberapa detik sekali saat kondisi bahaya,
// agar bunyi tetap terdengar walau halaman di-reload saat pindah menu.
const REPEAT_INTERVAL_MS = 3000;
let lastRepeatAt = 0;
let lastRepeatStatus = null;
let lastResetNotifiedAt = 0;
let lastSystemEventId = '';
let stopSystemNotificationFeed = null;

try {
  const at = localStorage.getItem('iot_last_alarm_repeat_at');
  const st = localStorage.getItem('iot_last_alarm_repeat_status');
  const resetAt = localStorage.getItem('iot_last_reset_notified_at');
  const systemEventId = localStorage.getItem('iot_last_system_event_id');
  if (at) lastRepeatAt = Number(at) || 0;
  if (st) lastRepeatStatus = st;
  if (resetAt) lastResetNotifiedAt = Number(resetAt) || 0;
  if (systemEventId) lastSystemEventId = systemEventId;
} catch (_) {}

function isAlarmDisabled() {
  try {
    return localStorage.getItem('iot_alarm_disable') === '1';
  } catch (_) {
    return false;
  }
}

import { messaging, getToken, db, auth } from "./firebase-config.js";
import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/**
 * Request notification permission on first user interaction.
 * Call this once at page load.
 */
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') {
    registerFCMToken();
    return true;
  }
  if (Notification.permission === 'denied') return false;

  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    registerFCMToken();
  }
  return perm === 'granted';
}

async function registerFCMToken() {
  if (!messaging) return;
  try {
    const token = await getToken(messaging, { 
      vapidKey: "g9Cx-PNOUASH7e5oCunyYgut0I6sUIobkq-QoffeCEw" 
    });
    if (token) {
      console.log("[FCM] Got token, submitting to local RTDB for CLI Backend...");
      // Simpan langsung ke RTDB agar Node CLI bisa membacanya dan bertindak sebagai Server.
      const uid = auth.currentUser ? auth.currentUser.uid : "anon_" + Date.now();
      await set(ref(db, `fcm_tokens/web/${uid}`), token);
      console.log("[FCM] Registration token saved to RTDB successfully.");
    } else {
      console.warn("[FCM] No registration token available.");
    }
  } catch (err) {
    console.error("[FCM] Error obtaining token", err);
  }
}

/**
 * Send a browser notification.
 * @param {string} title
 * @param {string} body
 * @param {string} icon - path to icon image
 * @param {string} tag  - unique tag to prevent notification spam
 */
function sendNotification(title, body, icon = '/assets/icons/icon-192.png', tag = 'iot-alert') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const n = new Notification(title, {
    body,
    icon,
    tag,           // same tag replaces previous notification instead of stacking
    renotify: true, // bila browser mendukung: tetap bunyikan walau ditimpa tag
    badge: '/assets/icons/icon-96.png',
    vibrate: [200, 100, 200],
    requireInteraction: false,
  });

  // Auto-close singkat supaya tidak numpuk
  setTimeout(() => n.close(), 2500);

  n.addEventListener('click', () => {
    window.focus();
    n.close();
  });
}

// ── Web Audio API Siren Logic ─────────────────────────────────
let audioCtx = null;
let sirenInterval = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playWebSiren() {
  if (sirenInterval) return; // Sudah bunyi
  initAudio();
  
  // Buat suara sirine berulang tiap 600ms
  sirenInterval = setInterval(() => {
    if (!audioCtx || audioCtx.state === 'suspended') return; // Lewati jika diblokir browser
    
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'square';
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      // Efek sirine "ngiung" (frekuensi turun)
      osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.5);
      
      // Kontrol volume 
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Web audio error:", e);
    }
  }, 600);
}

function stopWebSiren() {
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }
}

function parseResetTimestamp(value) {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const direct = Number(value);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function checkAdminResetNotify(payload) {
  const resetByAdmin = !!payload?.reset_by_admin;
  const resetAt = parseResetTimestamp(payload?.reset_at);
  if (!resetByAdmin || !resetAt) return false;
  if (resetAt <= lastResetNotifiedAt) return false;

  const message =
    payload?.reset_note ||
    'Admin mengosongkan data realtime sensor perangkat IoT pada /listrik.';

  sendNotification(
    'Data realtime sensor dikosongkan',
    message,
    '/assets/icons/icon-192.png',
    'admin-live-reset'
  );
  showToast(message, 'info', 5000);

  lastResetNotifiedAt = resetAt;
  try {
    localStorage.setItem('iot_last_reset_notified_at', String(resetAt));
  } catch (_) {}
  return true;
}

function getToastTypeForSeverity(severity) {
  switch (String(severity || '').toLowerCase()) {
    case 'danger':
    case 'error':
      return 'error';
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    default:
      return 'info';
  }
}

function checkSystemEventNotify(payload, options = {}) {
  const { initialFreshWindowMs = 15000 } = options;
  const id = String(payload?.id || '').trim();
  if (!id) return false;
  if (payload?.target && payload.target !== 'physical') return false;
  if (payload?.scope && payload.scope !== 'physical') return false;

  const createdAt = parseResetTimestamp(payload?.created_at ?? payload?.created_at_iso);
  if (id === lastSystemEventId) return false;

  if (!lastSystemEventId && createdAt) {
    const ageMs = Math.max(0, Date.now() - createdAt);
    if (ageMs > initialFreshWindowMs) {
      lastSystemEventId = id;
      try {
        localStorage.setItem('iot_last_system_event_id', id);
      } catch (_) {}
      return false;
    }
  }

  const title = String(payload?.title || 'Pembaruan Sistem').trim();
  const message = String(payload?.message || '').trim();
  if (!message) return false;

  sendNotification(title, message, '/assets/icons/icon-192.png', `system-${payload?.event || id}`);
  showToast(`${title} — ${message}`, getToastTypeForSeverity(payload?.severity), 5500);

  lastSystemEventId = id;
  try {
    localStorage.setItem('iot_last_system_event_id', id);
  } catch (_) {}
  return true;
}

function startSystemNotificationFeed(options = {}) {
  const { enabled = true } = options;
  if (stopSystemNotificationFeed) {
    stopSystemNotificationFeed();
    stopSystemNotificationFeed = null;
  }
  if (!enabled) return () => {};

  stopSystemNotificationFeed = onValue(ref(db, '/notifications/system/latest'), (snap) => {
    const payload = snap.val();
    if (!payload) return;
    checkSystemEventNotify(payload);
  });

  return () => {
    if (stopSystemNotificationFeed) {
      stopSystemNotificationFeed();
      stopSystemNotificationFeed = null;
    }
  };
}

/**
 * Check status and send notification if status is critical.
 * Prevents duplicate notifications for the same status.
 * @param {string} status - 'NORMAL' | 'WARNING' | 'LEAKAGE' | 'DANGER'
 * @param {number} arus   - current in Amperes
 * @param {number} tegangan - voltage in Volts
 */
function checkAndNotify(status, arus, tegangan) {
  if (isAlarmDisabled()) {
    stopWebSiren();
    return;
  }

  // Normalize
  status = status || 'NORMAL';

  // Always evaluate siren state based on current status
  if (status === 'WARNING' || status === 'LEAKAGE' || status === 'DANGER') {
    // Requires page interaction first! (browser policy)
    playWebSiren();
  } else {
    stopWebSiren();
  }

  const isDanger = status === 'WARNING' || status === 'LEAKAGE' || status === 'DANGER';
  if (!isDanger) {
    // Recovery handling + stop repeats
    if (status === 'NORMAL' && lastNotifiedStatus && lastNotifiedStatus !== 'NORMAL') {
      // Notify recovery
      sendNotification(
        '<iconify-icon icon="lucide:shield-check"></iconify-icon> Sistem Kembali Normal',
        `Arus: ${arus.toFixed(2)} A | Tegangan: ${tegangan.toFixed(1)} V`,
        '/assets/icons/icon-192.png',
        'normal-recovery'
      );
      lastNotifiedStatus = status;
      try { localStorage.setItem('iot_last_notified_status', status); } catch (_) {}
    }
    // reset repeat timer
    lastRepeatAt = 0;
    lastRepeatStatus = null;
    try { localStorage.removeItem('iot_last_alarm_repeat_at'); } catch (_) {}
    try { localStorage.removeItem('iot_last_alarm_repeat_status'); } catch (_) {}
    return;
  }

  const now = Date.now();
  const shouldNotify =
    status !== lastNotifiedStatus ||
    (lastRepeatStatus === status && now - lastRepeatAt >= REPEAT_INTERVAL_MS);

  if (!shouldNotify) return;

  if (status === 'LEAKAGE') {
    sendNotification(
      '<iconify-icon icon="lucide:triangle-alert"></iconify-icon> Kebocoran Arus Terdeteksi!',
      `Arus: ${arus.toFixed(2)} A | Tegangan: ${tegangan.toFixed(1)} V\nSistem mendeteksi kebocoran arus listrik.`,
      '/icons/icon-192.png',
      'leakage-alert'
    );
  } else if (status === 'DANGER') {
    sendNotification(
      '<iconify-icon icon="lucide:triangle-alert"></iconify-icon> BAHAYA! Kondisi Listrik Kritis!',
      `Arus: ${arus.toFixed(2)} A | Tegangan: ${tegangan.toFixed(1)} V\nRelay akan dimatikan otomatis!`,
      '/icons/icon-192.png',
      'danger-alert'
    );
  } else if (status === 'WARNING') {
    sendNotification(
      '<iconify-icon icon="lucide:bell"></iconify-icon> Peringatan Arus Tinggi',
      `Arus: ${arus.toFixed(2)} A | Tegangan: ${tegangan.toFixed(1)} V\nArus mendekati batas threshold.`,
      '/icons/icon-192.png',
      'warning-alert'
    );
  }

  lastNotifiedStatus = status;
  lastRepeatAt = now;
  lastRepeatStatus = status;
  try { localStorage.setItem('iot_last_notified_status', status); } catch (_) {}
  try { localStorage.setItem('iot_last_alarm_repeat_at', String(lastRepeatAt)); } catch (_) {}
  try { localStorage.setItem('iot_last_alarm_repeat_status', String(lastRepeatStatus)); } catch (_) {}
}

/**
 * In-app toast notification system.
 * Creates toast container if not present.
 */
function showToast(message, type = 'success', duration = 4000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '<span class="material-symbols-rounded">check_circle</span>', error: '<span class="material-symbols-rounded">error</span>', warning: '<span class="material-symbols-rounded">warning</span>', info: '<span class="material-symbols-rounded">info</span>' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] ?? '<span class="material-symbols-rounded">info</span>'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

export {
  requestNotificationPermission,
  sendNotification,
  checkAndNotify,
  checkAdminResetNotify,
  checkSystemEventNotify,
  startSystemNotificationFeed,
  showToast,
  initAudio,
  stopWebSiren,
};

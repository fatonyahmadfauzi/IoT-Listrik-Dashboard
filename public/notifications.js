/**
 * notifications.js
 * ─────────────────────────────────────────────────────────────
 * Browser notification helpers.
 * Uses the Web Notifications API (no server needed).
 * Triggered locally when RTDB status changes to LEAKAGE/DANGER.
 * ─────────────────────────────────────────────────────────────
 */

let lastNotifiedStatus = null;

/**
 * Request notification permission on first user interaction.
 * Call this once at page load.
 */
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied')  return false;

  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

/**
 * Send a browser notification.
 * @param {string} title
 * @param {string} body
 * @param {string} icon - path to icon image
 * @param {string} tag  - unique tag to prevent notification spam
 */
function sendNotification(title, body, icon = '/icons/icon-192.png', tag = 'iot-alert') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const n = new Notification(title, {
    body,
    icon,
    tag,           // same tag replaces previous notification instead of stacking
    badge: '/icons/icon-96.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,  // stays until user dismisses
  });

  // Auto-close after 10 seconds
  setTimeout(() => n.close(), 10000);

  n.addEventListener('click', () => {
    window.focus();
    n.close();
  });
}

// ── Web Audio API Siren Logic ─────────────────────────────────
let audioCtx = null;
let oscillator = null;
let gainNode = null;
let sirenInterval = null;
let isSirenPlaying = false;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playWebSiren() {
  if (isSirenPlaying) return;
  initAudio();
  isSirenPlaying = true;
  
  oscillator = audioCtx.createOscillator();
  gainNode = audioCtx.createGain();
  
  oscillator.type = 'square';
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  // Set volume (0.0 to 1.0)
  gainNode.gain.value = 0.5;
  oscillator.start();
  
  // Create a two-tone European style siren (High/Low frequency)
  let isHigh = false;
  sirenInterval = setInterval(() => {
    oscillator.frequency.setValueAtTime(isHigh ? 800 : 600, audioCtx.currentTime);
    isHigh = !isHigh;
  }, 500);
}

function stopWebSiren() {
  if (!isSirenPlaying) return;
  isSirenPlaying = false;
  clearInterval(sirenInterval);
  if (oscillator) {
    oscillator.stop();
    oscillator.disconnect();
    oscillator = null;
  }
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
}

/**
 * Check status and send notification if status is critical.
 * Prevents duplicate notifications for the same status.
 * @param {string} status - 'NORMAL' | 'WARNING' | 'LEAKAGE' | 'DANGER'
 * @param {number} arus   - current in Amperes
 * @param {number} tegangan - voltage in Volts
 */
function checkAndNotify(status, arus, tegangan) {
  // Always evaluate siren state based on current status
  if (status === 'LEAKAGE' || status === 'DANGER') {
    // Requires page interaction first! (browser policy)
    playWebSiren();
  } else {
    stopWebSiren();
  }

  if (status === lastNotifiedStatus) return;  // avoid spam

  if (status === 'LEAKAGE') {
    sendNotification(
      '⚠️ Kebocoran Arus Terdeteksi!',
      `Arus: ${arus.toFixed(2)} A | Tegangan: ${tegangan.toFixed(1)} V\nSistem mendeteksi kebocoran arus listrik.`,
      '/icons/icon-192.png',
      'leakage-alert'
    );
    lastNotifiedStatus = status;
  } else if (status === 'DANGER') {
    sendNotification(
      '🚨 BAHAYA! Kondisi Listrik Kritis!',
      `Arus: ${arus.toFixed(2)} A | Tegangan: ${tegangan.toFixed(1)} V\nRelay akan dimatikan otomatis!`,
      '/icons/icon-192.png',
      'danger-alert'
    );
    lastNotifiedStatus = status;
  } else if (status === 'WARNING') {
    sendNotification(
      '🔔 Peringatan Arus Tinggi',
      `Arus: ${arus.toFixed(2)} A | Tegangan: ${tegangan.toFixed(1)} V\nArus mendekati batas threshold.`,
      '/icons/icon-192.png',
      'warning-alert'
    );
    lastNotifiedStatus = status;
  } else if (status === 'NORMAL' && lastNotifiedStatus && lastNotifiedStatus !== 'NORMAL') {
    // Notify recovery
    sendNotification(
      '✅ Sistem Kembali Normal',
      `Arus: ${arus.toFixed(2)} A | Tegangan: ${tegangan.toFixed(1)} V`,
      '/icons/icon-192.png',
      'normal-recovery'
    );
    lastNotifiedStatus = status;
  }
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

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] ?? 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

export { requestNotificationPermission, sendNotification, checkAndNotify, showToast };

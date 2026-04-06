/**
 * app.js
 * ─────────────────────────────────────────────────────────────
 * Dashboard page logic:
 *   - Realtime RTDB listener for /listrik
 *   - Relay control (admin only)
 *   - Chart updates
 *   - Browser notifications
 * ─────────────────────────────────────────────────────────────
 */

import { db }           from './firebase-config.js';
import { initPage, populateSidebar, initSidebarToggle, logout } from './auth.js';
import { createRealtimeChart, pushRealtimeData, resetChartZoom } from './charts.js';
import { requestNotificationPermission, checkAndNotify, showToast } from './notifications.js';
import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ─── DOM refs ────────────────────────────────────────────────
const elArus        = document.getElementById('valArus');
const elTegangan    = document.getElementById('valTegangan');
const elDaya        = document.getElementById('valDaya');
const elRelay       = document.getElementById('valRelay');
const elRelayDot    = document.getElementById('relayDot');
const elStatus      = document.getElementById('statusBadge');
const elUpdated     = document.getElementById('lastUpdated');
const elRelayOn     = document.getElementById('relayOnBtn');
const elRelayOff    = document.getElementById('relayOffBtn');
const elResetZoom   = document.getElementById('resetZoomBtn');
const elRelaySection= document.getElementById('relaySection');
const canvas        = document.getElementById('monitorChart');

let chart        = null;
let currentRole  = null;
let lastRelayVal = -1;  // track relay changes for toast

// ─── Status rendering ─────────────────────────────────────────
function renderStatus(status) {
  elStatus.textContent = status;
  elStatus.className = `status-badge status-${status}`;
}

function renderRelay(relay) {
  const isOn = relay === 1;
  elRelay.textContent = isOn ? 'ON' : 'OFF';
  elRelayDot.className = `relay-indicator ${isOn ? 'on' : 'off'}`;

  // Toast on relay change
  if (lastRelayVal !== -1 && lastRelayVal !== relay) {
    showToast(`Relay ${isOn ? 'dinyalakan ✅' : 'dimatikan 🔴'}`, isOn ? 'success' : 'warning');
  }
  lastRelayVal = relay;
}

// ─── Relay write (admin only) ─────────────────────────────────
async function sendRelayCommand(val) {
  try {
    elRelayOn.disabled  = true;
    elRelayOff.disabled = true;
    await set(ref(db, '/listrik/relay'), val);
    showToast(`Perintah relay ${val === 1 ? 'ON' : 'OFF'} dikirim`, 'success');
  } catch (err) {
    showToast('Gagal mengirim perintah relay: ' + err.message, 'error');
  } finally {
    elRelayOn.disabled  = false;
    elRelayOff.disabled = false;
  }
}

// ─── RTDB listener ────────────────────────────────────────────
function startRealtimeListener() {
  onValue(ref(db, '/listrik'), (snap) => {
    const d = snap.val();
    if (!d) return;

    const arus     = Number(d.arus     || 0);
    const tegangan = Number(d.tegangan || 0);
    const daya     = (arus * tegangan).toFixed(1);
    const relay    = Number(d.relay    ?? 1);
    const status   = d.status || 'NORMAL';
    const updatedAt= d.updated_at ? new Date(Number(d.updated_at)).toLocaleTimeString('id-ID') : '—';

    // Update DOM
    if (elArus)     elArus.textContent     = arus.toFixed(2) + ' A';
    if (elTegangan) elTegangan.textContent = tegangan.toFixed(1) + ' V';
    if (elDaya)     elDaya.textContent     = daya + ' VA';
    if (elUpdated)  elUpdated.textContent  = updatedAt;

    renderStatus(status);
    renderRelay(relay);

    // Push to chart
    if (chart) {
      const label = new Date().toLocaleTimeString('id-ID');
      pushRealtimeData(chart, label, arus, tegangan);
    }

    // Browser push notification
    checkAndNotify(status, arus, tegangan);
  });
}

// ─── PWA install prompt ───────────────────────────────────────
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.getElementById('installBtn')?.classList.remove('hidden');
});

document.getElementById('installBtn')?.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') showToast('App berhasil diinstall!', 'success');
  deferredInstallPrompt = null;
  document.getElementById('installBtn')?.classList.add('hidden');
});

// ─── Service Worker registration ─────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err));
  });
}

// ─── Init ────────────────────────────────────────────────────
initPage({
  onAuthed: async (user, role) => {
    currentRole = role;

    // Populate sidebar
    populateSidebar(user, role);
    initSidebarToggle();

    // Show/hide relay controls
    if (role === 'admin') {
      elRelaySection?.classList.remove('hidden');
    } else {
      elRelaySection?.classList.add('hidden');
    }

    // Init chart
    if (canvas) chart = createRealtimeChart(canvas);

    // Start RTDB listener
    startRealtimeListener();

    // Request notification permission
    await requestNotificationPermission();

    // Relay buttons
    elRelayOn?.addEventListener('click',  () => sendRelayCommand(1));
    elRelayOff?.addEventListener('click', () => sendRelayCommand(0));

    // Reset chart zoom
    elResetZoom?.addEventListener('click', () => resetChartZoom(chart));

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
  },
});

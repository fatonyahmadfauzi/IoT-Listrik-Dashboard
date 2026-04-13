import { initPage, getDbPrefix, isTempAccount } from './auth.js';
import { db } from './firebase-config.js';
import { ref, set, push, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// DOM Elements
const toggleDataBtn = document.getElementById('toggleDataBtn');
const dataStatus = document.getElementById('dataStatus');
const triggerDangerBtn = document.getElementById('triggerDangerBtn');
const clearDataBtn = document.getElementById('clearDataBtn');
const testNotifBtn = document.getElementById('testNotifBtn');
const pwaInstallSimBtn = document.getElementById('pwaInstallSimBtn');

let dataInterval = null;
let isStreaming = false;

// Toast Wrapper
function showToast(msg, type="success") {
  import('./notifications.js').then(m => m.showToast(msg, type)).catch(() => alert(msg));
}

// Generate random number
function getRandom(min, max) { return Math.random() * (max - min) + min; }

// Inject normal data function
async function injectData(prefix, isDanger = false) {
  const arus = isDanger ? getRandom(20, 50) : getRandom(0.5, 3.5);
  const tegangan = getRandom(215, 230);
  const daya = arus * tegangan;
  const pf = getRandom(0.8, 0.99);
  
  const payload = {
    arus: parseFloat(arus.toFixed(2)),
    tegangan: parseFloat(tegangan.toFixed(1)),
    daya: parseFloat(daya.toFixed(1)),
    daya_w: parseFloat((daya * pf).toFixed(1)),
    energi_kwh: parseFloat(getRandom(10, 100).toFixed(2)),
    frekuensi: parseFloat(getRandom(49.8, 50.2).toFixed(1)),
    power_factor: parseFloat(pf.toFixed(2)),
    relay: isDanger ? 0 : 1, // cut-off if danger
    status: isDanger ? "BAHAYA" : "NORMAL",
    updated_at: new Date().toISOString()
  };

  try {
    await set(ref(db, prefix + '/listrik'), payload);
    
    // Auto write log if danger
    if (isDanger) {
      await push(ref(db, prefix + '/logs'), {
        timestamp: new Date().toISOString(),
        type: "danger",
        message: `PWA Simulator memicu peringatan Arus Lebih: ${payload.arus}A`
      });
    }
  } catch (error) {
    console.error("Gagal inject data:", error);
  }
}

// Start Simulator Logics
function initControlPanel() {
  const prefix = getDbPrefix();
  
  if (!isTempAccount()) {
    showToast("Anda menggunakan akun Admin/User asli. Simulator Control ini dirancang untuk akun Demo. Harap berhati-hati.", "warning");
  }

  // Toggle Stream
  toggleDataBtn.addEventListener('click', () => {
    isStreaming = !isStreaming;
    if (isStreaming) {
      dataStatus.textContent = "ONLINE";
      dataStatus.className = "status-badge status-on";
      toggleDataBtn.textContent = "Berhenti Transmisi";
      toggleDataBtn.className = "btn-simulator btn-red";
      
      // Inject directly once, then loop
      injectData(prefix, false);
      dataInterval = setInterval(() => injectData(prefix, false), 2500);
      showToast("Mulai mengirim data sensor random", "success");
    } else {
      dataStatus.textContent = "STOP";
      dataStatus.className = "status-badge status-off";
      toggleDataBtn.textContent = "Mulai Transmisi";
      toggleDataBtn.className = "btn-simulator btn-green";
      
      clearInterval(dataInterval);
      showToast("Transmisi data dihentikan.", "info");
    }
  });

  // Trigger Danger
  triggerDangerBtn.addEventListener('click', async () => {
    const btnHtml = triggerDangerBtn.innerHTML;
    triggerDangerBtn.disabled = true;
    triggerDangerBtn.textContent = "Menginjeksi...";
    
    await injectData(prefix, true);
    showToast("Arus Lebih (Short Circuit) terkirim! Cek Dashboard.", "warning");
    
    triggerDangerBtn.innerHTML = btnHtml;
    triggerDangerBtn.disabled = false;
  });

  // Test Notification
  testNotifBtn.addEventListener('click', async () => {
    testNotifBtn.disabled = true;
    try {
      await push(ref(db, prefix + '/logs'), {
        timestamp: new Date().toISOString(),
        type: "info",
        message: "Test Notifikasi dari Control Panel Simulator PWA berjalan sukses!"
      });
      // Toggle relay untuk memicu event visual
      await set(ref(db, prefix + '/listrik/relay'), 1);
      
      showToast("Log notifikasi terkirim", "success");
    } catch (err) {
      showToast("Gagal test notifikasi", "error");
    }
    testNotifBtn.disabled = false;
  });

  // Clear Logs
  clearDataBtn.addEventListener('click', async () => {
    if (!confirm("Yakin ingin mereset riwayat log dan status sensor simulasi ini?")) return;
    
    try {
      await remove(ref(db, prefix + '/logs'));
      await set(ref(db, prefix + '/listrik'), {
        arus: 0, tegangan: 220, daya: 0, frekuensi: 50, power_factor: 0.85, relay: 1, status: "NORMAL"
      });
      showToast("Riwayat dihapus dan sensor di reset ke Nol", "success");
    } catch (e) {
      showToast("Gagal mereset: " + e.message, "error");
    }
  });

  // Handle PWA Install Prompt
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    pwaInstallSimBtn.style.display = "flex";
  });
  
  pwaInstallSimBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      pwaInstallSimBtn.style.display = "none";
    }
    deferredPrompt = null;
  });
}

// Ensure Authentication
initPage({
  requireAdmin: false,
  redirectIfGuest: '/simulator/index.html', // Kembali ke landing jika belum generate akun
  onAuthed: (user) => {
    initControlPanel();
  }
});

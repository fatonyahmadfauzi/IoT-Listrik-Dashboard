import {
  initPage,
  populateSidebar,
  initSidebarToggle,
  getDbPrefix,
  isTempAccount,
  getCurrentUser,
  logout,
} from "./auth.js";
import { db } from "./firebase-config.js";
import {
  ref,
  set,
  get,
  push,
  remove,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// DOM Elements
const toggleDataBtn   = document.getElementById("toggleDataBtn");
const dataStatus      = document.getElementById("dataStatus");
const triggerDangerBtn = document.getElementById("triggerDangerBtn");
const clearDataBtn    = document.getElementById("clearDataBtn");
const testNotifBtn    = document.getElementById("testNotifBtn");
const pwaInstallSimBtn = document.getElementById("pwaInstallSimBtn");

let dataInterval = null;
let isStreaming  = false;

// ── Sim Notifier API Base ─────────────────────────────────────────────────
// sim-notifier.js berjalan di port 3002
const SIM_API = 'http://localhost:3002';

// ── Helper: Reload config di sim-notifier setelah settings disimpan ─────────
async function reloadSimNotifierConfig(uid) {
  if (!uid) return;
  try {
    await fetch(`${SIM_API}/api/sim/reload-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
      signal: AbortSignal.timeout(3000),
    });
    console.log('[SimControl] Config di-reload di sim-notifier');
  } catch {
    console.warn('[SimControl] Tidak bisa reload config di sim-notifier (server mungkin tidak jalan)');
  }
}

// ── Toast Wrapper ─────────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  import("./notifications.js")
    .then((m) => m.showToast(msg, type))
    .catch(() => alert(msg));
}

// ── Generate random number ─────────────────────────────────────────────────
function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

// ── Baca settings Telegram dari sandbox akun temp ─────────────────────────
async function getSimSettings(prefix) {
  try {
    const snap = await get(ref(db, prefix + '/settings'));
    return snap.val() || {};
  } catch { return {}; }
}

// ── Kirim Telegram langsung dari browser (fallback jika sim-notifier down) ─
async function sendTelegramFallback(botToken, chatId, message) {
  if (!botToken || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
    const json = await res.json();
    return json.ok;
  } catch { return false; }
}

// ── Kirim Discord embed langsung dari browser (fallback) ───────────────────
async function sendDiscordFallback(webhookUrl, embed) {
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) return false;
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    return res.ok || res.status === 204;
  } catch { return false; }
}

// ── Inject data ke Firebase RTDB ──────────────────────────────────────────
async function injectData(prefix, isDanger = false) {
  const arus     = isDanger ? getRandom(20, 50) : getRandom(0.5, 3.5);
  const tegangan = getRandom(215, 230);
  const daya     = arus * tegangan;
  const pf       = getRandom(0.8, 0.99);

  const payload = {
    arus:         parseFloat(arus.toFixed(2)),
    tegangan:     parseFloat(tegangan.toFixed(1)),
    daya:         parseFloat(daya.toFixed(1)),
    daya_w:       parseFloat((daya * pf).toFixed(1)),
    energi_kwh:   parseFloat(getRandom(10, 100).toFixed(2)),
    frekuensi:    parseFloat(getRandom(49.8, 50.2).toFixed(1)),
    power_factor: parseFloat(pf.toFixed(2)),
    relay:        isDanger ? 0 : 1,
    status:       isDanger ? "DANGER" : "NORMAL",
    updated_at:   new Date().toISOString(),
  };

  try {
    await set(ref(db, prefix + "/listrik"), payload);

    if (isDanger) {
      await push(ref(db, prefix + "/logs"), {
        waktu:    new Date().toISOString(),
        arus:     payload.arus,
        tegangan: payload.tegangan,
        status:   payload.status,
        relay:    payload.relay,
        source:   "SIMULATOR",
      });
    }
    return payload;
  } catch (error) {
    console.error("Gagal inject data:", error);
    return null;
  }
}

// ── Trigger semua notifikasi via sim-notifier atau fallback langsung ───────
async function triggerAllNotifications(uid, status, listrikData, settings, label = 'Alert') {
  const results = { simNotifier: false, discord: false, telegram: false };

  // ── Coba via sim-notifier API dulu ─────────────────────────────────────
  try {
    const res = await fetch(`${SIM_API}/api/sim/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, status, data: listrikData }),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      results.simNotifier = true;
      console.log(`[Sim Notifier] ${label} dikirim via server`);
    }
  } catch (e) {
    console.warn('[Sim Notifier] Server tidak tersedia, pakai fallback langsung');
  }

  // ── Fallback: Kirim langsung dari browser jika sim-notifier tidak jalan ──
  if (!results.simNotifier) {
    const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    // Discord fallback — cek enabled (default true jika tidak di-set)
    const discordEnabled = settings?.discord?.enabled !== false;
    if (discordEnabled && settings?.discord?.webhookAlerts) {
      const emoji = status === 'DANGER' ? '🔴' : status === 'WARNING' ? '🟡' : '🟢';
      const color = status === 'DANGER' ? 0xED4245 : status === 'WARNING' ? 0xFEE75C : 0x57F287;
      results.discord = await sendDiscordFallback(settings.discord.webhookAlerts, {
        title: `${emoji} [SIM] Status: ${status}`,
        description: status === 'DANGER'
          ? '⚠️ **OVERCURRENT TERDETEKSI!** Relay diputuskan otomatis.'
          : status === 'WARNING'
          ? '⚡ Arus mendekati batas threshold.'
          : '✅ Kondisi kelistrikan simulator kembali NORMAL.',
        color,
        fields: [
          { name: '⚡ Arus',     value: `${listrikData?.arus ?? '-'} A`,     inline: true },
          { name: '🔋 Tegangan', value: `${listrikData?.tegangan ?? '-'} V`, inline: true },
          { name: '🔌 Relay',    value: listrikData?.relay ? 'ON' : 'OFF',   inline: true },
        ],
        footer: { text: `IoT Listrik Simulator (Browser Fallback) • ${waktu}` },
      });
    }

    // Telegram fallback
    if (settings?.telegramNotifyEnabled !== false && settings?.telegramBotToken && settings?.telegramChatId) {
      const msgMap = {
        DANGER:  `🔴 <b>[SIM] BAHAYA!</b> Overcurrent terdeteksi!\n⚡ Arus: <b>${listrikData?.arus ?? '-'} A</b>\n🕐 ${waktu}`,
        WARNING: `🟡 <b>[SIM] Peringatan</b> Arus Tinggi\n⚡ Arus: <b>${listrikData?.arus ?? '-'} A</b>\n🕐 ${waktu}`,
        NORMAL:  `🟢 <b>[SIM] Status Normal</b>\n⚡ Arus: ${listrikData?.arus ?? '-'} A\n🕐 ${waktu}`,
      };
      results.telegram = await sendTelegramFallback(
        settings.telegramBotToken,
        settings.telegramChatId,
        msgMap[status] || `Status: ${status}`
      );
    }
  }

  return results;
}

// ── Main Init ──────────────────────────────────────────────────────────────
function initControlPanel() {
  const prefix = getDbPrefix();
  const user   = getCurrentUser();
  const uid    = user?.uid;

  if (!isTempAccount()) {
    showToast(
      "This action is intended for Test Sessions only. Proceed with caution.",
      "warning"
    );
  }

  // ── State: Lock NORMAL inject saat danger/test aktif ─────────────────
  let dangerLock = false;

  // Wrap injectData agar lock bekerja (NORMAL tidak masuk saat danger aktif)
  async function injectDataSafe(prefix, isDanger) {
    if (!isDanger && dangerLock) return null; // Blok NORMAL selama danger lock
    return injectData(prefix, isDanger);
  }

  // ── Toggle Stream ─────────────────────────────────────────────────────
  toggleDataBtn.addEventListener("click", () => {
    isStreaming = !isStreaming;
    if (isStreaming) {
      dataStatus.textContent  = "Running";
      dataStatus.className    = "status-badge status-on";
      toggleDataBtn.textContent = "Stop Stream";
      toggleDataBtn.className = "btn-simulator btn-red";

      injectDataSafe(prefix, false);
      dataInterval = setInterval(() => injectDataSafe(prefix, false), 2500);
      showToast("Telemetry stream active", "success");
    } else {
      dataStatus.textContent  = "Standby";
      dataStatus.className    = "status-badge status-off";
      toggleDataBtn.textContent = "Start Streaming";
      toggleDataBtn.className = "btn-simulator btn-green";

      clearInterval(dataInterval);
      dataInterval = null;
      showToast("Telemetry stream stopped", "info");
    }
  });

  // ── Trigger Danger ────────────────────────────────────────────────────
  triggerDangerBtn.addEventListener("click", async () => {
    const btnLabel = "Trigger Overcurrent";
    triggerDangerBtn.disabled    = true;
    triggerDangerBtn.textContent = "Sending...";

    try {
      // 1. Aktifkan danger lock agar stream NORMAL tidak override DANGER
      dangerLock = true;

      // 2. Inject data DANGER ke Firebase → listener di semua platform terpicu
      const data = await injectData(prefix, true);

      // 3. Baca settings untuk fallback (jika sim-notifier tidak jalan)
      const settings = await getSimSettings(prefix);

      // 4. Reload config di sim-notifier agar selalu sinkron
      if (uid) await reloadSimNotifierConfig(uid);

      // 5. Kirim notifikasi eksplisit melalui API
      const results = await triggerAllNotifications(uid, 'DANGER', data, settings, 'Overcurrent');

      // 6. Auto restore ke NORMAL setelah 10 detik dan lepas lock
      setTimeout(async () => {
        try {
          dangerLock = false;
          await injectData(prefix, false);
          console.log('[SimControl] Status dikembalikan ke NORMAL');
        } catch { dangerLock = false; }
      }, 10000);

      const parts = [];
      if (results.simNotifier) parts.push('Server✅');
      if (results.discord)     parts.push('Discord✅');
      if (results.telegram)    parts.push('Telegram✅');

      const summary = parts.length > 0 ? ` (${parts.join(', ')})` : '';
      showToast(`Overcurrent active 10 detik${summary}`, "warning");
    } catch (err) {
      dangerLock = false;
      showToast("Gagal trigger overcurrent: " + err.message, "error");
    }


    triggerDangerBtn.textContent = btnLabel;
    triggerDangerBtn.disabled    = false;
  });

  // ── Alert Test (Test semua notifikasi sekaligus) ───────────────────────
  testNotifBtn.addEventListener("click", async () => {
    testNotifBtn.disabled    = true;
    testNotifBtn.textContent = "Sending...";

    try {
      const settings = await getSimSettings(prefix);

      // 1. Reload config di sim-notifier agar sinkron terbaru
      if (uid) await reloadSimNotifierConfig(uid);

      // 2. Aktifkan danger lock agar stream NORMAL tidak override WARNING
      dangerLock = true;

      // 3. Tulis WARNING ke /listrik DULU agar alarm terpicu di semua platform
      //    (Web siren, Electron audio, Android AlarmActivity)
      const testData = {
        arus:         parseFloat(getRandom(15, 19).toFixed(2)),
        tegangan:     parseFloat(getRandom(215, 230).toFixed(1)),
        daya:         0,
        frekuensi:    50,
        power_factor: 0.85,
        relay:        1,
        status:       'WARNING',
        updated_at:   new Date().toISOString(),
      };
      testData.daya = parseFloat((testData.arus * testData.tegangan).toFixed(1));

      // Tulis ke RTDB → onValue listener di browser/Electron/Android terpicu → alarm berbunyi
      await set(ref(db, prefix + '/listrik'), testData);

      // Tulis log ke RTDB
      await push(ref(db, prefix + "/logs"), {
        waktu:  new Date().toISOString(),
        arus:   testData.arus,
        tegangan: testData.tegangan,
        status: "WARNING",
        relay:  1,
        source: "TEST_ALERT",
        message: "Manual test notifikasi dari Control Panel",
      });

      // 4. Auto restore ke NORMAL setelah 8 detik dan lepas lock
      setTimeout(async () => {
        try {
          dangerLock = false;
          await injectData(prefix, false);
          console.log('[SimControl] Status Test Alert dikembalikan ke NORMAL');
        } catch { dangerLock = false; }
      }, 8000);

      // 5. Coba via sim-notifier test endpoint
      let simOk = false;
      let simResults = {};
      try {
        const res = await fetch(`${SIM_API}/api/sim/test-notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid }),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const json = await res.json();
          simOk = json.ok;
          simResults = json.results || {};
          console.log('[Test] sim-notifier results:', json);
        }
      } catch {
        console.warn('[Test] sim-notifier tidak tersedia, fallback ke browser');
      }

      // 6. Fallback dari browser
      const fbResults = { discord: false, telegram: false };
      if (!simOk || (!simResults.discord && !simResults.telegram)) {
        const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        const discordEnabled = settings?.discord?.enabled !== false;

        if (discordEnabled && settings?.discord?.webhookAlerts) {
          fbResults.discord = await sendDiscordFallback(settings.discord.webhookAlerts, {
            title: '🔔 [SIM] Test Notifikasi Aktif',
            description: 'Koneksi Discord Webhook simulator berhasil! Notifikasi real-time siap.',
            color: 0x5865F2,
            fields: [
              { name: 'Status', value: '✅ Terhubung', inline: true },
              { name: 'Waktu', value: waktu, inline: true },
              { name: '🆔 Session', value: `\`${uid?.slice(0,12) ?? 'unknown'}...\``, inline: false },
            ],
            footer: { text: 'IoT Listrik Simulator — Test (Browser Fallback)' },
          });
        }

        if (settings?.telegramBotToken && settings?.telegramChatId) {
          fbResults.telegram = await sendTelegramFallback(
            settings.telegramBotToken,
            settings.telegramChatId,
            `🔔 <b>[SIM] Test Notifikasi Berhasil!</b>\nSistem notifikasi aktif.\n🕐 ${waktu}\n<i>Session: ${uid?.slice(0,12) ?? 'unknown'}...</i>`
          );
        }
      }

      // 7. Feedback ke user
      const discordOk  = simResults.discord  || fbResults.discord;
      const telegramOk = simResults.telegram || fbResults.telegram;
      const parts = [];
      if (simOk && (simResults.discord || simResults.telegram)) parts.push('Server✅');
      if (discordOk)  parts.push('Discord✅');
      if (telegramOk) parts.push('Telegram✅');

      const hasSettings = !!(settings?.discord?.webhookAlerts || settings?.telegramBotToken);
      if (parts.length === 0) {
        if (!hasSettings) {
          showToast('⚠️ Bot Token & Webhook Discord belum diisi di Settings. Isi lalu coba lagi.', 'warning');
        } else {
          showToast('Notifikasi tidak terkirim. Periksa Token/Webhook di Settings.', 'error');
        }
      } else {
        showToast(`Test terkirim ke: ${parts.join(', ')}`, 'success');
      }
    } catch (err) {
      dangerLock = false;
      showToast("Gagal test notifikasi: " + err.message, "error");
    }

    testNotifBtn.textContent = "Send Test Alert";
    testNotifBtn.disabled    = false;

  });

  // ── Clear Data ───────────────────────────────────────────────────────
  clearDataBtn?.addEventListener("click", async () => {
    if (!confirm("Clear all test logs and reset sensor state?")) return;

    try {
      await remove(ref(db, prefix + "/logs"));
      await set(ref(db, prefix + "/listrik"), {
        arus:         0,
        tegangan:     220,
        daya:         0,
        frekuensi:    50,
        power_factor: 0.85,
        relay:        1,
        status:       "NORMAL",
      });
      showToast("System reset to baseline", "success");
    } catch (e) {
      showToast("Reset failed: " + e.message, "error");
    }
  });

  // ── PWA Install Prompt ───────────────────────────────────────────────
  let deferredPrompt;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    pwaInstallSimBtn.style.display = "flex";
  });

  pwaInstallSimBtn?.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      pwaInstallSimBtn.style.display = "none";
    }
    deferredPrompt = null;
  });
}

// ── Ensure Authentication ─────────────────────────────────────────────────
initPage({
  requireAdmin: false,
  redirectIfGuest: "/simulator/login",
  onAuthed: (user, role) => {
    populateSidebar(user, role);
    initSidebarToggle();
    document.getElementById("logoutBtn")?.addEventListener("click", logout);
    initControlPanel();
  },
});

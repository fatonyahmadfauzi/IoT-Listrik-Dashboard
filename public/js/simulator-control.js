import {
  initPage,
  populateSidebar,
  initSidebarToggle,
  getDbPrefix,
  isTempAccount,
  getCurrentUser,
  logout,
} from "./auth.js";
import { db, functions } from "./firebase-config.js";
import {
  ref,
  set,
  get,
  push,
  remove,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";


// DOM Elements
const toggleDataBtn   = document.getElementById("toggleDataBtn");
const dataStatus      = document.getElementById("dataStatus");
const triggerDangerBtn = document.getElementById("triggerDangerBtn");
const clearDataBtn    = document.getElementById("clearDataBtn");
const testNotifBtn    = document.getElementById("testNotifBtn");
const pwaInstallSimBtn = document.getElementById("pwaInstallSimBtn");

let dataInterval = null;
let isStreaming  = false;

// ── Accumulated energy counter (simulates kWh meter) ─────────────────────
let _accumulatedEnergy = parseFloat(sessionStorage.getItem("sim_energy_kwh") || "0");

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

// ── Baca settings dari sandbox akun temp ───────────────────────────────────
async function getSimSettings(prefix) {
  try {
    const snap = await get(ref(db, prefix + '/settings'));
    return snap.val() || {};
  } catch { return {}; }
}

// ── Kirim Discord embed langsung dari browser (fallback jika CF gagal) ────
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

// ── Kirim Telegram langsung dari browser (fallback jika CF gagal) ─────────
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

async function sendTelegramFallback(botToken, chatIds, message) {
  const ids = parseTelegramChatIds(chatIds);
  if (!botToken || ids.length === 0) return false;

  const results = await Promise.allSettled(ids.map(async (chatId) => {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
    const json = await res.json();
    return !!json.ok;
  }));

  return results.some((result) => result.status === 'fulfilled' && result.value);
}

// ── Build full sensor payload (identik dengan hardware SCT-013 + ZMPT101B) ─
function buildSensorPayload(isDanger = false) {
  // Arus: NORMAL 0.5-3.5 A, DANGER 20-50 A (overcurrent di atas threshold 10A)
  const arus = isDanger ? getRandom(20, 50) : getRandom(0.5, 3.5);

  // Tegangan: NORMAL 215-230 V, DANGER sedikit drop 195-210 V
  const tegangan = isDanger ? getRandom(195, 210) : getRandom(215, 230);

  // Apparent Power (S = V × I) dalam VA — ini yang disimpan di field "daya"
  const apparent_power = arus * tegangan;

  // Power Factor: NORMAL 0.85-0.99, DANGER drop ke 0.60-0.80
  const pf = isDanger ? getRandom(0.60, 0.80) : getRandom(0.85, 0.99);

  // Active Power (P = S × PF) dalam Watt — disimpan di field "daya_w"
  const active_power = apparent_power * pf;

  // Frekuensi: NORMAL 49.8-50.2 Hz, DANGER bisa sedikit deviate
  const frekuensi = isDanger ? getRandom(49.5, 50.5) : getRandom(49.8, 50.2);

  // Energi kWh: akumulasi bertahap per interval (5 detik = 5/3600 jam)
  const hours = 5 / 3600; // 5 detik dalam jam
  _accumulatedEnergy += (active_power / 1000) * hours;
  sessionStorage.setItem("sim_energy_kwh", _accumulatedEnergy.toFixed(4));

  return {
    arus:         parseFloat(arus.toFixed(2)),
    tegangan:     parseFloat(tegangan.toFixed(1)),
    daya:         parseFloat(apparent_power.toFixed(1)),        // Apparent Power (VA)
    daya_w:       parseFloat(active_power.toFixed(1)),          // Active Power (W)
    apparent_power: parseFloat(apparent_power.toFixed(1)),      // Alias VA untuk CLI
    power_factor: parseFloat(pf.toFixed(2)),
    frekuensi:    parseFloat(frekuensi.toFixed(1)),
    energi_kwh:   parseFloat(_accumulatedEnergy.toFixed(4)),
    relay:        isDanger ? 0 : 1,                             // Overcurrent → relay OFF
    status:       isDanger ? "DANGER" : "NORMAL",
    updated_at:   new Date().toISOString(),
  };
}

// ── Inject data ke Firebase RTDB ──────────────────────────────────────────
// Throttle counter: push log setiap 3 inject NORMAL (~15 detik) agar tidak flooding
let _logThrottleCount = 0;

async function injectData(prefix, isDanger = false) {
  const payload = buildSensorPayload(isDanger);

  try {
    await set(ref(db, prefix + "/listrik"), payload);

    // Selalu log saat DANGER; throttle log NORMAL (1 dari 3 inject)
    const shouldLog = isDanger || (++_logThrottleCount % 3 === 0);
    if (shouldLog) {
      await push(ref(db, prefix + "/logs"), {
        waktu:        new Date().toISOString(),
        arus:         payload.arus,
        tegangan:     payload.tegangan,
        daya:         payload.daya,
        daya_w:       payload.daya_w,
        power_factor: payload.power_factor,
        frekuensi:    payload.frekuensi,
        energi_kwh:   payload.energi_kwh,
        status:       payload.status,
        relay:        payload.relay,
        source:       "SIMULATOR",
        message:      isDanger
          ? "⚠️ Overcurrent terdeteksi — relay diputuskan otomatis"
          : "📡 Telemetri normal dari simulator",
      });
    }
    return payload;
  } catch (error) {
    console.error("Gagal inject data:", error);
    return null;
  }
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

  // ── Load accumulated energy dari RTDB saat pertama kali ───────────────
  (async () => {
    try {
      const snap = await get(ref(db, prefix + "/listrik/energi_kwh"));
      if (snap.exists()) {
        _accumulatedEnergy = parseFloat(snap.val()) || 0;
        sessionStorage.setItem("sim_energy_kwh", _accumulatedEnergy.toFixed(4));
      }
    } catch { /* ignore */ }
  })();

  // ══════════════════════════════════════════════════════════════════════
  // [1] Toggle Stream — interval 5000ms (5 detik)
  // ══════════════════════════════════════════════════════════════════════
  toggleDataBtn.addEventListener("click", () => {
    isStreaming = !isStreaming;
    if (isStreaming) {
      dataStatus.textContent  = "Running";
      dataStatus.className    = "status-badge status-on";
      toggleDataBtn.textContent = "Stop Stream";
      toggleDataBtn.className = "btn-simulator btn-red";

      // Kirim data pertama langsung, lalu setiap 5 detik
      injectDataSafe(prefix, false);
      dataInterval = setInterval(() => injectDataSafe(prefix, false), 5000);
      showToast("Telemetry stream active (5s interval)", "success");
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

  // ══════════════════════════════════════════════════════════════════════
  // [2] Trigger Overcurrent — arus >20A, tegangan drop, relay OFF, lock 10s
  // ══════════════════════════════════════════════════════════════════════
  triggerDangerBtn.addEventListener("click", async () => {
    const btnLabel = "Trigger Overcurrent";
    triggerDangerBtn.disabled    = true;
    triggerDangerBtn.textContent = "Sending...";

    try {
      // 1. Aktifkan danger lock agar stream NORMAL tidak override DANGER
      dangerLock = true;

      // 2. Inject data DANGER ke Firebase → onValue listener terpicu di semua platform
      //    (arus >20A, tegangan drop, relay=0, status=DANGER)
      //    → Ini otomatis trigger Cloud Functions: onStatusChanged, onRelayChanged, onNewLog
      const data = await injectData(prefix, true);

      // 3. Baca settings untuk fallback notifikasi langsung
      const settings = await getSimSettings(prefix);

      // 4. Kirim notifikasi fallback langsung dari browser
      //    (Discord + Telegram) jika Cloud Function tidak bisa menjangkau user webhooks
      const fbResults = { discord: false, telegram: false };
      const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

      const discordEnabled = settings?.discord?.enabled !== false;
      if (discordEnabled && settings?.discord?.webhookAlerts) {
        fbResults.discord = await sendDiscordFallback(settings.discord.webhookAlerts, {
          title: '🔴 [SIM] OVERCURRENT — Status: DANGER',
          description: '⚠️ **ARUS BERLEBIH TERDETEKSI!** Relay diputuskan otomatis oleh sistem proteksi.',
          color: 0xED4245,
          fields: [
            { name: '⚡ Arus',         value: `${data?.arus ?? '-'} A`,              inline: true },
            { name: '🔋 Tegangan',     value: `${data?.tegangan ?? '-'} V`,          inline: true },
            { name: '💡 Daya Aktif',   value: `${data?.daya_w ?? '-'} W`,            inline: true },
            { name: '🔌 Relay',        value: 'OFF (Auto Cutoff)',                   inline: true },
            { name: '📊 Power Factor', value: `${data?.power_factor ?? '-'}`,        inline: true },
            { name: '📡 Frekuensi',    value: `${data?.frekuensi ?? '-'} Hz`,        inline: true },
          ],
          footer: { text: `IoT Listrik Simulator • ${waktu}` },
        });
      }

      const telegramChatIds = getTelegramChatIds(settings);
      if (settings?.telegramNotifyEnabled !== false && settings?.telegramBotToken && telegramChatIds.length > 0) {
        fbResults.telegram = await sendTelegramFallback(
          settings.telegramBotToken,
          telegramChatIds,
          `🔴 <b>[SIM] BAHAYA — OVERCURRENT!</b>\n⚡ Arus: <b>${data?.arus ?? '-'} A</b>\n🔋 Tegangan: ${data?.tegangan ?? '-'} V\n💡 Daya: ${data?.daya_w ?? '-'} W\n🔌 Relay: OFF (Auto Cutoff)\n🕐 ${waktu}`
        );
      }

      // 5. Auto restore ke NORMAL setelah 10 detik dan lepas lock
      setTimeout(async () => {
        try {
          dangerLock = false;
          await injectData(prefix, false);
          console.log('[SimControl] Status dikembalikan ke NORMAL setelah 10s');
        } catch { dangerLock = false; }
      }, 10000);

      const parts = [];
      if (fbResults.discord)  parts.push('Discord✅');
      if (fbResults.telegram) parts.push('Telegram✅');

      const summary = parts.length > 0 ? ` (${parts.join(', ')})` : '';
      showToast(`⚡ Overcurrent aktif 10 detik${summary}`, "warning");
    } catch (err) {
      dangerLock = false;
      showToast("Gagal trigger overcurrent: " + err.message, "error");
    }

    triggerDangerBtn.textContent = btnLabel;
    triggerDangerBtn.disabled    = false;
  });

  // ══════════════════════════════════════════════════════════════════════
  // [3] Send Test Alert — panggil Cloud Function testSimNotification
  //     via httpsCallable (bukan fetch ke localhost:3002)
  // ══════════════════════════════════════════════════════════════════════
  testNotifBtn.addEventListener("click", async () => {
    testNotifBtn.disabled    = true;
    testNotifBtn.textContent = "Sending...";

    try {
      const settings = await getSimSettings(prefix);

      // 1. Aktifkan danger lock agar stream NORMAL tidak override WARNING
      dangerLock = true;

      // 2. Tulis WARNING ke /listrik DULU agar alarm terpicu real-time
      //    di semua platform (Web siren, Electron audio, Android AlarmActivity)
      const arus     = parseFloat(getRandom(15, 19).toFixed(2));
      const tegangan = parseFloat(getRandom(215, 225).toFixed(1));
      const pf       = parseFloat(getRandom(0.82, 0.92).toFixed(2));
      const apparent = arus * tegangan;
      const active   = apparent * pf;
      const frekuensi = parseFloat(getRandom(49.8, 50.2).toFixed(1));

      // Akumulasi energi
      const hours = 5 / 3600;
      _accumulatedEnergy += (active / 1000) * hours;
      sessionStorage.setItem("sim_energy_kwh", _accumulatedEnergy.toFixed(4));

      const testData = {
        arus,
        tegangan,
        daya:           parseFloat(apparent.toFixed(1)),
        daya_w:         parseFloat(active.toFixed(1)),
        apparent_power: parseFloat(apparent.toFixed(1)),
        power_factor:   pf,
        frekuensi,
        energi_kwh:     parseFloat(_accumulatedEnergy.toFixed(4)),
        relay:          1,
        status:         'WARNING',
        updated_at:     new Date().toISOString(),
      };

      // Tulis ke RTDB → onValue listener di browser/Electron/Android terpicu → alarm berbunyi
      await set(ref(db, prefix + '/listrik'), testData);

      // Tulis log ke RTDB → trigger onNewLog Cloud Function → Discord #logs
      await push(ref(db, prefix + "/logs"), {
        waktu:        new Date().toISOString(),
        arus:         testData.arus,
        tegangan:     testData.tegangan,
        daya:         testData.daya,
        daya_w:       testData.daya_w,
        power_factor: testData.power_factor,
        frekuensi:    testData.frekuensi,
        energi_kwh:   testData.energi_kwh,
        status:       "WARNING",
        relay:        1,
        source:       "TEST_ALERT",
        message:      "Manual test notifikasi dari Control Panel",
      });

      // 3. Auto restore ke NORMAL setelah 8 detik dan lepas lock
      setTimeout(async () => {
        try {
          dangerLock = false;
          await injectData(prefix, false);
          console.log('[SimControl] Status Test Alert dikembalikan ke NORMAL setelah 8s');
        } catch { dangerLock = false; }
      }, 8000);

      // 4. Panggil Cloud Function testSimNotification via httpsCallable
      //    Cloud Function akan baca settings dari /sim/{uid}/settings
      //    dan kirim notifikasi ke Telegram/Discord sesuai konfigurasi
      let cfOk = false;
      let cfResults = {};
      try {
        const testSimNotification = httpsCallable(functions, 'testSimNotification');
        const result = await testSimNotification({
          scenario: 'WARNING',
          channels: ['discord', 'telegram'],
        });
        cfOk = result.data?.success ?? false;
        cfResults = result.data?.results ?? {};
        console.log('[Test] Cloud Function result:', result.data);
      } catch (cfErr) {
        console.warn('[Test] Cloud Function gagal, fallback ke browser:', cfErr.message);
      }

      // 5. Fallback dari browser — setiap channel dievaluasi INDEPENDEN
      //    Bug fix: && harus || agar Telegram tetap dicoba walau Discord sudah terkirim
      const fbResults = { discord: false, telegram: false };
      const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

      // Fallback Discord — hanya jika CF tidak mengirim ke Discord
      if (cfResults.discord !== 'sent') {
        const discordEnabled = settings?.discord?.enabled !== false;
        if (discordEnabled && settings?.discord?.webhookAlerts) {
          fbResults.discord = await sendDiscordFallback(settings.discord.webhookAlerts, {
            title: '🔔 [SIM] Test Notifikasi — ⚡ WARNING',
            description: 'Koneksi Discord Webhook simulator berhasil!\nNotifikasi real-time siap digunakan.',
            color: 0xFEE75C,
            fields: [
              { name: '⚡ Arus',         value: `${testData.arus} A`,     inline: true },
              { name: '🔋 Tegangan',     value: `${testData.tegangan} V`, inline: true },
              { name: '💡 Daya Aktif',   value: `${testData.daya_w} W`,   inline: true },
              { name: '📊 Power Factor', value: `${testData.power_factor}`, inline: true },
              { name: '📡 Frekuensi',    value: `${testData.frekuensi} Hz`, inline: true },
              { name: '🔌 Relay',        value: 'ON',                     inline: true },
            ],
            footer: { text: `IoT Simulator • Test Alert (Browser Fallback) • ${waktu}` },
          });
        }
      }

      // Fallback Telegram — hanya jika CF tidak mengirim ke Telegram
      //    INDEPENDENT dari Discord agar tidak saling memblokir
      if (cfResults.telegram !== 'sent') {
        const telegramChatIds = getTelegramChatIds(settings);
        if (settings?.telegramBotToken && telegramChatIds.length > 0) {
          fbResults.telegram = await sendTelegramFallback(
            settings.telegramBotToken,
            telegramChatIds,
            `🔔 <b>[SIM] Test Notifikasi — WARNING</b>\n⚡ Arus: <b>${testData.arus} A</b>\n🔋 Tegangan: ${testData.tegangan} V\n💡 Daya: ${testData.daya_w} W\n🕐 ${waktu}\n<i>Session: ${uid?.slice(0,12) ?? 'unknown'}...</i>`
          );
        }
      }

      // 6. Feedback ke user
      const discordOk  = cfResults.discord === 'sent'  || fbResults.discord;
      const telegramOk = cfResults.telegram === 'sent' || fbResults.telegram;
      const parts = [];
      if (cfOk) parts.push('CloudFn✅');
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

  // ══════════════════════════════════════════════════════════════════════
  // [4] Clear Data — reset semua log dan state sensor
  // ══════════════════════════════════════════════════════════════════════
  clearDataBtn?.addEventListener("click", async () => {
    if (!confirm("Clear all test logs and reset sensor state?")) return;

    try {
      await remove(ref(db, prefix + "/logs"));
      _accumulatedEnergy = 0;
      sessionStorage.setItem("sim_energy_kwh", "0");
      await set(ref(db, prefix + "/listrik"), {
        arus:           0,
        tegangan:       220,
        daya:           0,
        daya_w:         0,
        apparent_power: 0,
        power_factor:   0.85,
        frekuensi:      50,
        energi_kwh:     0,
        relay:          1,
        status:         "NORMAL",
        updated_at:     new Date().toISOString(),
      });
      showToast("System reset to baseline", "success");
    } catch (e) {
      showToast("Reset failed: " + e.message, "error");
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  // [5] PWA Install Prompt
  // ══════════════════════════════════════════════════════════════════════
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

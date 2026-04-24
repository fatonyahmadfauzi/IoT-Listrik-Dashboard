/**
 * app.js — Dashboard: hybrid cloud/local data + chart + relay + logs preview
 */
import { db } from "./firebase-config.js";
import {
  initPage,
  populateSidebar,
  initSidebarToggle,
  logout,
  getDbPrefix,
  isTempAccount,
} from "./auth.js";
import {
  createRealtimeChart,
  pushRealtimeData,
  resetChartZoom,
} from "./charts.js";
import {
  requestNotificationPermission,
  checkAndNotify,
  showToast,
  initAudio,
} from "./notifications.js";
import {
  ref,
  onValue,
  set,
  query,
  orderByKey,
  limitToLast,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { startHybridListrik } from "./hybrid-listrik.js";

const elArus = document.getElementById("valArus");
const elTegangan = document.getElementById("valTegangan");
const elDayaW = document.getElementById("valDayaW");
const elVA = document.getElementById("valVA");
const elEnergi = document.getElementById("valEnergi");
const elPF = document.getElementById("valPF");
const elFreq = document.getElementById("valFreq");
const elRelay = document.getElementById("valRelay");
const elRelayDot = document.getElementById("relayDot");
const elStatus = document.getElementById("statusBadge");
const elUpdated = document.getElementById("lastUpdated");
const elRelayOn = document.getElementById("relayOnBtn");
const elRelayOff = document.getElementById("relayOffBtn");
const elResetZoom = document.getElementById("resetZoomBtn");
const elRelaySection = document.getElementById("relaySection");
const canvas = document.getElementById("monitorChart");
const elEndpointBadge = document.getElementById("endpointBadge");
const elConnState = document.getElementById("connStateText");
const elAlertPulse = document.getElementById("alertPulse");
const elMiniLogs = document.getElementById("miniLogsBody");

let chart = null;
let currentRole = null;
let lastRelayVal = -1;
let stopHybrid = null;
let stopLogs = null;

function formatSeenTime(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return new Date(n).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getStatusLabel(status) {
  if (status === "DANGER" || status === "LEAKAGE")
    return "Bahaya — arus abnormal melewati ambang";
  if (status === "WARNING") return "Peringatan — mendekati batas";
  return "Sistem stabil";
}

function renderStatus(status) {
  if (!elStatus) return;
  elStatus.textContent = status || "NORMAL";
  elStatus.className = `status-badge status-${status}`;
  if (status === "LEAKAGE") elStatus.className = "status-badge status-DANGER";

  const card = elStatus.closest(".metric-card");
  if (card) {
    if (status === "DANGER" || status === "LEAKAGE") {
      card.classList.add("status-pulse-danger");
    } else {
      card.classList.remove("status-pulse-danger");
    }
  }
  if (elAlertPulse) {
    if (status === "DANGER" || status === "LEAKAGE" || status === "WARNING") {
      elAlertPulse.classList.remove("hidden");
    } else {
      elAlertPulse.classList.add("hidden");
    }
  }
}

function renderConnectionMeta(m) {
  if (!elEndpointBadge || !elConnState) return;
  const b = m.endpointBadge || (m.source === "LOCAL" ? "LOCAL" : "CLOUD");
  elEndpointBadge.textContent =
    b === "FALLBACK" ? "FALLBACK" : b === "LOCAL" ? "LOCAL" : "CLOUD";
  elEndpointBadge.className =
    "ep-badge " +
    (b === "LOCAL"
      ? "ep-local"
      : b === "FALLBACK"
        ? "ep-fallback"
        : "ep-cloud");
  elConnState.textContent = m.connection || "—";
  if (m.fallbackActive) {
    elEndpointBadge.textContent = "FALLBACK";
    elEndpointBadge.className = "ep-badge ep-fallback";
  }
  if (elUpdated) {
    const seenLabel = formatSeenTime(m.lastDeviceSeenAt);
    if (seenLabel) {
      elUpdated.textContent = `Update ${seenLabel}`;
    } else if (m.connection === "Device Offline") {
      elUpdated.textContent = "Tanpa heartbeat";
    } else if (m.connection === "Memeriksa perangkat...") {
      elUpdated.textContent = "Menunggu heartbeat";
    } else if (m.connection === "Memulihkan...") {
      elUpdated.textContent = "Menyambungkan cloud";
    } else {
      elUpdated.textContent = "—";
    }
  }
}

function renderRelay(relay) {
  const isOn = relay === 1;
  if (elRelay) elRelay.textContent = isOn ? "ON" : "OFF";
  if (elRelayDot) elRelayDot.className = `relay-indicator ${isOn ? "on" : "off"}`;

  if (lastRelayVal !== -1 && lastRelayVal !== relay) {
    showToast(
      `Relay ${isOn ? "dinyalakan" : "dimatikan"}`,
      isOn ? "success" : "warning",
    );
  }
  lastRelayVal = relay;
}

async function sendRelayCommand(val) {
  try {
    if (currentRole !== "admin") {
      showToast(
        "Akses ditolak: hanya admin yang bisa mengontrol relay.",
        "error",
      );
      return;
    }

    elRelayOn.disabled = true;
    elRelayOff.disabled = true;
    await set(ref(db, getDbPrefix() + "/listrik/relay"), val);
    showToast(`Perintah relay ${val === 1 ? "ON" : "OFF"} dikirim`, "success");
  } catch (err) {
    showToast("Gagal mengirim perintah relay: " + err.message, "error");
  } finally {
    elRelayOn.disabled = false;
    elRelayOff.disabled = false;
  }
}

function formatLogTime(raw) {
  const n = Number(raw);
  if (Number.isFinite(n) && n > 1e12)
    return new Date(n).toLocaleString("id-ID");
  if (Number.isFinite(n) && n > 0 && n < 1e12) return "—";
  const p = Date.parse(String(raw || ""));
  if (Number.isFinite(p)) return new Date(p).toLocaleString("id-ID");
  return "—";
}

function startMiniLogsListener() {
  if (stopLogs) stopLogs();
  const logsRef = query(ref(db, getDbPrefix() + "/logs"), orderByKey(), limitToLast(15));
  stopLogs = onValue(logsRef, (snap) => {
    if (!elMiniLogs) return;
    const v = snap.val();
    if (!v) {
      elMiniLogs.innerHTML =
        '<tr class="log-row"><td colspan="4" class="text-muted text-sm" style="padding:12px;">Belum ada log</td></tr>';
      return;
    }
    const rows = Object.entries(v)
      .map(([k, x]) => ({ k, ...x }))
      .reverse()
      .slice(0, 15);
    elMiniLogs.innerHTML = rows
      .map(
        (r) => `<tr class="log-row log-status-${(r.status || 'NORMAL').toUpperCase()}">
      <td class="log-time" data-label="Waktu">${formatLogTime(r.waktu ?? r.timestamp)}</td>
      <td class="log-values" data-label="Arus / Teg."><span class="log-val-arus">${Number(r.arus || 0).toFixed(2)} A</span><span class="log-val-sep">·</span><span class="log-val-teg">${Number(r.tegangan || 0).toFixed(0)} V</span></td>
      <td class="log-status" data-label="Status"><span class="status-badge status-${r.status || 'NORMAL'}">${r.status || 'NORMAL'}</span></td>
    </tr>`,
      )
      .join("");
  });

}

function startRealtimeListener() {
  if (stopHybrid) stopHybrid();
  stopHybrid = startHybridListrik(db, {
    onData: (d) => {
      if (elArus) elArus.textContent = d.arus.toFixed(2) + " A";
      if (elTegangan) elTegangan.textContent = d.tegangan.toFixed(1) + " V";
      if (elDayaW) elDayaW.textContent = d.daya_w.toFixed(0) + " W";
      if (elVA) elVA.textContent = d.daya.toFixed(0) + " VA";
      if (elEnergi) elEnergi.textContent = d.energi_kwh.toFixed(3) + " kWh";
      if (elPF) elPF.textContent = d.power_factor.toFixed(2);
      if (elFreq) elFreq.textContent = d.frekuensi.toFixed(0) + " Hz";

      if (elUpdated && Number(d.updated_at) > 1e12) {
        elUpdated.textContent = `Update ${new Date(Number(d.updated_at)).toLocaleTimeString("id-ID")}`;
      }

      renderStatus(d.status);
      renderRelay(d.relay);

      if (chart) {
        const label = new Date().toLocaleTimeString("id-ID");
        pushRealtimeData(chart, label, d.arus, d.tegangan, d.daya_w);
      }
      checkAndNotify(d.status, d.arus, d.tegangan);
    },
    onMeta: renderConnectionMeta,
  });
}

let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.getElementById("installBtn")?.classList.remove("hidden");
});

const handleInstallClick = async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === "accepted") showToast("App berhasil diinstall!", "success");
  deferredInstallPrompt = null;
  document.getElementById("installBtn")?.classList.add("hidden");
};

document
  .getElementById("installBtn")
  ?.addEventListener("click", handleInstallClick);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const isSim = window.location.pathname.startsWith('/simulator/');
    const swPath = isSim ? "/simulator/sw.js" : "/app/sw.js";
    const swScope = isSim ? "/simulator/" : "/app/";
    navigator.serviceWorker
      .register(swPath, { scope: swScope })
      .then((reg) => console.log("[SW] Registered:", reg.scope))
      .catch((err) => console.warn("[SW] Registration failed:", err));
  });
}

initPage({
  onAuthed: async (user, role) => {
    currentRole = role;

    populateSidebar(user, role);
    initSidebarToggle();

    if (role === "admin") {
      elRelaySection?.classList.remove("hidden");
    } else {
      elRelaySection?.classList.add("hidden");
    }

    if (isTempAccount()) {
      const header = document.querySelector('.page-header');
      if (header) {
        const demoBanner = document.createElement('div');
        demoBanner.style = "background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); color: var(--warning); padding: 12px 16px; border-radius: 12px; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; font-weight: 500;";
        demoBanner.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="material-symbols-rounded" style="font-size: 1.2rem;">science</span> 
            <span>Kredensial Demo Simulator. Monitor menunggu data dari Hardware Simulator.</span>
          </div>
          <div>
            <a href="/simulator/app.html" target="_blank" style="display:inline-flex; align-items:center; gap:6px; background:var(--primary); color:white; padding:6px 14px; border-radius:6px; text-decoration:none; font-weight:600; font-size:0.8rem; box-shadow:0 2px 10px rgba(59,130,246,0.3);">
              <span class="material-symbols-rounded" style="font-size:1rem;">tune</span> Buka Control Panel Hardware
            </a>
          </div>
        `;
        header.parentNode.insertBefore(demoBanner, header.nextSibling);
      }
    }

    if (canvas) chart = createRealtimeChart(canvas);

    startRealtimeListener();
    startMiniLogsListener();

    await requestNotificationPermission();

    window.addEventListener(
      "click",
      () => {
        initAudio();
      },
      { once: true },
    );

    elRelayOn?.addEventListener("click", () => sendRelayCommand(1));
    elRelayOff?.addEventListener("click", () => sendRelayCommand(0));

    elResetZoom?.addEventListener("click", () => resetChartZoom(chart));

    document.getElementById("logoutBtn")?.addEventListener("click", logout);
  },
});

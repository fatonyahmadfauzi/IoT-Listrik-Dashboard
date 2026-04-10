/**
 * app.js — Dashboard: hybrid cloud/local data + chart + relay + logs preview
 */
import { db } from "./firebase-config.js";
import {
  initPage,
  populateSidebar,
  initSidebarToggle,
  logout,
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

function getStatusLabel(status) {
  if (status === "DANGER" || status === "LEAKAGE")
    return "Critical — arus tinggi";
  if (status === "WARNING") return "Peringatan — mendekati batas";
  return "Sistem stabil";
}

function renderStatus(status) {
  elStatus.textContent = getStatusLabel(status);
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
}

function renderRelay(relay) {
  const isOn = relay === 1;
  elRelay.textContent = isOn ? "ON" : "OFF";
  elRelayDot.className = `relay-indicator ${isOn ? "on" : "off"}`;

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
    await set(ref(db, "/listrik/relay"), val);
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
  const logsRef = query(ref(db, "/logs"), orderByKey(), limitToLast(15));
  stopLogs = onValue(logsRef, (snap) => {
    if (!elMiniLogs) return;
    const v = snap.val();
    if (!v) {
      elMiniLogs.innerHTML =
        '<tr><td colspan="4" class="text-muted text-sm" style="padding:16px;">Belum ada log</td></tr>';
      return;
    }
    const rows = Object.entries(v)
      .map(([k, x]) => ({ k, ...x }))
      .reverse()
      .slice(0, 15);
    elMiniLogs.innerHTML = rows
      .map(
        (r) => `<tr>
      <td data-label="Waktu">${formatLogTime(r.waktu ?? r.timestamp)}</td>
      <td data-label="Arus">${Number(r.arus || 0).toFixed(2)} A</td>
      <td data-label="Teg.">${Number(r.tegangan || 0).toFixed(0)} V</td>
      <td data-label="Status"><span class="status-badge status-${r.status || "NORMAL"}">${r.status || "NORMAL"}</span></td>
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

      if (elUpdated) {
        elUpdated.textContent = d.updated_at
          ? new Date().toLocaleTimeString("id-ID")
          : new Date().toLocaleTimeString("id-ID");
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
    navigator.serviceWorker
      .register("/service-worker.js")
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

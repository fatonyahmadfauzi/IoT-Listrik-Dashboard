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
  createRealtimeDetailChart,
  createRealtimeElectricalDetailChart,
  pushRealtimeData,
  pushRealtimeDetailData,
  pushRealtimeElectricalDetailData,
  resetChartZoom,
} from "./charts.js";
import {
  requestNotificationPermission,
  checkAndNotify,
  checkAdminResetNotify,
  startSystemNotificationFeed,
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
const elSafetyPanel = document.getElementById("safetyStatusPanel");
const elStatusSummary = document.getElementById("statusSummary");
const elStatusHint = document.getElementById("statusHint");
const elUpdated = document.getElementById("lastUpdated");
const elRelayOn = document.getElementById("relayOnBtn");
const elRelayOff = document.getElementById("relayOffBtn");
const elRelayHint = document.getElementById("relayControlHint");
const elResetZoom = document.getElementById("resetZoomBtn");
const elRelaySection = document.getElementById("relaySection");
const canvas = document.getElementById("monitorChart");
const detailCanvas = document.getElementById("monitorDetailChart");
const electricalDetailCanvas = document.getElementById("monitorElectricalDetailChart");
const elEndpointBadge = document.getElementById("endpointBadge");
const elConnState = document.getElementById("connStateText");
const elHeartbeatText = document.getElementById("heartbeatText");
const elAlertPulse = document.getElementById("alertPulse");
const elMiniLogs = document.getElementById("miniLogsBody");
const elMiniLogsDetail = document.getElementById("miniLogsDetailBody");

let chart = null;
let detailChart = null;
let electricalDetailChart = null;
let currentRole = null;
let lastRelayVal = -1;
let lastDeviceStatus = "NORMAL"; // track status terbaru dari perangkat
let stopHybrid = null;
let stopLogs = null;
let relayControlAllowed = false;
let relayControlReason = "Menunggu status perangkat";

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
  if (status === "DANGER") return "Bahaya — gangguan ekstrem";
  if (status === "LEAKAGE") return "Indikasi kebocoran arus";
  if (status === "WARNING") return "Peringatan — mendekati batas";
  if (status === "SENSOR_ERROR") return "Sensor tidak terbaca";
  if (status === "UNKNOWN") return "Status belum dikenali";
  return "Sistem stabil";
}

function getStatusHint(status) {
  if (status === "DANGER") {
    return "Auto-cutoff dan notifikasi bahaya diprioritaskan. Periksa beban, kabel, dan kondisi perangkat sebelum menyalakan relay kembali.";
  }
  if (status === "LEAKAGE") {
    return "Sistem membaca indikasi arus bocor atau arus abnormal. Periksa isolasi, sambungan, dan kondisi beban sebelum relay dinyalakan kembali.";
  }
  if (status === "WARNING") {
    return "Arus mendekati ambang batas. Pantau perubahan beban dan pastikan konsumsi masih sesuai kapasitas uji.";
  }
  if (status === "SENSOR_ERROR") {
    return "Sensor PZEM-004T tidak memberikan data. Periksa kabel TX/RX, sumber daya 5V, dan koneksi GND. Relay tetap menyala sesuai kondisi terakhir.";
  }
  if (status === "UNKNOWN") {
    return "Status belum dikenali. Tunggu data berikutnya atau periksa koneksi perangkat.";
  }
  return "Data realtime dibaca dari perangkat dan dievaluasi berdasarkan ambang sistem.";
}

function normalizeStatus(status) {
  const value = String(status || "NORMAL").toUpperCase();
  return ["NORMAL", "WARNING", "LEAKAGE", "DANGER", "SENSOR_ERROR"].includes(value)
    ? value
    : "UNKNOWN";
}

function renderStatus(status) {
  if (!elStatus) return;
  const safeStatus = normalizeStatus(status);
  elStatus.textContent = safeStatus;
  elStatus.className = `status-badge status-${safeStatus}`;
  if (elStatusSummary) elStatusSummary.textContent = getStatusLabel(safeStatus);
  if (elStatusHint) elStatusHint.textContent = getStatusHint(safeStatus);

  const statusSurface = elSafetyPanel || elStatus.closest(".metric-card");
  if (statusSurface) {
    statusSurface.classList.remove(
      "status-NORMAL",
      "status-WARNING",
      "status-LEAKAGE",
      "status-DANGER",
      "status-SENSOR_ERROR",
      "status-UNKNOWN",
      "status-pulse-danger",
    );
    statusSurface.classList.add(`status-${safeStatus}`);
    if (safeStatus === "DANGER" || safeStatus === "LEAKAGE") {
      statusSurface.classList.add("status-pulse-danger");
    } else {
      statusSurface.classList.remove("status-pulse-danger");
    }
  }
  if (elAlertPulse) {
    if (safeStatus === "DANGER" || safeStatus === "LEAKAGE" || safeStatus === "WARNING" || safeStatus === "SENSOR_ERROR") {
      elAlertPulse.classList.remove("hidden");
    } else {
      elAlertPulse.classList.add("hidden");
    }
  }
  // Track status terbaru
  lastDeviceStatus = safeStatus;
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
  const rawConnection = m.connection || "—";
  elConnState.textContent =
    rawConnection === "Connected" ? "Device Online" : rawConnection;
  if (elHeartbeatText) {
    elHeartbeatText.textContent =
      rawConnection === "Connected" ? "Heartbeat aktif" : "Tanpa heartbeat";
  }
  if (m.fallbackActive) {
    elEndpointBadge.textContent = "FALLBACK";
    elEndpointBadge.className = "ep-badge ep-fallback";
  }
  relayControlAllowed = m.connection === "Connected";
  relayControlReason = relayControlAllowed
    ? ""
    : m.connection === "Device Offline"
      ? "Perangkat offline. Relay fisik tidak bisa menerima perintah."
      : m.connection === "Memeriksa perangkat..."
        ? "Sistem masih menunggu heartbeat perangkat."
        : m.connection === "Memulihkan..."
          ? "Koneksi cloud sedang dipulihkan."
          : "Perangkat belum siap menerima perintah.";
  // Re-render tombol relay sesuai state terakhir + status koneksi
  if (lastRelayVal !== -1) renderRelay(lastRelayVal);
  if (elRelayHint) {
    const statusUnsafe = lastDeviceStatus === "WARNING" || lastDeviceStatus === "DANGER" || lastDeviceStatus === "SENSOR_ERROR";
    if (!relayControlAllowed) {
      elRelayHint.textContent = relayControlReason;
    } else if (statusUnsafe) {
      elRelayHint.textContent = `Kondisi ${lastDeviceStatus} — relay dikunci OFF. Perbaiki kondisi lebih dulu, lalu klik ON.`;
    } else if (lastRelayVal === 0) {
      elRelayHint.textContent = "Relay dimatikan. Klik tombol ON untuk menyalakan kembali.";
    } else {
      elRelayHint.textContent = "Perangkat terhubung. Auto-cutoff aktif: relay OFF otomatis jika WARNING/DANGER.";
    }
  }
  if (elUpdated) {
    const seenLabel = formatSeenTime(m.lastDeviceSeenAt);
    elUpdated.textContent = seenLabel
      ? `Update terakhir: ${seenLabel}`
      : "Update terakhir: -";
  }
}

function renderRelay(relay) {
  const isOn = relay === 1;
  if (elRelay) elRelay.textContent = isOn ? "ON" : "OFF";
  if (elRelayDot) elRelayDot.className = `relay-indicator ${isOn ? "on" : "off"}`;

  // Disable tombol yang sesuai state saat ini:
  // Relay ON  → tombol ON disabled, tombol OFF aktif
  // Relay OFF → tombol OFF disabled, tombol ON aktif
  if (elRelayOn) {
    elRelayOn.disabled = !relayControlAllowed || isOn;
    elRelayOn.title = !relayControlAllowed ? relayControlReason
      : isOn ? "Relay sudah menyala" : "Nyalakan relay";
  }
  if (elRelayOff) {
    elRelayOff.disabled = !relayControlAllowed || !isOn;
    elRelayOff.title = !relayControlAllowed ? relayControlReason
      : !isOn ? "Relay sudah mati" : "Matikan relay";
  }

  if (lastRelayVal !== -1 && lastRelayVal !== relay) {
    showToast(
      `Relay ${isOn ? "dinyalakan" : "dimatikan"}`,
      isOn ? "success" : "warning",
    );
  }
  lastRelayVal = relay;
}

async function sendRelayCommand(val) {
  if (currentRole !== "admin") {
    showToast(
      "Akses ditolak: hanya admin yang bisa mengontrol relay.",
      "error",
    );
    return;
  }

  if (!relayControlAllowed) {
    showToast(
      relayControlReason || "Perangkat offline. Perintah relay diblokir.",
      "warning",
    );
    return;
  }

  // Blokir perintah ON jika kondisi masih WARNING atau DANGER
  if (val === 1 && (lastDeviceStatus === "WARNING" || lastDeviceStatus === "DANGER")) {
    showToast(
      `Perintah ON ditolak: kondisi ${lastDeviceStatus}. Perbaiki kondisi listrik lebih dulu.`,
      "error",
    );
    return;
  }

  // Disable kedua tombol saat mengirim perintah.
  // renderRelay() akan mengaktifkan kembali tombol yang tepat
  // setelah Firebase mengkonfirmasi state relay aktual dari /listrik/relay.
  if (elRelayOn) elRelayOn.disabled = true;
  if (elRelayOff) elRelayOff.disabled = true;

  try {
    await set(ref(db, getDbPrefix() + "/commands/relay"), val);
    showToast(`Perintah relay ${val === 1 ? "ON" : "OFF"} dikirim`, "success");

    // Safety timeout: jika Firebase tidak mengkonfirmasi dalam 8 detik,
    // re-enable tombol berdasarkan state terakhir yang diketahui.
    setTimeout(() => {
      if (lastRelayVal !== -1) renderRelay(lastRelayVal);
    }, 8000);
  } catch (err) {
    showToast("Gagal mengirim perintah relay: " + err.message, "error");
    // Kembalikan tombol jika gagal
    if (lastRelayVal !== -1) renderRelay(lastRelayVal);
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


function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatLogNumber(value, decimals = 0, unit = "") {
  const suffix = unit ? ` ${unit}` : "";
  return `${num(value).toFixed(decimals)}${suffix}`;
}

function formatLogRelay(value) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (value === 1 || value === true || raw === "1" || raw === "ON") return "ON";
  if (value === 0 || value === false || raw === "0" || raw === "OFF") return "OFF";
  return "—";
}

function formatLogMeterSource(row) {
  const raw =
    row?.sensor_source ??
    row?.sensorSource ??
    row?.meter_source ??
    row?.meterSource ??
    "";
  const source = String(raw || "").trim();
  if (source) return source;
  return isTempAccount() ? "Simulator" : "PZEM-004T";
}

function formatLogEvent(row) {
  const raw = row?.source ?? row?.sumber ?? row?.mode ?? row?.endpoint ?? row?.dataSource ?? "";
  return String(raw || "").trim().toUpperCase();
}

function formatLogUptime(row) {
  const seconds = Number(row?.uptime_s ?? row?.uptimeSeconds ?? row?.uptime);
  return Number.isFinite(seconds) && seconds >= 0 ? `${Math.floor(seconds)} s` : "—";
}

function getLogActivePower(row) {
  return num(row?.daya_w ?? row?.active_power ?? row?.power_w ?? row?.dayaAktif ?? row?.daya);
}

function getLogEnergy(row) {
  return num(row?.energi_kwh ?? row?.energy_kwh ?? row?.energi ?? row?.kwh);
}

function getLogPowerFactor(row) {
  return num(row?.power_factor ?? row?.pf);
}

function getLogFrequency(row) {
  return num(row?.frekuensi ?? row?.frequency ?? row?.hz);
}

function getLogApparentPower(row) {
  const direct = row?.apparent ?? row?.apparent_va ?? row?.daya_va ?? row?.va;
  if (direct !== undefined && direct !== null && direct !== "") return num(direct);
  const daya = row?.daya;
  if (daya !== undefined && daya !== null && daya !== "") return num(daya);
  return num(row?.arus) * num(row?.tegangan);
}

function renderMiniLogsEmpty() {
  if (elMiniLogs) {
    elMiniLogs.innerHTML =
      `<tr class="log-row mini-log-empty-row">
        <td colspan="6">
          <div class="mini-log-empty-state">
            <span class="material-symbols-rounded">history</span>
            <strong>Belum ada log</strong>
            <small>Data terbaru akan muncul saat perangkat mengirim histori.</small>
          </div>
        </td>
      </tr>`;
  }
  if (elMiniLogsDetail) {
    elMiniLogsDetail.innerHTML = `
      <div class="mini-log-empty">
        <span class="material-symbols-rounded">history</span>
        <strong>Belum ada log</strong>
        <small>Detail audit akan muncul setelah histori tersedia.</small>
      </div>`;
  }
}

function renderMiniLogDetailRows(rows) {
  if (!elMiniLogsDetail) return;
  elMiniLogsDetail.innerHTML = rows
    .map((r) => {
      const safeStatus = normalizeStatus(r.status);
      const relay = formatLogRelay(r.relay);
      const source = formatLogMeterSource(r);
      const event = formatLogEvent(r);
      const uptime = formatLogUptime(r);
      return `<article class="mini-log-detail-row log-status-${safeStatus}">
        <div class="mini-detail-main">
          <span class="mini-detail-label">Waktu</span>
          <strong>${escapeHtml(formatLogTime(r.waktu ?? r.timestamp))}</strong>
        </div>
        <div class="mini-detail-metrics">
          <span class="mini-detail-metric metric-arus"><em>Arus</em><strong>${formatLogNumber(r.arus, 2, "A")}</strong></span>
          <span class="mini-detail-metric metric-tegangan"><em>Tegangan</em><strong>${formatLogNumber(r.tegangan, 1, "V")}</strong></span>
          <span class="mini-detail-metric metric-daya"><em>Daya Aktif</em><strong>${formatLogNumber(getLogActivePower(r), 0, "W")}</strong></span>
          <span class="mini-detail-metric metric-energi"><em>Energi</em><strong>${formatLogNumber(getLogEnergy(r), 3, "kWh")}</strong></span>
          <span class="mini-detail-metric metric-pf"><em>PF</em><strong>${formatLogNumber(getLogPowerFactor(r), 2)}</strong></span>
          <span class="mini-detail-metric metric-freq"><em>Frekuensi</em><strong>${formatLogNumber(getLogFrequency(r), 1, "Hz")}</strong></span>
          <span class="mini-detail-metric metric-va"><em>Apparent</em><strong>${formatLogNumber(getLogApparentPower(r), 0, "VA")}</strong></span>
        </div>
        <div class="mini-detail-state">
          <span class="status-badge status-${safeStatus}">${safeStatus}</span>
          <span class="mini-detail-pill">Relay ${escapeHtml(relay)}</span>
          <span class="mini-detail-source">Sumber ${escapeHtml(source)}</span>
          <span class="mini-detail-pill">Uptime ${escapeHtml(uptime)}</span>
          ${event ? `<span class="mini-detail-pill">Log ${escapeHtml(event)}</span>` : ""}
        </div>
      </article>`;
    })
    .join("");
}

function initMiniLogTabs() {
  const tabs = Array.from(document.querySelectorAll("[data-mini-log-tab]"));
  if (!tabs.length) return;
  const panels = {
    summary: document.getElementById("miniLogsSummaryPanel"),
    detail: document.getElementById("miniLogsDetailPanel"),
  };

  const activate = (target) => {
    const safeTarget = target === "detail" ? "detail" : "summary";
    tabs.forEach((tab) => {
      const isActive = tab.dataset.miniLogTab === safeTarget;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });
    Object.entries(panels).forEach(([key, panel]) => {
      if (panel) panel.hidden = key !== safeTarget;
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activate(tab.dataset.miniLogTab));
  });
  activate(tabs.find((tab) => tab.classList.contains("active"))?.dataset.miniLogTab);
}

function startMiniLogsListener() {
  if (stopLogs) stopLogs();
  const logsRef = query(ref(db, getDbPrefix() + "/logs"), orderByKey(), limitToLast(15));
  stopLogs = onValue(logsRef, (snap) => {
    if (!elMiniLogs) return;
    const v = snap.val();
    if (!v) {
      renderMiniLogsEmpty();
      return;
    }
    const rows = Object.entries(v)
      .map(([k, x]) => ({ k, ...x }))
      .reverse()
      .slice(0, 15);

    elMiniLogs.innerHTML = rows
      .map((r) => {
        const safeStatus = normalizeStatus(r.status);
        const relay = formatLogRelay(r.relay);
        const source = formatLogMeterSource(r);
        const uptime = formatLogUptime(r);
        return `<tr class="log-row log-status-${safeStatus}">
      <td class="log-time" data-label="Waktu">${escapeHtml(formatLogTime(r.waktu ?? r.timestamp))}</td>
      <td class="log-values" data-label="Beban"><div class="beban-values" style="display: flex; flex-wrap: wrap; gap: 4px 6px; align-items: center;"><span class="log-val-arus" style="white-space: nowrap;">${num(r.arus).toFixed(2)} A <span class="log-val-sep" style="opacity:0.5; margin-left:2px;">·</span></span><span class="log-val-teg" style="white-space: nowrap;">${num(r.tegangan).toFixed(1)} V <span class="log-val-sep" style="opacity:0.5; margin-left:2px;">·</span></span><span class="log-val-daya" style="white-space: nowrap;">${getLogActivePower(r).toFixed(0)} W</span></div></td>
      <td class="log-status" data-label="Status"><span class="status-badge status-${safeStatus}">${safeStatus}</span></td>
      <td class="log-relay" data-label="Relay">${escapeHtml(relay)}</td>
      <td class="log-source" data-label="Sumber">${escapeHtml(source)}</td>
      <td class="log-uptime" data-label="Uptime">${escapeHtml(uptime)}</td>
    </tr>`;
      })
      .join("");
    renderMiniLogDetailRows(rows);
  }, (err) => {
    console.error("[Logs] Firebase error:", err.code, err.message);
    if (elMiniLogs) {
      elMiniLogs.innerHTML = `<tr class="log-row">
        <td colspan="6" style="text-align:center;padding:20px;color:var(--danger);">
          <span class="material-symbols-rounded" style="vertical-align:middle;margin-right:6px;">error</span>
          Gagal memuat log: ${err.code === "PERMISSION_DENIED" ? "Akses ditolak — coba login ulang." : err.message}
        </td>
      </tr>`;
    }
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
      checkAdminResetNotify(d);

      if (chart) {
        const label = new Date().toLocaleTimeString("id-ID");
        pushRealtimeData(chart, label, d.arus, d.tegangan, d.daya_w);
        if (detailChart) pushRealtimeDetailData(detailChart, label, d);
        if (electricalDetailChart) pushRealtimeElectricalDetailData(electricalDetailChart, label, d);
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
            <a href="/simulator/dashboard" target="_blank" style="display:inline-flex; align-items:center; gap:6px; background:var(--primary); color:white; padding:6px 14px; border-radius:6px; text-decoration:none; font-weight:600; font-size:0.8rem; box-shadow:0 2px 10px rgba(59,130,246,0.3);">
              <span class="material-symbols-rounded" style="font-size:1rem;">tune</span> Buka Control Panel Hardware
            </a>
          </div>
        `;
        header.parentNode.insertBefore(demoBanner, header.nextSibling);
      }
    }

    if (canvas) chart = createRealtimeChart(canvas);
    if (detailCanvas) detailChart = createRealtimeDetailChart(detailCanvas);
    if (electricalDetailCanvas) {
      electricalDetailChart = createRealtimeElectricalDetailChart(electricalDetailCanvas);
    }

    initMiniLogTabs();
    startRealtimeListener();
    startMiniLogsListener();

    await requestNotificationPermission();
    startSystemNotificationFeed({ enabled: !isTempAccount() });

    window.addEventListener(
      "click",
      () => {
        initAudio();
      },
      { once: true },
    );

    elRelayOn?.addEventListener("click", () => sendRelayCommand(1));
    elRelayOff?.addEventListener("click", () => sendRelayCommand(0));

    elResetZoom?.addEventListener("click", () => {
      resetChartZoom(chart);
      resetChartZoom(detailChart);
      resetChartZoom(electricalDetailChart);
    });

    document.getElementById("logoutBtn")?.addEventListener("click", logout);
  },
});

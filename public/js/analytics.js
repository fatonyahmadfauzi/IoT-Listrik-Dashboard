/**
 * analytics.js
 * ─────────────────────────────────────────────────────────────
 * PWA analytics page:
 *   - Reads recent /logs entries
 *   - Builds trend, status distribution, and latest-metric snapshot charts
 *   - Keeps notification/alarm monitor active while the user is on analytics
 * ─────────────────────────────────────────────────────────────
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
  requestNotificationPermission,
  checkAndNotify,
  checkAdminResetNotify,
  startSystemNotificationFeed,
  initAudio,
  showToast,
  stopWebSiren,
} from "./notifications.js";
import { createLogDateFilter } from "./date-filter.js";
import {
  ref,
  query,
  orderByKey,
  limitToLast,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const LOG_LIMIT = 1000;
const TREND_LIMIT = 60;

const COLORS = {
  normal: "#22c55e",
  warning: "#fcd34d",
  leakage: "#fb923c",
  danger: "#ef4444",
  current: "#22c55e",
  voltage: "#60a5fa",
  activePower: "#fcd34d",
  energy: "#a78bfa",
  pf: "#38bdf8",
  frequency: "#2dd4bf",
  apparent: "#fb923c",
  grid: "rgba(255,255,255,0.06)",
  text: "#94a3b8",
  textPrimary: "#e5edf7",
  surface: "rgba(13,20,36,0.96)",
};

const countEl = document.getElementById("analyticsCount");
const latestStatusEl = document.getElementById("analyticsLatestStatus");
const updatedAtEl = document.getElementById("analyticsUpdatedAt");
const statusLegendEl = document.getElementById("analyticsStatusLegend");
const dateFilterRoot = document.getElementById("analyticsDateFilter");

let allLogs = [];
let logs = [];
let latestRealtime = null;
let trendChart = null;
let statusChart = null;
let snapshotChart = null;
let energyPfChart = null;
let frequencyApparentChart = null;
let unsubLogs = null;
let unsubListrik = null;
let dateFilter = null;

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStatus(status) {
  const value = String(status || "NORMAL").toUpperCase();
  return ["NORMAL", "WARNING", "LEAKAGE", "DANGER"].includes(value)
    ? value
    : "UNKNOWN";
}

function getTimestamp(entry = {}) {
  const value = entry.waktu ?? entry.timestamp ?? entry.updated_at ?? entry.createdAt ?? entry.created_at;
  if (value === undefined || value === null || value === "") return 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  const localDate = parseLocalDateTime(value);
  if (localDate) return localDate;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseLocalDateTime(value) {
  const match = String(value).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4}),?\s+(\d{1,2})[.:](\d{1,2})(?:[.:](\d{1,2}))?/);
  if (!match) return 0;
  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  const hour = Number(match[4] || 0);
  const minute = Number(match[5] || 0);
  const second = Number(match[6] || 0);
  const timestamp = new Date(year, month, day, hour, minute, second).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatDateTime(value) {
  const timestamp = Number(value) > 0 ? Number(value) : getTimestamp({ waktu: value });
  if (!timestamp) return "Belum ada data";
  return new Date(timestamp).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatTime(value) {
  const timestamp = Number(value) > 0 ? Number(value) : getTimestamp({ waktu: value });
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function derivePower(entry = {}) {
  const arus = number(entry.arus);
  const tegangan = number(entry.tegangan);
  const pf = number(entry.power_factor ?? entry.powerFactor, 0.85);
  const apparent = number(entry.apparent_power ?? entry.apparentPower ?? entry.daya, arus * tegangan);
  const active = number(entry.daya_w ?? entry.active_power ?? entry.activePower, apparent * pf);
  return { active, apparent, pf };
}

function normalizeEntry(entry = {}) {
  const power = derivePower(entry);
  return {
    ...entry,
    waktu: getTimestamp(entry),
    status: normalizeStatus(entry.status),
    arus: number(entry.arus),
    tegangan: number(entry.tegangan),
    daya_w: power.active,
    daya: power.apparent,
    energi_kwh: number(entry.energi_kwh ?? entry.energy_kwh ?? entry.energy ?? entry.energi),
    power_factor: number(entry.power_factor ?? entry.powerFactor, power.pf),
    frekuensi: number(entry.frekuensi ?? entry.frequency),
  };
}

function average(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function minValue(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  return clean.length ? Math.min(...clean) : 0;
}

function maxValue(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  return clean.length ? Math.max(...clean) : 0;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function applyChartDefaults() {
  if (!window.Chart) return;
  Chart.defaults.color = COLORS.text;
  Chart.defaults.borderColor = COLORS.grid;
  Chart.defaults.font.family = "'JetBrains Mono', 'Inter', monospace";
  Chart.defaults.font.size = 11;
}

function createTrendChart(canvas) {
  applyChartDefaults();
  return new Chart(canvas, {
    type: "line",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 240 },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: COLORS.text, boxWidth: 13, padding: 14 } },
        tooltip: {
          backgroundColor: COLORS.surface,
          borderColor: "rgba(255,255,255,0.14)",
          borderWidth: 1,
          padding: 12,
        },
      },
      scales: {
        x: {
          ticks: { color: COLORS.text, maxRotation: 0, maxTicksLimit: 8 },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        yA: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          title: { display: true, text: "Arus (A)", color: COLORS.current },
          ticks: { color: COLORS.current },
          grid: { color: "rgba(255,255,255,0.05)" },
        },
        yV: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          title: { display: true, text: "Tegangan (V)", color: COLORS.voltage },
          ticks: { color: COLORS.voltage },
          grid: { drawOnChartArea: false },
        },
        yP: {
          type: "linear",
          position: "right",
          offset: true,
          beginAtZero: true,
          title: { display: true, text: "Daya Aktif (W)", color: COLORS.activePower },
          ticks: { color: COLORS.activePower },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

function createEnergyPfChart(canvas) {
  applyChartDefaults();
  return new Chart(canvas, {
    type: "line",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 220 },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: COLORS.text, boxWidth: 13, padding: 14 } },
        tooltip: {
          backgroundColor: COLORS.surface,
          borderColor: "rgba(255,255,255,0.14)",
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx) => {
              const unit = ctx.dataset.yAxisID === "yKwh" ? " kWh" : "";
              return ` ${ctx.dataset.label}: ${Number(ctx.raw || 0).toFixed(unit ? 3 : 2)}${unit}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: COLORS.text, maxRotation: 0, maxTicksLimit: 8 },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        yKwh: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          title: { display: true, text: "Energi (kWh)", color: COLORS.energy },
          ticks: { color: COLORS.energy },
          grid: { color: "rgba(255,255,255,0.05)" },
        },
        yPf: {
          type: "linear",
          position: "right",
          min: 0,
          max: 1,
          title: { display: true, text: "PF", color: COLORS.normal },
          ticks: { color: COLORS.normal },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

function createFrequencyApparentChart(canvas) {
  applyChartDefaults();
  return new Chart(canvas, {
    type: "line",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 220 },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: COLORS.text, boxWidth: 13, padding: 14 } },
        tooltip: {
          backgroundColor: COLORS.surface,
          borderColor: "rgba(255,255,255,0.14)",
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx) => {
              const unit = ctx.dataset.yAxisID === "yHz" ? " Hz" : " VA";
              const digits = ctx.dataset.yAxisID === "yHz" ? 1 : 0;
              return ` ${ctx.dataset.label}: ${Number(ctx.raw || 0).toFixed(digits)}${unit}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: COLORS.text, maxRotation: 0, maxTicksLimit: 8 },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        yHz: {
          type: "linear",
          position: "left",
          suggestedMin: 45,
          suggestedMax: 65,
          title: { display: true, text: "Hz", color: COLORS.pf },
          ticks: { color: COLORS.pf },
          grid: { color: "rgba(255,255,255,0.05)" },
        },
        yVa: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          title: { display: true, text: "VA", color: COLORS.apparent },
          ticks: { color: COLORS.apparent },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

function createStatusChart(canvas) {
  applyChartDefaults();
  return new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["NORMAL", "WARNING", "LEAKAGE", "DANGER"],
      datasets: [
        {
          data: [0, 0, 0, 0],
          backgroundColor: [COLORS.normal, COLORS.warning, COLORS.leakage, COLORS.danger],
          borderColor: "rgba(7,12,24,0.92)",
          borderWidth: 4,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      animation: { duration: 260 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: COLORS.surface,
          borderColor: "rgba(255,255,255,0.14)",
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.raw} log`,
          },
        },
      },
    },
  });
}

function createSnapshotChart(canvas) {
  applyChartDefaults();
  return new Chart(canvas, {
    type: "bar",
    data: { labels: [], datasets: [] },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 240 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: COLORS.surface,
          borderColor: "rgba(255,255,255,0.14)",
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx) => {
              const raw = ctx.dataset.rawValues?.[ctx.dataIndex];
              return raw ? ` ${raw}` : ` ${Number(ctx.raw).toFixed(1)}%`;
            },
          },
        },
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          ticks: { color: COLORS.text, callback: (value) => `${value}%` },
          title: { display: true, text: "Skala relatif tampilan", color: COLORS.text },
          grid: { color: "rgba(255,255,255,0.05)" },
        },
        y: {
          ticks: { color: COLORS.textPrimary },
          grid: { display: false },
        },
      },
    },
  });
}

function ensureCharts() {
  if (!window.Chart) {
    showToast("Chart.js belum termuat", "error");
    return false;
  }

  const trendCanvas = document.getElementById("analyticsTrendChart");
  const statusCanvas = document.getElementById("analyticsStatusChart");
  const snapshotCanvas = document.getElementById("analyticsSnapshotChart");
  const energyPfCanvas = document.getElementById("analyticsEnergyPfChart");
  const frequencyApparentCanvas = document.getElementById("analyticsFrequencyApparentChart");

  if (!trendCanvas || !statusCanvas || !snapshotCanvas || !energyPfCanvas || !frequencyApparentCanvas) {
    showToast("Elemen chart analytics belum lengkap", "error");
    return false;
  }

  trendChart ||= createTrendChart(trendCanvas);
  statusChart ||= createStatusChart(statusCanvas);
  snapshotChart ||= createSnapshotChart(snapshotCanvas);
  energyPfChart ||= createEnergyPfChart(energyPfCanvas);
  frequencyApparentChart ||= createFrequencyApparentChart(frequencyApparentCanvas);
  return Boolean(trendChart && statusChart && snapshotChart && energyPfChart && frequencyApparentChart);
}

function calculateStats(entries) {
  const currents = entries.map((entry) => entry.arus);
  const voltages = entries.map((entry) => entry.tegangan);
  const activePowers = entries.map((entry) => entry.daya_w);
  const apparentPowers = entries.map((entry) => entry.daya);
  const energies = entries.map((entry) => entry.energi_kwh);
  const pfs = entries.map((entry) => entry.power_factor);
  const freqs = entries.map((entry) => entry.frekuensi);
  const statusCounts = { NORMAL: 0, WARNING: 0, LEAKAGE: 0, DANGER: 0 };

  entries.forEach((entry) => {
    if (statusCounts[entry.status] !== undefined) statusCounts[entry.status] += 1;
  });

  return {
    count: entries.length,
    statusCounts,
    avgCurrent: average(currents),
    minCurrent: minValue(currents),
    maxCurrent: maxValue(currents),
    avgVoltage: average(voltages),
    minVoltage: minValue(voltages),
    maxVoltage: maxValue(voltages),
    avgPower: average(activePowers),
    peakPower: maxValue(activePowers),
    avgApparent: average(apparentPowers),
    peakApparent: maxValue(apparentPowers),
    energyLast: entries.length ? entries[entries.length - 1].energi_kwh : maxValue(energies),
    maxEnergy: maxValue(energies),
    avgPf: average(pfs),
    avgFreq: average(freqs),
  };
}

function updateSummary(stats, latest) {
  const riskCount = stats.statusCounts.WARNING + stats.statusCounts.LEAKAGE + stats.statusCounts.DANGER;
  const latestStatus = latest?.status || "UNKNOWN";

  if (countEl) countEl.textContent = `${stats.count} log`;
  if (latestStatusEl) {
    latestStatusEl.textContent = latestStatus;
    latestStatusEl.className = `status-text status-${latestStatus}`;
  }
  if (updatedAtEl) updatedAtEl.textContent = latest?.waktu ? formatDateTime(latest.waktu) : "Menunggu data";

  setText("analyticsAvgCurrent", `${stats.avgCurrent.toFixed(2)} A`);
  setText("analyticsCurrentRange", `Min ${stats.minCurrent.toFixed(2)} A · Max ${stats.maxCurrent.toFixed(2)} A`);
  setText("analyticsAvgVoltage", `${stats.avgVoltage.toFixed(1)} V`);
  setText("analyticsVoltageRange", `Min ${stats.minVoltage.toFixed(1)} V · Max ${stats.maxVoltage.toFixed(1)} V`);
  setText("analyticsPeakPower", `${stats.peakPower.toFixed(0)} W`);
  setText("analyticsAvgPower", `Rata-rata ${stats.avgPower.toFixed(0)} W`);
  setText("analyticsEnergy", `${stats.energyLast.toFixed(3)} kWh`);
  setText("analyticsSamples", `${stats.count} sampel histori`);
  setText("analyticsAvgPf", stats.avgPf.toFixed(2));
  setText("analyticsAvgFreq", `${stats.avgFreq.toFixed(1)} Hz`);
  setText("analyticsPeakApparent", `${stats.peakApparent.toFixed(0)} VA`);
  setText("analyticsAvgApparent", `Rata-rata ${stats.avgApparent.toFixed(0)} VA`);
  setText("analyticsRiskCount", String(riskCount));
}

function updateTrendChart(entries) {
  const selected = entries.slice(-TREND_LIMIT);
  trendChart.data.labels = selected.map((entry) => formatTime(entry.waktu));
  trendChart.data.datasets = [
    {
      label: "Arus (A)",
      data: selected.map((entry) => entry.arus),
      borderColor: COLORS.current,
      backgroundColor: "rgba(34,197,94,0.10)",
      borderWidth: 2,
      tension: 0.35,
      pointRadius: 2,
      pointHoverRadius: 5,
      fill: true,
      yAxisID: "yA",
    },
    {
      label: "Tegangan (V)",
      data: selected.map((entry) => entry.tegangan),
      borderColor: COLORS.voltage,
      backgroundColor: "rgba(96,165,250,0.08)",
      borderWidth: 2,
      tension: 0.35,
      pointRadius: 2,
      pointHoverRadius: 5,
      fill: false,
      yAxisID: "yV",
    },
    {
      label: "Daya Aktif (W)",
      data: selected.map((entry) => entry.daya_w),
      borderColor: COLORS.activePower,
      backgroundColor: "rgba(252,211,77,0.08)",
      borderWidth: 2,
      tension: 0.35,
      pointRadius: 2,
      pointHoverRadius: 5,
      fill: false,
      yAxisID: "yP",
    },
  ];
  trendChart.update("none");
}

function updateSupportCharts(entries) {
  const selected = entries.slice(-TREND_LIMIT);
  const labels = selected.map((entry) => formatTime(entry.waktu));

  energyPfChart.data.labels = labels;
  energyPfChart.data.datasets = [
    {
      label: "Energi (kWh)",
      data: selected.map((entry) => entry.energi_kwh),
      borderColor: COLORS.energy,
      backgroundColor: "rgba(167,139,250,0.10)",
      borderWidth: 2,
      tension: 0.35,
      pointRadius: 2,
      pointHoverRadius: 5,
      fill: true,
      yAxisID: "yKwh",
    },
    {
      label: "Power Factor",
      data: selected.map((entry) => entry.power_factor),
      borderColor: COLORS.normal,
      backgroundColor: "rgba(34,197,94,0.08)",
      borderWidth: 2,
      tension: 0.35,
      pointRadius: 2,
      pointHoverRadius: 5,
      fill: false,
      yAxisID: "yPf",
    },
  ];
  energyPfChart.update("none");

  frequencyApparentChart.data.labels = labels;
  frequencyApparentChart.data.datasets = [
    {
      label: "Frekuensi (Hz)",
      data: selected.map((entry) => entry.frekuensi),
      borderColor: COLORS.pf,
      backgroundColor: "rgba(56,189,248,0.08)",
      borderWidth: 2,
      tension: 0.35,
      pointRadius: 2,
      pointHoverRadius: 5,
      fill: false,
      yAxisID: "yHz",
    },
    {
      label: "Apparent (VA)",
      data: selected.map((entry) => entry.daya),
      borderColor: COLORS.apparent,
      backgroundColor: "rgba(251,146,60,0.08)",
      borderWidth: 2,
      tension: 0.35,
      pointRadius: 2,
      pointHoverRadius: 5,
      fill: false,
      yAxisID: "yVa",
    },
  ];
  frequencyApparentChart.update("none");
}

function updateStatusChart(stats) {
  const counts = [
    stats.statusCounts.NORMAL,
    stats.statusCounts.WARNING,
    stats.statusCounts.LEAKAGE,
    stats.statusCounts.DANGER,
  ];
  statusChart.data.datasets[0].data = counts;
  statusChart.update("none");

  const total = Math.max(1, counts.reduce((sum, value) => sum + value, 0));
  const rows = [
    ["NORMAL", counts[0], COLORS.normal],
    ["WARNING", counts[1], COLORS.warning],
    ["LEAKAGE", counts[2], COLORS.leakage],
    ["DANGER", counts[3], COLORS.danger],
  ];

  if (statusLegendEl) {
    statusLegendEl.innerHTML = rows
      .map(([label, count, color]) => {
        const pct = Math.round((count / total) * 100);
        return `<div class="analytics-status-row">
          <span><i style="background:${color}"></i>${label}</span>
          <strong>${count} <small>${pct}%</small></strong>
        </div>`;
      })
      .join("");
  }
}

function updateSnapshotChart(latest, stats) {
  const current = latest || {
    arus: 0,
    tegangan: 0,
    daya_w: 0,
    energi_kwh: 0,
    power_factor: 0,
    frekuensi: 0,
    daya: 0,
  };

  const items = [
    { label: "Arus", value: current.arus, unit: "A", color: COLORS.current, ref: Math.max(stats.maxCurrent, 10, current.arus) },
    { label: "Tegangan", value: current.tegangan, unit: "V", color: COLORS.voltage, ref: Math.max(stats.maxVoltage, 260, current.tegangan) },
    { label: "Daya Aktif", value: current.daya_w, unit: "W", color: COLORS.activePower, ref: Math.max(stats.peakPower, 2200, current.daya_w) },
    { label: "Energi", value: current.energi_kwh, unit: "kWh", color: COLORS.energy, ref: Math.max(stats.maxEnergy, 1, current.energi_kwh) },
    { label: "Power Factor", value: current.power_factor, unit: "", color: COLORS.pf, ref: 1 },
    { label: "Frekuensi", value: current.frekuensi, unit: "Hz", color: COLORS.frequency, ref: 65 },
    { label: "Apparent", value: current.daya, unit: "VA", color: COLORS.apparent, ref: Math.max(stats.peakApparent, 2200, current.daya) },
  ];

  snapshotChart.data.labels = items.map((item) => item.label);
  snapshotChart.data.datasets = [
    {
      label: "Snapshot",
      data: items.map((item) => Math.max(0, Math.min(100, (item.value / item.ref) * 100))),
      rawValues: items.map((item) => `${item.value.toFixed(item.unit === "kWh" ? 3 : item.unit === "" ? 2 : 1)}${item.unit ? ` ${item.unit}` : ""}`),
      backgroundColor: items.map((item) => `${item.color}cc`),
      borderColor: items.map((item) => item.color),
      borderWidth: 1,
      borderRadius: 8,
      barThickness: 18,
    },
  ];
  snapshotChart.update("none");
}

function renderAnalytics() {
  if (!ensureCharts()) return;
  const stats = calculateStats(logs);
  const latest = logs[logs.length - 1] || latestRealtime;

  updateSummary(stats, latest);
  updateTrendChart(logs);
  updateSupportCharts(logs);
  updateStatusChart(stats);
  updateSnapshotChart(latest, stats);
}

function startLogsListener() {
  if (unsubLogs) unsubLogs();
  const logsQuery = query(ref(db, `${getDbPrefix()}/logs`), orderByKey(), limitToLast(LOG_LIMIT));

  unsubLogs = onValue(
    logsQuery,
    (snap) => {
      const next = [];
      snap.forEach((child) => {
        next.push(normalizeEntry({ _key: child.key, ...child.val() }));
      });
      allLogs = next.sort((a, b) => a.waktu - b.waktu);
      if (dateFilter) {
        dateFilter.setLogs(allLogs);
      } else {
        logs = allLogs;
        renderAnalytics();
      }
    },
    (error) => {
      showToast(`Gagal memuat analytics: ${error.message}`, "error");
    },
  );
}

function startRealtimeMonitor() {
  if (unsubListrik) return;
  const listrikRef = ref(db, `${getDbPrefix()}/listrik`);
  unsubListrik = onValue(listrikRef, (snap) => {
    const data = snap.val();
    if (!data) return;

    latestRealtime = normalizeEntry({
      ...data,
      waktu: data.updated_at || data.timestamp || Date.now(),
    });

    checkAndNotify(latestRealtime.status, latestRealtime.arus, latestRealtime.tegangan);
    checkAdminResetNotify(data);

    if (!logs.length) renderAnalytics();
  });
}

initPage({
  onAuthed: async (user, role) => {
    populateSidebar(user, role);
    initSidebarToggle();

    await requestNotificationPermission();
    startSystemNotificationFeed({ enabled: !isTempAccount() });
    try { initAudio(); } catch (_) {}
    window.addEventListener("click", () => initAudio(), { once: true });
    window.addEventListener("beforeunload", () => {
      try { stopWebSiren(); } catch (_) {}
    });

    startRealtimeMonitor();
    dateFilter = createLogDateFilter({
      root: dateFilterRoot,
      onChange: (filteredLogs) => {
        logs = filteredLogs.slice().sort((a, b) => a.waktu - b.waktu);
        renderAnalytics();
      },
    });
    startLogsListener();

    document.getElementById("logoutBtn")?.addEventListener("click", logout);
  },
});

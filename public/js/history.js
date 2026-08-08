/**
 * history.js
 * ─────────────────────────────────────────────────────────────
 * History page logic:
 *   - Load last 100 log entries from /logs
 *   - Render sortable table
 *   - Load into chart (history view)
 *   - Filter by status
 * ─────────────────────────────────────────────────────────────
 */

import { db }           from './firebase-config.js';
import { initPage, populateSidebar, initSidebarToggle, logout, getDbPrefix, isTempAccount } from './auth.js';
import {
  createRealtimeChart,
  createRealtimeDetailChart,
  createRealtimeElectricalDetailChart,
  loadHistoryIntoChart,
  loadHistoryIntoDetailChart,
  loadHistoryIntoElectricalDetailChart,
} from './charts.js';
import { requestNotificationPermission, checkAndNotify, checkAdminResetNotify, startSystemNotificationFeed, initAudio, showToast, stopWebSiren } from './notifications.js';
import { createLogDateFilter } from './date-filter.js';
import { ref, query, orderByKey, limitToLast, onValue }
                        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const LOG_LIMIT = 1000;

// ─── DOM refs ────────────────────────────────────────────────
const summaryTbody = document.getElementById('historySummaryTbody');
const detailTbody = document.getElementById('historyTbody');
const filterSel   = document.getElementById('filterStatus');
const exportBtn   = document.getElementById('exportBtn');
const countEl     = document.getElementById('logCount');
const canvas      = document.getElementById('historyChart');
const detailCanvas = document.getElementById('historyDetailChart');
const electricalDetailCanvas = document.getElementById('historyElectricalDetailChart');
const dateFilterRoot = document.getElementById('historyDateFilter');

let chart     = null;
let detailChart = null;
let electricalDetailChart = null;
let allLogs   = [];   // raw log array (newest first)
let dateLogs  = [];   // date-filtered log array (newest first)
let visibleLogs = []; // date + status filtered log array (newest first)
let unsubLog  = null; // RTDB listener
let unsubListrik = null; // RTDB status listener untuk alarm
let dateFilter = null;

function getTimestamp(entry = {}) {
  const value = entry.waktu ?? entry.timestamp ?? entry.updated_at ?? entry.createdAt ?? entry.created_at;
  if (value === undefined || value === null || value === '') return 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
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

function startAlarmMonitor() {
  if (unsubListrik) return; // already started
  const listrikRef = ref(db, getDbPrefix() + '/listrik');
  unsubListrik = onValue(listrikRef, (snap) => {
    const d = snap.val();
    if (!d) return;
    const status = d.status || 'NORMAL';
    const arus = Number(d.arus || 0);
    const tegangan = Number(d.tegangan || 0);
    checkAndNotify(status, arus, tegangan);
    checkAdminResetNotify(d);
  });
}

// ─── Format timestamp ─────────────────────────────────────────
function fmtTime(waktu) {
  // waktu may be ISO string or millis number
  const d = isNaN(Number(waktu)) ? new Date(waktu) : new Date(Number(waktu));
  if (isNaN(d)) return waktu;
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function getStatusLabel(status) {
  if (status === 'LEAKAGE') return 'Indikasi arus bocor';
  if (status === 'DANGER') return 'Bahaya - arus abnormal';
  if (status === 'WARNING') return 'Periksa beban';
  return 'Sistem stabil';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeStatus(status) {
  const value = String(status || 'NORMAL').toUpperCase();
  return ['NORMAL', 'WARNING', 'LEAKAGE', 'DANGER'].includes(value) ? value : 'UNKNOWN';
}

function derivePower(log = {}) {
  const arus = Number(log.arus ?? 0);
  const tegangan = Number(log.tegangan ?? 0);
  const pf = Number(log.power_factor ?? 0.85);
  const apparent = Number(log.apparent_power ?? log.apparentPower ?? log.apparent ?? log.daya_va ?? log.va ?? arus * tegangan);
  const active = Number(log.daya_w ?? log.active_power ?? log.activePower ?? log.daya ?? apparent * pf);
  return { active, apparent };
}

function metricNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getEnergy(log = {}) {
  return metricNumber(log.energi_kwh ?? log.energy_kwh ?? log.kwh ?? log.energi ?? log.energy);
}

function getPowerFactor(log = {}) {
  return metricNumber(log.power_factor ?? log.pf ?? log.powerFactor);
}

function getFrequency(log = {}) {
  return metricNumber(log.frekuensi ?? log.frequency ?? log.freq);
}

function getMeterSource(log = {}) {
  const value = log.sensor_source ?? log.sensorSource ?? log.meter_source ?? log.meterSource;
  const source = String(value ?? '').trim();
  return source || (isTempAccount() ? 'Simulator' : 'PZEM-004T');
}

function getLogType(log = {}) {
  return String(log.source ?? log.sumber ?? log.mode ?? '').trim().toUpperCase();
}

function getUptime(log = {}) {
  const seconds = Number(log.uptime_s ?? log.uptimeSeconds ?? log.uptime);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : null;
}

function formatUptime(log = {}) {
  const seconds = getUptime(log);
  return seconds === null ? '—' : `${seconds} s`;
}

function getRelayText(log = {}) {
  const relay = log.relay ?? log.relayStatus ?? log.relay_status;
  return relay === 1 || relay === true || String(relay).toUpperCase() === 'ON' ? 'ON' : 'OFF';
}

// ─── Status chip ─────────────────────────────────────────────
function statusChip(status) {
  const safeStatus = normalizeStatus(status);
  return `<span class="status-badge status-${safeStatus}">${escapeHtml(safeStatus)}</span>`;
}

function renderEmptyLogRow(colspan) {
  return `
    <tr class="log-row mini-log-empty-row">
      <td colspan="${colspan}">
        <div class="mini-log-empty-state">
          <span class="material-symbols-rounded" aria-hidden="true">history</span>
          <strong>Belum ada log</strong>
          <small>Data terbaru akan muncul saat perangkat mengirim histori.</small>
        </div>
      </td>
    </tr>
  `;
}

function renderDetailEmpty() {
  return `
    <div class="mini-log-empty">
      <span class="material-symbols-rounded" aria-hidden="true">history</span>
      <strong>Belum ada log</strong>
      <small>Detail audit akan muncul setelah histori tersedia.</small>
    </div>
  `;
}

// ─── Render table ─────────────────────────────────────────────
function renderSummaryTable(logs) {
  if (!summaryTbody) return;
  if (logs.length === 0) {
    summaryTbody.innerHTML = renderEmptyLogRow(6);
    if (countEl) countEl.textContent = '0 log';
    return;
  }

  if (countEl) countEl.textContent = `${logs.length} log`;

  summaryTbody.innerHTML = logs.map(l => {
    const power = derivePower(l);
    const safeStatus = normalizeStatus(l.status);
    return `
    <tr class="log-row log-status-${safeStatus}">
      <td class="log-time" data-label="Waktu">${escapeHtml(fmtTime(l.waktu ?? l.timestamp))}</td>
      <td class="log-values" data-label="Beban">
        <div class="beban-values" style="display: flex; flex-wrap: wrap; gap: 4px 6px; align-items: center;">
          <span class="log-val-arus" style="white-space: nowrap;">${Number(l.arus || 0).toFixed(2)} A <span class="log-val-sep" style="opacity:0.5; margin-left:2px;">·</span></span>
          <span class="log-val-teg" style="white-space: nowrap;">${Number(l.tegangan || 0).toFixed(1)} V <span class="log-val-sep" style="opacity:0.5; margin-left:2px;">·</span></span>
          <span class="log-val-daya" style="white-space: nowrap;">${power.active.toFixed(0)} W</span>
        </div>
      </td>
      <td class="log-status" data-label="Status">${statusChip(safeStatus)}</td>
      <td class="log-relay" data-label="Relay">${getRelayText(l)}</td>
      <td class="log-source" data-label="Sumber">${escapeHtml(getMeterSource(l))}</td>
      <td class="log-uptime" data-label="Uptime">${escapeHtml(formatUptime(l))}</td>
    </tr>
  `;
  }).join('');
}

function renderDetailTable(logs) {
  if (!detailTbody) return;
  if (logs.length === 0) {
    detailTbody.innerHTML = renderDetailEmpty();
    return;
  }

  detailTbody.innerHTML = logs.map(l => {
    const power = derivePower(l);
    const safeStatus = normalizeStatus(l.status);
    return `
    <article class="mini-log-detail-row log-status-${safeStatus}">
      <div class="mini-detail-main">
        <span class="mini-detail-label">Waktu</span>
        <strong>${escapeHtml(fmtTime(l.waktu ?? l.timestamp))}</strong>
      </div>
      <div class="mini-detail-metrics">
        <span class="mini-detail-metric metric-arus"><em>Arus</em><strong>${Number(l.arus || 0).toFixed(2)} A</strong></span>
        <span class="mini-detail-metric metric-tegangan"><em>Tegangan</em><strong>${Number(l.tegangan || 0).toFixed(1)} V</strong></span>
        <span class="mini-detail-metric metric-daya"><em>Daya Aktif</em><strong>${power.active.toFixed(0)} W</strong></span>
        <span class="mini-detail-metric metric-energi"><em>Energi</em><strong>${getEnergy(l).toFixed(3)} kWh</strong></span>
        <span class="mini-detail-metric metric-pf"><em>PF</em><strong>${getPowerFactor(l).toFixed(2)}</strong></span>
        <span class="mini-detail-metric metric-freq"><em>Frekuensi</em><strong>${getFrequency(l).toFixed(1)} Hz</strong></span>
        <span class="mini-detail-metric metric-va"><em>Apparent</em><strong>${power.apparent.toFixed(0)} VA</strong></span>
      </div>
      <div class="mini-detail-state">
        ${statusChip(safeStatus)}
        <span class="mini-detail-pill">Relay ${escapeHtml(getRelayText(l))}</span>
        <span class="mini-detail-source">Sumber ${escapeHtml(getMeterSource(l))}</span>
        <span class="mini-detail-pill">Uptime ${escapeHtml(formatUptime(l))}</span>
        ${getLogType(l) ? `<span class="mini-detail-pill">Log ${escapeHtml(getLogType(l))}</span>` : ''}
      </div>
    </article>
  `;
  }).join('');
}

function renderTable(logs) {
  renderSummaryTable(logs);
  renderDetailTable(logs);
}

function initHistoryLogTabs() {
  const tabs = Array.from(document.querySelectorAll('[data-history-log-tab]'));
  if (!tabs.length) return;
  const panels = {
    summary: document.getElementById('historySummaryPanel'),
    detail: document.getElementById('historyDetailPanel'),
  };

  const activate = (target) => {
    const safeTarget = target === 'detail' ? 'detail' : 'summary';
    tabs.forEach((tab) => {
      const isActive = tab.dataset.historyLogTab === safeTarget;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
    Object.entries(panels).forEach(([key, panel]) => {
      if (panel) panel.hidden = key !== safeTarget;
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activate(tab.dataset.historyLogTab));
  });
  activate(tabs.find((tab) => tab.classList.contains('active'))?.dataset.historyLogTab);
}

function applyFilter() {
  const status = filterSel?.value || 'ALL';
  const sourceLogs = dateFilter ? dateLogs : allLogs;
  const filtered = status === 'ALL' ? sourceLogs : sourceLogs.filter(l => normalizeStatus(l.status) === status);
  visibleLogs = filtered;
  renderTable(filtered);
  if (filtered.length > 0) {
    const chartLogs = filtered.slice().reverse().slice(-50);
    if (chart) loadHistoryIntoChart(chart, chartLogs);
    if (detailChart) loadHistoryIntoDetailChart(detailChart, chartLogs);
    if (electricalDetailChart) loadHistoryIntoElectricalDetailChart(electricalDetailChart, chartLogs);
  } else {
    if (chart) loadHistoryIntoChart(chart, []);
    if (detailChart) loadHistoryIntoDetailChart(detailChart, []);
    if (electricalDetailChart) loadHistoryIntoElectricalDetailChart(electricalDetailChart, []);
  }
  
  // Auto-scroll logic
  const wrapper = document.querySelector('.table-wrap');
  if (wrapper) wrapper.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Load logs from RTDB ──────────────────────────────────────
function loadLogs() {
  const logsQuery = query(ref(db, getDbPrefix() + '/logs'), orderByKey(), limitToLast(LOG_LIMIT));

  const loadingSummary = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-secondary);">
    <div style="display:flex;align-items:center;justify-content:center;gap:10px;">
      <div class="spinner"></div> Memuat data log...
    </div></td></tr>`;
  const loadingDetail = `<div class="mini-log-empty"><div class="spinner"></div><span>Memuat data log...</span></div>`;
  if (summaryTbody) summaryTbody.innerHTML = loadingSummary;
  if (detailTbody) detailTbody.innerHTML = loadingDetail;

  unsubLog = onValue(logsQuery, (snap) => {
    allLogs = [];
    snap.forEach(child => {
      const value = { _key: child.key, ...child.val() };
      const timestamp = getTimestamp(value);
      allLogs.unshift({ ...value, waktu: timestamp || value.waktu }); // newest first
    });
    if (dateFilter) {
      dateFilter.setLogs(allLogs);
    } else {
      dateLogs = allLogs;
      applyFilter();
    }
  }, (err) => {
    showToast('Gagal memuat log: ' + err.message, 'error');
  });
}

// ─── Export CSV ───────────────────────────────────────────────
function exportCSV() {
  const rowsSource = visibleLogs.length ? visibleLogs : (dateFilter ? dateLogs : allLogs);
  if (rowsSource.length === 0) { showToast('Tidak ada data untuk diekspor', 'warning'); return; }

  const header = ['Waktu', 'Arus (A)', 'Tegangan (V)', 'Daya Aktif (W)', 'Energi (kWh)', 'Power Factor', 'Frekuensi (Hz)', 'Apparent (VA)', 'Status', 'Relay', 'Sumber meter', 'Uptime (s)', 'Jenis log'];
  const rows   = rowsSource.map(l => {
    const power = derivePower(l);
    return [
      fmtTime(l.waktu),
      Number(l.arus || 0).toFixed(2),
      Number(l.tegangan || 0).toFixed(1),
      power.active.toFixed(1),
      getEnergy(l).toFixed(3),
      getPowerFactor(l).toFixed(2),
      getFrequency(l).toFixed(1),
      power.apparent.toFixed(1),
      l.status || '',
      getRelayText(l),
       getMeterSource(l),
       getUptime(l) ?? '',
       getLogType(l),
    ];
  });

  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `log-listrik-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  showToast('Data berhasil diekspor ke CSV', 'success');
}

// ─── Init ────────────────────────────────────────────────────
initPage({
  onAuthed: (user, role) => {
    populateSidebar(user, role);
    initSidebarToggle();

    // Init history chart
    if (canvas) chart = createRealtimeChart(canvas);
    if (detailCanvas) detailChart = createRealtimeDetailChart(detailCanvas);
    if (electricalDetailCanvas) {
      electricalDetailChart = createRealtimeElectricalDetailChart(electricalDetailCanvas);
    }
    initHistoryLogTabs();
    dateFilter = createLogDateFilter({
      root: dateFilterRoot,
      onChange: (filteredLogs) => {
        dateLogs = filteredLogs;
        applyFilter();
      },
    });

    // Alarm: tetap bunyi walau pindah menu (history/settings) dengan memonitor status /listrik juga.
    requestNotificationPermission();
    startSystemNotificationFeed({ enabled: !isTempAccount() });
    // Coba unlock lebih awal (kalau browser sudah pernah di-gesture di halaman sebelumnya).
    try { initAudio(); } catch (_) {}
    window.addEventListener('click', () => initAudio(), { once: true });
    startAlarmMonitor();
    window.addEventListener('beforeunload', () => {
      try { stopWebSiren(); } catch (_) {}
    });

    loadLogs();

    filterSel?.addEventListener('change', applyFilter);
    exportBtn?.addEventListener('click',  exportCSV);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
  },
});

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

function getSource(log = {}) {
  return log.source || log.sumber || log.mode || '—';
}

function getRelayText(log = {}) {
  const relay = log.relay ?? log.relayStatus ?? log.relay_status;
  return relay === 1 || relay === true || String(relay).toUpperCase() === 'ON' ? 'ON' : 'OFF';
}

// ─── Status chip ─────────────────────────────────────────────
function statusChip(status) {
  const safeStatus = normalizeStatus(status);
  const map = {
    NORMAL:  ['#86efac', 'rgba(22,163,74,.14)'],
    WARNING: ['#fde68a', 'rgba(245,158,11,.14)'],
    LEAKAGE: ['#fed7aa', 'rgba(249,115,22,.16)'],
    DANGER:  ['#fecaca', 'rgba(220,38,38,.24)'],
  };
  const [color, bg] = map[safeStatus] || ['#94a3b8', 'rgba(148,163,184,.15)'];
  return `<span style="color:${color};background:${bg};padding:3px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.04em;">${escapeHtml(safeStatus)}</span>`;
}

function renderEmptyLogRow(colspan, detail = false) {
  const helper = detail
    ? 'Detail audit akan muncul setelah histori tersedia.'
    : 'Data terbaru akan muncul saat perangkat mengirim histori.';
  return `
    <tr class="history-log-empty-row">
      <td colspan="${colspan}">
        <div class="mini-log-empty-state history-log-empty-state">
          <span class="material-symbols-rounded" aria-hidden="true">history</span>
          <strong>Belum ada log</strong>
          <small>${helper}</small>
        </div>
      </td>
    </tr>
  `;
}

// ─── Render table ─────────────────────────────────────────────
function renderSummaryTable(logs) {
  if (!summaryTbody) return;
  if (logs.length === 0) {
    summaryTbody.innerHTML = renderEmptyLogRow(5);
    if (countEl) countEl.textContent = '0 log';
    return;
  }

  if (countEl) countEl.textContent = `${logs.length} log`;

  summaryTbody.innerHTML = logs.map(l => {
    const power = derivePower(l);
    return `
    <tr>
      <td data-label="Waktu" class="td-mono text-sm">${escapeHtml(fmtTime(l.waktu))}</td>
      <td data-label="Beban" class="td-mono">
        <span class="history-load-values">
          <span class="history-val-arus">${Number(l.arus || 0).toFixed(2)} A</span>
          <span class="history-val-sep">/</span>
          <span class="history-val-teg">${Number(l.tegangan || 0).toFixed(1)} V</span>
          <span class="history-val-sep">/</span>
          <span class="history-val-daya">${power.active.toFixed(1)} W</span>
        </span>
      </td>
      <td data-label="Status">${statusChip(l.status || '—')}</td>
      <td data-label="Relay" class="td-mono">${getRelayText(l)}</td>
      <td data-label="Sumber" class="text-sm text-muted">${escapeHtml(getSource(l))}</td>
    </tr>
  `;
  }).join('');
}

function renderDetailTable(logs) {
  if (!detailTbody) return;
  if (logs.length === 0) {
    detailTbody.innerHTML = renderEmptyLogRow(11, true);
    return;
  }

  detailTbody.innerHTML = logs.map(l => {
    const power = derivePower(l);
    return `
    <tr>
      <td data-label="Waktu" class="td-mono text-sm">${escapeHtml(fmtTime(l.waktu))}</td>
      <td data-label="Arus (A)" class="td-mono">${Number(l.arus || 0).toFixed(2)} A</td>
      <td data-label="Tegangan (V)" class="td-mono">${Number(l.tegangan || 0).toFixed(1)} V</td>
      <td data-label="Daya Aktif (W)" class="td-mono">${power.active.toFixed(1)} W</td>
      <td data-label="Energi" class="td-mono">${getEnergy(l).toFixed(3)} kWh</td>
      <td data-label="PF" class="td-mono">${getPowerFactor(l).toFixed(2)}</td>
      <td data-label="Frekuensi" class="td-mono">${getFrequency(l).toFixed(1)} Hz</td>
      <td data-label="Apparent (VA)" class="td-mono">${power.apparent.toFixed(1)} VA</td>
      <td data-label="Status">${statusChip(l.status || '—')}</td>
      <td data-label="Relay" class="td-mono">${getRelayText(l)}</td>
      <td data-label="Sumber" class="text-sm text-muted">${escapeHtml(getSource(l))}</td>
    </tr>
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
  const loadingDetail = `<tr><td colspan="11" style="text-align:center;padding:32px;color:var(--text-secondary);">
    <div style="display:flex;align-items:center;justify-content:center;gap:10px;">
      <div class="spinner"></div> Memuat data log...
    </div></td></tr>`;
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

  const header = ['Waktu', 'Arus (A)', 'Tegangan (V)', 'Daya Aktif (W)', 'Energi (kWh)', 'Power Factor', 'Frekuensi (Hz)', 'Apparent (VA)', 'Status', 'Relay', 'Sumber'];
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
      getSource(l),
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

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
import { createRealtimeChart, loadHistoryIntoChart } from './charts.js';
import { requestNotificationPermission, checkAndNotify, checkAdminResetNotify, startSystemNotificationFeed, initAudio, showToast, stopWebSiren } from './notifications.js';
import { ref, query, orderByKey, limitToLast, onValue }
                        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ─── DOM refs ────────────────────────────────────────────────
const tbody       = document.getElementById('historyTbody');
const filterSel   = document.getElementById('filterStatus');
const exportBtn   = document.getElementById('exportBtn');
const countEl     = document.getElementById('logCount');
const canvas      = document.getElementById('historyChart');

let chart     = null;
let allLogs   = [];   // raw log array (newest first)
let unsubLog  = null; // RTDB listener
let unsubListrik = null; // RTDB status listener untuk alarm

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
  const apparent = Number(log.apparent_power ?? log.daya ?? arus * tegangan);
  const active = Number(log.daya_w ?? apparent * pf);
  return { active, apparent };
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

// ─── Render table ─────────────────────────────────────────────
function renderTable(logs) {
  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-secondary);">Belum ada data log</td></tr>`;
    countEl.textContent = '0 log';
    return;
  }

  countEl.textContent = `${logs.length} log`;

  tbody.innerHTML = logs.map(l => `
    <tr>
      <td data-label="Waktu" class="td-mono text-sm">${escapeHtml(fmtTime(l.waktu))}</td>
      <td data-label="Arus" class="td-mono">${Number(l.arus     || 0).toFixed(2)} A</td>
      <td data-label="Tegangan" class="td-mono">${Number(l.tegangan || 0).toFixed(1)} V</td>
      <td data-label="Status">${statusChip(l.status || '—')}</td>
      <td data-label="Relay" class="td-mono">${l.relay === 1 ? 'ON' : 'OFF'}</td>
      <td data-label="Sumber" class="text-sm text-muted">${escapeHtml(l.source || '—')}</td>
    </tr>
  `).join('');
}

function applyFilter() {
  const status = filterSel?.value || 'ALL';
  const filtered = status === 'ALL' ? allLogs : allLogs.filter(l => l.status === status);
  renderTable(filtered);
  if (chart && filtered.length > 0) {
    loadHistoryIntoChart(chart, filtered.slice().reverse().slice(-50));
  }
  
  // Auto-scroll logic
  const wrapper = document.querySelector('.table-wrap');
  if (wrapper) wrapper.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Load logs from RTDB ──────────────────────────────────────
function loadLogs() {
  const logsQuery = query(ref(db, getDbPrefix() + '/logs'), orderByKey(), limitToLast(100));

  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-secondary);">
    <div style="display:flex;align-items:center;justify-content:center;gap:10px;">
      <div class="spinner"></div> Memuat data log...
    </div></td></tr>`;

  unsubLog = onValue(logsQuery, (snap) => {
    allLogs = [];
    snap.forEach(child => {
      allLogs.unshift({ _key: child.key, ...child.val() }); // newest first
    });
    applyFilter();
  }, (err) => {
    showToast('Gagal memuat log: ' + err.message, 'error');
  });
}

// ─── Export CSV ───────────────────────────────────────────────
function exportCSV() {
  if (allLogs.length === 0) { showToast('Tidak ada data untuk diekspor', 'warning'); return; }

  const header = ['Waktu', 'Arus (A)', 'Tegangan (V)', 'Daya Aktif (W)', 'Daya Semu (VA)', 'PF', 'Frekuensi (Hz)', 'Status', 'Relay', 'Sumber'];
  const rows   = allLogs.map(l => {
    const power = derivePower(l);
    return [
      fmtTime(l.waktu),
      Number(l.arus || 0).toFixed(2),
      Number(l.tegangan || 0).toFixed(1),
      power.active.toFixed(1),
      power.apparent.toFixed(1),
      Number(l.power_factor ?? 0).toFixed(2),
      Number(l.frekuensi ?? 0).toFixed(1),
      l.status || '',
      l.relay === 1 ? 'ON' : 'OFF',
      l.source || '',
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

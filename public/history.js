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
import { initPage, populateSidebar, initSidebarToggle, logout } from './auth.js';
import { createRealtimeChart, loadHistoryIntoChart } from './charts.js';
import { showToast }    from './notifications.js';
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

// ─── Status chip ─────────────────────────────────────────────
function statusChip(status) {
  const map = {
    NORMAL:  ['#22c55e', 'rgba(34,197,94,.15)'],
    WARNING: ['#fcd34d', 'rgba(252,211,77,.15)'],
    LEAKAGE: ['#fca5a5', 'rgba(252,165,165,.15)'],
    DANGER:  ['#ff8080', 'rgba(255,128,128,.20)'],
  };
  const [color, bg] = map[status] || ['#94a3b8', 'rgba(148,163,184,.15)'];
  return `<span style="color:${color};background:${bg};padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;">${status}</span>`;
}

// ─── Render table ─────────────────────────────────────────────
function renderTable(logs) {
  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-secondary);">📂 Belum ada data log</td></tr>`;
    countEl.textContent = '0 log';
    return;
  }

  countEl.textContent = `${logs.length} log`;

  tbody.innerHTML = logs.map(l => `
    <tr>
      <td class="td-mono text-sm">${fmtTime(l.waktu)}</td>
      <td class="td-mono">${Number(l.arus     || 0).toFixed(2)} A</td>
      <td class="td-mono">${Number(l.tegangan || 0).toFixed(1)} V</td>
      <td>${statusChip(l.status || '—')}</td>
      <td class="td-mono">${l.relay === 1 ? '🟢 ON' : '🔴 OFF'}</td>
      <td class="text-sm text-muted">${l.source || '—'}</td>
    </tr>
  `).join('');
}

// ─── Filter ───────────────────────────────────────────────────
function applyFilter() {
  const status = filterSel?.value || 'ALL';
  const filtered = status === 'ALL' ? allLogs : allLogs.filter(l => l.status === status);
  renderTable(filtered);
  if (chart && filtered.length > 0) {
    loadHistoryIntoChart(chart, filtered.slice().reverse().slice(-50));
  }
}

// ─── Load logs from RTDB ──────────────────────────────────────
function loadLogs() {
  const logsQuery = query(ref(db, '/logs'), orderByKey(), limitToLast(100));

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

  const header = ['Waktu', 'Arus (A)', 'Tegangan (V)', 'Status', 'Relay', 'Sumber'];
  const rows   = allLogs.map(l => [
    fmtTime(l.waktu),
    Number(l.arus || 0).toFixed(2),
    Number(l.tegangan || 0).toFixed(1),
    l.status || '',
    l.relay === 1 ? 'ON' : 'OFF',
    l.source || '',
  ]);

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

    loadLogs();

    filterSel?.addEventListener('change', applyFilter);
    exportBtn?.addEventListener('click',  exportCSV);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
  },
});

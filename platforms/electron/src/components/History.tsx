import { useMemo, useState } from 'react';
import { Download, History as HistoryIcon } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useDataStore } from '../lib/store';
import { LogDateFilter, useLogDateFilter } from './LogDateFilter';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const chartText = '#cbd5e1';
const chartGrid = 'rgba(148, 163, 184, 0.16)';

type StatusFilter = '' | 'NORMAL' | 'WARNING' | 'LEAKAGE' | 'DANGER';
type LogMode = 'summary' | 'detail';

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumber(value: unknown, digits: number, fallback = '0') {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : fallback;
}

function formatTime(timestamp?: number) {
  if (!timestamp) return '-';
  if (timestamp < 1e12) return 'Live';
  return new Date(timestamp).toLocaleString('id-ID');
}

function formatClock(timestamp?: number) {
  if (!timestamp) return '-';
  if (timestamp < 1e12) return 'Live';
  return new Date(timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function normalizeStatus(status?: string) {
  const value = String(status || 'NORMAL').toUpperCase();
  return ['NORMAL', 'WARNING', 'LEAKAGE', 'DANGER'].includes(value) ? value : 'UNKNOWN';
}

function statusClass(status?: string) {
  switch (normalizeStatus(status)) {
    case 'NORMAL':
      return 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200';
    case 'WARNING':
      return 'border-amber-300/45 bg-amber-500/15 text-amber-100';
    case 'LEAKAGE':
      return 'border-orange-300/45 bg-orange-500/15 text-orange-100';
    case 'DANGER':
      return 'border-red-300/50 bg-red-500/20 text-red-100';
    default:
      return 'border-slate-600 bg-slate-800 text-slate-300';
  }
}

function relayLabel(relay?: boolean) {
  return relay ? 'ON' : 'OFF';
}

function asSource(log: any) {
  return String(log?.source || log?.sumber || 'CLOUD').toUpperCase();
}

function getMeterSource(log: any, fallback = 'PZEM-004T') {
  const raw = String(log?.sensor_source ?? log?.sensorSource ?? '').trim();
  return raw || fallback;
}

function formatUptime(log: any) {
  const seconds = Number(log?.uptime_s ?? log?.uptimeSeconds ?? log?.uptime);
  return Number.isFinite(seconds) && seconds >= 0 ? `${Math.floor(seconds)} s` : '\u2014';
}

export function History() {
  const { logs } = useDataStore();
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('');
  const [logMode, setLogMode] = useState<LogMode>('summary');
  const dateFilter = useLogDateFilter(logs);

  const visibleLogs = useMemo(
    () =>
      filterStatus
        ? dateFilter.filteredLogs.filter((log) => normalizeStatus(log.status) === filterStatus)
        : dateFilter.filteredLogs,
    [dateFilter.filteredLogs, filterStatus]
  );

  const chartLogs = useMemo(() => visibleLogs.slice(0, 50).reverse(), [visibleLogs]);

  const primaryChartData = {
    labels: chartLogs.map((log) => formatClock(number(log.timestamp))),
    datasets: [
      {
        label: 'Arus (A)',
        data: chartLogs.map((log) => number(log.arus)),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yCurrent',
      },
      {
        label: 'Tegangan (V)',
        data: chartLogs.map((log) => number(log.tegangan)),
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96, 165, 250, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yVoltage',
      },
      {
        label: 'Daya Aktif (W)',
        data: chartLogs.map((log) => number(log.daya)),
        borderColor: '#facc15',
        backgroundColor: 'rgba(250, 204, 21, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yPower',
      },
    ],
  };

  const supportChartData = {
    labels: chartLogs.map((log) => formatClock(number(log.timestamp))),
    datasets: [
      {
        label: 'Energi (kWh)',
        data: chartLogs.map((log) => number(log.energi_kwh)),
        borderColor: '#a78bfa',
        backgroundColor: 'rgba(167, 139, 250, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yEnergy',
      },
      {
        label: 'Power Factor',
        data: chartLogs.map((log) => number(log.power_factor)),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yPf',
      },
      {
        label: 'Frekuensi (Hz)',
        data: chartLogs.map((log) => number(log.frekuensi)),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yFreq',
      },
      {
        label: 'Apparent (VA)',
        data: chartLogs.map((log) => number(log.apparent_power)),
        borderColor: '#fb923c',
        backgroundColor: 'rgba(251, 146, 60, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yApparent',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { labels: { color: chartText, boxWidth: 14 } },
      tooltip: { enabled: true },
    },
    scales: {
      x: { ticks: { color: chartText, maxRotation: 0 }, grid: { color: chartGrid } },
      yCurrent: {
        type: 'linear' as const,
        position: 'left' as const,
        ticks: { color: '#22c55e' },
        grid: { color: chartGrid },
        title: { display: true, text: 'Arus (A)', color: '#22c55e' },
      },
      yVoltage: {
        type: 'linear' as const,
        position: 'right' as const,
        ticks: { color: '#60a5fa' },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Tegangan (V)', color: '#60a5fa' },
      },
      yPower: {
        type: 'linear' as const,
        position: 'right' as const,
        ticks: { color: '#facc15' },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Daya Aktif (W)', color: '#facc15' },
      },
    },
  };

  const supportOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { labels: { color: chartText, boxWidth: 14 } },
      tooltip: { enabled: true },
    },
    scales: {
      x: { ticks: { color: chartText, maxRotation: 0 }, grid: { color: chartGrid } },
      yEnergy: {
        type: 'linear' as const,
        position: 'left' as const,
        ticks: { color: '#a78bfa' },
        grid: { color: chartGrid },
        title: { display: true, text: 'Energi (kWh)', color: '#a78bfa' },
      },
      yPf: {
        type: 'linear' as const,
        position: 'right' as const,
        ticks: { color: '#22c55e' },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'PF', color: '#22c55e' },
      },
      yFreq: {
        type: 'linear' as const,
        position: 'right' as const,
        ticks: { color: '#38bdf8' },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Hz', color: '#38bdf8' },
      },
      yApparent: {
        type: 'linear' as const,
        position: 'right' as const,
        ticks: { color: '#fb923c' },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'VA', color: '#fb923c' },
      },
    },
  };

  const handleExportCSV = () => {
    const headers = [
      'Waktu',
      'Arus (A)',
      'Tegangan (V)',
      'Daya Aktif (W)',
      'Energi (kWh)',
      'Power Factor',
      'Frekuensi',
      'Apparent (VA)',
      'Status',
      'Relay',
      'Sumber',
      'Sumber Meter',
      'Uptime (s)',
    ];
    const rows = visibleLogs.map((log) => [
      formatTime(log.timestamp),
      formatNumber(log.arus, 2),
      formatNumber(log.tegangan, 1),
      formatNumber(log.daya, 1),
      formatNumber(log.energi_kwh, 3, '0.000'),
      formatNumber(log.power_factor, 2, '0.00'),
      formatNumber(log.frekuensi, 1),
      formatNumber(log.apparent_power, 1),
      normalizeStatus(log.status),
      relayLabel(Boolean(log.relay)),
      asSource(log),
      getMeterSource(log),
      formatUptime(log),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-slate-100">
      <section className="rounded-xl border border-slate-700/75 bg-slate-900/70 p-6 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Riwayat Log</p>
            <h2 className="mt-3 text-3xl font-black text-white">Grafik dan tabel histori perangkat.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Data log membaca arus, tegangan, daya aktif, energi, power factor, frekuensi, apparent power, status, relay, dan sumber data.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-500/40 bg-sky-600/25 px-4 py-3 text-sm font-black text-sky-100 transition hover:bg-sky-600/35"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </section>

      <LogDateFilter
        title="Filter Riwayat Log"
        subtitle="Tanggal tanpa data dibuat nonaktif. Pilihan ini mengubah grafik, tabel ringkas, tabel detail, dan export CSV."
        filter={dateFilter}
      />

      <section className="rounded-xl border border-slate-700/75 bg-slate-900/70 p-6 shadow-xl">
        <div className="border-b border-slate-700/70 pb-4">
          <h2 className="text-lg font-black text-white">Grafik Riwayat (50 data terakhir)</h2>
          <p className="mt-1 text-sm text-slate-400">
            Arus, tegangan, dan daya aktif dipantau sebagai grafik utama karena paling cepat berubah.
          </p>
        </div>
        <div className="mt-6 h-72 min-w-0">
          <Line data={primaryChartData} options={chartOptions} />
        </div>
        <div className="mt-8 border-t border-slate-700/70 pt-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
            Metrik Pendukung Riwayat
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Energi, power factor, frekuensi, dan apparent power dipisah agar skala grafik utama tetap terbaca.
          </p>
          <div className="mt-5 h-72 min-w-0">
            <Line data={supportChartData} options={supportOptions} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700/75 bg-slate-900/70 p-6 shadow-xl">
        <div className="flex flex-col gap-4 border-b border-slate-700/70 pb-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-lg font-black text-white">Tabel Log Event</h2>
            <p className="mt-1 text-sm text-slate-400">
              Ringkas untuk pantauan cepat, detail untuk audit parameter listrik.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value as StatusFilter)}
              className="h-11 rounded-lg border border-slate-700 bg-slate-950/50 px-3 text-sm font-bold text-slate-100 outline-none"
            >
              <option value="">Semua Status</option>
              <option value="NORMAL">NORMAL</option>
              <option value="WARNING">WARNING</option>
              <option value="LEAKAGE">LEAKAGE</option>
              <option value="DANGER">DANGER</option>
            </select>
            <div className="inline-flex rounded-full border border-slate-700 bg-slate-950/50 p-1">
              <button
                className={`rounded-full px-5 py-2 text-sm font-black transition ${logMode === 'summary' ? 'bg-sky-600/35 text-sky-100' : 'text-slate-300'}`}
                onClick={() => setLogMode('summary')}
              >
                Ringkas
              </button>
              <button
                className={`rounded-full px-5 py-2 text-sm font-black transition ${logMode === 'detail' ? 'bg-sky-600/35 text-sky-100' : 'text-slate-300'}`}
                onClick={() => setLogMode('detail')}
              >
                Detail
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-slate-700/75">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/45 text-xs uppercase tracking-[0.08em] text-slate-400">
              {logMode === 'summary' ? (
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Beban</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Relay</th>
                  <th className="px-4 py-3">Sumber</th>
                  <th className="px-4 py-3">Sumber Meter</th>
                  <th className="px-4 py-3">Uptime</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Arus (A)</th>
                  <th className="px-4 py-3">Tegangan (V)</th>
                  <th className="px-4 py-3">Daya Aktif (W)</th>
                  <th className="px-4 py-3">Energi (kWh)</th>
                  <th className="px-4 py-3">PF</th>
                  <th className="px-4 py-3">Frekuensi</th>
                  <th className="px-4 py-3">Apparent</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Relay</th>
                  <th className="px-4 py-3">Sumber</th>
                  <th className="px-4 py-3">Sumber Meter</th>
                  <th className="px-4 py-3">Uptime</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {visibleLogs.length > 0 ? (
                visibleLogs.map((log) =>
                  logMode === 'summary' ? (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap px-4 py-3">{formatTime(log.timestamp)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {formatNumber(log.arus, 2)} A / {formatNumber(log.tegangan, 1)} V / {formatNumber(log.daya, 1)} W
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(log.status)}`}>
                          {normalizeStatus(log.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{relayLabel(Boolean(log.relay))}</td>
                      <td className="whitespace-nowrap px-4 py-3">{asSource(log)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{getMeterSource(log)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatUptime(log)}</td>
                    </tr>
                  ) : (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap px-4 py-3">{formatTime(log.timestamp)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(log.arus, 2)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(log.tegangan, 1)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(log.daya, 1)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(log.energi_kwh, 3, '0.000')}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(log.power_factor, 2, '0.00')}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(log.frekuensi, 1)} Hz</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(log.apparent_power, 1)} VA</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(log.status)}`}>
                          {normalizeStatus(log.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{relayLabel(Boolean(log.relay))}</td>
                      <td className="whitespace-nowrap px-4 py-3">{asSource(log)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{getMeterSource(log)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatUptime(log)}</td>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td colSpan={logMode === 'summary' ? 7 : 13} className="px-4 py-10">
                    <div className="flex flex-col items-center justify-center text-center text-slate-400">
                      <HistoryIcon className="h-9 w-9" />
                      <p className="mt-2 text-base font-semibold text-slate-200">Belum ada log</p>
                      <p className="mt-1 text-sm">Data terbaru akan muncul saat perangkat mengirim histori.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Menampilkan entri log sesuai filter tanggal dan status. Data diperbarui realtime.
        </p>
      </section>
    </div>
  );
}

import { useMemo } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useDataStore } from '../lib/store';
import { LogDateFilter, useLogDateFilter } from './LogDateFilter';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const colors = {
  normal: '#22c55e',
  warning: '#facc15',
  leakage: '#fb923c',
  danger: '#ef4444',
  current: '#22c55e',
  voltage: '#60a5fa',
  activePower: '#facc15',
  energy: '#a78bfa',
  pf: '#38bdf8',
  frequency: '#2dd4bf',
  apparent: '#fb923c',
  text: '#cbd5e1',
  grid: 'rgba(148, 163, 184, 0.16)',
};

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumber(value: unknown, digits: number, fallback = '0') {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : fallback;
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

function average(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function minValue(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value));
  return clean.length ? Math.min(...clean) : 0;
}

function maxValue(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value));
  return clean.length ? Math.max(...clean) : 0;
}

function readEnergy(source: any) {
  return number(source?.energi_kwh ?? source?.energy_kwh ?? source?.energy ?? source?.energi);
}

function readPowerFactor(source: any) {
  return number(source?.power_factor ?? source?.powerFactor ?? source?.pf);
}

function readFrequency(source: any) {
  return number(source?.frekuensi ?? source?.frequency);
}

function readApparent(source: any) {
  const arus = number(source?.arus);
  const tegangan = number(source?.tegangan);
  return number(source?.apparent_power ?? source?.apparentPower ?? source?.apparent_va ?? source?.daya_va, arus * tegangan);
}

function normalizeStatus(status?: string) {
  const value = String(status || 'NORMAL').toUpperCase();
  return ['NORMAL', 'WARNING', 'LEAKAGE', 'DANGER'].includes(value) ? value : 'UNKNOWN';
}

function statusBadgeClass(status?: string) {
  switch (normalizeStatus(status)) {
    case 'NORMAL':
      return 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200';
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

export function Analytics() {
  const { logs, currentData } = useDataStore();
  const dateFilter = useLogDateFilter(logs);
  const filteredLogs = dateFilter.filteredLogs;
  const snapshotSource = filteredLogs[0] || currentData;

  const chartLogs = useMemo(() => filteredLogs.slice(0, 60).reverse(), [filteredLogs]);
  const currents = useMemo(() => filteredLogs.map((log) => number(log.arus)), [filteredLogs]);
  const voltages = useMemo(() => filteredLogs.map((log) => number(log.tegangan)), [filteredLogs]);
  const activePowers = useMemo(() => filteredLogs.map((log) => number(log.daya)), [filteredLogs]);
  const pfValues = useMemo(() => filteredLogs.map(readPowerFactor), [filteredLogs]);
  const freqValues = useMemo(() => filteredLogs.map(readFrequency), [filteredLogs]);
  const apparentValues = useMemo(() => filteredLogs.map(readApparent), [filteredLogs]);

  const statusCounts = useMemo(
    () => ({
      NORMAL: filteredLogs.filter((log) => normalizeStatus(log.status) === 'NORMAL').length,
      WARNING: filteredLogs.filter((log) => normalizeStatus(log.status) === 'WARNING').length,
      LEAKAGE: filteredLogs.filter((log) => normalizeStatus(log.status) === 'LEAKAGE').length,
      DANGER: filteredLogs.filter((log) => normalizeStatus(log.status) === 'DANGER').length,
    }),
    [filteredLogs]
  );

  const stats = {
    avgCurrent: average(currents),
    minCurrent: minValue(currents),
    maxCurrent: maxValue(currents),
    avgVoltage: average(voltages),
    minVoltage: minValue(voltages),
    maxVoltage: maxValue(voltages),
    avgPower: average(activePowers),
    peakPower: maxValue(activePowers),
    avgPf: average(pfValues),
    avgFreq: average(freqValues),
    avgApparent: average(apparentValues),
    peakApparent: maxValue(apparentValues),
    riskCount: statusCounts.WARNING + statusCounts.LEAKAGE + statusCounts.DANGER,
  };

  const statusTotal = Object.values(statusCounts).reduce((sum, value) => sum + value, 0);
  const statusRows = [
    ['NORMAL', statusCounts.NORMAL, colors.normal],
    ['WARNING', statusCounts.WARNING, colors.warning],
    ['LEAKAGE', statusCounts.LEAKAGE, colors.leakage],
    ['DANGER', statusCounts.DANGER, colors.danger],
  ] as const;

  const trendData = {
    labels: chartLogs.map((log) => formatClock(number(log.timestamp))),
    datasets: [
      {
        label: 'Arus (A)',
        data: chartLogs.map((log) => number(log.arus)),
        borderColor: colors.current,
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yA',
      },
      {
        label: 'Tegangan (V)',
        data: chartLogs.map((log) => number(log.tegangan)),
        borderColor: colors.voltage,
        backgroundColor: 'rgba(96, 165, 250, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yV',
      },
      {
        label: 'Daya Aktif (W)',
        data: chartLogs.map((log) => number(log.daya)),
        borderColor: colors.activePower,
        backgroundColor: 'rgba(250, 204, 21, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yP',
      },
    ],
  };

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { labels: { color: colors.text, boxWidth: 14 } },
      tooltip: { enabled: true },
    },
    scales: {
      x: { ticks: { color: colors.text, maxRotation: 0 }, grid: { color: colors.grid } },
      yA: {
        type: 'linear' as const,
        position: 'left' as const,
        ticks: { color: colors.current },
        grid: { color: colors.grid },
        title: { display: true, text: 'Arus (A)', color: colors.current },
      },
      yV: {
        type: 'linear' as const,
        position: 'right' as const,
        ticks: { color: colors.voltage },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Tegangan (V)', color: colors.voltage },
      },
      yP: {
        type: 'linear' as const,
        position: 'right' as const,
        ticks: { color: colors.activePower },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Daya Aktif (W)', color: colors.activePower },
      },
    },
  };

  const statusData = {
    labels: ['NORMAL', 'WARNING', 'LEAKAGE', 'DANGER'],
    datasets: [
      {
        data: [
          statusCounts.NORMAL,
          statusCounts.WARNING,
          statusCounts.LEAKAGE,
          statusCounts.DANGER,
        ],
        backgroundColor: [colors.normal, colors.warning, colors.leakage, colors.danger],
        borderColor: 'rgba(7, 12, 24, 0.92)',
        borderWidth: 4,
      },
    ],
  };

  const energyPfData = {
    labels: chartLogs.map((log) => formatClock(number(log.timestamp))),
    datasets: [
      {
        label: 'Energi (kWh)',
        data: chartLogs.map(readEnergy),
        borderColor: colors.energy,
        backgroundColor: 'rgba(167, 139, 250, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yEnergy',
      },
      {
        label: 'Power Factor',
        data: chartLogs.map(readPowerFactor),
        borderColor: colors.normal,
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yPf',
      },
    ],
  };

  const frequencyApparentData = {
    labels: chartLogs.map((log) => formatClock(number(log.timestamp))),
    datasets: [
      {
        label: 'Frekuensi (Hz)',
        data: chartLogs.map(readFrequency),
        borderColor: colors.frequency,
        backgroundColor: 'rgba(45, 212, 191, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yFreq',
      },
      {
        label: 'Apparent (VA)',
        data: chartLogs.map(readApparent),
        borderColor: colors.apparent,
        backgroundColor: 'rgba(251, 146, 60, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yApparent',
      },
    ],
  };

  const supportChartBaseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { labels: { color: colors.text, boxWidth: 14 } },
      tooltip: { enabled: true },
    },
  };

  const energyPfOptions = {
    ...supportChartBaseOptions,
    scales: {
      x: { ticks: { color: colors.text, maxRotation: 0 }, grid: { color: colors.grid } },
      yEnergy: {
        type: 'linear' as const,
        position: 'left' as const,
        ticks: { color: colors.energy },
        grid: { color: colors.grid },
        title: { display: true, text: 'Energi (kWh)', color: colors.energy },
      },
      yPf: {
        type: 'linear' as const,
        position: 'right' as const,
        ticks: { color: colors.normal },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'PF', color: colors.normal },
      },
    },
  };

  const frequencyApparentOptions = {
    ...supportChartBaseOptions,
    scales: {
      x: { ticks: { color: colors.text, maxRotation: 0 }, grid: { color: colors.grid } },
      yFreq: {
        type: 'linear' as const,
        position: 'left' as const,
        ticks: { color: colors.frequency },
        grid: { color: colors.grid },
        title: { display: true, text: 'Hz', color: colors.frequency },
      },
      yApparent: {
        type: 'linear' as const,
        position: 'right' as const,
        ticks: { color: colors.apparent },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'VA', color: colors.apparent },
      },
    },
  };

  const snapshotData = {
    labels: ['Arus', 'Tegangan', 'Daya', 'Energi', 'PF', 'Frekuensi', 'Apparent'],
    datasets: [
      {
        label: 'Snapshot terakhir',
        data: [
          number(snapshotSource?.arus),
          number(snapshotSource?.tegangan),
          number(snapshotSource?.daya),
          readEnergy(snapshotSource),
          readPowerFactor(snapshotSource),
          readFrequency(snapshotSource),
          readApparent(snapshotSource),
        ],
        backgroundColor: [
          colors.current,
          colors.voltage,
          colors.activePower,
          colors.energy,
          colors.pf,
          colors.frequency,
          colors.apparent,
        ],
        borderWidth: 0,
      },
    ],
  };

  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: colors.text, boxWidth: 14 } },
      tooltip: { enabled: true },
    },
  };

  const latestStatus = normalizeStatus(snapshotSource?.status);

  return (
    <div className="space-y-6 text-slate-100">
      <section className="rounded-xl border border-slate-700/75 bg-slate-900/70 p-6 shadow-xl">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Ringkasan Historis</p>
            <h2 className="mt-3 text-3xl font-black text-white">Tren, status, dan beban listrik dalam satu halaman.</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
              Halaman ini membaca histori log dan data realtime untuk membantu melihat pola arus,
              tegangan, daya aktif, energi, power factor, frekuensi, apparent power, dan distribusi status.
            </p>
          </div>
          <div className="rounded-lg border border-sky-500/30 bg-sky-950/30 p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Status terakhir</p>
            <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${statusBadgeClass(latestStatus)}`}>
              <span className="h-2 w-2 rounded-full bg-current" />
              {latestStatus}
            </div>
            <p className="mt-4 text-sm text-slate-400">
              {snapshotSource?.updated_at || snapshotSource?.timestamp
                ? new Date(Number(snapshotSource.updated_at || snapshotSource.timestamp)).toLocaleString('id-ID')
                : 'Menunggu data'}
            </p>
          </div>
        </div>
      </section>

      <LogDateFilter
        title="Filter Analytics"
        subtitle="Tanggal tanpa log dibuat nonaktif. Pilihan ini menghitung ulang kartu statistik, grafik tren, distribusi status, dan snapshot."
        filter={dateFilter}
      />

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          ['Arus rata-rata', `${stats.avgCurrent.toFixed(2)} A`, `Min ${stats.minCurrent.toFixed(2)} A · Max ${stats.maxCurrent.toFixed(2)} A`, 'border-l-emerald-400'],
          ['Tegangan rata-rata', `${stats.avgVoltage.toFixed(1)} V`, `Min ${stats.minVoltage.toFixed(1)} V · Max ${stats.maxVoltage.toFixed(1)} V`, 'border-l-sky-400'],
          ['Daya aktif puncak', `${stats.peakPower.toFixed(0)} W`, `Rata-rata ${stats.avgPower.toFixed(0)} W`, 'border-l-amber-400'],
          ['Energi terakhir', `${formatNumber(readEnergy(snapshotSource), 3, '0.000')} kWh`, `${filteredLogs.length} sampel histori`, 'border-l-violet-400'],
          ['Power factor rata-rata', stats.avgPf.toFixed(2), 'Diambil dari PZEM / fallback settings', 'border-l-cyan-400'],
          ['Frekuensi rata-rata', `${stats.avgFreq.toFixed(1)} Hz`, 'Nominal grid PLN', 'border-l-orange-400'],
          ['Apparent puncak', `${stats.peakApparent.toFixed(0)} VA`, `Rata-rata ${stats.avgApparent.toFixed(0)} VA`, 'border-l-sky-300'],
          ['Status berisiko', String(stats.riskCount), 'WARNING + LEAKAGE + DANGER', 'border-l-red-400'],
        ].map(([label, value, note, border]) => (
          <article key={label} className={`rounded-xl border border-slate-700/75 bg-slate-900/70 p-5 shadow-lg border-l-2 ${border}`}>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
            <p className="mt-4 font-mono text-3xl font-black tracking-wider text-slate-100">{value}</p>
            <p className="mt-3 text-sm text-slate-400">{note}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-4">
        <article className="rounded-xl border border-slate-700/75 bg-slate-900/70 p-6 shadow-xl">
          <div className="border-b border-slate-700/70 pb-4">
            <h2 className="text-lg font-black text-white">Trend Historis</h2>
            <p className="mt-1 text-sm text-slate-400">Arus, tegangan, dan daya aktif dari log terbaru.</p>
          </div>
          <div className="mt-6 h-80 min-w-0">
            <Line data={trendData} options={trendOptions} />
          </div>
        </article>

        <article className="rounded-xl border border-slate-700/75 bg-slate-900/70 p-6 shadow-xl">
          <div className="border-b border-slate-700/70 pb-4">
            <h2 className="text-lg font-black text-white">Distribusi Status</h2>
            <p className="mt-1 text-sm text-slate-400">Perbandingan NORMAL, WARNING, LEAKAGE, dan DANGER.</p>
          </div>
          <div className="mt-6 h-80 min-w-0">
            <Doughnut data={statusData} options={commonChartOptions} />
          </div>
          <div className="mt-5 space-y-3">
            {statusRows.map(([label, count, color]) => {
              const pct = statusTotal ? Math.round((count / statusTotal) * 100) : 0;
              return (
                <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-700/75 bg-slate-950/35 px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-sm font-black text-slate-200">
                    <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                  <strong className="font-mono text-sm text-slate-100">
                    {count} <small className="text-slate-400">{pct}%</small>
                  </strong>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-slate-700/75 bg-slate-900/70 p-6 shadow-xl">
        <div className="border-b border-slate-700/70 pb-4">
          <h2 className="text-lg font-black text-white">Metrik Pendukung Riwayat</h2>
          <p className="mt-1 text-sm text-slate-400">
            Energi, power factor, frekuensi, dan apparent power dipisah agar tren utama tetap mudah dibaca.
          </p>
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="min-w-0">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-slate-300">
              Energi (kWh) dan Power Factor
            </p>
            <div className="h-72 min-w-0">
              <Line data={energyPfData} options={energyPfOptions} />
            </div>
          </div>
          <div className="min-w-0">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-slate-300">
              Frekuensi dan Apparent (VA)
            </p>
            <div className="h-72 min-w-0">
              <Line data={frequencyApparentData} options={frequencyApparentOptions} />
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          Frekuensi dan apparent power (VA) dipisah ke grafik kedua agar tampilan riwayat tetap mudah dibaca pada desktop, tablet, dan mobile.
        </p>
      </section>

      <section className="rounded-xl border border-slate-700/75 bg-slate-900/70 p-6 shadow-xl">
        <div className="border-b border-slate-700/70 pb-4">
          <h2 className="text-lg font-black text-white">Snapshot Metrik Terakhir</h2>
          <p className="mt-1 text-sm text-slate-400">
            Nilai terakhir dari Arus, Tegangan, Daya Aktif, Energi, PF, Frekuensi, dan Apparent.
          </p>
        </div>
        <div className="mt-6 h-80 min-w-0">
          <Bar
            data={snapshotData}
            options={{
              ...commonChartOptions,
              scales: {
                x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
                y: { ticks: { color: colors.text }, grid: { color: colors.grid } },
              },
            }}
          />
        </div>
      </section>
    </div>
  );
}

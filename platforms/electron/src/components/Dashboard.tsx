import { useMemo, useRef, useState } from 'react';
import { ref, set } from 'firebase/database';
import { Line } from 'react-chartjs-2';
import { AlertTriangle, Clock, Cloud, History, Maximize2, Shield, Zap } from 'lucide-react';
import zoomPlugin from 'chartjs-plugin-zoom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { db } from '../lib/firebase';
import { showNotification } from '../lib/notifikasi';
import { useAuthStore, useDataStore } from '../lib/store';
import { useStore } from '../store';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, zoomPlugin);

const statusCopy: Record<
  string,
  {
    panel: string;
    badge: string;
    text: string;
    iconBox: string;
    title: string;
    hint: string;
  }
> = {
  NORMAL: {
    panel: 'border-emerald-500/55 bg-emerald-500/10',
    badge: 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200',
    text: 'text-emerald-300',
    iconBox: 'text-emerald-200 bg-emerald-500/20 border-emerald-400/30',
    title: 'Sistem stabil',
    hint: 'Data realtime dibaca dari perangkat dan dievaluasi berdasarkan ambang sistem.',
  },
  WARNING: {
    panel: 'border-amber-400/55 bg-amber-500/10',
    badge: 'border-amber-300/45 bg-amber-500/15 text-amber-100',
    text: 'text-amber-200',
    iconBox: 'text-amber-100 bg-amber-500/20 border-amber-300/30',
    title: 'Perlu perhatian',
    hint: 'Nilai listrik mendekati ambang batas. Periksa beban dan kondisi instalasi.',
  },
  LEAKAGE: {
    panel: 'border-orange-400/55 bg-orange-500/10',
    badge: 'border-orange-300/45 bg-orange-500/15 text-orange-100',
    text: 'text-orange-200',
    iconBox: 'text-orange-100 bg-orange-500/20 border-orange-300/30',
    title: 'Indikasi arus abnormal',
    hint: 'Sistem membaca indikasi arus abnormal berdasarkan ambang dan pola data perangkat.',
  },
  DANGER: {
    panel: 'border-red-400/60 bg-red-500/10',
    badge: 'border-red-300/50 bg-red-500/20 text-red-100',
    text: 'text-red-200',
    iconBox: 'text-red-100 bg-red-500/20 border-red-300/30',
    title: 'Kondisi berbahaya',
    hint: 'Relay perlu berada pada kondisi aman sampai data kembali normal.',
  },
  SENSOR_ERROR: {
    panel: 'border-slate-400/55 bg-slate-500/10',
    badge: 'border-slate-400/50 bg-slate-500/15 text-slate-200',
    text: 'text-slate-200',
    iconBox: 'text-slate-200 bg-slate-500/20 border-slate-400/30',
    title: 'Sensor tidak terbaca',
    hint: 'Data PZEM-004T tidak valid. Periksa koneksi sensor dan tunggu pembacaan berikutnya.',
  },
};

const chartText = '#cbd5e1';
const chartGrid = 'rgba(148, 163, 184, 0.16)';

function getStatusCopy(status?: string) {
  return statusCopy[String(status || 'NORMAL').toUpperCase()] || statusCopy.NORMAL;
}

function formatNumber(value: number | undefined, digits: number, fallback = '0') {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : fallback;
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

function asSource(log: any, endpoint: string) {
  return String(log?.source || log?.sumber || endpoint || 'CLOUD').toUpperCase();
}

function getMeterSource(log: any, fallback = 'PZEM-004T') {
  const raw = String(log?.sensor_source ?? log?.sensorSource ?? '').trim();
  return raw || fallback;
}

function formatUptime(log: any) {
  const seconds = Number(log?.uptime_s ?? log?.uptimeSeconds ?? log?.uptime);
  return Number.isFinite(seconds) && seconds >= 0 ? `${Math.floor(seconds)} s` : '\u2014';
}

function relayLabel(relay?: boolean) {
  return relay ? 'ON' : 'OFF';
}

function getStatusIcon(status: string) {
  if (status === 'NORMAL') return Shield;
  if (status === 'LEAKAGE') return Zap;
  return AlertTriangle;
}

export function Dashboard() {
  const { currentData, logs, connectionMeta } = useDataStore();
  const { role } = useAuthStore();
  const [loadingRelay, setLoadingRelay] = useState(false);
  const [logMode, setLogMode] = useState<'summary' | 'detail'>('summary');
  const primaryChartRef = useRef<ChartJS<'line'> | null>(null);
  const supportChartRef = useRef<ChartJS<'line'> | null>(null);
  // Alarm/notification sekarang dikontrol global dari App.tsx
  useStore();

  const endpoint = String(connectionMeta?.endpointBadge || 'CLOUD');
  const connection = String(connectionMeta?.connection || 'Memeriksa perangkat...');
  const status = String(currentData?.status || 'NORMAL').toUpperCase();
  const statusUi = getStatusCopy(status);
  const StatusIcon = getStatusIcon(status);
  const relayControlAllowed = role === 'admin' && connection === 'Connected';
  const relayDisabledReason =
    connection === 'Device Offline'
      ? 'Perangkat offline. Relay fisik tidak bisa menerima perintah.'
      : connection === 'Memeriksa perangkat...'
        ? 'Sistem masih menunggu heartbeat perangkat.'
        : connection === 'Memulihkan...'
          ? 'Koneksi cloud sedang dipulihkan.'
          : 'Perangkat belum siap menerima perintah.';
  const recentLogs = useMemo(() => logs.slice(0, 15), [logs]);
  const chartLogs = useMemo(() => logs.slice(0, 30).reverse(), [logs]);

  const handleRelayToggle = async (nextRelay: boolean) => {
    if (role !== 'admin') {
      showNotification('Akses ditolak', 'Hanya admin yang bisa mengontrol relay.');
      return;
    }
    if (!relayControlAllowed) {
      showNotification('Perintah relay diblokir', relayDisabledReason);
      return;
    }
    setLoadingRelay(true);
    try {
      await set(ref(db, 'commands/relay'), nextRelay ? 1 : 0);
    } catch (error) {
      console.error('Error toggling relay:', error);
      showNotification('Gagal mengubah relay', 'Request relay ditolak atau gagal terkirim.');
    } finally {
      setLoadingRelay(false);
    }
  };

  const handleResetZoom = () => {
    (primaryChartRef.current as any)?.resetZoom?.();
    (supportChartRef.current as any)?.resetZoom?.();
  };

  const metricCards = [
    {
      label: 'Arus',
      value: formatNumber(currentData?.arus, 2),
      unit: 'A',
      tone: 'text-emerald-300',
      border: 'border-t-emerald-400',
      sub: 'PZEM-004T Meter',
    },
    {
      label: 'Tegangan',
      value: formatNumber(currentData?.tegangan, 1),
      unit: 'V',
      tone: 'text-sky-200',
      border: 'border-t-sky-400',
      sub: 'PZEM-004T Meter',
    },
    {
      label: 'Daya Aktif (W)',
      value: formatNumber(currentData?.daya, 0),
      unit: 'W',
      tone: 'text-amber-200',
      border: 'border-t-amber-400',
      sub: 'V×I×PF (dari perangkat)',
    },
    {
      label: 'Energi (kWh)',
      value: formatNumber(currentData?.energi_kwh, 3, '0.000'),
      unit: 'kWh',
      tone: 'text-slate-100',
      border: 'border-t-violet-400/70',
      sub: 'Akumulasi meter',
    },
    {
      label: 'Power Factor',
      value: formatNumber(currentData?.power_factor, 2, '0.00'),
      unit: '',
      tone: 'text-slate-100',
      border: 'border-t-cyan-400/70',
      sub: 'Meter / fallback settings',
    },
    {
      label: 'Frekuensi',
      value: formatNumber(currentData?.frekuensi, 0),
      unit: 'Hz',
      tone: 'text-slate-100',
      border: 'border-t-orange-400/70',
      sub: 'Meter / fallback',
    },
    {
      label: 'Apparent (VA)',
      value: formatNumber(currentData?.apparent_power, 0),
      unit: 'VA',
      tone: 'text-slate-100',
      border: 'border-t-slate-500',
      sub: 'V × I',
    },
  ];

  const primaryChartData = {
    labels: chartLogs.map((log) => formatClock(Number(log.timestamp))),
    datasets: [
      {
        label: 'Arus (A)',
        data: chartLogs.map((log) => Number(log.arus || 0)),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yCurrent',
      },
      {
        label: 'Tegangan (V)',
        data: chartLogs.map((log) => Number(log.tegangan || 0)),
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96, 165, 250, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yVoltage',
      },
      {
        label: 'Daya Aktif (W)',
        data: chartLogs.map((log) => Number(log.daya || 0)),
        borderColor: '#facc15',
        backgroundColor: 'rgba(250, 204, 21, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yPower',
      },
    ],
  };

  const supportChartData = {
    labels: chartLogs.map((log) => formatClock(Number(log.timestamp))),
    datasets: [
      {
        label: 'Energi (kWh)',
        data: chartLogs.map((log) => Number(log.energi_kwh || 0)),
        borderColor: '#a78bfa',
        backgroundColor: 'rgba(167, 139, 250, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yEnergy',
      },
      {
        label: 'Power Factor',
        data: chartLogs.map((log) => Number(log.power_factor || 0)),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yPf',
      },
      {
        label: 'Frekuensi (Hz)',
        data: chartLogs.map((log) => Number(log.frekuensi || 0)),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yFreq',
      },
      {
        label: 'Apparent (VA)',
        data: chartLogs.map((log) => Number(log.apparent_power || 0)),
        borderColor: '#fb923c',
        backgroundColor: 'rgba(251, 146, 60, 0.12)',
        tension: 0.34,
        pointRadius: 2,
        yAxisID: 'yApparent',
      },
    ],
  };

  const primaryChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { labels: { color: chartText, boxWidth: 14 } },
      tooltip: { enabled: true },
      zoom: {
        pan: { enabled: true, mode: 'x' as const },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'x' as const,
        },
      },
    },
    scales: {
      x: { ticks: { color: chartText }, grid: { color: chartGrid } },
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

  const supportChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { labels: { color: chartText, boxWidth: 14 } },
      tooltip: { enabled: true },
      zoom: {
        pan: { enabled: true, mode: 'x' as const },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'x' as const,
        },
      },
    },
    scales: {
      x: { ticks: { color: chartText }, grid: { color: chartGrid } },
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

  return (
    <div className="space-y-6 text-slate-100">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-4">
        <section className={`rounded-xl border p-6 shadow-xl ${statusUi.panel}`}>
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0 space-y-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
                Status Keselamatan
              </p>
              <div className={`inline-flex min-w-[220px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${statusUi.badge}`}>
                <span className="h-2 w-2 rounded-full bg-current" />
                {status}
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">{statusUi.title}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">{statusUi.hint}</p>
              </div>
            </div>
            <div className={`hidden sm:flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border ${statusUi.iconBox}`}>
              <StatusIcon className="h-9 w-9" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-6 shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Koneksi Perangkat
          </p>
          <h2 className="mt-3 text-xl font-black text-white">Realtime Heartbeat</h2>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            Perintah relay hanya aktif saat perangkat fisik terhubung dan siap menerima instruksi.
          </p>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-start gap-3 text-slate-300">
              <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
              <span>Sumber data mengikuti mode cloud/local yang aktif.</span>
            </div>
            <div className="flex items-start gap-3 text-slate-300">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
              <span>Update terakhir dan status heartbeat ditampilkan di header atas dashboard.</span>
            </div>
          </div>
        </section>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {metricCards.map((metric) => (
          <article
            key={metric.label}
            className={`rounded-xl border border-slate-700/75 bg-slate-900/70 p-5 shadow-lg border-t-2 ${metric.border}`}
          >
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{metric.label}</p>
            <p className={`mt-4 font-mono text-4xl font-black tracking-wider ${metric.tone}`}>
              {metric.value} {metric.unit && <span className="text-2xl">{metric.unit}</span>}
            </p>
            <p className="mt-3 text-sm text-slate-400">{metric.sub}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-slate-700/75 bg-slate-900/70 p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-700/70 pb-4">
          <div>
            <h2 className="text-lg font-black text-white">Kontrol Relay</h2>
            <p className="mt-1 text-sm text-slate-400">
              Aksi kritikal untuk memutus atau mengaktifkan beban listrik.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono font-black">
            <span className={`h-3 w-3 rounded-full ${currentData?.relay ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {relayLabel(currentData?.relay)}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => handleRelayToggle(true)}
            disabled={loadingRelay || !relayControlAllowed || currentData?.relay === true}
            title={relayControlAllowed ? 'Nyalakan relay' : relayDisabledReason}
            className="rounded-lg border border-emerald-500/35 bg-emerald-600/25 px-4 py-3 font-black text-emerald-100 transition hover:bg-emerald-600/35 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingRelay ? 'Memproses...' : 'Nyalakan Relay'}
          </button>
          <button
            onClick={() => handleRelayToggle(false)}
            disabled={loadingRelay || !relayControlAllowed || currentData?.relay === false}
            title={relayControlAllowed ? 'Matikan relay' : relayDisabledReason}
            className="rounded-lg border border-red-500/35 bg-red-600/25 px-4 py-3 font-black text-red-100 transition hover:bg-red-600/35 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingRelay ? 'Memproses...' : 'Matikan Relay'}
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          {relayControlAllowed
            ? 'Perangkat terhubung dan siap menerima perintah relay.'
            : relayDisabledReason}
        </p>
      </section>

      <section className="rounded-xl border border-slate-700/75 bg-slate-900/70 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/70 pb-4">
          <div>
            <h2 className="text-lg font-black text-white">Grafik Realtime</h2>
            <p className="mt-1 text-sm text-slate-400">
              Scroll untuk zoom • Drag untuk pan • Arus, tegangan, daya aktif (W) • 30 titik terakhir
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetZoom}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-black text-slate-100"
          >
            <Maximize2 className="h-4 w-4" />
            Reset Zoom
          </button>
        </div>
        <div className="mt-6 h-72 min-w-0">
          <Line ref={primaryChartRef} data={primaryChartData} options={primaryChartOptions} />
        </div>
        <div className="mt-8 border-t border-slate-700/70 pt-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
            Metrik pendukung realtime
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Energi (kWh), power factor, frekuensi, dan apparent power (VA) dipisah agar skala grafik utama tetap mudah dibaca.
          </p>
          <div className="mt-5 h-72 min-w-0">
            <Line ref={supportChartRef} data={supportChartData} options={supportChartOptions} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700/75 bg-slate-900/70 p-6 shadow-xl">
        <div className="flex flex-col gap-4 border-b border-slate-700/70 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-white">Log terkini</h2>
            <p className="mt-1 text-sm text-slate-400">
              Ringkas untuk pantauan cepat, detail untuk audit parameter listrik.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="text-sm text-slate-400">15 entri terakhir</span>
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
              {recentLogs.length > 0 ? (
                recentLogs.map((log) => {
                  const logStatus = String(log.status || 'NORMAL').toUpperCase();
                  const logUi = getStatusCopy(logStatus);
                  return logMode === 'summary' ? (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap px-4 py-3">{formatTime(Number(log.timestamp))}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {formatNumber(log.arus, 2)} A / {formatNumber(log.tegangan, 1)} V / {formatNumber(log.daya, 0)} W
                      </td>
                      <td className={`whitespace-nowrap px-4 py-3 font-black ${logUi.text}`}>{logStatus}</td>
                      <td className="whitespace-nowrap px-4 py-3">{relayLabel(Boolean(log.relay))}</td>
                      <td className="whitespace-nowrap px-4 py-3">{asSource(log, endpoint)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{getMeterSource(log)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatUptime(log)}</td>
                    </tr>
                  ) : (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap px-4 py-3">{formatTime(Number(log.timestamp))}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(log.arus, 2)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(log.tegangan, 1)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(log.daya, 0)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(log.energi_kwh, 3, '0.000')}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(log.power_factor, 2, '0.00')}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(log.frekuensi, 0)} Hz</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatNumber(log.apparent_power, 0)} VA</td>
                      <td className={`whitespace-nowrap px-4 py-3 font-black ${logUi.text}`}>{logStatus}</td>
                      <td className="whitespace-nowrap px-4 py-3">{relayLabel(Boolean(log.relay))}</td>
                      <td className="whitespace-nowrap px-4 py-3">{asSource(log, endpoint)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{getMeterSource(log)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatUptime(log)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={logMode === 'summary' ? 7 : 13} className="px-4 py-10">
                    <div className="flex flex-col items-center justify-center text-center text-slate-400">
                      <History className="h-9 w-9" />
                      <p className="mt-2 text-base font-semibold text-slate-200">Belum ada log</p>
                      <p className="mt-1 text-sm">Data terbaru akan muncul saat perangkat mengirim histori.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

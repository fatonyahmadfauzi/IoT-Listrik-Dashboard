import { useState } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '../lib/firebase';
import { showNotification } from '../lib/notifikasi';
import { useAuthStore, useDataStore } from '../lib/store';
import { useStore } from '../store';

const statusCopy: Record<
  string,
  {
    panel: string;
    badge: string;
    text: string;
    icon: string;
    title: string;
    hint: string;
  }
> = {
  NORMAL: {
    panel: 'border-emerald-500/55 bg-emerald-500/10',
    badge: 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200',
    text: 'text-emerald-300',
    icon: 'text-emerald-200 bg-emerald-500/20 border-emerald-400/30',
    title: 'Sistem stabil',
    hint: 'Data realtime dibaca dari perangkat dan dievaluasi berdasarkan ambang sistem.',
  },
  WARNING: {
    panel: 'border-amber-400/55 bg-amber-500/10',
    badge: 'border-amber-300/45 bg-amber-500/15 text-amber-100',
    text: 'text-amber-200',
    icon: 'text-amber-100 bg-amber-500/20 border-amber-300/30',
    title: 'Perlu perhatian',
    hint: 'Nilai listrik mendekati ambang batas. Periksa beban dan kondisi instalasi.',
  },
  LEAKAGE: {
    panel: 'border-orange-400/55 bg-orange-500/10',
    badge: 'border-orange-300/45 bg-orange-500/15 text-orange-100',
    text: 'text-orange-200',
    icon: 'text-orange-100 bg-orange-500/20 border-orange-300/30',
    title: 'Indikasi arus abnormal',
    hint: 'Sistem membaca indikasi arus abnormal berdasarkan ambang dan pola data perangkat.',
  },
  DANGER: {
    panel: 'border-red-400/60 bg-red-500/10',
    badge: 'border-red-300/50 bg-red-500/20 text-red-100',
    text: 'text-red-200',
    icon: 'text-red-100 bg-red-500/20 border-red-300/30',
    title: 'Kondisi berbahaya',
    hint: 'Relay perlu berada pada kondisi aman sampai data kembali normal.',
  },
};

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

export function Dashboard() {
  const { currentData, logs, connectionMeta } = useDataStore();
  const { role } = useAuthStore();
  const [loadingRelay, setLoadingRelay] = useState(false);
  // Alarm/notification sekarang dikontrol global dari App.tsx
  useStore();

  const endpoint = String(connectionMeta?.endpointBadge || 'CLOUD');
  const connection = String(connectionMeta?.connection || 'Memeriksa perangkat...');
  const fallback = connectionMeta?.fallbackActive ? ' · FALLBACK' : '';
  const lastDeviceSeenAt = Number(connectionMeta?.lastDeviceSeenAt ?? 0);
  const status = String(currentData?.status || 'NORMAL').toUpperCase();
  const statusUi = getStatusCopy(status);
  const relayControlAllowed = role === 'admin' && connection === 'Connected';
  const relayDisabledReason =
    connection === 'Device Offline'
      ? 'Perangkat offline. Relay fisik tidak menerima perintah.'
      : connection === 'Memeriksa perangkat...'
        ? 'Sistem masih menunggu heartbeat perangkat.'
        : connection === 'Memulihkan...'
          ? 'Koneksi cloud sedang dipulihkan.'
          : 'Perangkat belum siap menerima perintah.';
  const connectionColor =
    connection === 'Connected'
      ? 'text-emerald-300'
      : connection === 'Memeriksa perangkat...' || connection === 'Memulihkan...'
        ? 'text-amber-200'
        : 'text-red-200';

  const handleRelayToggle = async () => {
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
      await update(ref(db, 'listrik'), {
        relay: !currentData?.relay,
      });
    } catch (error) {
      console.error('Error toggling relay:', error);
      showNotification('Gagal mengubah relay', 'Request relay ditolak atau gagal terkirim.');
    } finally {
      setLoadingRelay(false);
    }
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
      sub: 'V x I x PF (dari perangkat)',
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
      border: 'border-t-slate-500',
      sub: 'Meter / fallback settings',
    },
    {
      label: 'Frekuensi',
      value: formatNumber(currentData?.frekuensi, 0),
      unit: 'Hz',
      tone: 'text-slate-100',
      border: 'border-t-slate-500',
      sub: 'Meter / fallback',
    },
    {
      label: 'Apparent (VA)',
      value: formatNumber(currentData?.apparent_power, 0),
      unit: 'VA',
      tone: 'text-slate-100',
      border: 'border-t-slate-500',
      sub: 'V x I',
    },
  ];

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
            <div className={`hidden sm:flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border ${statusUi.icon}`}>
              <span className="text-2xl font-black">{status === 'NORMAL' ? 'OK' : '!'}</span>
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
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-blue-700/50 bg-blue-900/40 px-2 py-1 text-xs font-black text-blue-200">
                {endpoint}
              </span>
              <span className={`font-bold ${connectionColor}`}>{connection}{fallback}</span>
            </div>
            <p className="text-slate-400">Update terakhir: {formatTime(lastDeviceSeenAt || currentData?.updated_at)}</p>
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
            {currentData?.relay ? 'ON' : 'OFF'}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleRelayToggle}
            disabled={loadingRelay || !relayControlAllowed || currentData?.relay === true}
            title={relayControlAllowed ? 'Nyalakan relay' : relayDisabledReason}
            className="rounded-lg border border-emerald-500/35 bg-emerald-600/25 px-4 py-3 font-black text-emerald-100 transition hover:bg-emerald-600/35 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingRelay ? 'Memproses...' : 'Nyalakan Relay'}
          </button>
          <button
            onClick={handleRelayToggle}
            disabled={loadingRelay || !relayControlAllowed || currentData?.relay === false}
            title={relayControlAllowed ? 'Matikan relay' : relayDisabledReason}
            className="rounded-lg border border-red-500/35 bg-red-600/25 px-4 py-3 font-black text-red-100 transition hover:bg-red-600/35 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingRelay ? 'Memproses...' : 'Matikan Relay'}
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          Auto-cutoff aktif: relay dimatikan otomatis saat terdeteksi arus abnormal atau bahaya. Perintah ON ditolak jika perangkat offline atau kondisi belum aman.
        </p>
      </section>

      <section className="rounded-xl border border-slate-700/75 bg-slate-900/70 p-6 shadow-xl">
        <h2 className="text-lg font-black text-white">Aktivitas Terbaru</h2>
        <div className="mt-4 divide-y divide-slate-700/70">
          {logs.length > 0 ? (
            logs.slice(0, 12).map((log) => {
              const logStatus = String(log.status || 'NORMAL').toUpperCase();
              const logUi = getStatusCopy(logStatus);
              return (
                <div key={log.id} className="flex justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm text-slate-200">
                      Status: <span className={`font-black ${logUi.text}`}>{logStatus}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Arus: {formatNumber(log.arus, 2)} A | Tegangan: {formatNumber(log.tegangan, 1)} V
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{formatTime(log.timestamp)}</span>
                </div>
              );
            })
          ) : (
            <p className="py-6 text-slate-400">Belum ada aktivitas.</p>
          )}
        </div>
      </section>
    </div>
  );
}

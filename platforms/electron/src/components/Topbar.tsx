import { Bell, Clock, Cloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuthStore, useDataStore } from '../lib/store';
import { useStore } from '../store';

type TopbarProps = {
  title: string;
};

export function Topbar({ title }: TopbarProps) {
  const { notifications } = useStore();
  const { currentData, connectionMeta } = useDataStore();
  const { isTempAccount, tempExpiresAt } = useAuthStore();
  const [, setClockTick] = useState(0);
  useEffect(() => {
    if (!isTempAccount || !tempExpiresAt) return;
    const timer = window.setInterval(() => setClockTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isTempAccount, tempExpiresAt]);
  const remainingSeconds = tempExpiresAt ? Math.max(0, Math.ceil((tempExpiresAt - Date.now()) / 1000)) : 0;
  const demoCountdown = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;
  const endpoint = isTempAccount ? 'SIM' : String(connectionMeta?.endpointBadge || 'CLOUD');
  const connection = String(connectionMeta?.connection || 'Memeriksa perangkat...');
  const fallback = connectionMeta?.fallbackActive ? ' · FALLBACK' : '';
  const lastDeviceSeenAt = Number(connectionMeta?.lastDeviceSeenAt ?? 0);
  const heartbeatLabel =
    connection === 'Connected'
      ? 'Heartbeat aktif'
      : connection === 'Device Offline'
        ? 'Tanpa heartbeat'
        : 'Menunggu heartbeat';
  const connectionColor =
    connection === 'Connected'
      ? 'text-emerald-200'
      : connection === 'Memeriksa perangkat...' || connection === 'Memulihkan...'
        ? 'text-amber-200'
        : 'text-red-200';

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '-';
    if (timestamp < 1e12) return 'Live';
    return new Date(timestamp).toLocaleString('id-ID');
  };

  const handleNotification = () => {
    if (window.electronAPI) {
      window.electronAPI.showNotification(
        'Test Notification',
        'This is a test notification from the app!'
      );
    }
  };

  return (
    <header className="min-h-16 bg-[#090d12] flex flex-col gap-3 border-b border-slate-800/90 px-4 py-3 shadow-[0_10px_35px_rgba(0,0,0,0.28)] lg:flex-row lg:items-center lg:justify-between sm:px-6 shrink-0">
      <h2 className="text-lg font-black text-white">
        {title}
      </h2>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <div className="flex h-10 max-w-full items-center gap-2 overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900/75 px-3 shadow-lg sm:max-w-[640px]">
          {isTempAccount && (
            <span className="shrink-0 rounded-md border border-amber-400/45 bg-amber-500/15 px-2 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-amber-100">
              DEMO {tempExpiresAt ? demoCountdown : ''}
            </span>
          )}
          <span className="shrink-0 rounded-md border border-blue-700/55 bg-blue-900/45 px-2 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-blue-200">
            {endpoint}
          </span>
          <span className={`shrink-0 whitespace-nowrap text-sm font-black ${connectionColor}`}>{connection}{fallback}</span>
          <span className="shrink-0 whitespace-nowrap rounded-full border border-slate-700 bg-slate-950/55 px-2.5 py-1 text-[11px] font-bold text-slate-300">
            {heartbeatLabel}
          </span>
          <span className="hidden h-4 w-px shrink-0 bg-slate-700/80 md:block" />
          <span className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-slate-400">
            <Cloud className="h-3.5 w-3.5 shrink-0 text-sky-300" />
            <span className="truncate">Update terakhir: {formatTime(lastDeviceSeenAt || currentData?.updated_at)}</span>
            <Clock className="hidden h-3.5 w-3.5 shrink-0 text-sky-300 md:block" />
          </span>
        </div>
        <button
          onClick={handleNotification}
          disabled={!notifications}
          title={notifications ? 'Test notifikasi' : 'Notifikasi nonaktif'}
          className="grid h-10 w-10 place-items-center rounded-lg border border-slate-700/80 bg-slate-900/70 text-slate-400 transition hover:border-sky-500/45 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

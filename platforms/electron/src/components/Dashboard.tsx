import { useDataStore, useAuthStore } from '../lib/store';
import { ref, update } from 'firebase/database';
import { db } from '../lib/firebase';
import { useState } from 'react';
import { useStore } from '../store';
import { showNotification } from '../lib/notifikasi';

export function Dashboard() {
  const { currentData, logs, connectionMeta } = useDataStore();
  const { role } = useAuthStore();
  const [loadingRelay, setLoadingRelay] = useState(false);
  // Alarm/notification sekarang dikontrol global dari App.tsx
  useStore();

  const ep = String(connectionMeta?.endpointBadge || 'CLOUD');
  const conn = String(connectionMeta?.connection || '—');
  const fb = connectionMeta?.fallbackActive ? ' · FALLBACK' : '';
  const lastDeviceSeenAt = Number(connectionMeta?.lastDeviceSeenAt ?? 0);
  const relayControlAllowed = role === 'admin' && conn === 'Connected';
  const relayDisabledReason =
    conn === 'Device Offline'
      ? 'Perangkat offline. Relay fisik tidak menerima perintah.'
      : conn === 'Memeriksa perangkat...'
      ? 'Sistem masih menunggu heartbeat perangkat.'
      : conn === 'Memulihkan...'
      ? 'Koneksi cloud sedang dipulihkan.'
      : 'Perangkat belum siap menerima perintah.';

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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'NORMAL':
        return 'text-green-600';
      case 'WARNING':
        return 'text-yellow-600';
      case 'LEAKAGE':
        return 'text-orange-600';
      case 'DANGER':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBgColor = (status?: string) => {
    switch (status) {
      case 'NORMAL':
        return 'bg-green-100 dark:bg-green-900';
      case 'WARNING':
        return 'bg-yellow-100 dark:bg-yellow-900';
      case 'LEAKAGE':
        return 'bg-orange-100 dark:bg-orange-900';
      case 'DANGER':
        return 'bg-red-100 dark:bg-red-900';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '-';
    if (timestamp < 1e12) return 'Live';
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="px-2 py-1 rounded-md bg-blue-900/40 text-blue-200 border border-blue-700/50 font-semibold tracking-wide">
          {ep}
        </span>
        <span className="text-gray-400">
          {conn}
          {fb}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Arus
          </h3>
          <p className="text-3xl font-bold text-blue-600">
            {currentData?.arus?.toFixed(2) || '0.00'}{' '}
            <span className="text-lg">A</span>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Tegangan
          </h3>
          <p className="text-3xl font-bold text-green-600">
            {currentData?.tegangan?.toFixed(2) || '0.00'}{' '}
            <span className="text-lg">V</span>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Daya (est. W)
          </h3>
          <p className="text-3xl font-bold text-purple-600">
            {currentData?.daya?.toFixed(0) || '0'}{' '}
            <span className="text-lg">W</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            VA: {currentData?.apparent_power?.toFixed(0) || '0'}
          </p>
        </div>

        <div
          className={`${getStatusBgColor(currentData?.status)} p-6 rounded-lg shadow`}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Status
          </h3>
          <p
            className={`text-2xl font-bold ${getStatusColor(currentData?.status)}`}
          >
            {currentData?.status || 'UNKNOWN'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Energi
          </h3>
          <p className="text-2xl font-bold text-amber-500">
            {currentData?.energi_kwh?.toFixed(3) ?? '0.000'} kWh
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Power factor
          </h3>
          <p className="text-2xl font-bold text-gray-200">
            {currentData?.power_factor?.toFixed(2) ?? '—'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Frekuensi
          </h3>
          <p className="text-2xl font-bold text-gray-200">
            {currentData?.frekuensi?.toFixed(0) ?? '50'} Hz
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow flex items-center">
          <p className="text-sm text-gray-500">
            Data: Firebase hybrid + optional REST lokal. Atur di Settings → Backend.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Relay Status
              </h3>
              <p
                className={`text-xl font-bold ${currentData?.relay ? 'text-green-600' : 'text-red-600'}`}
              >
                {currentData?.relay ? 'ON' : 'OFF'}
              </p>
            </div>
            {role === 'admin' && (
              <button
                onClick={handleRelayToggle}
                disabled={loadingRelay || !relayControlAllowed}
                title={relayControlAllowed ? 'Toggle relay' : relayDisabledReason}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
              >
                {loadingRelay ? 'Loading...' : 'Toggle'}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Updated: {formatTime(lastDeviceSeenAt || currentData?.updated_at)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Info
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {conn}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Role:</span>
              <span className="font-semibold text-gray-900 dark:text-white capitalize">
                {role || 'User'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h3>
        <div className="space-y-3">
          {logs.length > 0 ? (
            logs.slice(0, 12).map((log) => (
              <div
                key={log.id}
                className="flex justify-between items-start py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
              >
                <div>
                  <p className="text-gray-700 dark:text-gray-300">
                    Status:{' '}
                    <span
                      className={`font-semibold ${getStatusColor(log.status)}`}
                    >
                      {log.status}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Arus: {log.arus?.toFixed(2) || '0'} A | Tegangan:{' '}
                    {log.tegangan?.toFixed(2) || '0'} V
                  </p>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                  {formatTime(log.timestamp)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No activity yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

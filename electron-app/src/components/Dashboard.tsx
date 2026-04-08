
import { useDataStore, useAuthStore } from '../lib/store';
import { ref, update } from 'firebase/database';
import { db } from '../lib/firebase';
import { useState } from 'react';

export function Dashboard() {
  const { currentData, logs } = useDataStore();
  const { role } = useAuthStore();
  const [loadingRelay, setLoadingRelay] = useState(false);

  const handleRelayToggle = async () => {
    if (role !== 'admin') return;
    setLoadingRelay(true);
    try {
      await update(ref(db, 'listrik'), {
        relay: !currentData?.relay,
      });
    } catch (error) {
      console.error('Error toggling relay:', error);
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
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Arus
          </h3>
          <p className="text-3xl font-bold text-blue-600">
            {currentData?.arus?.toFixed(2) || '0.00'} <span className="text-lg">A</span>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Tegangan
          </h3>
          <p className="text-3xl font-bold text-green-600">
            {currentData?.tegangan?.toFixed(2) || '0.00'} <span className="text-lg">V</span>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Daya Semu
          </h3>
          <p className="text-3xl font-bold text-purple-600">
            {currentData?.apparent_power?.toFixed(2) || '0.00'} <span className="text-lg">VA</span>
          </p>
        </div>

        <div className={`${getStatusBgColor(currentData?.status)} p-6 rounded-lg shadow`}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Status
          </h3>
          <p className={`text-2xl font-bold ${getStatusColor(currentData?.status)}`}>
            {currentData?.status || 'UNKNOWN'}
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
              <p className={`text-xl font-bold ${currentData?.relay ? 'text-green-600' : 'text-red-600'}`}>
                {currentData?.relay ? 'ON' : 'OFF'}
              </p>
            </div>
            {role === 'admin' && (
              <button
                onClick={handleRelayToggle}
                disabled={loadingRelay}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
              >
                {loadingRelay ? 'Loading...' : 'Toggle'}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Updated: {formatTime(currentData?.updated_at)}
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
                {currentData ? 'Online' : 'Offline'}
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
            logs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex justify-between items-start py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <div>
                  <p className="text-gray-700 dark:text-gray-300">
                    Status: <span className={`font-semibold ${getStatusColor(log.status)}`}>
                      {log.status}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Arus: {log.arus?.toFixed(2) || '0'} A | Tegangan: {log.tegangan?.toFixed(2) || '0'} V
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


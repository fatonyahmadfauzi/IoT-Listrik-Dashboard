import { useState } from 'react';
import { Download } from 'lucide-react';
import { useDataStore } from '../lib/store';

export function History() {
  const { logs } = useDataStore();
  const [filterStatus, setFilterStatus] = useState<'' | 'NORMAL' | 'WARNING' | 'LEAKAGE' | 'DANGER'>('');

  const filteredLogs = filterStatus
    ? logs.filter((log) => log.status === filterStatus)
    : logs;

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

  const handleExportCSV = () => {
    const headers = ['Time', 'Arus (A)', 'Tegangan (V)', 'Daya (VA)', 'Status', 'Relay', 'Source'];
    const rows = filteredLogs.map((log) => [
      formatTime(log.timestamp),
      log.arus?.toFixed(2) || '0',
      log.tegangan?.toFixed(2) || '0',
      log.apparent_power?.toFixed(2) || '0',
      log.status,
      log.relay ? 'ON' : 'OFF',
      log.source || 'ESP32',
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">History</h2>
          <p className="text-gray-600 dark:text-gray-400">Last {filteredLogs.length} entries</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => setFilterStatus('')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filterStatus === ''
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          All
        </button>
        {(['NORMAL', 'WARNING', 'LEAKAGE', 'DANGER'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-semibold transition capitalize ${
              filterStatus === status
                ? `${getStatusBgColor(status)} ${getStatusColor(status)}`
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-900 dark:text-white">
                Time
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-900 dark:text-white">
                Arus (A)
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-900 dark:text-white">
                Tegangan (V)
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-900 dark:text-white">
                Daya (VA)
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-900 dark:text-white">
                Status
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-900 dark:text-white">
                Relay
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-900 dark:text-white">
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {formatTime(log.timestamp)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {log.arus?.toFixed(2) || '0.00'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {log.tegangan?.toFixed(2) || '0.00'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {log.apparent_power?.toFixed(2) || '0.00'}
                  </td>
                  <td className={`py-3 px-4 text-sm font-semibold ${getStatusColor(log.status)}`}>
                    {log.status}
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {log.relay ? 'ON' : 'OFF'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {log.source || 'ESP32'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-8 px-4 text-center text-gray-500 dark:text-gray-400">
                  No logs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

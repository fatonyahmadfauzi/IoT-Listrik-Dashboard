import { useDataStore } from '../lib/store';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export function Analytics() {
  const { logs, currentData } = useDataStore();

  // Calculate statistics
  const stats = {
    avgCurrent:
      logs.length > 0
        ? (
            logs.reduce((sum, log) => sum + (log.arus || 0), 0) / logs.length
          ).toFixed(2)
        : '0.00',
    maxCurrent:
      logs.length > 0
        ? Math.max(...logs.map((log) => log.arus || 0)).toFixed(2)
        : '0.00',
    minCurrent:
      logs.length > 0
        ? Math.min(...logs.map((log) => log.arus || 0)).toFixed(2)
        : '0.00',

    avgVoltage:
      logs.length > 0
        ? (
            logs.reduce((sum, log) => sum + (log.tegangan || 0), 0) /
            logs.length
          ).toFixed(2)
        : '0.00',
    maxVoltage:
      logs.length > 0
        ? Math.max(...logs.map((log) => log.tegangan || 0)).toFixed(2)
        : '0.00',
    minVoltage:
      logs.length > 0
        ? Math.min(...logs.map((log) => log.tegangan || 0)).toFixed(2)
        : '0.00',

    warningCount: logs.filter((log) => log.status === 'WARNING').length,
    leakageCount: logs.filter((log) => log.status === 'LEAKAGE').length,
    dangerCount: logs.filter((log) => log.status === 'DANGER').length,
    normalCount: logs.filter((log) => log.status === 'NORMAL').length,
  };

  // Calculate power statistics
  const avgPower =
    logs.length > 0
      ? (
          logs.reduce((sum, log) => sum + (log.apparent_power || 0), 0) /
          logs.length
        ).toFixed(2)
      : '0.00';
  const maxPower =
    logs.length > 0
      ? Math.max(...logs.map((log) => log.apparent_power || 0)).toFixed(2)
      : '0.00';

  // Estimated daily usage (assuming logs are hourly)
  const estimatedDaily = ((parseFloat(avgPower) * 24) / 1000).toFixed(2);

  // Chart Data
  const lineData = {
    labels: logs.map((_, i) => `#${i + 1}`),
    datasets: [
      {
        label: 'Current (A)',
        data: logs.map((log) => log.arus || 0),
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.2)',
        yAxisID: 'y',
      },
      {
        label: 'Voltage (V)',
        data: logs.map((log) => log.tegangan || 0),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        yAxisID: 'y1',
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Current & Voltage Trend' },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: { display: true, text: 'Current (A)' },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Voltage (V)' },
      },
    },
  };

  const pieData = {
    labels: ['Normal', 'Warning', 'Leakage', 'Danger'],
    datasets: [
      {
        label: 'Status',
        data: [
          stats.normalCount,
          stats.warningCount,
          stats.leakageCount,
          stats.dangerCount,
        ],
        backgroundColor: [
          'rgb(22, 163, 74)',
          'rgb(202, 138, 4)',
          'rgb(251, 146, 60)',
          'rgb(220, 38, 38)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Analytics Overview
      </h2>

      {/* Chart Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <Line data={lineData} options={lineOptions} height={220} />
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow flex flex-col items-center justify-center">
          <Pie data={pieData} />
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center space-x-4">
              <span className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-green-600 inline-block mr-1"></span>
                Normal
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-yellow-600 inline-block mr-1"></span>
                Warning
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-orange-600 inline-block mr-1"></span>
                Leakage
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-red-600 inline-block mr-1"></span>
                Danger
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
            Avg Current
          </h4>
          <p className="text-3xl font-bold text-blue-600">
            {stats.avgCurrent} <span className="text-lg">A</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Max: {stats.maxCurrent} A | Min: {stats.minCurrent} A
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
            Avg Voltage
          </h4>
          <p className="text-3xl font-bold text-green-600">
            {stats.avgVoltage} <span className="text-lg">V</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Max: {stats.maxVoltage} V | Min: {stats.minVoltage} V
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
            Peak Power
          </h4>
          <p className="text-3xl font-bold text-purple-600">
            {maxPower} <span className="text-lg">VA</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Avg: {avgPower} VA
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
            Est. Daily Usage
          </h4>
          <p className="text-3xl font-bold text-orange-600">
            {estimatedDaily} <span className="text-lg">kWh</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Based on {logs.length} log entries
          </p>
        </div>
      </div>

      {/* Status & Current Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Status Distribution (Last {logs.length} entries)
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                <span className="text-gray-700 dark:text-gray-300">Normal</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stats.normalCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  Warning
                </span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stats.warningCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  Leakage
                </span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stats.leakageCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-600"></div>
                <span className="text-gray-700 dark:text-gray-300">Danger</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stats.dangerCount}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Status
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700 dark:text-gray-300">
                Current Reading
              </span>
              <span className="font-semibold text-blue-600">
                {currentData?.arus?.toFixed(2) || '0.00'} A
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700 dark:text-gray-300">
                Voltage Reading
              </span>
              <span className="font-semibold text-green-600">
                {currentData?.tegangan?.toFixed(2) || '0.00'} V
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700 dark:text-gray-300">
                Power Reading
              </span>
              <span className="font-semibold text-purple-600">
                {currentData?.apparent_power?.toFixed(2) || '0.00'} VA
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700 dark:text-gray-300">
                Relay Status
              </span>
              <span
                className={`font-semibold ${currentData?.relay ? 'text-green-600' : 'text-red-600'}`}
              >
                {currentData?.relay ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

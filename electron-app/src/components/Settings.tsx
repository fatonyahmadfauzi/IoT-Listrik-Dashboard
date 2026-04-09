import { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { useDataStore, useAuthStore } from '../lib/store';
import { db } from '../lib/firebase';
import { ref, update, remove } from 'firebase/database';
import {
  loadClientConfig,
  saveClientConfig,
  type ClientBackendConfig,
} from '../lib/clientConfig';

interface SettingsProps {
  onLogout: () => void;
}

export function Settings({ onLogout }: SettingsProps) {
  const { settings, users } = useDataStore();
  const { role, user } = useAuthStore();
  const [tab, setTab] = useState<
    'system' | 'calibration' | 'telegram' | 'users' | 'backend'
  >('system');
  const [loading, setLoading] = useState(false);
  const [clientCfg, setClientCfg] = useState<ClientBackendConfig>(() =>
    loadClientConfig()
  );
  const [localSrvMsg, setLocalSrvMsg] = useState('');

  useEffect(() => {
    if (tab === 'backend') setClientCfg(loadClientConfig());
  }, [tab]);

  const [threshold, setThreshold] = useState(settings?.threshold || 5);
  const [sendInterval, setSendInterval] = useState(settings?.send_interval || 60);
  const [buzzer, setBuzzer] = useState(settings?.buzzer_enabled || true);
  const [autoCutoff, setAutoCutoff] = useState(settings?.auto_cutoff || false);

  const [currentCalib, setCurrentCalib] = useState(settings?.calibration?.arus || 1);
  const [voltageCalib, setVoltageCalib] = useState(settings?.calibration?.tegangan || 1);

  const [telegramToken, setTelegramToken] = useState(settings?.telegram?.bot_token || '');
  const [telegramChat, setTelegramChat] = useState(settings?.telegram?.chat_id || '');

  const [newUserEmail, setNewUserEmail] = useState('');

  const isAdmin = role === 'admin';

  const handleSaveSystem = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      await update(ref(db, 'settings'), {
        threshold,
        send_interval: sendInterval,
        buzzer_enabled: buzzer,
        auto_cutoff: autoCutoff,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCalibration = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      await update(ref(db, 'settings/calibration'), {
        arus: currentCalib,
        tegangan: voltageCalib,
      });
    } catch (error) {
      console.error('Error saving calibration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTelegram = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      await update(ref(db, 'settings/telegram'), {
        bot_token: telegramToken,
        chat_id: telegramChat,
      });
    } catch (error) {
      console.error('Error saving Telegram settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (uid: string, newRole: 'admin' | 'user') => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      await update(ref(db, `users/${uid}`), {
        role: newRole,
      });
    } catch (error) {
      console.error('Error changing role:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!isAdmin || uid === user?.uid) return; // Prevent self-delete
    if (!confirm('Are you sure?')) return;
    setLoading(true);
    try {
      await remove(ref(db, `users/${uid}`));
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Anda harus admin untuk mengakses pengaturan sistem.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h1>
        <button
          onClick={onLogout}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
        {(
          ['system', 'calibration', 'telegram', 'backend', 'users'] as const
        ).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md font-semibold capitalize transition ${
              tab === t
                ? 'bg-blue-600 text-white'
                : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* System Tab */}
      {tab === 'system' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Configuration
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Threshold (A)
            </label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Send Interval (seconds)
            </label>
            <input
              type="number"
              value={sendInterval}
              onChange={(e) => setSendInterval(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
            />
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="buzzer"
              checked={buzzer}
              onChange={(e) => setBuzzer(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="buzzer" className="text-gray-700 dark:text-gray-300">
              Enable Buzzer
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="autoCutoff"
              checked={autoCutoff}
              onChange={(e) => setAutoCutoff(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoCutoff" className="text-gray-700 dark:text-gray-300">
              Auto Cutoff on Danger
            </label>
          </div>

          <button
            onClick={handleSaveSystem}
            disabled={loading}
            className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

      {/* Calibration Tab */}
      {tab === 'calibration' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sensor Calibration
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Calibration Factor
            </label>
            <input
              type="number"
              step="0.01"
              value={currentCalib}
              onChange={(e) => setCurrentCalib(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Voltage Calibration Factor
            </label>
            <input
              type="number"
              step="0.01"
              value={voltageCalib}
              onChange={(e) => setVoltageCalib(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
            />
          </div>

          <button
            onClick={handleSaveCalibration}
            disabled={loading}
            className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

      {/* Telegram Tab */}
      {tab === 'telegram' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Telegram Integration
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bot Token
            </label>
            <input
              type="password"
              value={telegramToken}
              onChange={(e) => setTelegramToken(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
              placeholder="Enter bot token"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Chat ID
            </label>
            <input
              type="text"
              value={telegramChat}
              onChange={(e) => setTelegramChat(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
              placeholder="Enter chat ID"
            />
          </div>

          <button
            onClick={handleSaveTelegram}
            disabled={loading}
            className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

      {/* Backend / failover (localStorage + optional local process) */}
      {tab === 'backend' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Backend &amp; failover
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Disimpan per aplikasi (localStorage). Sama dengan panel web → Backend
            klien. Mode AUTO: Firebase dulu, lalu REST lokal jika koneksi RTDB putus.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Public API base (opsional)
              </label>
              <input
                className="w-full rounded-lg border border-gray-700 bg-gray-900 text-white p-2"
                value={clientCfg.publicApiBase}
                onChange={(e) =>
                  setClientCfg({ ...clientCfg, publicApiBase: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Local API base
              </label>
              <input
                className="w-full rounded-lg border border-gray-700 bg-gray-900 text-white p-2"
                value={clientCfg.localApiBase}
                onChange={(e) =>
                  setClientCfg({ ...clientCfg, localApiBase: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Mode
              </label>
              <select
                className="w-full rounded-lg border border-gray-700 bg-gray-900 text-white p-2"
                value={clientCfg.mode}
                onChange={(e) =>
                  setClientCfg({
                    ...clientCfg,
                    mode: e.target.value as ClientBackendConfig['mode'],
                  })
                }
              >
                <option value="AUTO">AUTO</option>
                <option value="PUBLIC">PUBLIC</option>
                <option value="LOCAL">LOCAL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Health path
              </label>
              <input
                className="w-full rounded-lg border border-gray-700 bg-gray-900 text-white p-2"
                value={clientCfg.healthPath}
                onChange={(e) =>
                  setClientCfg({ ...clientCfg, healthPath: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={clientCfg.autoFailover}
                onChange={(e) =>
                  setClientCfg({ ...clientCfg, autoFailover: e.target.checked })
                }
              />
              <span className="text-sm text-gray-300">Auto failover</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={clientCfg.autoStartLocal}
                onChange={(e) =>
                  setClientCfg({ ...clientCfg, autoStartLocal: e.target.checked })
                }
              />
              <span className="text-sm text-gray-300">
                Auto-start local server (Windows)
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Working directory (local server)
              </label>
              <input
                className="w-full rounded-lg border border-gray-700 bg-gray-900 text-white p-2"
                value={clientCfg.localServerPath}
                onChange={(e) =>
                  setClientCfg({ ...clientCfg, localServerPath: e.target.value })
                }
                placeholder="E:\\...\\backend-local"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Start command
              </label>
              <input
                className="w-full rounded-lg border border-gray-700 bg-gray-900 text-white p-2"
                value={clientCfg.localStartCmd}
                onChange={(e) =>
                  setClientCfg({ ...clientCfg, localStartCmd: e.target.value })
                }
                placeholder="node server.js"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                saveClientConfig(clientCfg);
                setLocalSrvMsg('Konfigurasi disimpan.');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Simpan konfigurasi klien
            </button>
            {typeof window !== 'undefined' && window.electronAPI?.startLocalServer && (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    const r = await window.electronAPI!.startLocalServer({
                      cwd: clientCfg.localServerPath || '.',
                      command: clientCfg.localStartCmd || 'node server.js',
                    });
                    setLocalSrvMsg(r.ok ? 'Server start dipanggil.' : r.error || 'Gagal');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Start local server
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await window.electronAPI!.stopLocalServer();
                    setLocalSrvMsg('Stop dikirim.');
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold"
                >
                  Stop local server
                </button>
              </>
            )}
          </div>
          {localSrvMsg && (
            <p className="text-sm text-gray-400">{localSrvMsg}</p>
          )}
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            User Management
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add New User
            </label>
            <div className="flex space-x-2">
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
              />
              <button
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
                disabled
              >
                Invite
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Users can register themselves. Admin will upgrade as needed.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-900 dark:text-white">
                    Email
                  </th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-900 dark:text-white">
                    Role
                  </th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-900 dark:text-white">
                    Created
                  </th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-gray-900 dark:text-white">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.uid} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-2 px-2 text-sm text-gray-700 dark:text-gray-300">
                      {u.email}
                      {u.uid === user?.uid && <span className="ml-2 text-xs text-blue-600">(You)</span>}
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={u.role || 'user'}
                        onChange={(e) => handleChangeRole(u.uid, e.target.value as 'admin' | 'user')}
                        disabled={loading || u.uid === user?.uid}
                        className="text-sm rounded px-2 py-1 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white disabled:opacity-50"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(u.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        onClick={() => handleDeleteUser(u.uid)}
                        disabled={loading || u.uid === user?.uid}
                        className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


import { useState, useEffect } from 'react';
import { LogOut, Eye, EyeOff } from 'lucide-react';
import { useDataStore, useAuthStore } from '../lib/store';
import { db } from '../lib/firebase';
import { ref, update, remove, set } from 'firebase/database';
import {
  loadClientConfig,
  saveClientConfig,
  type ClientBackendConfig,
} from '../lib/clientConfig';

interface SettingsProps {
  onLogout: () => void;
}

function normalizeTelegramChatId(value: unknown): string {
  const id = String(value ?? '').trim();
  return /^-?\d+$/.test(id) ? id : '';
}

function parseTelegramChatIds(...sources: unknown[]): string[] {
  const ids: string[] = [];
  const add = (value: unknown) => {
    const id = normalizeTelegramChatId(value);
    if (id && !ids.includes(id)) ids.push(id);
  };

  const visit = (source: unknown) => {
    if (source == null) return;
    if (Array.isArray(source)) {
      source.forEach(visit);
      return;
    }
    if (typeof source === 'object') {
      Object.values(source as Record<string, unknown>).forEach(visit);
      return;
    }
    String(source).split(/[\s,;]+/).forEach(add);
  };

  sources.forEach(visit);
  return ids;
}

export function Settings({ onLogout }: SettingsProps) {
  const { settings, users } = useDataStore();
  const { role, user } = useAuthStore();
  const [tab, setTab] = useState<
    'system' | 'calibration' | 'telegram' | 'discord' | 'backend' | 'users'
  >('system');
  const [loading, setLoading] = useState(false);
  const [clientCfg, setClientCfg] = useState<ClientBackendConfig>(() =>
    loadClientConfig()
  );
  const [localSrvMsg, setLocalSrvMsg] = useState('');

  useEffect(() => {
    if (tab === 'backend') setClientCfg(loadClientConfig());
  }, [tab]);

  // System
  const [thresholdArus, setThresholdArus] = useState(settings?.thresholdArus ?? settings?.threshold ?? 10);
  const [warningPercent, setWarningPercent] = useState(settings?.warningPercent ?? 80);
  const [sendIntervalMs, setSendIntervalMs] = useState(settings?.sendIntervalMs ?? settings?.send_interval ?? 2000);
  const [buzzerEnabled, setBuzzerEnabled] = useState(settings?.buzzerEnabled ?? settings?.buzzer_enabled ?? true);
  const [autoCutoffEnabled, setAutoCutoffEnabled] = useState(settings?.autoCutoffEnabled ?? settings?.auto_cutoff ?? true);
  const [powerFactorEstimate, setPowerFactorEstimate] = useState(settings?.powerFactorEstimate ?? 0.85);
  const [frequencyHz, setFrequencyHz] = useState(settings?.frequencyHz ?? 50);

  // Calibration
  const [arusCalibration, setArusCalibration] = useState(settings?.arusCalibration ?? settings?.calibration?.arus ?? 1);
  const [teganganCalibration, setTeganganCalibration] = useState(settings?.teganganCalibration ?? settings?.calibration?.tegangan ?? 1);

  // Telegram
  const [telegramNotifyEnabled, setTelegramNotifyEnabled] = useState(settings?.telegramNotifyEnabled ?? true);
  const [telegramBotToken, setTelegramBotToken] = useState(settings?.telegramBotToken ?? settings?.telegram?.bot_token ?? '');
  const [telegramChatIds, setTelegramChatIds] = useState<string[]>(() =>
    parseTelegramChatIds(
      settings?.telegramChatIds,
      settings?.telegramChatId,
      settings?.telegram?.chat_id
    )
  );
  const [telegramChatIdDraft, setTelegramChatIdDraft] = useState('');
  const [editingChatIdIndex, setEditingChatIdIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!settings) return;
    setTelegramNotifyEnabled(settings.telegramNotifyEnabled ?? true);
    setTelegramBotToken(settings.telegramBotToken ?? settings.telegram?.bot_token ?? '');
    setTelegramChatIds(parseTelegramChatIds(
      settings.telegramChatIds,
      settings.telegramChatId,
      settings.telegram?.chat_id
    ));
  }, [settings]);

  // Discord
  const dSettings = settings?.discord || {};
  const [discordAlerts, setDiscordAlerts] = useState(dSettings.webhookAlerts || '');
  const [discordRelay, setDiscordRelay] = useState(dSettings.webhookRelay || '');
  const [discordMonitoring, setDiscordMonitoring] = useState(dSettings.webhookMonitoring || '');
  const [discordLogs, setDiscordLogs] = useState(dSettings.webhookLogs || '');
  const [discordEnabled, setDiscordEnabled] = useState(dSettings.enabled ?? true);

  const [newUserEmail, setNewUserEmail] = useState('');
  
  // Visibility toggles
  const [showTgToken, setShowTgToken] = useState(false);
  const [showDiscordAlerts, setShowDiscordAlerts] = useState(false);
  const [showDiscordRelay, setShowDiscordRelay] = useState(false);
  const [showDiscordMonitoring, setShowDiscordMonitoring] = useState(false);
  const [showDiscordLogs, setShowDiscordLogs] = useState(false);

  const isAdmin = role === 'admin';

  const handleSaveSystem = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      await update(ref(db, 'settings'), {
        thresholdArus,
        warningPercent,
        sendIntervalMs,
        buzzerEnabled,
        autoCutoffEnabled,
        powerFactorEstimate,
        frequencyHz,
      });
      alert('System configuration saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCalibration = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      await update(ref(db, 'settings'), {
        arusCalibration,
        teganganCalibration,
      });
      alert('Calibration saved successfully');
    } catch (error) {
      console.error('Error saving calibration:', error);
      alert('Failed to save calibration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTelegram = async () => {
    if (!isAdmin) return;

    let nextChatIds = [...telegramChatIds];
    const draft = telegramChatIdDraft.trim();
    if (draft) {
      const chatId = normalizeTelegramChatId(draft);
      if (!chatId) {
        alert('Chat ID harus angka. Untuk grup biasanya diawali -100.');
        return;
      }

      const duplicateIndex = nextChatIds.findIndex((id) => id === chatId);
      if (duplicateIndex !== -1 && duplicateIndex !== editingChatIdIndex) {
        alert('Chat ID sudah ada di daftar.');
        return;
      }

      if (editingChatIdIndex !== null) {
        nextChatIds[editingChatIdIndex] = chatId;
      } else {
        nextChatIds.push(chatId);
      }

      setTelegramChatIds(nextChatIds);
      setTelegramChatIdDraft('');
      setEditingChatIdIndex(null);
    }

    setLoading(true);
    try {
      await update(ref(db, 'settings'), {
        telegramBotToken,
        telegramChatId: nextChatIds.join(','),
        telegramChatIds: nextChatIds,
        telegramNotifyEnabled,
      });
      alert('Telegram integration saved successfully');
    } catch (error) {
      console.error('Error saving Telegram settings:', error);
      alert('Failed to save telegram integration');
    } finally {
      setLoading(false);
    }
  };

  const addOrUpdateTelegramChatId = () => {
    const chatId = normalizeTelegramChatId(telegramChatIdDraft);
    if (!chatId) {
      alert('Chat ID harus angka. Untuk grup biasanya diawali -100.');
      return;
    }

    const duplicateIndex = telegramChatIds.findIndex((id) => id === chatId);
    if (duplicateIndex !== -1 && duplicateIndex !== editingChatIdIndex) {
      alert('Chat ID sudah ada di daftar.');
      return;
    }

    if (editingChatIdIndex !== null) {
      setTelegramChatIds((ids) =>
        ids.map((id, index) => (index === editingChatIdIndex ? chatId : id))
      );
    } else {
      setTelegramChatIds((ids) => [...ids, chatId]);
    }

    setTelegramChatIdDraft('');
    setEditingChatIdIndex(null);
  };

  const editTelegramChatId = (index: number) => {
    setTelegramChatIdDraft(telegramChatIds[index]);
    setEditingChatIdIndex(index);
  };

  const removeTelegramChatId = (index: number) => {
    setTelegramChatIds((ids) => ids.filter((_, itemIndex) => itemIndex !== index));
    if (editingChatIdIndex === index) {
      setTelegramChatIdDraft('');
      setEditingChatIdIndex(null);
    }
  };

  const handleSaveDiscord = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      await set(ref(db, 'settings/discord'), {
        webhookAlerts: discordAlerts,
        webhookRelay: discordRelay,
        webhookMonitoring: discordMonitoring,
        webhookLogs: discordLogs,
        enabled: discordEnabled,
      });
      alert('Discord configuration saved successfully');
    } catch (error) {
      console.error('Error saving Discord settings:', error);
      alert('Failed to save discord integration');
    } finally {
      setLoading(false);
    }
  };

  const testDiscordWebhook = async () => {
    if (!discordAlerts.startsWith('https://discord.com/api/webhooks/')) {
      alert('Isi Webhook #alerts terlebih dahulu untuk test');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(discordAlerts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '🔔 Test Notifikasi — IoT Listrik Dashboard',
            description: 'Koneksi Discord Webhook berhasil! Sistem notifikasi Desktop siap digunakan.',
            color: 0x5865F2,
            fields: [
              { name: 'Status', value: '✅ Webhook terhubung', inline: true },
              { name: 'Waktu', value: new Date().toLocaleString('id-ID'), inline: true },
            ],
            footer: { text: 'IoT Listrik Dashboard Desktop — Discord Integration Test' },
          }],
        }),
      });
      if (res.ok || res.status === 204) {
        alert('Test embed berhasil dikirim ke #alerts!');
      } else {
        alert(`Discord menolak: HTTP ${res.status}`);
      }
    } catch (error: any) {
      alert('Gagal kirim test: ' + error.message);
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
      <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg overflow-x-auto">
        {(
          ['system', 'calibration', 'telegram', 'discord', 'backend', 'users'] as const
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Batas Arus Maksimal (A)
              </label>
              <input
                type="number"
                step="0.1"
                value={thresholdArus}
                onChange={(e) => setThresholdArus(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ambang Peringatan (%)
              </label>
              <input
                type="number"
                value={warningPercent}
                onChange={(e) => setWarningPercent(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interval Pengiriman Sensor (ms)
              </label>
              <input
                type="number"
                value={sendIntervalMs}
                onChange={(e) => setSendIntervalMs(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estimasi Power Factor
              </label>
              <input
                type="number"
                step="0.01"
                value={powerFactorEstimate}
                onChange={(e) => setPowerFactorEstimate(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Frekuensi Jaringan (Hz)
              </label>
              <input
                type="number"
                value={frequencyHz}
                onChange={(e) => setFrequencyHz(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 mt-4">
            <input
              type="checkbox"
              id="buzzer"
              checked={buzzerEnabled}
              onChange={(e) => setBuzzerEnabled(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="buzzer" className="text-gray-700 dark:text-gray-300">
              Enable Buzzer on Controller
            </label>
          </div>

          <div className="flex items-center space-x-3 mt-2">
            <input
              type="checkbox"
              id="autoCutoff"
              checked={autoCutoffEnabled}
              onChange={(e) => setAutoCutoffEnabled(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoCutoff" className="text-gray-700 dark:text-gray-300">
              Auto Cutoff on Danger Overload
            </label>
          </div>

          <button
            onClick={handleSaveSystem}
            disabled={loading}
            className="w-full mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
          >
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      )}

      {/* Calibration Tab */}
      {tab === 'calibration' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sensor Calibration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Calibration Factor (PZEM Arus)
              </label>
              <input
                type="number"
                step="0.001"
                value={arusCalibration}
                onChange={(e) => setArusCalibration(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Voltage Calibration Factor (PZEM Tegangan)
              </label>
              <input
                type="number"
                step="0.1"
                value={teganganCalibration}
                onChange={(e) => setTeganganCalibration(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
              />
            </div>
          </div>

          <button
            onClick={handleSaveCalibration}
            disabled={loading}
            className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
          >
            {loading ? 'Saving...' : 'Save Calibration'}
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
            <div className="relative">
              <input
                type={showTgToken ? "text" : "password"}
                value={telegramBotToken}
                onChange={(e) => setTelegramBotToken(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 pr-10"
                placeholder="1234567890:ABCDEF..."
              />
              <button 
                className="absolute right-3 top-3 text-gray-500"
                onClick={() => setShowTgToken(!showTgToken)}
              >
                {showTgToken ? <EyeOff size={20}/> : <Eye size={20}/>}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Chat ID / Group ID
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={telegramChatIdDraft}
                onChange={(e) => setTelegramChatIdDraft(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
                placeholder="Masukkan ID lalu klik Tambah"
              />
              <button
                type="button"
                onClick={addOrUpdateTelegramChatId}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition"
              >
                {editingChatIdIndex === null ? 'Tambah' : 'Update'}
              </button>
              {editingChatIdIndex !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setTelegramChatIdDraft('');
                    setEditingChatIdIndex(null);
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold transition"
                >
                  Batal
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Untuk grup biasanya diawali -100. Untuk pribadi gunakan ID numerik positif.
            </p>
            <div className="mt-3 space-y-2">
              {telegramChatIds.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-3 text-sm text-gray-500 dark:text-gray-400">
                  Belum ada Chat ID tersimpan.
                </div>
              ) : (
                telegramChatIds.map((chatId, index) => (
                  <div
                    key={`${chatId}-${index}`}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3"
                  >
                    <span className="font-mono text-sm text-gray-900 dark:text-white break-all">
                      {chatId}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editTelegramChatId(index)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTelegramChatId(index)}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 mt-4">
            <input
              type="checkbox"
              id="tgNotify"
              checked={telegramNotifyEnabled}
              onChange={(e) => setTelegramNotifyEnabled(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="tgNotify" className="text-gray-700 dark:text-gray-300">
              Aktifkan Telegram Notifications
            </label>
          </div>

          <button
            onClick={handleSaveTelegram}
            disabled={loading}
            className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
          >
            {loading ? 'Saving...' : 'Save Telegram Config'}
          </button>
        </div>
      )}

      {/* Discord Tab */}
      {tab === 'discord' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Discord Integration
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Konfigurasi koneksi webhook untuk log dan peringatan ke Discord.
          </p>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Webhook #alerts (Peringatan Bahaya)
              </label>
              <div className="relative">
                <input
                  type={showDiscordAlerts ? "text" : "password"}
                  value={discordAlerts}
                  onChange={(e) => setDiscordAlerts(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 pr-10"
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <button className="absolute right-3 top-3 text-gray-500" onClick={() => setShowDiscordAlerts(!showDiscordAlerts)}>
                  {showDiscordAlerts ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Webhook #relay (Status Relay Aktif/Mati)
              </label>
              <div className="relative">
                <input
                  type={showDiscordRelay ? "text" : "password"}
                  value={discordRelay}
                  onChange={(e) => setDiscordRelay(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 pr-10"
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <button className="absolute right-3 top-3 text-gray-500" onClick={() => setShowDiscordRelay(!showDiscordRelay)}>
                  {showDiscordRelay ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Webhook #monitoring (Data Realtime)
              </label>
              <div className="relative">
                <input
                  type={showDiscordMonitoring ? "text" : "password"}
                  value={discordMonitoring}
                  onChange={(e) => setDiscordMonitoring(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 pr-10"
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <button className="absolute right-3 top-3 text-gray-500" onClick={() => setShowDiscordMonitoring(!showDiscordMonitoring)}>
                  {showDiscordMonitoring ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Webhook #logs (Aktivitas Sistem)
              </label>
              <div className="relative">
                <input
                  type={showDiscordLogs ? "text" : "password"}
                  value={discordLogs}
                  onChange={(e) => setDiscordLogs(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 pr-10"
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <button className="absolute right-3 top-3 text-gray-500" onClick={() => setShowDiscordLogs(!showDiscordLogs)}>
                  {showDiscordLogs ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 mt-4">
            <input
              type="checkbox"
              id="discordEnabled"
              checked={discordEnabled}
              onChange={(e) => setDiscordEnabled(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="discordEnabled" className="text-gray-700 dark:text-gray-300">
              Aktifkan Integrasi Discord
            </label>
          </div>

          <div className="flex space-x-4 mt-6">
            <button
              onClick={handleSaveDiscord}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
            >
              {loading ? 'Saving...' : 'Simpan Konfigurasi'}
            </button>
            <button
              onClick={testDiscordWebhook}
              disabled={loading || !discordAlerts.startsWith('https://discord.com/api/webhooks/')}
              className="px-4 py-2 bg-transparent border border-[#5865F2] text-[#5865F2] hover:bg-[#5865F2] hover:text-white rounded-lg font-semibold transition disabled:opacity-50"
            >
              Test Kirim Ke #alerts
            </button>
          </div>
        </div>
      )}

      {/* Backend & Failover Tab */}
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Public API base (opsional)
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-2"
                value={clientCfg.publicApiBase}
                onChange={(e) =>
                  setClientCfg({ ...clientCfg, publicApiBase: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Local API base
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-2"
                value={clientCfg.localApiBase}
                onChange={(e) =>
                  setClientCfg({ ...clientCfg, localApiBase: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mode
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-2"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Health path
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-2"
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
              <span className="text-sm text-gray-700 dark:text-gray-300">Auto failover</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={clientCfg.autoStartLocal}
                onChange={(e) =>
                  setClientCfg({ ...clientCfg, autoStartLocal: e.target.checked })
                }
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Auto-start local server (Windows)
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Working directory (local server)
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-2"
                value={clientCfg.localServerPath}
                onChange={(e) =>
                  setClientCfg({ ...clientCfg, localServerPath: e.target.value })
                }
                placeholder="E:\...\backend-local"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start command
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-2"
                value={clientCfg.localStartCmd}
                onChange={(e) =>
                  setClientCfg({ ...clientCfg, localStartCmd: e.target.value })
                }
                placeholder="node server.js"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{localSrvMsg}</p>
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
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 px-2 text-xs font-semibold text-gray-900 dark:text-white">
                    Email
                  </th>
                  <th className="py-2 px-2 text-xs font-semibold text-gray-900 dark:text-white">
                    Role
                  </th>
                  <th className="py-2 px-2 text-xs font-semibold text-gray-900 dark:text-white">
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

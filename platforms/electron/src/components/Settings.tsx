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

interface TelegramRecipient {
  name: string;
  chatId: string;
}

interface DeviceBootstrapSettings {
  status?: string;
  statusMessage?: string;
  requestedAt?: string;
  requestedBy?: string;
  lastConfirmedAt?: string;
  activeSsid?: string;
  lastError?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  firebaseApiKey?: string;
  firebaseDbUrl?: string;
  iotEmail?: string;
  iotPassword?: string;
}

function normalizeTelegramChatId(value: unknown): string {
  const id = String(value ?? '').trim();
  return /^-?\d+$/.test(id) ? id : '';
}

function normalizeTelegramRecipient(value: unknown): TelegramRecipient | null {
  if (value == null) return null;

  if (typeof value === 'object' && !Array.isArray(value)) {
    const item = value as Record<string, unknown>;
    const chatId = normalizeTelegramChatId(
      item.chatId ?? item.telegramChatId ?? item.id
    );
    if (!chatId) return null;
    return {
      name: String(item.name ?? item.label ?? '').trim(),
      chatId,
    };
  }

  const chatId = normalizeTelegramChatId(value);
  return chatId ? { name: '', chatId } : null;
}

function parseTelegramRecipients(...sources: unknown[]): TelegramRecipient[] {
  const recipients: TelegramRecipient[] = [];
  const add = (value: unknown) => {
    const recipient = normalizeTelegramRecipient(value);
    if (!recipient) return;

    const existing = recipients.find((item) => item.chatId === recipient.chatId);
    if (existing) {
      if (!existing.name && recipient.name) existing.name = recipient.name;
      return;
    }
    recipients.push(recipient);
  };

  const visit = (source: unknown) => {
    if (source == null) return;
    if (Array.isArray(source)) {
      source.forEach(visit);
      return;
    }
    if (typeof source === 'object') {
      const item = source as Record<string, unknown>;
      if ('chatId' in item || 'telegramChatId' in item || 'id' in item) {
        add(source);
        return;
      }
      Object.entries(item)
        .filter(([key]) => !['name', 'label', 'displayName', 'title'].includes(key))
        .forEach(([, value]) => visit(value));
      return;
    }
    String(source).split(/[\s,;]+/).forEach(add);
  };

  sources.forEach(visit);
  return recipients;
}

const telegramLabelClass =
  'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2';
const telegramInputClass =
  'w-full min-h-[46px] rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
const telegramPrimaryActionClass =
  'min-h-[46px] px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition';
const telegramMutedActionClass =
  'min-h-[46px] px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-semibold transition';

export function Settings({ onLogout }: SettingsProps) {
  const { settings, users } = useDataStore();
  const { role, user, isTempAccount } = useAuthStore();
  const [tab, setTab] = useState<
    'system' | 'calibration' | 'telegram' | 'discord' | 'device' | 'backend' | 'users'
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
  const [telegramRecipients, setTelegramRecipients] = useState<TelegramRecipient[]>(() =>
    parseTelegramRecipients(
      settings?.telegramRecipients,
      settings?.telegramChatIds,
      settings?.telegramChatId,
      settings?.telegram?.chat_id
    )
  );
  const [telegramRecipientNameDraft, setTelegramRecipientNameDraft] = useState('');
  const [telegramChatIdDraft, setTelegramChatIdDraft] = useState('');
  const [editingChatIdIndex, setEditingChatIdIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!settings) return;
    setTelegramNotifyEnabled(settings.telegramNotifyEnabled ?? true);
    setTelegramBotToken(settings.telegramBotToken ?? settings.telegram?.bot_token ?? '');
    setTelegramRecipients(parseTelegramRecipients(
      settings.telegramRecipients,
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

  const bootstrapSettings = (settings?.deviceBootstrap || {}) as DeviceBootstrapSettings;
  const [deviceWifiSsid, setDeviceWifiSsid] = useState(bootstrapSettings.wifiSsid || '');
  const [deviceWifiPassword, setDeviceWifiPassword] = useState(bootstrapSettings.wifiPassword || '');
  const [deviceApiKey, setDeviceApiKey] = useState(bootstrapSettings.firebaseApiKey || '');
  const [deviceDbUrl, setDeviceDbUrl] = useState(bootstrapSettings.firebaseDbUrl || '');
  const [deviceEmail, setDeviceEmail] = useState(bootstrapSettings.iotEmail || '');
  const [devicePassword, setDevicePassword] = useState(bootstrapSettings.iotPassword || '');
  const [liveResetOtp, setLiveResetOtp] = useState('');
  const [liveResetActionId, setLiveResetActionId] = useState('');
  const [liveResetExpiresAt, setLiveResetExpiresAt] = useState<number | null>(null);
  const [liveResetMaskedEmail, setLiveResetMaskedEmail] = useState('');
  const [liveResetState, setLiveResetState] = useState<'idle' | 'otp_sent' | 'success' | 'error'>('idle');
  const [liveResetMessage, setLiveResetMessage] = useState('Bagian ini hanya mengosongkan data realtime di /listrik. Histori log tidak dihapus.');

  const [newUserEmail, setNewUserEmail] = useState('');
  
  // Visibility toggles
  const [showTgToken, setShowTgToken] = useState(false);
  const [showDiscordAlerts, setShowDiscordAlerts] = useState(false);
  const [showDiscordRelay, setShowDiscordRelay] = useState(false);
  const [showDiscordMonitoring, setShowDiscordMonitoring] = useState(false);
  const [showDiscordLogs, setShowDiscordLogs] = useState(false);
  const [showDeviceWifiPassword, setShowDeviceWifiPassword] = useState(false);
  const [showDeviceApiKey, setShowDeviceApiKey] = useState(false);
  const [showDevicePassword, setShowDevicePassword] = useState(false);
  const [liveResetLoading, setLiveResetLoading] = useState(false);

  const isAdmin = role === 'admin';
  const canManageDeviceBootstrap = isAdmin && !isTempAccount;
  const deviceBootstrapStatus = String(bootstrapSettings.status || 'idle').toLowerCase();
  const deviceBootstrapStatusLabel =
    {
      idle: 'Siap',
      pending: 'Menunggu ESP32',
      applying: 'Menyimpan ke NVS',
      restarting: 'Sedang restart',
      connected: 'Terkonfirmasi',
      portal: 'Masuk captive portal',
      error: 'Gagal diterapkan',
    }[deviceBootstrapStatus] || bootstrapSettings.status || 'Siap';
  const liveResetStatusLabel = {
    idle: 'Siap',
    otp_sent: 'OTP terkirim',
    success: 'Reset berhasil',
    error: 'Perlu perhatian',
  }[liveResetState];

  useEffect(() => {
    const next = (settings?.deviceBootstrap || {}) as DeviceBootstrapSettings;
    setDeviceWifiSsid(next.wifiSsid || '');
    setDeviceWifiPassword(next.wifiPassword || '');
    setDeviceApiKey(next.firebaseApiKey || '');
    setDeviceDbUrl(next.firebaseDbUrl || '');
    setDeviceEmail(next.iotEmail || '');
    setDevicePassword(next.iotPassword || '');
  }, [settings?.deviceBootstrap]);

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

    let nextRecipients = [...telegramRecipients];
    const name = telegramRecipientNameDraft.trim();
    const draft = telegramChatIdDraft.trim();
    if (draft || name) {
      if (!draft && name) {
        alert('Chat ID wajib diisi.');
        return;
      }
      const chatId = normalizeTelegramChatId(draft);
      if (!chatId) {
        alert('Chat ID harus angka. Untuk grup biasanya diawali -100.');
        return;
      }

      const duplicateIndex = nextRecipients.findIndex((item) => item.chatId === chatId);
      if (duplicateIndex !== -1 && duplicateIndex !== editingChatIdIndex) {
        alert('Chat ID sudah ada di daftar.');
        return;
      }

      const recipient = { name, chatId };
      if (editingChatIdIndex !== null) {
        nextRecipients[editingChatIdIndex] = recipient;
      } else {
        nextRecipients.push(recipient);
      }

      setTelegramRecipients(nextRecipients);
      setTelegramRecipientNameDraft('');
      setTelegramChatIdDraft('');
      setEditingChatIdIndex(null);
    }
    const nextChatIds = nextRecipients.map((recipient) => recipient.chatId);

    setLoading(true);
    try {
      await update(ref(db, 'settings'), {
        telegramBotToken,
        telegramChatId: nextChatIds.join(','),
        telegramChatIds: nextChatIds,
        telegramRecipients: nextRecipients,
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
    const name = telegramRecipientNameDraft.trim();
    if (!telegramChatIdDraft.trim() && name) {
      alert('Chat ID wajib diisi.');
      return;
    }

    const chatId = normalizeTelegramChatId(telegramChatIdDraft);
    if (!chatId) {
      alert('Chat ID harus angka. Untuk grup biasanya diawali -100.');
      return;
    }

    const duplicateIndex = telegramRecipients.findIndex((item) => item.chatId === chatId);
    if (duplicateIndex !== -1 && duplicateIndex !== editingChatIdIndex) {
      alert('Chat ID sudah ada di daftar.');
      return;
    }

    const recipient = { name, chatId };
    if (editingChatIdIndex !== null) {
      setTelegramRecipients((items) =>
        items.map((item, index) => (index === editingChatIdIndex ? recipient : item))
      );
    } else {
      setTelegramRecipients((items) => [...items, recipient]);
    }

    setTelegramRecipientNameDraft('');
    setTelegramChatIdDraft('');
    setEditingChatIdIndex(null);
  };

  const editTelegramChatId = (index: number) => {
    setTelegramRecipientNameDraft(telegramRecipients[index].name);
    setTelegramChatIdDraft(telegramRecipients[index].chatId);
    setEditingChatIdIndex(index);
  };

  const removeTelegramChatId = (index: number) => {
    setTelegramRecipients((items) => items.filter((_, itemIndex) => itemIndex !== index));
    if (editingChatIdIndex === index) {
      setTelegramRecipientNameDraft('');
      setTelegramChatIdDraft('');
      setEditingChatIdIndex(null);
    } else if (editingChatIdIndex !== null && editingChatIdIndex > index) {
      setEditingChatIdIndex(editingChatIdIndex - 1);
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

  const validateDeviceBootstrap = () => {
    if (!deviceWifiSsid.trim()) return 'SSID Wi-Fi wajib diisi.';
    if (!deviceApiKey.trim()) return 'Firebase API Key wajib diisi.';
    if (!/^https:\/\/.+/.test(deviceDbUrl.trim())) {
      return 'Realtime Database URL harus diawali https://';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deviceEmail.trim())) {
      return 'Email akun IoT tidak valid.';
    }
    if (!devicePassword.trim()) return 'Password akun IoT wajib diisi.';
    return '';
  };

  const handleSaveDeviceBootstrap = async () => {
    if (!canManageDeviceBootstrap) return;

    const validationError = validateDeviceBootstrap();
    if (validationError) {
      alert(validationError);
      return;
    }

    setLoading(true);
    try {
      await set(ref(db, 'settings/deviceBootstrap'), {
        ...bootstrapSettings,
        action: 'save',
        requestId: `bootstrap-${Date.now()}`,
        pending: true,
        status: 'pending',
        statusMessage: 'Menunggu ESP32 membaca permintaan bootstrap dari Firebase.',
        requestedAt: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        requestedBy: user?.email || 'admin',
        wifiSsid: deviceWifiSsid.trim(),
        wifiPassword: deviceWifiPassword,
        firebaseApiKey: deviceApiKey.trim(),
        firebaseDbUrl: deviceDbUrl.trim(),
        iotEmail: deviceEmail.trim(),
        iotPassword: devicePassword,
        lastError: '',
        restartRequired: true,
      });
      alert('Permintaan bootstrap dikirim. ESP32 akan restart setelah menerapkan konfigurasi baru.');
    } catch (error) {
      console.error('Error saving device bootstrap:', error);
      alert('Gagal menyimpan bootstrap device');
    } finally {
      setLoading(false);
    }
  };

  const handleClearDeviceBootstrap = async () => {
    if (!canManageDeviceBootstrap) return;
    if (!confirm('Hapus konfigurasi Wi-Fi device dan buka captive portal setup?')) return;

    setLoading(true);
    try {
      await set(ref(db, 'settings/deviceBootstrap'), {
        ...bootstrapSettings,
        action: 'clear',
        requestId: `bootstrap-clear-${Date.now()}`,
        pending: true,
        status: 'pending',
        statusMessage: 'Menunggu ESP32 menghapus bootstrap lalu membuka captive portal.',
        requestedAt: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        requestedBy: user?.email || 'admin',
        wifiSsid: '',
        wifiPassword: '',
        lastError: '',
        restartRequired: true,
      });
      alert('Permintaan hapus bootstrap dikirim. Device akan masuk mode setup setelah restart.');
    } catch (error) {
      console.error('Error clearing device bootstrap:', error);
      alert('Gagal menghapus bootstrap device');
    } finally {
      setLoading(false);
    }
  };

  const getCallableErrorMessage = (error: unknown, fallback: string) => {
    const raw = error instanceof Error ? error.message : String(error || '');
    return raw
      .replace(/^internal\s*/i, '')
      .replace(/^permission-denied\s*/i, '')
      .replace(/^invalid-argument\s*/i, '')
      .replace(/^failed-precondition\s*/i, '')
      .replace(/^resource-exhausted\s*/i, '')
      .replace(/^deadline-exceeded\s*/i, '')
      .replace(/^not-found\s*/i, '')
      .replace(/^unauthenticated\s*/i, '')
      .trim() || fallback;
  };

  const getLiveResetApiBase = () => 'https://iot-listrik-dashboard.vercel.app';

  const callLiveResetApi = async (path: string, body: Record<string, unknown>) => {
    const token = await user?.getIdToken();
    if (!token) {
      throw new Error('Sesi admin tidak ditemukan. Silakan login ulang.');
    }

    const response = await fetch(`${getLiveResetApiBase()}/api/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }
    return data as {
      actionId?: string;
      expiresAt?: number;
      maskedEmail?: string;
      clearedAt?: number;
    };
  };

  const handleRequestLiveResetOtp = async () => {
    if (!canManageDeviceBootstrap) return;
    setLiveResetLoading(true);
    try {
      const data = await callLiveResetApi('request-live-reset-otp', {});

      setLiveResetActionId(String(data.actionId || ''));
      setLiveResetExpiresAt(Number(data.expiresAt || 0) || null);
      setLiveResetMaskedEmail(String(data.maskedEmail || user?.email || ''));
      setLiveResetOtp('');
      setLiveResetState('otp_sent');
      setLiveResetMessage('Kode OTP sudah dikirim ke email admin. Masukkan 6 digit OTP untuk mengosongkan data realtime /listrik.');
      alert('OTP reset data realtime berhasil dikirim ke email admin.');
    } catch (error) {
      const msg = getCallableErrorMessage(error, 'Gagal meminta OTP reset data realtime.');
      setLiveResetState('error');
      setLiveResetMessage(msg);
      alert(msg);
    } finally {
      setLiveResetLoading(false);
    }
  };

  const handleConfirmLiveReset = async () => {
    if (!canManageDeviceBootstrap) return;
    if (!liveResetActionId) {
      alert('Minta OTP dulu sebelum mengosongkan data realtime.');
      return;
    }
    if (!/^\d{6}$/.test(liveResetOtp.trim())) {
      alert('OTP harus 6 digit angka.');
      return;
    }

    setLiveResetLoading(true);
    try {
      const data = await callLiveResetApi('confirm-live-reset', {
        otp: liveResetOtp.trim(),
        actionId: liveResetActionId,
      });
      const clearedLabel = data.clearedAt
        ? new Date(Number(data.clearedAt)).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
        : 'baru saja';

      setLiveResetActionId('');
      setLiveResetExpiresAt(null);
      setLiveResetOtp('');
      setLiveResetState('success');
      setLiveResetMessage(`Data realtime /listrik berhasil dikosongkan pada ${clearedLabel} WIB.`);
      alert('Data realtime perangkat IoT berhasil dikosongkan.');
    } catch (error) {
      const msg = getCallableErrorMessage(error, 'Gagal mengosongkan data realtime /listrik.');
      setLiveResetState('error');
      setLiveResetMessage(msg);
      alert(msg);
    } finally {
      setLiveResetLoading(false);
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
          [
            ['system', 'System'],
            ['calibration', 'Calibration'],
            ['telegram', 'Telegram'],
            ['discord', 'Discord'],
            ['device', 'Device'],
            ['backend', 'Backend'],
            ['users', 'Users'],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md font-semibold capitalize transition ${
              tab === t
                ? 'bg-blue-600 text-white'
                : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {label}
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
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow space-y-5">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Telegram Integration
            </h3>
            <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
              Atur token bot, daftar penerima, dan status notifikasi Telegram.
            </p>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            <strong className="font-semibold">Aman:</strong> Token dan daftar Chat ID tersimpan di Firebase, bukan di firmware.
          </div>

          <div className="space-y-2">
            <label className={telegramLabelClass}>
              Bot Token
            </label>
            <div className="relative">
              <input
                type={showTgToken ? "text" : "password"}
                value={telegramBotToken}
                onChange={(e) => setTelegramBotToken(e.target.value)}
                className={`${telegramInputClass} pr-12 font-mono`}
                placeholder="1234567890:ABCDEF..."
              />
              <button 
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                onClick={() => setShowTgToken(!showTgToken)}
              >
                {showTgToken ? <EyeOff size={20}/> : <Eye size={20}/>}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className={telegramLabelClass}>
              Penerima Telegram
            </label>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto] lg:items-end">
              <div className="min-w-0">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Nama / Label
                </label>
                <input
                  type="text"
                  value={telegramRecipientNameDraft}
                  onChange={(e) => setTelegramRecipientNameDraft(e.target.value)}
                  className={telegramInputClass}
                  placeholder="Contoh: Pak Budi"
                />
              </div>
              <div className="min-w-0">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Chat ID / Group ID
                </label>
                <input
                  type="text"
                  value={telegramChatIdDraft}
                  onChange={(e) => setTelegramChatIdDraft(e.target.value)}
                  className={`${telegramInputClass} font-mono`}
                  placeholder="-1001234567890"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  type="button"
                  onClick={addOrUpdateTelegramChatId}
                  className={telegramPrimaryActionClass}
                >
                  {editingChatIdIndex === null ? 'Tambah' : 'Update'}
                </button>
                {editingChatIdIndex !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setTelegramRecipientNameDraft('');
                      setTelegramChatIdDraft('');
                      setEditingChatIdIndex(null);
                    }}
                    className={telegramMutedActionClass}
                  >
                    Batal
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Untuk grup biasanya diawali -100. Untuk pribadi gunakan ID numerik positif.
            </p>
            <div className="space-y-2">
              {telegramRecipients.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 text-center text-sm leading-6 text-gray-500 dark:text-gray-400">
                  Belum ada penerima Telegram tersimpan.
                </div>
              ) : (
                telegramRecipients.map((recipient, index) => (
                  <div
                    key={`${recipient.chatId}-${index}`}
                    className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="break-words text-sm font-semibold leading-5 text-gray-900 dark:text-white">
                        {recipient.name || `Penerima ${index + 1}`}
                      </div>
                      <div className="break-all font-mono text-sm leading-6 text-gray-500 dark:text-gray-400">
                        {recipient.chatId}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <button
                        type="button"
                        onClick={() => editTelegramChatId(index)}
                        className="min-h-[42px] rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTelegramChatId(index)}
                        className="min-h-[42px] rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <label htmlFor="tgNotify" className="min-w-0">
              <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                Notifikasi Telegram
              </span>
              <span className="block text-sm leading-6 text-gray-500 dark:text-gray-400">
                Aktifkan pengiriman alert saat status berubah.
              </span>
            </label>
            <label
              htmlFor="tgNotify"
              className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center"
              aria-label="Aktifkan notifikasi Telegram"
            >
              <input
                type="checkbox"
                id="tgNotify"
                checked={telegramNotifyEnabled}
                onChange={(e) => setTelegramNotifyEnabled(e.target.checked)}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full border border-gray-300 bg-gray-200 transition peer-checked:border-emerald-500 peer-checked:bg-emerald-500/25 dark:border-gray-700 dark:bg-gray-800" />
              <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-gray-500 transition peer-checked:translate-x-5 peer-checked:bg-emerald-500" />
            </label>
          </div>

          <button
            onClick={handleSaveTelegram}
            disabled={loading}
            className="w-full min-h-[46px] px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-semibold transition"
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

      {/* Device Bootstrap Tab */}
      {tab === 'device' && (
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow space-y-5">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Bootstrap Device &amp; Wi-Fi ESP32
            </h3>
            <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
              Atur SSID, password Wi-Fi, Firebase API Key, Realtime Database URL, dan akun IoT untuk device fisik.
              Setelah dikirim, ESP32 akan menyimpan konfigurasi ke NVS lalu restart otomatis.
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            <strong className="font-semibold">Khusus admin utama:</strong> tab ini tidak dipakai akun temp simulator.
            Device perlu firmware terbaru ini satu kali, setelah itu ganti Wi-Fi berikutnya tidak perlu upload ulang.
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                SSID Wi-Fi
              </label>
              <input
                type="text"
                value={deviceWifiSsid}
                onChange={(e) => setDeviceWifiSsid(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
                placeholder="Nama Wi-Fi tujuan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password Wi-Fi
              </label>
              <div className="relative">
                <input
                  type={showDeviceWifiPassword ? 'text' : 'password'}
                  value={deviceWifiPassword}
                  onChange={(e) => setDeviceWifiPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 pr-10"
                  placeholder="Kosongkan jika tanpa password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-gray-500"
                  onClick={() => setShowDeviceWifiPassword(!showDeviceWifiPassword)}
                >
                  {showDeviceWifiPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Firebase API Key
              </label>
              <div className="relative">
                <input
                  type={showDeviceApiKey ? 'text' : 'password'}
                  value={deviceApiKey}
                  onChange={(e) => setDeviceApiKey(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 pr-10"
                  placeholder="AIza..."
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-gray-500"
                  onClick={() => setShowDeviceApiKey(!showDeviceApiKey)}
                >
                  {showDeviceApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Realtime Database URL
              </label>
              <input
                type="url"
                value={deviceDbUrl}
                onChange={(e) => setDeviceDbUrl(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
                placeholder="https://project-id-default-rtdb.firebaseio.com/"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Akun IoT
              </label>
              <input
                type="email"
                value={deviceEmail}
                onChange={(e) => setDeviceEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
                placeholder="listrik.iot.device@gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password Akun IoT
              </label>
              <div className="relative">
                <input
                  type={showDevicePassword ? 'text' : 'password'}
                  value={devicePassword}
                  onChange={(e) => setDevicePassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 pr-10"
                  placeholder="Password akun device"
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-gray-500"
                  onClick={() => setShowDevicePassword(!showDevicePassword)}
                >
                  {showDevicePassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
            <div className="font-semibold">Status bootstrap: {deviceBootstrapStatusLabel}</div>
            <div className="mt-2">{bootstrapSettings.statusMessage || 'Belum ada permintaan bootstrap yang dikirim.'}</div>
            {bootstrapSettings.requestedBy && (
              <div className="mt-2">Diminta oleh: {bootstrapSettings.requestedBy}</div>
            )}
            {bootstrapSettings.requestedAt && (
              <div>Waktu permintaan: {bootstrapSettings.requestedAt}</div>
            )}
            {bootstrapSettings.lastConfirmedAt && (
              <div>
                Konfirmasi device:{' '}
                {/^\d+$/.test(String(bootstrapSettings.lastConfirmedAt))
                  ? `${bootstrapSettings.lastConfirmedAt} ms uptime`
                  : bootstrapSettings.lastConfirmedAt}
              </div>
            )}
            {bootstrapSettings.activeSsid && (
              <div>SSID aktif: {bootstrapSettings.activeSsid}</div>
            )}
            {bootstrapSettings.lastError && (
              <div className="text-red-600 dark:text-red-400">
                Detail error: {bootstrapSettings.lastError}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSaveDeviceBootstrap}
              disabled={loading || !canManageDeviceBootstrap}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
            >
              {loading ? 'Mengirim...' : 'Simpan & Terapkan ke Device'}
            </button>
            <button
              onClick={handleClearDeviceBootstrap}
              disabled={loading || !canManageDeviceBootstrap}
              className="px-4 py-2 bg-transparent border border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white disabled:opacity-50 rounded-lg font-semibold transition"
            >
              Hapus Wi-Fi & Buka Setup
            </button>
          </div>

          <div className="border-t border-gray-200 pt-5 dark:border-gray-700">
            <div className="space-y-2">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                Reset Data Realtime IoT
              </h4>
              <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
                Aksi ini mengosongkan data realtime sensor pada <code>/listrik</code> setelah OTP 6 digit
                dikirim ke email admin yang sedang login.
              </p>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              Histori log tidak dihapus. Jika device fisik masih online, data baru dapat muncul lagi pada heartbeat berikutnya.
            </div>

            <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              OTP akan dikirim ke email admin: <strong>{user?.email || '—'}</strong>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kode OTP Email Admin
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={liveResetOtp}
                  onChange={(e) => setLiveResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3"
                  placeholder="Masukkan 6 digit OTP"
                />
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
                <div className="font-semibold">Status verifikasi: {liveResetStatusLabel}</div>
                <div className="mt-2">{liveResetMessage}</div>
                {liveResetMaskedEmail && <div className="mt-2">Email tujuan: {liveResetMaskedEmail}</div>}
                {liveResetActionId && <div>ID verifikasi: {liveResetActionId}</div>}
                {liveResetExpiresAt && (
                  <div>
                    OTP berlaku sampai:{' '}
                    {new Date(liveResetExpiresAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={handleRequestLiveResetOtp}
                disabled={liveResetLoading || !canManageDeviceBootstrap}
                className="px-4 py-2 bg-transparent border border-gray-400 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 rounded-lg font-semibold transition"
              >
                {liveResetLoading ? 'Mengirim...' : 'Kirim OTP ke Email Admin'}
              </button>
              <button
                onClick={handleConfirmLiveReset}
                disabled={liveResetLoading || !canManageDeviceBootstrap}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
              >
                {liveResetLoading ? 'Memproses...' : 'Kosongkan Data Realtime'}
              </button>
            </div>
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

/**
 * Client-only configuration (browser / same shape as Electron store).
 * Not sent to ESP32 — controls data source failover for this device.
 */
const STORAGE_KEY = 'iotListrik_clientV1';

export function defaultClientConfig() {
  return {
    publicApiBase: '',
    localApiBase: 'http://localhost:3000',
    mode: 'AUTO',
    autoFailover: true,
    retryIntervalMs: 6000,
    timeoutMs: 4000,
    healthPath: '/health',
    autoStartLocal: false,
    localServerPath: '',
    localStartCmd: 'node server.js',
    localStopCmd: '',
  };
}

export function loadClientConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultClientConfig();
    return { ...defaultClientConfig(), ...JSON.parse(raw) };
  } catch {
    return defaultClientConfig();
  }
}

export function saveClientConfig(partial) {
  const next = { ...loadClientConfig(), ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

const STORAGE_KEY = 'iotListrik_clientV1';

export type DataMode = 'AUTO' | 'PUBLIC' | 'LOCAL';

export interface ClientBackendConfig {
  publicApiBase: string;
  localApiBase: string;
  mode: DataMode;
  autoFailover: boolean;
  retryIntervalMs: number;
  timeoutMs: number;
  healthPath: string;
  autoStartLocal: boolean;
  localServerPath: string;
  localStartCmd: string;
  localStopCmd: string;
}

export function defaultClientConfig(): ClientBackendConfig {
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

export function loadClientConfig(): ClientBackendConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultClientConfig();
    return { ...defaultClientConfig(), ...JSON.parse(raw) };
  } catch {
    return defaultClientConfig();
  }
}

export function saveClientConfig(partial: Partial<ClientBackendConfig>): ClientBackendConfig {
  const next = { ...loadClientConfig(), ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

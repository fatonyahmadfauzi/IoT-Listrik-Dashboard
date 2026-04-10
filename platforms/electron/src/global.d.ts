export {};

declare global {
  interface Window {
    electronAPI?: {
      showNotification: (title: string, body: string) => Promise<string>;
      getSettings: () => Promise<{
        runAtStartup: boolean;
        enableNotifications: boolean;
        startMinimized: boolean;
      }>;
      setSettings: (settings: Record<string, unknown>) => Promise<void>;
      startLocalServer: (opts: {
        cwd: string;
        command: string;
      }) => Promise<{ ok: boolean; error?: string }>;
      stopLocalServer: () => Promise<{ ok: boolean }>;
      localServerStatus: () => Promise<{ running: boolean }>;
      onNotificationClick: (callback: () => void) => void;
      removeNotificationClick: (callback: () => void) => void;
    };
  }
}

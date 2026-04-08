import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('show-notification', { title, body }),

  getSettings: () => ipcRenderer.invoke('get-settings'),

  setSettings: (settings: any) => ipcRenderer.invoke('set-settings', settings),

  onNotificationClick: (callback: () => void) =>
    ipcRenderer.on('notification-click', callback),

  removeNotificationClick: (callback: () => void) =>
    ipcRenderer.removeListener('notification-click', callback),
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      showNotification: (title: string, body: string) => Promise<string>;
      getSettings: () => Promise<{
        runAtStartup: boolean;
        enableNotifications: boolean;
        startMinimized: boolean;
      }>;
      setSettings: (settings: any) => Promise<void>;
      onNotificationClick: (callback: () => void) => void;
      removeNotificationClick: (callback: () => void) => void;
    };
  }
}
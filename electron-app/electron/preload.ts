import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('show-notification', { title, body }),

  getSettings: () => ipcRenderer.invoke('get-settings'),

  setSettings: (settings: any) => ipcRenderer.invoke('set-settings', settings),

  startLocalServer: (opts: { cwd: string; command: string }) =>
    ipcRenderer.invoke('local-server:start', opts),

  stopLocalServer: () => ipcRenderer.invoke('local-server:stop'),

  localServerStatus: () => ipcRenderer.invoke('local-server:status'),

  onNotificationClick: (callback: () => void) =>
    ipcRenderer.on('notification-click', callback),

  removeNotificationClick: (callback: () => void) =>
    ipcRenderer.removeListener('notification-click', callback),
});